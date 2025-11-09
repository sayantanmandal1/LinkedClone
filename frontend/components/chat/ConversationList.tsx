'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Conversation, User } from '@/lib/types';
import { formatRelativeTime, cn } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export default function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  loading = false,
  error = null,
  className
}: ConversationListProps) {
  const { user } = useAuth();

  // Get the other participant in a conversation
  const getOtherParticipant = (conversation: Conversation): User | null => {
    if (!user) return null;
    return conversation.participants.find(p => p._id !== user._id) || null;
  };

  // Get unread count for current user
  const getUnreadCount = (conversation: Conversation): number => {
    if (!user) return 0;
    return conversation.unreadCount[user._id] || 0;
  };

  // Get last message sender name
  const getLastMessageSender = (conversation: Conversation): string => {
    if (!conversation.lastMessage) return '';
    
    const sender = conversation.lastMessage.sender;
    if (typeof sender === 'string') return '';
    
    if (user && sender._id === user._id) {
      return 'You';
    }
    
    return sender.name.split(' ')[0]; // First name only
  };

  // Truncate message preview
  const truncateMessage = (content: string, maxLength: number = 50): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading && conversations.length === 0) {
    return (
      <div className={cn('flex flex-col space-y-2', className)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center space-x-3 p-4 animate-pulse"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Show error state if there's an error and no conversations
  if (!loading && conversations.length === 0 && error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Failed to load conversations</h3>
        <p className="text-sm text-gray-500 text-center mb-4">{error}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.location.reload();
          }}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
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
        <h3 className="text-lg font-medium text-gray-900 mb-1">No conversations yet</h3>
        <p className="text-sm text-gray-500 text-center">
          Start a conversation by visiting a user's profile and clicking the message button
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {conversations.map((conversation) => {
        const otherParticipant = getOtherParticipant(conversation);
        const unreadCount = getUnreadCount(conversation);
        const isSelected = conversation._id === selectedConversationId;

        if (!otherParticipant) return null;

        return (
          <button
            key={conversation._id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectConversation(conversation._id);
            }}
            disabled={loading}
            className={cn(
              'flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors text-left w-full border-b border-gray-100',
              isSelected && 'bg-blue-50 hover:bg-blue-50 border-l-4 border-l-blue-600',
              loading && 'pointer-events-none opacity-50'
            )}
            aria-label={`Open conversation with ${otherParticipant.name}`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0 pointer-events-none">
              <Avatar
                name={otherParticipant.name}
                src={otherParticipant.profilePicture}
                size="lg"
              />
            </div>

            {/* Conversation info */}
            <div className="flex-1 min-w-0 pointer-events-none">
              {/* Name and timestamp */}
              <div className="flex items-baseline justify-between mb-1">
                <h3
                  className={cn(
                    'font-medium text-sm truncate',
                    unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                  )}
                >
                  {otherParticipant.name}
                </h3>
                {conversation.lastMessage && (
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {formatRelativeTime(conversation.lastMessage.createdAt)}
                  </span>
                )}
              </div>

              {/* Last message preview */}
              {conversation.lastMessage && (
                <div className="flex items-center justify-between">
                  <p
                    className={cn(
                      'text-sm truncate',
                      unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                    )}
                  >
                    {getLastMessageSender(conversation) && (
                      <span className="mr-1">
                        {getLastMessageSender(conversation)}:
                      </span>
                    )}
                    {truncateMessage(conversation.lastMessage.content)}
                  </p>
                  
                  {/* Unread badge */}
                  {unreadCount > 0 && (
                    <span className="ml-2 flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-600 rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
