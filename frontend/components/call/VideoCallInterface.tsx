'use client';

import { useEffect, useRef, useState } from 'react';
import { User } from '@/lib/types';
import Button from '@/components/ui/Button';

interface VideoCallInterfaceProps {
  participant: User;
  duration: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  connectionQuality: 'good' | 'fair' | 'poor' | 'unknown';
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onEndCall: () => void;
}

export default function VideoCallInterface({
  participant,
  duration,
  localStream,
  remoteStream,
  isMuted,
  isVideoEnabled,
  connectionQuality,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onEndCall,
}: VideoCallInterfaceProps) {
  const [isMobile, setIsMobile] = useState(false);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-[9998]">
      {/* Remote video - main view */}
      <div className="relative flex-1 w-full h-full">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Participant name overlay */}
        <div className="absolute top-6 left-6 bg-black bg-opacity-50 px-4 py-2 rounded-lg">
          <h2 className="text-white text-lg font-semibold">
            {participant.name}
          </h2>
        </div>

        {/* Call duration and connection quality */}
        <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
          {/* Call duration */}
          <div className="bg-black bg-opacity-50 px-4 py-2 rounded-lg">
            <div className="text-white text-lg font-mono">
              {formatDuration(duration)}
            </div>
          </div>

          {/* Connection quality indicator */}
          {connectionQuality !== 'unknown' && (
            <div className="flex items-center gap-2 bg-black bg-opacity-50 px-3 py-2 rounded-lg">
              <div className="flex gap-1">
                <div
                  className={`w-1 h-3 rounded-full ${
                    connectionQuality === 'good' || connectionQuality === 'fair' || connectionQuality === 'poor'
                      ? connectionQuality === 'poor' ? 'bg-red-400' : connectionQuality === 'fair' ? 'bg-yellow-400' : 'bg-green-400'
                      : 'bg-gray-400'
                  }`}
                ></div>
                <div
                  className={`w-1 h-4 rounded-full ${
                    connectionQuality === 'good' || connectionQuality === 'fair'
                      ? connectionQuality === 'fair' ? 'bg-yellow-400' : 'bg-green-400'
                      : 'bg-gray-400'
                  }`}
                ></div>
                <div
                  className={`w-1 h-5 rounded-full ${
                    connectionQuality === 'good' ? 'bg-green-400' : 'bg-gray-400'
                  }`}
                ></div>
              </div>
              <span className={`text-white text-sm font-medium capitalize ${
                connectionQuality === 'poor' ? 'text-red-300' : connectionQuality === 'fair' ? 'text-yellow-300' : 'text-green-300'
              }`}>
                {connectionQuality}
              </span>
            </div>
          )}
        </div>

        {/* Local video - picture-in-picture */}
        <div className="absolute bottom-24 right-6 w-[150px] h-[200px] rounded-lg overflow-hidden shadow-2xl border-2 border-white border-opacity-20">
          {isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3l18 18"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Control bar */}
      <div className="absolute bottom-0 left-0 right-0 pb-8 pt-4 bg-gradient-to-t from-black via-black to-transparent">
        <div className="flex justify-center items-center gap-4">
          {/* Mute button */}
          <button
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-white bg-opacity-20 hover:bg-opacity-30'
            }`}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? (
              <svg
                className="w-6 h-6 text-white"
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
                className="w-6 h-6 text-white"
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

          {/* Video toggle button */}
          <button
            onClick={onToggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
              !isVideoEnabled
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-white bg-opacity-20 hover:bg-opacity-30'
            }`}
            aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? (
              <svg
                className="w-6 h-6 text-white"
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
            ) : (
              <svg
                className="w-6 h-6 text-white"
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3l18 18"
                />
              </svg>
            )}
          </button>

          {/* Camera switch button (mobile only) */}
          {isMobile && (
            <button
              onClick={onSwitchCamera}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg bg-white bg-opacity-20 hover:bg-opacity-30"
              aria-label="Switch camera"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}

          {/* End call button */}
          <Button
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-2xl flex items-center justify-center"
            aria-label="End call"
          >
            <svg
              className="w-8 h-8 text-white"
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
        </div>
      </div>
    </div>
  );
}
