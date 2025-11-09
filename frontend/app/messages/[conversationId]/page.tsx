'use client';

import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import ChatErrorBoundary from '@/components/chat/ChatErrorBoundary';
import { useConversations } from '@/hooks/useConversations';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User } from '@/lib/types';

export default function ConversationPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const conversationId = params?.conversationId as string;
  
  const { conversations, loading, error, markConversationAsRead } = useConversations();
  const [recipient, setRecipient] = useState<User | null>(null);
  const [showList, setShowList] = useState(false);

  const handleSelectConversation = (newConversationId: string) => {
    // Prevent navigation if already on the same conversation
    if (newConversationId === conversationId) {
      setShowList(false);
      return;
    }
    
    // Close list immediately for better UX
    setShowList(false);
    
    // Navigate without blocking
    try {
      router.push(`/messages/${newConversationId}`);
    } catch (err) {
      console.error('[ConversationPage] Navigation error:', err);
      // Fallback to direct navigation if router fails
      window.location.href = `/messages/${newConversationId}`;
    }
  };

  const handleBackToList = () => {
    try {
      router.push('/messages');
    } catch (err) {
      console.error('[ConversationPage] Navigation error:', err);
      window.location.href = '/messages';
    }
  };

  // Find the current conversation and extract recipient
  useEffect(() => {
    if (!conversationId || !user) {
      setRecipient(null);
      return;
    }

    // Allow navigation even if conversations haven't loaded yet
    if (conversations.length === 0 && !loading) {
      setRecipient(null);
      return;
    }

    const conversation = conversations.find(c => c._id === conversationId);
    
    if (conversation) {
      // Find the other participant (not the current user)
      const otherParticipant = conversation.participants.find(
        p => p._id !== user._id
      );
      
      if (otherParticipant) {
        setRecipient(otherParticipant);
        // Mark conversation as read when opened (non-blocking)
        setTimeout(() => {
          try {
            markConversationAsRead(conversationId);
          } catch (err) {
            console.error('[ConversationPage] Error marking as read:', err);
          }
        }, 0);
      }
    }
  }, [conversationId, conversations, user, loading]);

  // Show loading state while fetching conversations
  if (loading && conversations.length === 0) {
    return (
      <ProtectedRoute>
        <Layout user={user!} onLogout={logout}>
          <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  // Show error if conversation not found (but only after loading completes)
  if (!loading && conversationId && !recipient && conversations.length > 0) {
    return (
      <ProtectedRoute>
        <Layout user={user!} onLogout={logout}>
          <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Conversation not found
              </h2>
              <p className="text-gray-500 mb-4">
                This conversation may have been deleted or you don't have access to it.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBackToList();
                }}
                className="text-blue-600 hover:text-blue-700 font-medium px-4 py-2 rounded hover:bg-blue-50 transition-colors"
              >
                Back to messages
              </button>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout user={user!} onLogout={logout}>
        <ChatErrorBoundary
          onError={(error, errorInfo) => {
            console.error('[ConversationPage] Error caught:', error, errorInfo);
            // Don't block navigation on error
          }}
        >
          <div className="max-w-7xl mx-auto h-[calc(100vh-120px)]">
            <div className="bg-white rounded-lg shadow-sm h-full flex relative">
            {/* Conversation List - Hidden on mobile when chat is open */}
            {(showList || typeof window !== 'undefined' && window.innerWidth >= 768) && (
              <div className={`
                w-full md:w-96 md:border-r border-gray-200 flex flex-col
                ${showList ? 'absolute md:relative' : 'relative'} inset-0 md:inset-auto z-10 md:z-auto
                bg-white
              `}>
              <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowList(false);
                  }}
                  className="md:hidden text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors"
                  aria-label="Close conversation list"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ConversationList
                  conversations={conversations}
                  selectedConversationId={conversationId}
                  onSelectConversation={handleSelectConversation}
                  loading={loading}
                  error={error}
                />
              </div>
              </div>
            )}

            {/* Chat Window - Full width on mobile, right column on desktop */}
            <div className="flex-1 flex flex-col relative">
              {recipient ? (
                <>
                  {/* Mobile back button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowList(true);
                    }}
                    className="md:hidden absolute top-4 left-4 z-20 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors"
                    aria-label="Show conversation list"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <ChatWindow
                    key={conversationId}
                    conversationId={conversationId}
                    recipient={recipient}
                    className="h-full"
                  />
                </>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
              )}
            </div>
          </div>
        </div>
        </ChatErrorBoundary>
      </Layout>
    </ProtectedRoute>
  );
}
