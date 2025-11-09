/**
 * Offline Message Queue Manager
 * Handles queueing messages when offline and retrying on reconnection
 */

export interface QueuedMessage {
  tempId: string;
  conversationId: string;
  content: string;
  retryCount: number;
  status: 'pending' | 'failed';
  createdAt: string;
}

const QUEUE_KEY = 'chat_message_queue';
const MAX_RETRY_ATTEMPTS = 3;

class MessageQueueManager {
  /**
   * Get all queued messages from localStorage
   */
  getQueue(): QueuedMessage[] {
    try {
      const queueData = localStorage.getItem(QUEUE_KEY);
      if (!queueData) return [];
      return JSON.parse(queueData);
    } catch (error) {
      console.error('[MessageQueue] Error reading queue:', error);
      return [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(queue: QueuedMessage[]): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('[MessageQueue] Error saving queue:', error);
    }
  }

  /**
   * Add a message to the queue
   */
  enqueue(message: Omit<QueuedMessage, 'retryCount' | 'status' | 'createdAt'>): QueuedMessage {
    const queue = this.getQueue();
    
    const queuedMessage: QueuedMessage = {
      ...message,
      retryCount: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    
    queue.push(queuedMessage);
    this.saveQueue(queue);
    
    console.log('[MessageQueue] Message enqueued:', queuedMessage.tempId);
    return queuedMessage;
  }

  /**
   * Remove a message from the queue
   */
  dequeue(tempId: string): void {
    const queue = this.getQueue();
    const filteredQueue = queue.filter(msg => msg.tempId !== tempId);
    this.saveQueue(filteredQueue);
    console.log('[MessageQueue] Message dequeued:', tempId);
  }

  /**
   * Get messages for a specific conversation
   */
  getConversationMessages(conversationId: string): QueuedMessage[] {
    const queue = this.getQueue();
    return queue.filter(msg => msg.conversationId === conversationId);
  }

  /**
   * Update message retry count
   */
  incrementRetryCount(tempId: string): QueuedMessage | null {
    const queue = this.getQueue();
    const messageIndex = queue.findIndex(msg => msg.tempId === tempId);
    
    if (messageIndex === -1) return null;
    
    queue[messageIndex].retryCount += 1;
    
    // Mark as failed if max retries reached
    if (queue[messageIndex].retryCount >= MAX_RETRY_ATTEMPTS) {
      queue[messageIndex].status = 'failed';
      console.log('[MessageQueue] Message marked as failed after max retries:', tempId);
    }
    
    this.saveQueue(queue);
    return queue[messageIndex];
  }

  /**
   * Mark a message as failed
   */
  markAsFailed(tempId: string): void {
    const queue = this.getQueue();
    const messageIndex = queue.findIndex(msg => msg.tempId === tempId);
    
    if (messageIndex !== -1) {
      queue[messageIndex].status = 'failed';
      this.saveQueue(queue);
      console.log('[MessageQueue] Message marked as failed:', tempId);
    }
  }

  /**
   * Reset retry count for a message (for manual retry)
   */
  resetRetryCount(tempId: string): void {
    const queue = this.getQueue();
    const messageIndex = queue.findIndex(msg => msg.tempId === tempId);
    
    if (messageIndex !== -1) {
      queue[messageIndex].retryCount = 0;
      queue[messageIndex].status = 'pending';
      this.saveQueue(queue);
      console.log('[MessageQueue] Message retry count reset:', tempId);
    }
  }

  /**
   * Get all pending messages (not failed)
   */
  getPendingMessages(): QueuedMessage[] {
    const queue = this.getQueue();
    return queue.filter(msg => msg.status === 'pending');
  }

  /**
   * Get all failed messages
   */
  getFailedMessages(): QueuedMessage[] {
    const queue = this.getQueue();
    return queue.filter(msg => msg.status === 'failed');
  }

  /**
   * Clear all messages from queue
   */
  clearQueue(): void {
    localStorage.removeItem(QUEUE_KEY);
    console.log('[MessageQueue] Queue cleared');
  }

  /**
   * Clear messages for a specific conversation
   */
  clearConversationQueue(conversationId: string): void {
    const queue = this.getQueue();
    const filteredQueue = queue.filter(msg => msg.conversationId !== conversationId);
    this.saveQueue(filteredQueue);
    console.log('[MessageQueue] Conversation queue cleared:', conversationId);
  }
}

// Export singleton instance
export const messageQueue = new MessageQueueManager();
