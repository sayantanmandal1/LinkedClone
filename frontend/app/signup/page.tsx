import { Metadata } from 'next';
import Link from 'next/link';
import { PublicOnlyRoute } from '@/components/auth';
import SignupForm from '@/components/auth/SignupForm';

export const metadata: Metadata = {
  title: 'Sign Up - LinkedIn Clone',
  description: 'Create your LinkedIn Clone account',
};

export default function SignupPage() {
  return (
    <PublicOnlyRoute>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          <div>
            <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <Link
                href="/login"
                className="font-medium text-primary-600 hover:text-primary-500 touch-manipulation"
              >
                sign in to your existing account
              </Link>
            </p>
          </div>
          
          <div className="bg-white py-6 sm:py-8 px-4 sm:px-10 shadow rounded-lg sm:rounded-lg">
            <SignupForm />
          </div>
        </div>
      </div>
    </PublicOnlyRoute>
  );
}