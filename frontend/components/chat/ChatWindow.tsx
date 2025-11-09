'use client';

import { useEffect, useRef, useState } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { useSocket } from '@/hooks/useSocket';
import { useCall } from '@/contexts/CallContext';
import { User } from '@/lib/types';
import { formatRelativeTime, cn } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import MessageBubble from './MessageBubble';
import ConnectionStatus from './ConnectionStatus';
import ChatErrorBoundary from './ChatErrorBoundary';

interface ChatWindowProps {
  conversationId: string;
  recipient: User;
  className?: string;
}

export default function ChatWindow({
  conversationId,
  recipient,
  className
}: ChatWindowProps) {
  const { connectionState } = useSocket();
  const { initiateCall, callStatus } = useCall();
  const {
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
  } = useConversation({
    conversationId,
    recipientId: recipient._id,
  });

  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const isLoadingMoreRef = useRef(false);

  // Check if user is on a call
  const isOnCall = callStatus !== 'idle';

  // Format online status
  const getOnlineStatus = (): string => {
    if (!recipientPresence) return 'Offline';
    
    if (recipientPresence.isOnline) {
      return 'Online';
    }
    
    if (recipientPresence.lastOnline) {
      return `Last seen ${formatRelativeTime(recipientPresence.lastOnline)}`;
    }
    
    return 'Offline';
  };

  // Auto-scroll to bottom when new messages arrive or sent
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Handle infinite scroll - load more messages when scrolling up
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingMoreRef.current || !hasMore) return;

    // Check if user scrolled to top (within 100px)
    if (container.scrollTop < 100) {
      isLoadingMoreRef.current = true;
      previousScrollHeightRef.current = container.scrollHeight;
      
      loadMore().finally(() => {
        isLoadingMoreRef.current = false;
        
        // Maintain scroll position after loading more messages
        if (container) {
          const newScrollHeight = container.scrollHeight;
          const scrollDiff = newScrollHeight - previousScrollHeightRef.current;
          container.scrollTop = scrollDiff;
        }
      });
    }
  };

  // Handle message input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    // Trigger typing indicator when user is typing
    if (value.trim()) {
      startTyping();
    }
  };

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const content = messageInput.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setMessageInput('');
    setSendError(null);
    stopTyping();

    try {
      await sendMessage(content);
      // Scroll to bottom after sending
      setTimeout(() => scrollToBottom('smooth'), 100);
    } catch (err) {
      console.error('[ChatWindow] Error sending message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setSendError(errorMessage);
      // Restore message input on error
      setMessageInput(content);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key to send (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Handle voice call button click
  const handleVoiceCall = async () => {
    if (isOnCall) return;
    try {
      await initiateCall(recipient._id, 'voice');
    } catch (error) {
      console.error('[ChatWindow] Failed to initiate voice call:', error);
    }
  };

  // Handle video call button click
  const handleVideoCall = async () => {
    if (isOnCall) return;
    try {
      await initiateCall(recipient._id, 'video');
    } catch (error) {
      console.error('[ChatWindow] Failed to initiate video call:', error);
    }
  };

  // Scroll to bottom on initial load and when new messages arrive
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Use instant scroll for initial load
      scrollToBottom('instant');
    }
  }, [loading]);

  // Scroll to bottom when new messages arrive (smooth scroll)
  useEffect(() => {
    if (messages.length > 0 && !isLoadingMoreRef.current) {
      const container = messagesContainerRef.current;
      if (container) {
        // Only auto-scroll if user is near bottom (within 200px)
        const isNearBottom = 
          container.scrollHeight - container.scrollTop - container.clientHeight < 200;
        
        if (isNearBottom) {
          scrollToBottom('smooth');
        }
      }
    }
  }, [messages]);

  return (
    <ChatErrorBoundary>
      <div className={cn('flex flex-col h-full bg-white', className)}>
        {/* Header */}
        <div className="flex items-center space-x-3 px-4 py-3 border-b border-gray-200 bg-white">
          <Avatar
            name={recipient.name}
            src={recipient.profilePicture}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <button
              onClick={() => {
                window.location.href = `/profile/${recipient._id}`;
              }}
              className="text-left hover:underline focus:outline-none focus:underline"
            >
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {recipient.name}
              </h2>
            </button>
            <p className={cn(
              'text-sm',
              recipientPresence?.isOnline ? 'text-green-600' : 'text-gray-500'
            )}>
              {getOnlineStatus()}
            </p>
          </div>
          
          {/* Call Buttons */}
          <div className="flex items-center space-x-2">
            {/* Voice Call Button */}
            <button
              onClick={handleVoiceCall}
              disabled={isOnCall}
              className={cn(
                'p-2 rounded-full transition-colors',
                isOnCall
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              )}
              title={isOnCall ? 'Already on a call' : 'Voice call'}
              aria-label="Voice call"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </button>

            {/* Video Call Button */}
            <button
              onClick={handleVideoCall}
              disabled={isOnCall}
              className={cn(
                'p-2 rounded-full transition-colors',
                isOnCall
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              )}
              title={isOnCall ? 'Already on a call' : 'Video call'}
              aria-label="Video call"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Connection Status */}
        {connectionState !== 'connected' && (
          <ConnectionStatus />
        )}

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {/* Loading indicator for initial load */}
        {loading && messages.length === 0 && (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {/* Load more indicator */}
        {hasMore && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <button
              onClick={() => {
                if (!isLoadingMoreRef.current) {
                  isLoadingMoreRef.current = true;
                  previousScrollHeightRef.current = messagesContainerRef.current?.scrollHeight || 0;
                  loadMore().finally(() => {
                    isLoadingMoreRef.current = false;
                  });
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Load older messages
            </button>
          </div>
        )}

        {/* Error message for loading messages */}
        {error && (
          <div className="flex justify-center px-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2 max-w-md">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium">Failed to load messages</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="text-red-700 hover:text-red-800 text-xs font-medium underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-gray-500">
              No messages yet. Start the conversation!
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <MessageBubble
            key={message._id}
            message={message}
            recipientOnline={recipientPresence?.isOnline || false}
            onRetry={retryMessage}
          />
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start space-x-2">
            <Avatar
              name={recipient.name}
              src={recipient.profilePicture}
              size="sm"
            />
            <div className="bg-gray-100 rounded-2xl px-4 py-2">
              <p className="text-sm text-gray-600 italic">
                {recipient.name.split(' ')[0]} is typing...
              </p>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        {/* Send error message */}
        {sendError && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{sendError}</span>
            </div>
            <button
              onClick={() => setSendError(null)}
              className="text-red-700 hover:text-red-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <textarea
            value={messageInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={connectionState === 'connected' ? 'Type a message...' : 'Type a message (will send when online)...'}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 min-h-[44px]"
            style={{
              height: 'auto',
              minHeight: '44px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />
          <Button
            type="submit"
            disabled={!messageInput.trim() || isSending}
            loading={isSending}
            className="flex-shrink-0"
            title={connectionState !== 'connected' ? 'Message will be queued and sent when online' : 'Send message'}
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
          {connectionState !== 'connected' && ' • Messages will be queued'}
        </p>
      </div>
    </div>
    </ChatErrorBoundary>
  );
}
