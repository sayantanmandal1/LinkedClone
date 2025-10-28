'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Post, Comment } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { postsApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import Button from '@/components/ui/Button';

interface CommentSectionProps {
  post: Post;
  onCommentAdded: () => void;
}

export default function CommentSection({ post, onCommentAdded }: CommentSectionProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>(post.comments || []);

  // Sync comments when post changes
  useEffect(() => {
    setComments(post.comments || []);
  }, [post.comments]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    setError(null);

    // Optimistic update - create temporary comment
    const tempComment: Comment = {
      _id: `temp-${Date.now()}`,
      author: user,
      content: newComment.trim(),
      post: post._id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setComments(prev => [...prev, tempComment]);
    const originalComment = newComment;
    setNewComment('');

    try {
      const response = await postsApi.addComment(post._id, {
        content: originalComment,
      });

      if (response.success && response.comment) {
        // Replace temporary comment with real one
        setComments(prev => 
          prev.map(comment => 
            comment._id === tempComment._id ? response.comment! : comment
          )
        );
        onCommentAdded();
      } else {
        // Remove temporary comment on failure
        setComments(prev => prev.filter(comment => comment._id !== tempComment._id));
        setNewComment(originalComment);
        setError('Failed to add comment');
      }
    } catch (error: any) {
      // Remove temporary comment on error
      setComments(prev => prev.filter(comment => comment._id !== tempComment._id));
      setNewComment(originalComment);
      setError(error.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-gray-100 bg-gray-50">
      {/* Existing comments */}
      {comments.length > 0 && (
        <div className="px-3 sm:px-4 py-3 space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment._id} className="flex space-x-2 sm:space-x-3">
              {/* Commenter avatar */}
              <Link 
                href={`/profile/${comment.author._id}`}
                className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-600 rounded-full flex items-center justify-center shrink-0 hover:bg-primary-700 transition-colors touch-manipulation"
              >
                <span className="text-white font-medium text-xs">
                  {comment.author.name.charAt(0).toUpperCase()}
                </span>
              </Link>
              
              {/* Comment content */}
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                  <div className="flex items-center space-x-2 mb-1 flex-wrap">
                    <Link 
                      href={`/profile/${comment.author._id}`}
                      className="font-medium text-xs sm:text-sm text-gray-900 hover:text-primary-600 transition-colors"
                    >
                      {comment.author.name}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap break-all leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      {user && (
        <div className="px-3 sm:px-4 py-3 border-t border-gray-200">
          <form onSubmit={handleSubmit} className="flex space-x-2 sm:space-x-3">
            {/* User avatar */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-medium text-xs">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            
            {/* Comment input */}
            <div className="flex-1">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[36px] sm:min-h-[32px]"
                  maxLength={500}
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newComment.trim() || isSubmitting}
                  loading={isSubmitting}
                  className="min-w-[60px] text-xs sm:text-sm"
                >
                  Post
                </Button>
              </div>
              
              {/* Character count and error - only show on mobile when typing */}
              {(newComment.length > 0 || error) && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">
                    {newComment.length}/500
                  </span>
                  {/* Error message */}
                  {error && (
                    <div className="text-red-600 text-xs">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Login prompt for non-authenticated users */}
      {!user && (
        <div className="px-3 sm:px-4 py-3 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            Please log in to comment on this post.
          </p>
        </div>
      )}
    </div>
  );
}