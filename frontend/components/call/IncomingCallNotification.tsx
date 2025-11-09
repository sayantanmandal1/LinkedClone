'use client';

import { useEffect, useRef } from 'react';
import { User } from '@/lib/types';
import { CallType } from '@/contexts/CallContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface IncomingCallNotificationProps {
  caller: User;
  callType: CallType;
  onAccept: () => void;
  onDecline: () => void;
  onDismiss: () => void;
}

export default function IncomingCallNotification({
  caller,
  callType,
  onAccept,
  onDecline,
  onDismiss,
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

  const handleDismiss = () => {
    // Stop ringing sound
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    onDismiss();
  };

  return (
    <>
      {/* Ringing sound */}
      <audio ref={audioRef} src="/sounds/ringing.mp3" />

      {/* Notification overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        style={{ zIndex: 9999 }}
      >
        <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4 relative animate-fade-in">
          {/* Dismiss button (X) */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss notification"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Content */}
          <div className="flex flex-col items-center text-center">
            {/* Caller avatar with pulsing animation */}
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
              <Avatar
                src={caller.profilePicture}
                name={caller.name}
                size="xl"
                className="relative"
              />
            </div>

            {/* Caller name */}
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {caller.name}
            </h2>

            {/* Call type indicator */}
            <div className="flex items-center gap-2 text-gray-600 mb-6">
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
                  <span className="text-sm font-medium">Incoming video call</span>
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
                  <span className="text-sm font-medium">Incoming voice call</span>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 w-full">
              {/* Decline button */}
              <Button
                onClick={handleDecline}
                variant="outline"
                className="flex-1 bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400"
              >
                <svg
                  className="w-5 h-5 mr-2"
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
                Decline
              </Button>

              {/* Accept button */}
              <Button
                onClick={handleAccept}
                className="flex-1 bg-green-600 hover:bg-green-700 focus:ring-green-500"
              >
                <svg
                  className="w-5 h-5 mr-2"
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
                Accept
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
