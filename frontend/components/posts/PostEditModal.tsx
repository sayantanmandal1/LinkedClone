'use client';

import { useState, useRef, useEffect } from 'react';
import { Post } from '@shared/types';
import { postsApi, uploadApi } from '@/lib/api';
import Button from '@/components/ui/Button';

interface PostEditModalProps {
  post: Post;
  onClose: () => void;
  onPostUpdated: (updatedPost: Post) => void;
}

export default function PostEditModal({ post, onClose, onPostUpdated }: PostEditModalProps) {
  const [content, setContent] = useState(post.content);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(post.imageUrl || null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key and outside clicks
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      setImageFile(file);
      setRemoveCurrentImage(false);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveCurrentImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!content.trim()) {
      setError('Post content is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let imageUrl: string | undefined = post.imageUrl;

      // Handle image changes
      if (imageFile) {
        // Upload new image
        const uploadResponse = await uploadApi.uploadImage(imageFile);
        if (uploadResponse.success && uploadResponse.data) {
          imageUrl = uploadResponse.data.url;
        }
      } else if (removeCurrentImage) {
        // Remove current image
        imageUrl = undefined;
      }

      // Update post
      const response = await postsApi.updatePost(post._id, {
        content: content.trim(),
        imageUrl,
      });

      if (response.success && response.post) {
        onPostUpdated(response.post);
      } else {
        setError(response.message || 'Failed to update post');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Edit Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Content input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={4}
              maxLength={1000}
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                {content.length}/1000 characters
              </span>
            </div>
          </div>

          {/* Image section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image
            </label>
            
            {/* Current/preview image */}
            {imagePreview && !removeCurrentImage && (
              <div className="relative mb-3">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full h-auto max-h-64 rounded-lg border"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </div>
            )}

            {/* Image upload */}
            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{imagePreview ? 'Change Image' : 'Add Image'}</span>
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {/* Modal actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Post'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}