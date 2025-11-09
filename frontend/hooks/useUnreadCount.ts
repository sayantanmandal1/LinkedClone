'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from '@/contexts/AuthContext';
import { chatApi } from '@/lib/api';

interface UseUnreadCountReturn {
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to track the total number of conversations with unread messages
 * Subscribes to Socket.io events for real-time updates
 */
export function useUnreadCount(): UseUnreadCountReturn {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calculate unread count from conversations
   */
  const calculateUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch conversations to calculate unread count
      const response = await chatApi.getConversations(1, 100); // Get first 100 conversations
      
      if (response.success && response.conversations) {
        // Count conversations with unread messages for current user
        const count = response.conversations.filter(conversation => {
          const userUnreadCount = conversation.unreadCount[user._id] || 0;
          return userUnreadCount > 0;
        }).length;
        
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('[useUnreadCount] Error calculating unread count:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load unread count';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Refresh unread count manually
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    await calculateUnreadCount();
  }, [calculateUnreadCount]);

  /**
   * Handle new message event
   * Increment unread count if message is from another user
   */
  const handleNewMessage = useCallback((data: { message: any; conversation: any }) => {
    const { message, conversation } = data;
    
    if (!user) return;
    
    // Only increment if message is from another user
    if (typeof message.sender === 'object' && message.sender._id !== user._id) {
      // Check if this conversation previously had no unread messages
      const previousUnreadCount = conversation.unreadCount?.[user._id] || 0;
      
      if (previousUnreadCount === 0) {
        // This conversation now has unread messages, increment count
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [user]);

  /**
   * Handle messages read event
   * Decrement unread count if all messages in a conversation are read
   */
  const handleMessagesRead = useCallback((data: { conversationId: string; userId: string }) => {
    const { userId } = data;
    
    if (!user || userId !== user._id) return;
    
    // Decrement unread count as this conversation no longer has unread messages
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [user]);

  /**
   * Handle unread count update event from backend
   */
  const handleUnreadUpdate = useCallback((data: { userId: string; unreadCount: number }) => {
    const { userId, unreadCount: newCount } = data;
    
    if (!user || userId !== user._id) return;
    
    setUnreadCount(newCount);
  }, [user]);

  // Initial fetch on mount
  useEffect(() => {
    if (user) {
      calculateUnreadCount();
    }
  }, [user, calculateUnreadCount]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('[useUnreadCount] Setting up WebSocket listeners');

    // Listen for new messages
    socket.on('message:new', handleNewMessage);

    // Listen for message read events
    socket.on('messages:read', handleMessagesRead);

    // Listen for unread count updates from backend
    socket.on('unread:update', handleUnreadUpdate);

    return () => {
      console.log('[useUnreadCount] Cleaning up WebSocket listeners');
      socket.off('message:new', handleNewMessage);
      socket.off('messages:read', handleMessagesRead);
      socket.off('unread:update', handleUnreadUpdate);
    };
  }, [socket, isConnected, handleNewMessage, handleMessagesRead, handleUnreadUpdate]);

  return {
    unreadCount,
    loading,
    error,
    refresh,
  };
}
