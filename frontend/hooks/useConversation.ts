'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { chatApi } from '@/lib/api';
import { Message, UserPresence, MessageStatus } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { messageQueue } from '@/lib/messageQueue';
import { useToast } from '@/contexts/ToastContext';

interface UseConversationOptions {
  conversationId: string;
  recipientId: string;
}

interface UseConversationReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  isTyping: boolean;
  recipientPresence: UserPresence | null;
  sendMessage: (content: string) => Promise<void>;
  loadMore: () => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
  retryMessage: (tempId: string) => Promise<void>;
}

const TYPING_DEBOUNCE_MS = 500;
const TYPING_TIMEOUT_MS = 3000;

export function useConversation({
  conversationId,
  recipientId,
}: UseConversationOptions): UseConversationReturn {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { showToast } = useToast();
  
  // Message state
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  
  // Typing state
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingEmittedRef = useRef(false);
  
  // Presence state
  const [recipientPresence, setRecipientPresence] = useState<UserPresence | null>(null);
  
  // Track unread message IDs for batch read marking
  const unreadMessageIdsRef = useRef<string[]>([]);

  // Fetch messages from API
  const fetchMessages = useCallback(async (pageNum: number, append = false) => {
    if (!conversationId) return;

    try {
      if (!append) {
        setLoading(true);
      }
      setError(null);

      const response = await chatApi.getConversationMessages(conversationId, pageNum, 50);

      if (response.success && response.messages) {
        // Messages come in reverse chronological order (newest first)
        // We want oldest first for display, so reverse them
        const sortedMessages = [...response.messages].reverse();
        
        setMessages(prev => 
          append ? [...sortedMessages, ...prev] : sortedMessages
        );
        
        if (response.pagination) {
          setHasMore(response.pagination.page < response.pagination.totalPages);
          setPage(response.pagination.page);
        }

        // Collect unread message IDs (messages not sent by current user and not seen)
        if (!append && user) {
          const unreadIds = response.messages
            .filter(msg => {
              const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
              return senderId !== user._id && msg.status !== 'seen';
            })
            .map(msg => msg._id);
          
          unreadMessageIdsRef.current = unreadIds;
        }
      }
    } catch (err) {
      console.error('[useConversation] Error fetching messages:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      showToast(errorMessage, 'error', 5000);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user, showToast]);

  // Load more messages (pagination for infinite scroll)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchMessages(page + 1, true);
  }, [hasMore, loading, page, fetchMessages]);

  // Send message via WebSocket with optimistic update and offline queueing
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !content.trim()) {
      console.warn('[useConversation] Cannot send message: no user or invalid content');
      return;
    }

    // Stop typing indicator immediately
    // Clear timeouts
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Emit stop typing if we previously emitted start
    if (isTypingEmittedRef.current && socket && isConnected) {
      socket.emit('typing:stop', { conversationId });
      isTypingEmittedRef.current = false;
    }

    // Create optimistic message
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const trimmedContent = content.trim();
    
    const optimisticMessage: Message = {
      _id: tempId,
      conversationId,
      sender: user,
      content: trimmedContent,
      status: isConnected ? 'sent' : 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      retryCount: 0,
    };

    // Add optimistic message to UI
    setMessages(prev => [...prev, optimisticMessage]);

    // If offline or no socket, try REST API fallback first
    if (!socket || !isConnected) {
      console.log('[useConversation] WebSocket unavailable - attempting REST API fallback');
      
      try {
        // Try to send via REST API
        const response = await chatApi.sendMessage(conversationId, trimmedContent);
        
        if (response.success && response.message) {
          // Replace optimistic message with real one
          setMessages(prev =>
            prev.map(msg =>
              msg._id === tempId ? response.message : msg
            )
          );
          showToast('Message sent via fallback', 'success', 2000);
          return;
        }
      } catch (restErr) {
        console.error('[useConversation] REST API fallback failed:', restErr);
      }
      
      // If REST API also fails, queue the message
      console.log('[useConversation] Queueing message for later:', tempId);
      messageQueue.enqueue({
        tempId,
        conversationId,
        content: trimmedContent,
      });
      
      // Mark optimistic message as pending
      setMessages(prev =>
        prev.map(msg =>
          msg._id === tempId
            ? { ...msg, status: 'pending' as MessageStatus, retryCount: 0 }
            : msg
        )
      );
      
      showToast('Message queued - will send when online', 'info', 3000);
      return;
    }

    try {
      // Emit message via WebSocket
      socket.emit('message:send', {
        conversationId,
        content: trimmedContent,
        tempId, // Send temp ID so we can replace it with real message
      });
    } catch (err) {
      console.error('[useConversation] Error sending message:', err);
      
      // Try REST API fallback
      try {
        const response = await chatApi.sendMessage(conversationId, trimmedContent);
        
        if (response.success && response.message) {
          // Replace optimistic message with real one
          setMessages(prev =>
            prev.map(msg =>
              msg._id === tempId ? response.message : msg
            )
          );
          showToast('Message sent via fallback', 'success', 2000);
          return;
        }
      } catch (restErr) {
        console.error('[useConversation] REST API fallback also failed:', restErr);
      }
      
      // Queue message for retry if both methods fail
      messageQueue.enqueue({
        tempId,
        conversationId,
        content: trimmedContent,
      });
      
      // Mark optimistic message as pending
      setMessages(prev =>
        prev.map(msg =>
          msg._id === tempId
            ? { ...msg, status: 'pending' as MessageStatus, retryCount: 0 }
            : msg
        )
      );
      
      const errorMessage = 'Failed to send message - will retry when online';
      setError(errorMessage);
      showToast(errorMessage, 'error', 4000);
    }
  }, [socket, isConnected, user, conversationId, showToast]);

  // Retry a failed message
  const retryMessage = useCallback(async (tempId: string) => {
    if (!socket || !isConnected || !user) {
      console.warn('[useConversation] Cannot retry: socket not connected');
      return;
    }

    // Get message from queue
    const queue = messageQueue.getQueue();
    const queuedMessage = queue.find(msg => msg.tempId === tempId);
    
    if (!queuedMessage) {
      console.warn('[useConversation] Message not found in queue:', tempId);
      return;
    }

    // Reset retry count and mark as pending
    messageQueue.resetRetryCount(tempId);
    
    // Update UI to show pending status
    setMessages(prev =>
      prev.map(msg =>
        msg._id === tempId
          ? { ...msg, status: 'pending' as MessageStatus, retryCount: 0 }
          : msg
      )
    );

    try {
      // Emit message via WebSocket
      socket.emit('message:send', {
        conversationId: queuedMessage.conversationId,
        content: queuedMessage.content,
        tempId,
      });
    } catch (err) {
      console.error('[useConversation] Error retrying message:', err);
      
      // Increment retry count
      const updated = messageQueue.incrementRetryCount(tempId);
      
      // Update UI with new status
      setMessages(prev =>
        prev.map(msg =>
          msg._id === tempId
            ? { 
                ...msg, 
                status: (updated?.status === 'failed' ? 'failed' : 'pending') as MessageStatus,
                retryCount: updated?.retryCount || 0
              }
            : msg
        )
      );
      
      if (updated?.status === 'failed') {
        showToast('Message failed to send after multiple attempts', 'error', 5000);
      }
    }
  }, [socket, isConnected, user, conversationId, showToast]);

  // Start typing indicator (debounced)
  const startTyping = useCallback(() => {
    if (!socket || !isConnected || !conversationId) return;

    // Clear existing debounce timeout
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    // Debounce the typing start emit
    typingDebounceRef.current = setTimeout(() => {
      if (!isTypingEmittedRef.current) {
        socket.emit('typing:start', { conversationId });
        isTypingEmittedRef.current = true;
      }
    }, TYPING_DEBOUNCE_MS);

    // Clear existing typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, TYPING_TIMEOUT_MS);
  }, [socket, isConnected, conversationId]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (!socket || !isConnected || !conversationId) return;

    // Clear timeouts
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Emit stop typing if we previously emitted start
    if (isTypingEmittedRef.current) {
      socket.emit('typing:stop', { conversationId });
      isTypingEmittedRef.current = false;
    }
  }, [socket, isConnected, conversationId]);

  // Handle new message received via WebSocket
  const handleNewMessage = useCallback((data: { message: Message }) => {
    const { message } = data;

    // Only add if it belongs to this conversation
    if (message.conversationId !== conversationId) return;

    setMessages(prev => {
      // Check if message already exists (avoid duplicates)
      const exists = prev.some(m => m._id === message._id);
      if (exists) return prev;

      // Check if this is replacing an optimistic message
      const tempMessageIndex = prev.findIndex(m => 
        m._id.startsWith('temp-') && 
        m.content === message.content &&
        typeof m.sender === 'object' && 
        typeof message.sender === 'object' &&
        m.sender._id === message.sender._id
      );

      if (tempMessageIndex >= 0) {
        // Replace optimistic message with real one
        const updated = [...prev];
        const tempId = updated[tempMessageIndex]._id;
        updated[tempMessageIndex] = message;
        
        // Remove from queue if it was queued
        messageQueue.dequeue(tempId);
        
        return updated;
      }

      // Add new message to end
      return [...prev, message];
    });

    // If message is from recipient and conversation is open, mark as read
    if (user && typeof message.sender === 'object' && message.sender._id !== user._id) {
      // Add to unread list for batch marking
      unreadMessageIdsRef.current.push(message._id);
      
      // Mark as read immediately since conversation is open
      if (socket && isConnected) {
        socket.emit('message:read', {
          conversationId,
          messageIds: [message._id],
        });
      }
    }
  }, [conversationId, user, socket, isConnected]);

  // Handle message status updates
  const handleMessageStatus = useCallback((data: { messageId: string; status: MessageStatus; timestamp: string }) => {
    const { messageId, status, timestamp } = data;

    setMessages(prev =>
      prev.map(msg => {
        if (msg._id === messageId) {
          const updates: Partial<Message> = { status };
          
          if (status === 'delivered') {
            updates.deliveredAt = timestamp;
          } else if (status === 'seen') {
            updates.seenAt = timestamp;
          }
          
          return { ...msg, ...updates };
        }
        return msg;
      })
    );
  }, []);

  // Handle typing indicator updates
  const handleTypingUpdate = useCallback((data: { conversationId: string; userId: string; isTyping: boolean }) => {
    // Only update if it's for this conversation and from the recipient
    if (data.conversationId === conversationId && data.userId === recipientId) {
      setIsTyping(data.isTyping);
    }
  }, [conversationId, recipientId]);

  // Handle presence updates
  const handlePresenceUpdate = useCallback((data: UserPresence) => {
    // Only update if it's for the recipient
    if (data.userId === recipientId) {
      setRecipientPresence(data);
    }
  }, [recipientId]);

  // Fetch recipient presence on mount
  useEffect(() => {
    const fetchPresence = async () => {
      try {
        const response = await chatApi.getUserPresence(recipientId);
        if (response.success && response.presence) {
          setRecipientPresence(response.presence);
        }
      } catch (err) {
        console.error('[useConversation] Error fetching presence:', err);
        // Don't show toast for presence errors - not critical
      }
    };

    if (recipientId) {
      fetchPresence();
    }
  }, [recipientId]);

  // Initial message fetch
  useEffect(() => {
    if (conversationId) {
      fetchMessages(1, false);
    }
  }, [conversationId, fetchMessages]);

  // Emit conversation:open and mark messages as read
  useEffect(() => {
    if (!socket || !isConnected || !conversationId) return;

    console.log('[useConversation] Opening conversation:', conversationId);
    
    // Emit conversation open event
    socket.emit('conversation:open', { conversationId });

    // Mark unread messages as read
    if (unreadMessageIdsRef.current.length > 0) {
      socket.emit('message:read', {
        conversationId,
        messageIds: unreadMessageIdsRef.current,
      });
      unreadMessageIdsRef.current = [];
    }

    // Cleanup: emit conversation close on unmount
    return () => {
      console.log('[useConversation] Closing conversation:', conversationId);
      socket.emit('conversation:close', { conversationId });
      stopTyping();
    };
  }, [socket, isConnected, conversationId, stopTyping]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('[useConversation] Setting up WebSocket listeners for conversation:', conversationId);

    // Listen for new messages
    socket.on('message:new', handleNewMessage);

    // Listen for message status updates
    socket.on('message:status', handleMessageStatus);

    // Listen for typing indicators
    socket.on('typing:update', handleTypingUpdate);

    // Listen for presence updates
    socket.on('presence:update', handlePresenceUpdate);

    return () => {
      console.log('[useConversation] Cleaning up WebSocket listeners');
      socket.off('message:new', handleNewMessage);
      socket.off('message:status', handleMessageStatus);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('presence:update', handlePresenceUpdate);
    };
  }, [socket, isConnected, conversationId, handleNewMessage, handleMessageStatus, handleTypingUpdate, handlePresenceUpdate]);

  // Process queued messages when reconnecting
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    // Get pending messages for this conversation
    const pendingMessages = messageQueue.getConversationMessages(conversationId)
      .filter(msg => msg.status === 'pending');

    if (pendingMessages.length === 0) return;

    console.log('[useConversation] Processing queued messages:', pendingMessages.length);

    // Process each pending message
    pendingMessages.forEach(async (queuedMsg) => {
      try {
        // Emit message via WebSocket
        socket.emit('message:send', {
          conversationId: queuedMsg.conversationId,
          content: queuedMsg.content,
          tempId: queuedMsg.tempId,
        });
      } catch (err) {
        console.error('[useConversation] Error processing queued message:', err);
        
        // Increment retry count
        const updated = messageQueue.incrementRetryCount(queuedMsg.tempId);
        
        // Update UI with new status
        setMessages(prev =>
          prev.map(msg =>
            msg._id === queuedMsg.tempId
              ? { 
                  ...msg, 
                  status: (updated?.status === 'failed' ? 'failed' : 'pending') as MessageStatus,
                  retryCount: updated?.retryCount || 0
                }
              : msg
          )
        );
        
        if (updated?.status === 'failed') {
          showToast('Some messages failed to send', 'error', 5000);
        }
      }
    });
  }, [socket, isConnected, user, conversationId, showToast]);

  // Load queued messages into UI on mount
  useEffect(() => {
    if (!conversationId || !user) return;

    const queuedMessages = messageQueue.getConversationMessages(conversationId);
    
    if (queuedMessages.length === 0) return;

    console.log('[useConversation] Loading queued messages into UI:', queuedMessages.length);

    // Convert queued messages to Message format and add to UI
    const queuedAsMessages: Message[] = queuedMessages.map(qMsg => ({
      _id: qMsg.tempId,
      conversationId: qMsg.conversationId,
      sender: user,
      content: qMsg.content,
      status: qMsg.status as MessageStatus,
      createdAt: qMsg.createdAt,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      retryCount: qMsg.retryCount,
    }));

    // Add queued messages to the end of the message list
    setMessages(prev => {
      // Filter out any duplicates
      const existingIds = new Set(prev.map(m => m._id));
      const newMessages = queuedAsMessages.filter(m => !existingIds.has(m._id));
      return [...prev, ...newMessages];
    });
  }, [conversationId, user]);

  // Cleanup typing timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    loading,
    error,
    hasMore,
    isTyping,
    recipientPresence,
    sendMessage,
    loadMore,
    startTyping,
    stopTyping,
    retryMessage,
  };
}
