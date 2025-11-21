'use client';

import { User } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';

interface VoiceCallInterfaceProps {
  participant: User;
  duration: number;
  isMuted: boolean;
  connectionQuality: 'good' | 'fair' | 'poor' | 'unknown';
  onToggleMute: () => void;
  onEndCall: () => void;
}

export default function VoiceCallInterface({
  participant,
  duration,
  isMuted,
  connectionQuality,
  onToggleMute,
  onEndCall,
}: VoiceCallInterfaceProps) {
  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex flex-col items-center justify-center z-[9998]">
      {/* Connection quality indicator */}
      {connectionQuality !== 'unknown' && (
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-black bg-opacity-40 px-4 py-2 rounded-full shadow-lg">
          <div className="flex gap-1 items-end">
            <div
              className={`w-1.5 h-3 rounded-full transition-colors ${
                connectionQuality === 'good' || connectionQuality === 'fair' || connectionQuality === 'poor'
                  ? connectionQuality === 'poor' ? 'bg-red-400' : connectionQuality === 'fair' ? 'bg-yellow-400' : 'bg-green-400'
                  : 'bg-gray-400'
              }`}
            ></div>
            <div
              className={`w-1.5 h-4 rounded-full transition-colors ${
                connectionQuality === 'good' || connectionQuality === 'fair'
                  ? connectionQuality === 'fair' ? 'bg-yellow-400' : 'bg-green-400'
                  : 'bg-gray-400'
              }`}
            ></div>
            <div
              className={`w-1.5 h-5 rounded-full transition-colors ${
                connectionQuality === 'good' ? 'bg-green-400' : 'bg-gray-400'
              }`}
            ></div>
          </div>
          <span className={`text-white text-sm font-semibold capitalize ${
            connectionQuality === 'poor' ? 'text-red-300' : connectionQuality === 'fair' ? 'text-yellow-300' : 'text-green-300'
          }`}>
            {connectionQuality}
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col items-center justify-center flex-1">
        {/* Participant avatar with animated ring */}
        <div className="relative mb-8">
          {/* Animated ring */}
          <div className="absolute inset-0 rounded-full">
            <div className="absolute inset-0 rounded-full border-4 border-white opacity-20 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-4 border-white opacity-10 animate-ping"></div>
          </div>
          
          {/* Avatar */}
          <Avatar
            src={participant.profilePicture}
            name={participant.name}
            size="2xl"
            className="relative shadow-2xl"
          />
        </div>

        {/* Participant name */}
        <h2 className="text-white text-3xl font-semibold mb-2">
          {participant.name}
        </h2>

        {/* Call duration */}
        <div className="text-white text-xl font-mono mb-8 opacity-90">
          {formatDuration(duration)}
        </div>

        {/* Audio status indicator */}
        <div className="text-white text-sm opacity-75 mb-4">
          {isMuted ? (
            <span className="flex items-center gap-2">
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
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
              Microphone muted
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg
                className="w-5 h-5 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              Voice call active
            </span>
          )}
        </div>
      </div>

      {/* Control buttons */}
      <div className="pb-12 flex gap-6 items-center">
        {/* Mute button */}
        <button
          onClick={onToggleMute}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl ${
            isMuted
              ? 'bg-red-500 hover:bg-red-600 active:scale-95'
              : 'bg-white bg-opacity-20 hover:bg-opacity-30 active:scale-95'
          }`}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            </svg>
          ) : (
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </button>

        {/* End call button */}
        <button
          onClick={onEndCall}
          className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 focus:ring-4 focus:ring-red-500 focus:ring-opacity-50 shadow-2xl flex items-center justify-center transition-all"
          aria-label="End call"
          title="End call"
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
        </button>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
