'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Post } from '@/lib/types';
import { postsApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { ErrorHandler } from '@/lib/errorHandler';
import PostCard from '@/components/posts/PostCard';

import clsx from 'clsx';

interface FeedProps {
  className?: string;
  onPostCreated?: (refreshFn: () => void) => void;
}

export default function Feed({ className, onPostCreated }: FeedProps) {
  const { showError } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const POSTS_PER_PAGE = 10;
  const REFRESH_INTERVAL = 30000; // 30 seconds

  // Load posts function
  const loadPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1 && !append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const response = await postsApi.getPosts(pageNum, POSTS_PER_PAGE);
      
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
        const errorMessage = response.message || 'Failed to load posts';
        setError(errorMessage);
        if (pageNum === 1) {
          showError(errorMessage);
        }
      }
    } catch (error) {
      const errorMessage = ErrorHandler.handleError(error, {
        showToast: pageNum === 1, // Only show toast for initial load
        fallbackMessage: 'Failed to load posts',
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [posts.length]);

  // Load more posts for infinite scroll
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    const nextPage = page + 1;
    setPage(nextPage);
    await loadPosts(nextPage, true);
  }, [loadPosts, loadingMore, hasMore, page]);

  // Refresh posts (for real-time updates)
  const refreshPosts = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await loadPosts(1, false);
    setRefreshing(false);
  }, [loadPosts]);

  // Handle post updates
  const handlePostUpdated = useCallback(() => {
    // Refresh the feed to get updated post data
    refreshPosts();
  }, [refreshPosts]);

  // Handle post deletion
  const handlePostDeleted = useCallback((deletedPostId: string) => {
    setPosts(prev => prev.filter(post => post._id !== deletedPostId));
  }, []);

  // Expose refresh function to parent
  useEffect(() => {
    if (onPostCreated) {
      onPostCreated(refreshPosts);
    }
  }, [onPostCreated, refreshPosts]);

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

  // Set up periodic refresh for real-time updates
  useEffect(() => {
    const setupRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(() => {
        if (!loading && !loadingMore && !refreshing) {
          refreshPosts();
        }
        setupRefresh(); // Schedule next refresh
      }, REFRESH_INTERVAL);
    };

    setupRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [loading, loadingMore, refreshing, refreshPosts]);

  // Initial load
  useEffect(() => {
    loadPosts(1, false);
  }, []);

  // Expose refresh function to parent
  useEffect(() => {
    if (onPostCreated) {
      // This effect allows parent components to trigger refresh
      // when they know a new post was created
    }
  }, [onPostCreated]);

  if (loading && posts.length === 0) {
    return (
      <div className={clsx('space-y-3 sm:space-y-4', className)}>
        {/* Loading skeleton */}
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/3 sm:w-1/4"></div>
                <div className="h-2 sm:h-3 bg-gray-200 rounded w-1/4 sm:w-1/6"></div>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 space-y-2">
              <div className="h-3 sm:h-4 bg-gray-200 rounded"></div>
              <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className={clsx('bg-white rounded-lg shadow-sm border p-6 text-center', className)}>
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
      <div className={clsx('bg-white rounded-lg shadow-sm border p-6 text-center', className)}>
        <div className="text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
          <p className="text-gray-600">Be the first to share something with the community!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-3 sm:space-y-4', className)}>
      {/* Refresh indicator */}
      {refreshing && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center space-x-2 text-primary-600">
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xs sm:text-sm font-medium">Refreshing posts...</span>
          </div>
        </div>
      )}

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
        <div ref={loadMoreRef} className="py-3 sm:py-4">
          {loadingMore ? (
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 text-gray-600">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm">Loading more posts...</span>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={loadMorePosts}
                className="px-4 py-2 text-primary-600 hover:text-primary-700 font-medium transition-colors touch-manipulation rounded-md hover:bg-primary-50"
              >
                Load more posts
              </button>
            </div>
          )}
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-4 sm:py-6">
          <p className="text-gray-500 text-sm">You've reached the end of the feed</p>
        </div>
      )}

      {/* Error message for loading more */}
      {error && posts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-red-600 text-xs sm:text-sm">{error}</p>
          <button
            onClick={() => loadPosts(page, true)}
            className="mt-2 px-3 py-1 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors touch-manipulation"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}