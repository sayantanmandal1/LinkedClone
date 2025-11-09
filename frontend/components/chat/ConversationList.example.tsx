/**
 * Example usage of ConversationList component
 * This file demonstrates how to integrate the ConversationList component
 * with the useConversations hook for real-time chat functionality.
 */

'use client';

import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import ConversationList from './ConversationList';

export default function ConversationListExample() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const { conversations, loading, error } = useConversations();

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    // Navigate to chat window or open modal
    console.log('Selected conversation:', conversationId);
  };

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading conversations: {error}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm border">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
      </div>
      
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        loading={loading}
      />
    </div>
  );
}
