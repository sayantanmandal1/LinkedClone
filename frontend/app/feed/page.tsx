'use client';

import { useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth';
import { PostCreator } from '@/components/posts';
import { Feed } from '@/components/feed';

export default function FeedPage() {
  const { user, logout } = useAuth();
  const feedRef = useRef<{ refresh: () => void } | null>(null);

  const handlePostCreated = () => {
    // Refresh the feed when a new post is created
    if (feedRef.current?.refresh) {
      feedRef.current.refresh();
    }
  };

  return (
    <ProtectedRoute>
      <Layout user={user!} onLogout={logout}>
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          {/* Post Creator */}
          <PostCreator onPostCreated={handlePostCreated} />
          
          {/* Main Feed */}
          <Feed onPostCreated={handlePostCreated} />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}