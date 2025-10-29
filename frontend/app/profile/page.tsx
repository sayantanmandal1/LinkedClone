'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProfilePage } from '@/components/profile';
import { debugLog, debugUser } from '@/lib/debug';

export default function CurrentUserProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    debugLog('PROFILE_PAGE_STATE', { loading, hasUser: !!user, userId: user?._id });
    debugUser(user);
    
    if (!loading && !user) {
      setRedirecting(true);
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || redirecting) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <div className="animate-pulse">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !user._id) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8 text-center">
            <p className="text-red-600">Unable to load profile. Please try logging in again.</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <ProfilePage userId={user._id} />;
}