'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { chatApi } from '@/lib/api';
import { Conversation, Message } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  createOrOpenConversation: (otherUserId: string) => Promise<Conversation | null>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateOptimistically: (conversationId: string, content: string, tempId: string) => void;
  markConversationAsRead: (conversationId: string) => void;
}

export function useConversations(): UseConversationsReturn {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const isInitialMount = useRef(true);

  // Fetch conversations from API
  const fetchConversations = useCallback(async (pageNum: number, append = false) => {
    if (!user) return;

    try {
      if (!append) {
        setLoading(true);
      }
      setError(null);

      const response = await chatApi.getConversations(pageNum, 20);

      if (response.success && response.conversations) {
        setConversations(prev => 
          append ? [...prev, ...response.conversations!] : response.conversations!
        );
        
        if (response.pagination) {
          setHasMore(response.pagination.page < response.pagination.totalPages);
          setPage(response.pagination.page);
        }
      }
    } catch (err) {
      console.error('[useConversations] Error fetching conversations:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);
      showToast(errorMessage, 'error', 5000);
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  // Load more conversations (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchConversations(page + 1, true);
  }, [hasMore, loading, page, fetchConversations]);

  // Refresh conversations (reload from page 1)
  const refresh = useCallback(async () => {
    setPage(1);
    await fetchConversations(1, false);
  }, [fetchConversations]);

  // Create or open conversation with a user
  const createOrOpenConversation = useCallback(async (otherUserId: string): Promise<Conversation | null> => {
    try {
      setError(null);
      const response = await chatApi.createOrGetConversation(otherUserId);

      if (response.success && response.conversation) {
        const newConversation = response.conversation;

        // Check if conversation already exists in list
        setConversations(prev => {
          const existingIndex = prev.findIndex(c => c._id === newConversation._id);
          
          if (existingIndex >= 0) {
            // Move existing conversation to top
            const updated = [...prev];
            updated.splice(existingIndex, 1);
            return [newConversation, ...updated];
          } else {
            // Add new conversation to top
            return [newConversation, ...prev];
          }
        });

        return newConversation;
      }

      return null;
    } catch (err) {
      console.error('[useConversations] Error creating/opening conversation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      showToast(errorMessage, 'error', 5000);
      return null;
    }
  }, [showToast]);

  // Handle new message received via WebSocket
  const handleNewMessage = useCallback((data: { message: Message; conversation: Conversation }) => {
    const { message, conversation } = data;

    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c._id === conversation._id);
      
      // Update conversation with new last message and move to top
      const updatedConversation: Conversation = {
        ...conversation,
        lastMessage: {
          content: message.content,
          sender: message.sender,
          createdAt: message.createdAt,
        },
        updatedAt: message.createdAt,
      };

      if (existingIndex >= 0) {
        // Remove from current position and add to top
        const updated = [...prev];
        updated.splice(existingIndex, 1);
        return [updatedConversation, ...updated];
      } else {
        // Add new conversation to top
        return [updatedConversation, ...prev];
      }
    });

    // Update unread count if message is from another user
    if (user && typeof message.sender === 'object' && message.sender._id !== user._id) {
      setConversations(prev => 
        prev.map(c => {
          if (c._id === conversation._id) {
            const currentUnread = c.unreadCount[user._id] || 0;
            return {
              ...c,
              unreadCount: {
                ...c.unreadCount,
                [user._id]: currentUnread + 1,
              },
            };
          }
          return c;
        })
      );
    }
  }, [user]);

  // Handle optimistic UI update for sent messages
  const handleOptimisticMessage = useCallback((conversationId: string, content: string, _tempId: string) => {
    if (!user) return;

    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c._id === conversationId);
      
      if (existingIndex >= 0) {
        const conversation = prev[existingIndex];
        const updatedConversation: Conversation = {
          ...conversation,
          lastMessage: {
            content,
            sender: user,
            createdAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        };

        // Move to top
        const updated = [...prev];
        updated.splice(existingIndex, 1);
        return [updatedConversation, ...updated];
      }
      
      return prev;
    });
  }, [user]);

  // Handle message read updates
  const handleMessagesRead = useCallback((data: { conversationId: string; userId: string }) => {
    const { conversationId, userId } = data;

    setConversations(prev =>
      prev.map(c => {
        if (c._id === conversationId) {
          return {
            ...c,
            unreadCount: {
              ...c.unreadCount,
              [userId]: 0,
            },
          };
        }
        return c;
      })
    );
  }, []);

  // Mark conversation as read (for current user)
  const markConversationAsRead = useCallback((conversationId: string) => {
    if (!user) return;

    setConversations(prev =>
      prev.map(c => {
        if (c._id === conversationId) {
          return {
            ...c,
            unreadCount: {
              ...c.unreadCount,
              [user._id]: 0,
            },
          };
        }
        return c;
      })
    );
  }, [user]);

  // Initial fetch on mount
  useEffect(() => {
    if (user && isInitialMount.current) {
      isInitialMount.current = false;
      fetchConversations(1, false);
    }
  }, [user, fetchConversations]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('[useConversations] Setting up WebSocket listeners');

    // Listen for new messages
    socket.on('message:new', handleNewMessage);

    // Listen for message read events
    socket.on('messages:read', handleMessagesRead);

    return () => {
      console.log('[useConversations] Cleaning up WebSocket listeners');
      socket.off('message:new', handleNewMessage);
      socket.off('messages:read', handleMessagesRead);
    };
  }, [socket, isConnected, handleNewMessage, handleMessagesRead]);

  return {
    conversations,
    loading,
    error,
    hasMore,
    page,
    createOrOpenConversation,
    loadMore,
    refresh,
    updateOptimistically: handleOptimisticMessage,
    markConversationAsRead,
  };
}
