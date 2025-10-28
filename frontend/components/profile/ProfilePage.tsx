'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User } from '@/lib/types';
import { usersApi } from '@/lib/api';
import ProfileFeed from './ProfileFeed';
import UserInfo from './UserInfo';

interface ProfilePageProps {
  userId?: string;
}

export default function ProfilePage({ userId }: ProfilePageProps) {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user ID from props or URL params
  const targetUserId = userId || (params?.id as string);

  useEffect(() => {
    if (!targetUserId) {
      setError('User ID is required');
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await usersApi.getUser(targetUserId);
        
        if (response.success && response.user) {
          setUser(response.user);
        } else {
          setError('User not found');
        }
      } catch (error: any) {
        setError(error.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [targetUserId]);

  const handleBackToFeed = () => {
    router.push('/feed');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-0">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 sm:px-6 py-6 sm:py-8">
            <div className="animate-pulse">
              <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 sm:h-6 bg-gray-200 rounded w-3/4 sm:w-48"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2 sm:w-32"></div>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="h-3 sm:h-4 bg-gray-200 rounded"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-0">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 sm:px-6 py-6 sm:py-8 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-base sm:text-lg font-medium">Profile not found</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">{error}</p>
            </div>
            <button
              onClick={handleBackToFeed}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors touch-manipulation"
            >
              Back to Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Back to Feed Navigation */}
      <div className="flex items-center">
        <button
          onClick={handleBackToFeed}
          className="flex items-center text-primary-600 hover:text-primary-700 font-medium transition-colors touch-manipulation py-2 -ml-2 pl-2 pr-3 rounded-md hover:bg-primary-50"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm sm:text-base">Back to Feed</span>
        </button>
      </div>

      {/* User Information */}
      <UserInfo user={user} />

      {/* User's Posts Feed */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Posts</h2>
        </div>
        <div className="p-3 sm:p-6">
          <ProfileFeed userId={user._id} />
        </div>
      </div>
    </div>
  );
}