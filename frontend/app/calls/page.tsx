'use client';

import { AuthGuard } from '@/components/auth';
import CallHistory from '@/components/call/CallHistory';

export default function CallsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">Call History</h1>
              <p className="mt-1 text-sm text-gray-500">
                View your recent calls and call back
              </p>
            </div>
            <CallHistory limit={50} showFilters={true} />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
