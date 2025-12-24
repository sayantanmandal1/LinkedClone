'use client';

import { User } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

interface CallingScreenProps {
  recipient: User;
  callType: 'voice' | 'video';
  onCancel: () => void;
}

export default function CallingScreen({
  recipient,
  callType,
  onCancel,
}: CallingScreenProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex flex-col items-center justify-center z-[9998]">
      {/* Main content */}
      <div className="flex flex-col items-center justify-center flex-1">
        {/* Recipient avatar with animated ring */}
        <div className="relative mb-8">
          {/* Animated rings */}
          <div className="absolute inset-0 rounded-full">
            <div className="absolute inset-0 rounded-full border-4 border-white opacity-20 animate-pulse"></div>
            <div className="absolute inset-[-20px] rounded-full border-4 border-white opacity-10 animate-ping"></div>
          </div>
          
          {/* Avatar - large and centered */}
          <div className="relative w-40 h-40">
            <Avatar
              src={recipient.profilePicture}
              name={recipient.name}
              size="2xl"
              className="!w-40 !h-40 shadow-2xl"
            />
          </div>
        </div>

        {/* Recipient name */}
        <h2 className="text-white text-4xl font-semibold mb-4">
          {recipient.name}
        </h2>

        {/* Calling status */}
        <div className="text-white text-xl mb-2 opacity-90 animate-pulse">
          Calling...
        </div>

        {/* Call type indicator */}
        <div className="text-white text-base opacity-75 flex items-center gap-2">
          {callType === 'video' ? (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Video Call
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              Voice Call
            </>
          )}
        </div>
      </div>

      {/* Cancel button */}
      <div className="pb-12">
        <Button
          onClick={onCancel}
          className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-2xl flex items-center justify-center"
          aria-label="Cancel call"
        >
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
            />
          </svg>
        </Button>
        <p className="text-white text-center mt-4 text-sm opacity-75">Cancel</p>
      </div>
    </div>
  );
}
