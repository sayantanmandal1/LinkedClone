'use client';

import { useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth';
import { PostCreator } from '@/components/posts';
import { Feed } from '@/components/feed';

export default function FeedPage() {
  const { user, logout } = useAuth();
  const feedRefreshRef = useRef<(() => void) | null>(null);

  const handlePostCreated = () => {
    // Refresh the feed when a new post is created
    if (feedRefreshRef.current) {
      feedRefreshRef.current();
    }
  };

  const setFeedRefresh = (refreshFn: () => void) => {
    feedRefreshRef.current = refreshFn;
  };

  return (
    <ProtectedRoute>
      <Layout user={user!} onLogout={logout}>
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          {/* Post Creator */}
          <PostCreator onPostCreated={handlePostCreated} />
          
          {/* Main Feed */}
          <Feed onPostCreated={setFeedRefresh} />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}