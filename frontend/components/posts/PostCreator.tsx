'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useToast } from '@/contexts/ToastContext';
import { postsApi, uploadApi } from '@/lib/api';
import { ErrorHandler } from '@/lib/errorHandler';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import clsx from 'clsx';

interface PostCreatorProps {
  onPostCreated?: () => void;
  className?: string;
}

export default function PostCreator({ onPostCreated, className }: PostCreatorProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingState, loadingActions] = useLoadingState({
    showErrorToast: false, // We'll handle errors manually for better UX
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showError('Image size must be less than 5MB');
        return;
      }

      setImageFile(file);
      loadingActions.clearError();
      
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!content.trim()) {
      showError('Post content is required');
      return;
    }

    if (!user) {
      showError('You must be logged in to create a post');
      return;
    }

    const result = await loadingActions.executeAsync(async () => {
      let imageUrl: string | undefined;

      // Upload image if selected
      if (imageFile) {
        setUploadingImage(true);
        try {
          const uploadResponse = await uploadApi.uploadImage(imageFile);
          if (uploadResponse.success && uploadResponse.data) {
            imageUrl = uploadResponse.data.url;
          }
        } catch (error) {
          throw new Error('Failed to upload image. Please try again.');
        } finally {
          setUploadingImage(false);
        }
      }

      // Create post
      const response = await postsApi.createPost({
        content: content.trim(),
        imageUrl: imageUrl,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to create post');
      }

      return response;
    }, {
      onSuccess: () => {
        // Reset form
        setContent('');
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        showSuccess('Post created successfully!');
        
        // Notify parent component
        onPostCreated?.();
      },
      onError: (error) => {
        showError(error.message || 'Failed to create post');
      },
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className={clsx('bg-white rounded-lg shadow-sm border p-3 sm:p-4', className)}>
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        {/* User info */}
        <div className="flex items-center space-x-3">
          <Avatar
            name={user.name}
            src={user.profilePicture}
            size="lg"
          />
          <div>
            <p className="font-medium text-gray-900 text-sm sm:text-base">{user.name}</p>
          </div>
        </div>

        {/* Content input */}
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base min-h-[80px] sm:min-h-[90px]"
            rows={3}
            maxLength={1000}
            disabled={loadingState.isLoading || uploadingImage}
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">
              {content.length}/1000 characters
            </span>
          </div>
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full h-auto max-h-48 sm:max-h-64 rounded-lg border"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-red-600 transition-colors touch-manipulation"
              disabled={loadingState.isLoading || uploadingImage}
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        )}

        {/* Error message */}
        {loadingState.error && (
          <div className="text-red-600 text-xs sm:text-sm bg-red-50 p-2 rounded">
            {loadingState.error}
          </div>
        )}

        {/* Loading indicator for image upload */}
        {uploadingImage && (
          <div className="text-blue-600 text-xs sm:text-sm bg-blue-50 p-2 rounded flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading image...
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={loadingState.isLoading || uploadingImage}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-primary-600 transition-colors py-2 px-2 sm:px-0 rounded-md hover:bg-gray-50 sm:hover:bg-transparent touch-manipulation"
              disabled={loadingState.isLoading || uploadingImage}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs sm:text-sm">Add Photo</span>
            </button>
          </div>

          <Button
            type="submit"
            loading={loadingState.isLoading || uploadingImage}
            disabled={!content.trim() || loadingState.isLoading || uploadingImage}
            size="sm"
            className="min-w-[80px]"
          >
            {uploadingImage ? 'Uploading...' : loadingState.isLoading ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </form>
    </div>
  );
}