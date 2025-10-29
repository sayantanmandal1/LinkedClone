'use client';

import { useState } from 'react';
import { Post } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { postsApi } from '@/lib/api';
import { ErrorHandler } from '@/lib/errorHandler';
import { cn } from '@/lib/utils';
import PostEditModal from '@/components/posts/PostEditModal';

interface PostActionsProps {
  post: Post;
  isOwner: boolean;
  showComments: boolean;
  onToggleComments: () => void;
  onLikeUpdate: (liked: boolean, likeCount: number) => void;
  onPostUpdate: (updatedPost: Post) => void;
  onPostDelete?: () => void;
}

export default function PostActions({
  post,
  isOwner,
  showComments,
  onToggleComments,
  onLikeUpdate,
  onPostUpdate,
  onPostDelete,
}: PostActionsProps) {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isLiked = user ? (post.likes || []).includes(user._id) : false;

  const handleLike = async () => {
    if (!user || isLiking) return;

    setIsLiking(true);

    // Optimistic update
    const wasLiked = isLiked;
    const currentLikeCount = post.likeCount || (post.likes || []).length;
    const newLikeCount = wasLiked ? currentLikeCount - 1 : currentLikeCount + 1;
    onLikeUpdate(!wasLiked, newLikeCount);

    try {
      const response = await postsApi.likePost(post._id);
      if (response.success) {
        // Update with actual server response
        onLikeUpdate(response.liked || false, response.likeCount || 0);
      } else {
        // Revert optimistic update on failure
        onLikeUpdate(wasLiked, post.likeCount || (post.likes || []).length);
        showError('Failed to update like');
      }
    } catch (error) {
      // Revert optimistic update on error
      onLikeUpdate(wasLiked, post.likeCount || (post.likes || []).length);
      ErrorHandler.handleError(error, {
        fallbackMessage: 'Failed to update like',
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner || isDeleting) return;

    const confirmed = window.confirm('Are you sure you want to delete this post?');
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const response = await postsApi.deletePost(post._id);
      if (response.success) {
        showSuccess('Post deleted successfully');
        onPostDelete?.();
      } else {
        showError('Failed to delete post');
      }
    } catch (error) {
      ErrorHandler.handleError(error, {
        fallbackMessage: 'Failed to delete post',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handlePostUpdated = (updatedPost: Post) => {
    onPostUpdate(updatedPost);
    setShowEditModal(false);
  };

  return (
    <>
      {/* Action buttons */}
      <div className="border-t border-gray-200">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2">
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Like button */}
            <button
              onClick={handleLike}
              disabled={!user || isLiking}
              className={cn(
                'flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[44px] sm:min-h-[36px]',
                isLiked
                  ? 'text-primary-600 bg-primary-50 hover:bg-primary-100'
                  : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50',
                (!user || isLiking) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <svg
                className={cn('w-4 h-4 sm:w-5 sm:h-5', isLiked && 'fill-current')}
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span className="hidden sm:inline">{isLiked ? 'Liked' : 'Like'}</span>
            </button>

            {/* Comment button */}
            <button
              onClick={onToggleComments}
              disabled={!user}
              className={cn(
                'flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[44px] sm:min-h-[36px]',
                showComments
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50',
                !user && 'opacity-50 cursor-not-allowed'
              )}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="hidden sm:inline">Comment</span>
            </button>
          </div>

          {/* Owner actions */}
          {isOwner && (
            <div className="flex items-center space-x-1">
              <button
                onClick={handleEdit}
                className="flex items-center space-x-1 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px] sm:min-h-[36px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span className="hidden sm:inline">Edit</span>
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center space-x-1 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 touch-manipulation min-h-[44px] sm:min-h-[36px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span className="hidden sm:inline">{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          )}
        </div>


      </div>

      {/* Edit modal */}
      {showEditModal && (
        <PostEditModal
          post={post}
          onClose={() => setShowEditModal(false)}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </>
  );
}