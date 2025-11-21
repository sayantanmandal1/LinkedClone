'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { uploadApi, usersApi, chatApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useCall } from '@/contexts/CallContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

interface UserInfoProps {
  user: User;
}

export default function UserInfo({ user }: UserInfoProps) {
  const { user: currentUser, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const { initiateCall, callStatus } = useCall();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);

  const isOwnProfile = currentUser?._id === user._id;

  // Format join date
  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate days since joining
  const daysSinceJoining = Math.floor(
    (new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleProfilePictureChange = async (file: File) => {
    if (!isOwnProfile) return;

    setUploading(true);
    try {
      // Upload the image
      const uploadResponse = await uploadApi.uploadImage(file);
      
      if (uploadResponse.success && uploadResponse.data) {
        // Update user profile with new image URL
        await usersApi.updateProfilePicture(uploadResponse.data.url);
        showSuccess('Profile picture updated successfully!');
        refreshUser();
      }
    } catch (error) {
      showError('Failed to update profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleMessageClick = async () => {
    if (!currentUser || isOwnProfile) return;

    setCreatingConversation(true);
    try {
      // Create or get existing conversation with this user
      const response = await chatApi.createOrGetConversation(user._id);
      
      if (response.success && response.conversation) {
        // Navigate to messages page with conversation ID
        router.push(`/messages/${response.conversation._id}`);
      } else {
        showError('Failed to open conversation');
      }
    } catch (error) {
      showError('Failed to open conversation');
    } finally {
      setCreatingConversation(false);
    }
  };

  const handleVoiceCall = async () => {
    if (!currentUser || isOwnProfile) return;
    
    try {
      await initiateCall(user._id, 'voice');
    } catch (error) {
      showError('Failed to initiate voice call');
    }
  };

  const handleVideoCall = async () => {
    if (!currentUser || isOwnProfile) return;
    
    try {
      await initiateCall(user._id, 'video');
    } catch (error) {
      showError('Failed to initiate video call');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          {/* Profile Avatar */}
          <div className="shrink-0 self-center sm:self-start">
            <Avatar
              name={user.name}
              src={user.profilePicture}
              size="xl"
              editable={isOwnProfile && !uploading}
              onImageChange={handleProfilePictureChange}
              className={uploading ? 'opacity-50' : ''}
            />
            {uploading && (
              <div className="text-xs text-center mt-2 text-gray-600">
                Uploading...
              </div>
            )}
          </div>

          {/* User Details */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="mb-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 break-all">
                {user.name}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mb-1 break-all">
                {user.email}
              </p>
              
              {/* Action Buttons - Only show if not own profile and user is logged in */}
              {!isOwnProfile && currentUser && (
                <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleMessageClick}
                    loading={creatingConversation}
                    disabled={creatingConversation || callStatus !== 'idle'}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleVoiceCall}
                    disabled={callStatus !== 'idle'}
                    title="Voice Call"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Voice
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleVideoCall}
                    disabled={callStatus !== 'idle'}
                    title="Video Call"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Video
                  </Button>
                </div>
              )}
            </div>

            {/* User Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="text-xs sm:text-sm text-gray-600 mb-1">Member since</div>
                <div className="font-semibold text-gray-900 text-sm sm:text-base">{joinDate}</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="text-xs sm:text-sm text-gray-600 mb-1">Days active</div>
                <div className="font-semibold text-gray-900 text-sm sm:text-base">
                  {daysSinceJoining === 0 ? 'Today' : `${daysSinceJoining} days`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}