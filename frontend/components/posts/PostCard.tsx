'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Post } from '@shared/types';
import { useAuth } from '@/contexts/AuthContext';
import { formatRelativeTime, cn } from '@/lib/utils';
import PostActions from '@/components/posts/PostActions';
import CommentSection from '@/components/posts/CommentSection';

interface PostCardProps {
  post: Post;
  onPostUpdated?: () => void;
  onPostDeleted?: () => void;
  className?: string;
}

export default function PostCard({ 
  post, 
  onPostUpdated, 
  onPostDeleted, 
  className 
}: PostCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [localPost, setLocalPost] = useState(post);

  const isOwner = user?._id === post.author._id;

  const handlePostUpdate = (updatedPost: Post) => {
    setLocalPost(updatedPost);
    onPostUpdated?.();
  };

  const handleLikeUpdate = (liked: boolean, likeCount: number) => {
    setLocalPost(prev => ({
      ...prev,
      likeCount,
      likes: liked 
        ? [...prev.likes.filter(id => id !== user!._id), user!._id]
        : prev.likes.filter(id => id !== user!._id)
    }));
  };

  const handleCommentAdded = () => {
    // The comment count will be updated when the post is refreshed
    // For now, we'll optimistically increment the count
    setLocalPost(prev => ({
      ...prev,
      commentCount: prev.commentCount + 1
    }));
    onPostUpdated?.();
  };

  return (
    <article className={cn('bg-white rounded-lg shadow-sm border', className)}>
      {/* Post header */}
      <div className="p-3 sm:p-4 pb-3">
        <div className="flex items-start space-x-3">
          {/* Author avatar */}
          <Link 
            href={`/profile/${localPost.author._id}`}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-600 rounded-full flex items-center justify-center shrink-0 hover:bg-primary-700 transition-colors touch-manipulation"
          >
            <span className="text-white font-medium text-sm sm:text-base">
              {localPost.author.name.charAt(0).toUpperCase()}
            </span>
          </Link>
          
          {/* Author info and timestamp */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <Link 
                  href={`/profile/${localPost.author._id}`}
                  className="font-medium text-gray-900 hover:text-primary-600 transition-colors truncate block text-sm sm:text-base"
                >
                  {localPost.author.name}
                </Link>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {formatRelativeTime(localPost.createdAt)}
                  {localPost.updatedAt !== localPost.createdAt && (
                    <span className="ml-1">(edited)</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Post content */}
      <div className="px-3 sm:px-4 pb-3">
        <p className="text-gray-900 whitespace-pre-wrap break-all text-sm sm:text-base leading-relaxed">
          {localPost.content}
        </p>
      </div>

      {/* Post image */}
      {localPost.imageUrl && (
        <div className="px-3 sm:px-4 pb-3">
          <img
            src={localPost.imageUrl}
            alt="Post image"
            className="w-full max-h-64 sm:max-h-96 object-cover rounded-lg border cursor-pointer hover:opacity-95 transition-opacity"
            loading="lazy"
            onClick={() => {
              // Open image in new tab on click for better mobile viewing
              window.open(localPost.imageUrl, '_blank');
            }}
          />
        </div>
      )}

      {/* Engagement stats */}
      {(localPost.likeCount > 0 || localPost.commentCount > 0) && (
        <div className="px-3 sm:px-4 pb-2">
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {localPost.likeCount > 0 && (
                <span>
                  {localPost.likeCount} {localPost.likeCount === 1 ? 'like' : 'likes'}
                </span>
              )}
            </div>
            {localPost.commentCount > 0 && (
              <button
                onClick={() => setShowComments(!showComments)}
                className="hover:text-primary-600 transition-colors touch-manipulation py-1"
              >
                {localPost.commentCount} {localPost.commentCount === 1 ? 'comment' : 'comments'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Post actions */}
      <PostActions
        post={localPost}
        isOwner={isOwner}
        showComments={showComments}
        onToggleComments={() => setShowComments(!showComments)}
        onLikeUpdate={handleLikeUpdate}
        onPostUpdate={handlePostUpdate}
        onPostDelete={onPostDeleted}
      />

      {/* Comments section */}
      {showComments && (
        <CommentSection
          post={localPost}
          onCommentAdded={handleCommentAdded}
        />
      )}
    </article>
  );
}