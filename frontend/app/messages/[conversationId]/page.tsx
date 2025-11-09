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
    router.push(`/messages/${newConversationId}`);
    setShowList(false); // Close list on mobile after selection
  };

  const handleBackToList = () => {
    router.push('/messages');
  };

  // Find the current conversation and extract recipient
  useEffect(() => {
    if (!conversationId || !user || conversations.length === 0) {
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
        // Mark conversation as read when opened
        markConversationAsRead(conversationId);
      }
    }
  }, [conversationId, conversations, user, markConversationAsRead]);

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

  // Show error if conversation not found
  if (!loading && conversationId && !recipient) {
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
                onClick={handleBackToList}
                className="text-blue-600 hover:text-blue-700 font-medium"
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
        <ChatErrorBoundary>
          <div className="max-w-7xl mx-auto h-[calc(100vh-120px)]">
            <div className="bg-white rounded-lg shadow-sm h-full flex">
            {/* Conversation List - Hidden on mobile when chat is open */}
            <div className={`
              ${showList ? 'block' : 'hidden'} 
              md:block 
              w-full md:w-96 md:border-r border-gray-200 flex flex-col
              absolute md:relative inset-0 md:inset-auto z-10 md:z-auto
              bg-white
            `}>
              <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
                <button
                  onClick={() => setShowList(false)}
                  className="md:hidden text-gray-500 hover:text-gray-700"
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

            {/* Chat Window - Full width on mobile, right column on desktop */}
            <div className="flex-1 flex flex-col relative">
              {recipient ? (
                <>
                  {/* Mobile back button */}
                  <button
                    onClick={() => setShowList(true)}
                    className="md:hidden absolute top-4 left-4 z-20 bg-white rounded-full p-2 shadow-md hover:bg-gray-50"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <ChatWindow
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
