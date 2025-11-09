'use client';

import Layout from '@/components/layout/Layout';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to feed
  useEffect(() => {
    if (!loading && user) {
      router.push('/feed');
    }
  }, [user, loading, router]);

  return (
    <Layout user={user} onLogout={logout}>
      <div className="text-center py-8 sm:py-12 px-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
          Welcome to VibeNet
        </h1>
        <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
          Connect with professionals, share your thoughts, and build your network.
          This is a social media platform similar to LinkedIn.
        </p>
        
        {!user && (
          <div className="space-y-3 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center max-w-sm sm:max-w-none mx-auto">
            <Link
              href="/signup"
              className="block sm:inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors touch-manipulation"
            >
              Get Started 
            </Link>
            <Link
              href="/login"
              className="block sm:inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors touch-manipulation"
            >
              Sign In
            </Link>
          </div>
        )}

        {user && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              Welcome back, {user.name}!
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              Ready to connect and share with your network?
            </p>
            <Link
              href="/feed"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors touch-manipulation"
            >
              Go to Feed
            </Link>
          </div>
        )}

        <div className="mt-12 sm:mt-16 grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-3 max-w-4xl mx-auto">
          <div className="text-center px-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white mx-auto mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Connect</h3>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
              Build your professional network and connect with like-minded individuals.
            </p>
          </div>

          <div className="text-center px-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white mx-auto mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Share</h3>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
              Share your thoughts, experiences, and insights with your network.
            </p>
          </div>

          <div className="text-center px-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white mx-auto mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Grow</h3>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
              Expand your professional opportunities and advance your career.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
