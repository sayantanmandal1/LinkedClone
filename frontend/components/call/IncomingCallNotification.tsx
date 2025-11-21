'use client';

import { useEffect, useRef } from 'react';
import { User } from '@/lib/types';
import { CallType } from '@/contexts/CallContext';
import Avatar from '@/components/ui/Avatar';

interface IncomingCallNotificationProps {
  caller: User;
  callType: CallType;
  onAccept: () => void;
  onDecline: () => void;
  onDismiss?: () => void;
}

export default function IncomingCallNotification({
  caller,
  callType,
  onAccept,
  onDecline,
}: IncomingCallNotificationProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play ringing sound when component mounts
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.play().catch((error) => {
        console.error('[IncomingCall] Failed to play ringing sound:', error);
      });
    }

    // Cleanup: stop sound when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const handleAccept = () => {
    // Stop ringing sound
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    onAccept();
  };

  const handleDecline = () => {
    // Stop ringing sound
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    onDecline();
  };

  return (
    <>
      {/* Ringing sound */}
      <audio ref={audioRef} src="/sounds/ringing.mp3" />

      {/* Full-screen notification overlay - WhatsApp style */}
      <div
        className="fixed inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-between py-16 px-6"
        style={{ zIndex: 99999 }}
      >
        {/* Top section - Caller info */}
        <div className="flex flex-col items-center text-center flex-1 justify-center">
          {/* Caller avatar with pulsing animation */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30"></div>
            <div className="absolute inset-0 rounded-full bg-blue-400 animate-pulse opacity-20"></div>
            <Avatar
              src={caller.profilePicture}
              name={caller.name}
              size="3xl"
              className="relative ring-4 ring-blue-400 ring-opacity-50"
            />
          </div>

          {/* Caller name */}
          <h1 className="text-4xl font-bold text-white mb-3">
            {caller.name}
          </h1>

          {/* Call type indicator */}
          <div className="flex items-center gap-2 text-gray-300 mb-2">
            {callType === 'video' ? (
              <>
                <svg
                  className="w-6 h-6"
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
                <span className="text-lg font-medium">Incoming video call</span>
              </>
            ) : (
              <>
                <svg
                  className="w-6 h-6"
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
                <span className="text-lg font-medium">Incoming voice call</span>
              </>
            )}
          </div>

          {/* Ringing indicator */}
          <div className="flex items-center gap-1 mt-4">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>

        {/* Bottom section - Action buttons */}
        <div className="flex items-center justify-center gap-16 w-full max-w-md">
          {/* Decline button - Red circular button */}
          <button
            onClick={handleDecline}
            className="flex flex-col items-center gap-3 group"
            aria-label="Decline call"
          >
            <div className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center shadow-lg transition-all duration-200 group-hover:scale-110">
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
            </div>
            <span className="text-white text-sm font-medium">Decline</span>
          </button>

          {/* Accept button - Green circular button */}
          <button
            onClick={handleAccept}
            className="flex flex-col items-center gap-3 group"
            aria-label="Accept call"
          >
            <div className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 flex items-center justify-center shadow-lg transition-all duration-200 group-hover:scale-110 animate-pulse-slow">
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
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <span className="text-white text-sm font-medium">Accept</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </>
  );
}
