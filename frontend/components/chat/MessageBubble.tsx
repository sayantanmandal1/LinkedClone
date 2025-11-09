'use client';

import { Message } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';

interface MessageBubbleProps {
  message: Message;
  recipientOnline: boolean;
  className?: string;
  onRetry?: (tempId: string) => void;
}

export default function MessageBubble({
  message,
  recipientOnline,
  className,
  onRetry
}: MessageBubbleProps) {
  const { user } = useAuth();

  // Determine if message was sent by current user
  const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;
  const isSent = user?._id === senderId;

  // Get sender info for avatar
  const sender = typeof message.sender === 'object' ? message.sender : null;

  // Format timestamp
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      // Show time for messages within 24 hours
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInHours < 48) {
      // Show "Yesterday" for messages from yesterday
      return `Yesterday ${date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;
    } else {
      // Show date for older messages
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  // Render delivery status ticks for sent messages
  const renderDeliveryStatus = () => {
    if (!isSent) return null;

    const { status } = message;

    // Pending - message queued for sending
    if (status === 'pending') {
      return (
        <div className="flex items-center space-x-1">
          <svg
            className="w-4 h-4 text-gray-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-xs text-gray-400">Sending...</span>
        </div>
      );
    }

    // Failed - message failed to send
    if (status === 'failed') {
      return (
        <div className="flex items-center space-x-1">
          <svg
            className="w-4 h-4 text-red-500"
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
          <span className="text-xs text-red-500">Failed</span>
        </div>
      );
    }

    // Single tick - delivered but recipient offline
    if (status === 'sent') {
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    }

    // Double tick - delivered and recipient online (but not seen)
    if (status === 'delivered') {
      return (
        <div className="flex -space-x-1">
          <svg
            className={cn(
              'w-4 h-4',
              recipientOnline ? 'text-gray-600' : 'text-gray-400'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <svg
            className={cn(
              'w-4 h-4',
              recipientOnline ? 'text-gray-600' : 'text-gray-400'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
    }

    // Blue double tick - seen by recipient
    if (status === 'seen') {
      return (
        <div className="flex -space-x-1">
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className={cn(
        'flex items-start space-x-2',
        isSent ? 'flex-row-reverse space-x-reverse' : 'flex-row',
        className
      )}
    >
      {/* Avatar (only for received messages) */}
      {!isSent && sender && (
        <div className="flex-shrink-0">
          <Avatar
            name={sender.name}
            src={sender.profilePicture}
            size="sm"
          />
        </div>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          'flex flex-col max-w-[70%]',
          isSent ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2 break-words',
            isSent
              ? message.status === 'failed'
                ? 'bg-red-100 text-red-900 rounded-br-sm'
                : 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Timestamp and delivery status */}
        <div
          className={cn(
            'flex items-center space-x-2 mt-1 px-1',
            isSent ? 'flex-row-reverse space-x-reverse' : 'flex-row'
          )}
        >
          <span className="text-xs text-gray-500">
            {formatTime(message.createdAt)}
          </span>
          {renderDeliveryStatus()}
          
          {/* Retry button for failed messages */}
          {isSent && message.status === 'failed' && onRetry && (
            <button
              onClick={() => onRetry(message._id)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
