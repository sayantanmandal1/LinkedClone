'use client';

import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth';
import ConversationList from '@/components/chat/ConversationList';
import ConnectionStatus from '@/components/chat/ConnectionStatus';
import ChatErrorBoundary from '@/components/chat/ChatErrorBoundary';
import { useConversations } from '@/hooks/useConversations';
import { useRouter } from 'next/navigation';

export default function MessagesPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { conversations, loading, error } = useConversations();

  const handleSelectConversation = (conversationId: string) => {
    router.push(`/messages/${conversationId}`);
  };

  return (
    <ProtectedRoute>
      <Layout user={user!} onLogout={logout}>
        <ChatErrorBoundary>
          <div className="max-w-7xl mx-auto h-[calc(100vh-120px)]">
            <div className="bg-white rounded-lg shadow-sm h-full flex">
              {/* Conversation List - Full width on mobile, left column on desktop */}
              <div className="w-full md:w-96 md:border-r border-gray-200 flex flex-col">
                <div className="px-4 py-4 border-b border-gray-200">
                  <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
                </div>
                <ConnectionStatus />
                <div className="flex-1 overflow-y-auto">
                  <ConversationList
                    conversations={conversations}
                    onSelectConversation={handleSelectConversation}
                    loading={loading}
                    error={error}
                  />
                </div>
              </div>

            {/* Empty state for desktop - shown when no conversation selected */}
            <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
              <div className="text-center px-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-gray-400"
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
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Select a conversation
                </h2>
                <p className="text-sm text-gray-500">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          </div>
        </div>
        </ChatErrorBoundary>
      </Layout>
    </ProtectedRoute>
  );
}
