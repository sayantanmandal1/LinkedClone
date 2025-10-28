'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Post } from '@/lib/types';
import { usersApi } from '@/lib/api';
import PostCard from '@/components/posts/PostCard';

interface ProfileFeedProps {
  userId: string;
}

export default function ProfileFeed({ userId }: ProfileFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const POSTS_PER_PAGE = 10;

  // Load user's posts
  const loadPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1 && !append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const response = await usersApi.getUserPosts(userId, pageNum, POSTS_PER_PAGE);
      
      if (response.success && response.posts) {
        const newPosts = response.posts;
        
        if (append) {
          setPosts(prev => {
            // Remove duplicates by ID
            const existingIds = new Set(prev.map(p => p._id));
            const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p._id));
            return [...prev, ...uniqueNewPosts];
          });
        } else {
          setPosts(newPosts);
        }

        // Check if there are more posts to load
        const totalLoaded = append ? posts.length + newPosts.length : newPosts.length;
        setHasMore(response.totalCount ? totalLoaded < response.totalCount : newPosts.length === POSTS_PER_PAGE);
      } else {
        setError(response.message || 'Failed to load posts');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, posts.length]);

  // Load more posts for infinite scroll
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    const nextPage = page + 1;
    setPage(nextPage);
    await loadPosts(nextPage, true);
  }, [loadPosts, loadingMore, hasMore, page]);

  // Handle post updates
  const handlePostUpdated = useCallback(() => {
    // Refresh the feed to get updated post data
    setPage(1);
    loadPosts(1, false);
  }, [loadPosts]);

  // Handle post deletion
  const handlePostDeleted = useCallback((deletedPostId: string) => {
    setPosts(prev => prev.filter(post => post._id !== deletedPostId));
  }, []);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          loadMorePosts();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loading, loadMorePosts]);

  // Initial load when userId changes
  useEffect(() => {
    if (userId) {
      setPage(1);
      setPosts([]);
      loadPosts(1, false);
    }
  }, [userId]);

  if (loading && posts.length === 0) {
    return (
      <div className="space-y-4">
        {/* Loading skeleton */}
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">Failed to load posts</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
        <button
          onClick={() => loadPosts(1, false)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
          <p className="text-gray-600">This user hasn't shared anything yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Posts list */}
      {posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          onPostUpdated={handlePostUpdated}
          onPostDeleted={() => handlePostDeleted(post._id)}
        />
      ))}

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-4">
          {loadingMore ? (
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 text-gray-600">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Loading more posts...</span>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={loadMorePosts}
                className="px-4 py-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                Load more posts
              </button>
            </div>
          )}
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-6">
          <p className="text-gray-500">You've reached the end of this user's posts</p>
        </div>
      )}

      {/* Error message for loading more */}
      {error && posts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => loadPosts(page, true)}
            className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}