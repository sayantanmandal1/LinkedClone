/**
 * Tests for offline message queue manager
 */

import { messageQueue, QueuedMessage } from '../messageQueue';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('MessageQueue', () => {
  beforeEach(() => {
    // Clear queue before each test
    messageQueue.clearQueue();
  });

  describe('enqueue', () => {
    it('should add a message to the queue', () => {
      const message = messageQueue.enqueue({
        tempId: 'temp-123',
        conversationId: 'conv-1',
        content: 'Test message',
      });

      expect(message.tempId).toBe('temp-123');
      expect(message.status).toBe('pending');
      expect(message.retryCount).toBe(0);

      const queue = messageQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].tempId).toBe('temp-123');
    });
  });

  describe('dequeue', () => {
    it('should remove a message from the queue', () => {
      messageQueue.enqueue({
        tempId: 'temp-123',
        conversationId: 'conv-1',
        content: 'Test message',
      });

      messageQueue.dequeue('temp-123');

      const queue = messageQueue.getQueue();
      expect(queue).toHaveLength(0);
    });
  });

  describe('getConversationMessages', () => {
    it('should return messages for a specific conversation', () => {
      messageQueue.enqueue({
        tempId: 'temp-1',
        conversationId: 'conv-1',
        content: 'Message 1',
      });

      messageQueue.enqueue({
        tempId: 'temp-2',
        conversationId: 'conv-2',
        content: 'Message 2',
      });

      messageQueue.enqueue({
        tempId: 'temp-3',
        conversationId: 'conv-1',
        content: 'Message 3',
      });

      const conv1Messages = messageQueue.getConversationMessages('conv-1');
      expect(conv1Messages).toHaveLength(2);
      expect(conv1Messages[0].tempId).toBe('temp-1');
      expect(conv1Messages[1].tempId).toBe('temp-3');
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count', () => {
      messageQueue.enqueue({
        tempId: 'temp-123',
        conversationId: 'conv-1',
        content: 'Test message',
      });

      const updated = messageQueue.incrementRetryCount('temp-123');
      expect(updated?.retryCount).toBe(1);
      expect(updated?.status).toBe('pending');
    });

    it('should mark as failed after max retries', () => {
      messageQueue.enqueue({
        tempId: 'temp-123',
        conversationId: 'conv-1',
        content: 'Test message',
      });

      // Increment 3 times to reach max retries
      messageQueue.incrementRetryCount('temp-123');
      messageQueue.incrementRetryCount('temp-123');
      const updated = messageQueue.incrementRetryCount('temp-123');

      expect(updated?.retryCount).toBe(3);
      expect(updated?.status).toBe('failed');
    });
  });

  describe('resetRetryCount', () => {
    it('should reset retry count and status', () => {
      messageQueue.enqueue({
        tempId: 'temp-123',
        conversationId: 'conv-1',
        content: 'Test message',
      });

      // Increment and mark as failed
      messageQueue.incrementRetryCount('temp-123');
      messageQueue.incrementRetryCount('temp-123');
      messageQueue.incrementRetryCount('temp-123');

      // Reset
      messageQueue.resetRetryCount('temp-123');

      const queue = messageQueue.getQueue();
      expect(queue[0].retryCount).toBe(0);
      expect(queue[0].status).toBe('pending');
    });
  });

  describe('getPendingMessages', () => {
    it('should return only pending messages', () => {
      messageQueue.enqueue({
        tempId: 'temp-1',
        conversationId: 'conv-1',
        content: 'Message 1',
      });

      messageQueue.enqueue({
        tempId: 'temp-2',
        conversationId: 'conv-1',
        content: 'Message 2',
      });

      // Mark one as failed
      messageQueue.markAsFailed('temp-2');

      const pending = messageQueue.getPendingMessages();
      expect(pending).toHaveLength(1);
      expect(pending[0].tempId).toBe('temp-1');
    });
  });

  describe('getFailedMessages', () => {
    it('should return only failed messages', () => {
      messageQueue.enqueue({
        tempId: 'temp-1',
        conversationId: 'conv-1',
        content: 'Message 1',
      });

      messageQueue.enqueue({
        tempId: 'temp-2',
        conversationId: 'conv-1',
        content: 'Message 2',
      });

      // Mark one as failed
      messageQueue.markAsFailed('temp-2');

      const failed = messageQueue.getFailedMessages();
      expect(failed).toHaveLength(1);
      expect(failed[0].tempId).toBe('temp-2');
    });
  });

  describe('clearConversationQueue', () => {
    it('should clear messages for a specific conversation', () => {
      messageQueue.enqueue({
        tempId: 'temp-1',
        conversationId: 'conv-1',
        content: 'Message 1',
      });

      messageQueue.enqueue({
        tempId: 'temp-2',
        conversationId: 'conv-2',
        content: 'Message 2',
      });

      messageQueue.clearConversationQueue('conv-1');

      const queue = messageQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].conversationId).toBe('conv-2');
    });
  });
});
