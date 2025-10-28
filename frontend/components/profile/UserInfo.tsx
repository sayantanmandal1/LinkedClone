'use client';

import { User } from '@shared/types';

interface UserInfoProps {
  user: User;
}

export default function UserInfo({ user }: UserInfoProps) {
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

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          {/* Profile Avatar */}
          <div className="shrink-0 self-center sm:self-start">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
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