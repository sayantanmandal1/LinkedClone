'use client';

import { useSocket } from '@/hooks/useSocket';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  className?: string;
  showWhenConnected?: boolean;
}

export default function ConnectionStatus({ 
  className,
  showWhenConnected = false 
}: ConnectionStatusProps) {
  const { connectionState, reconnectAttempts } = useSocket();

  // Don't show anything when connected unless explicitly requested
  if (connectionState === 'connected' && !showWhenConnected) {
    return null;
  }

  return (
    <div className={cn('px-4 py-2 text-sm font-medium', className)}>
      {connectionState === 'connected' && (
        <div className="flex items-center space-x-2 text-green-600">
          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
          <span>Connected</span>
        </div>
      )}

      {connectionState === 'reconnecting' && (
        <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 rounded-lg px-3 py-2">
          <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse" />
          <span>
            Reconnecting{reconnectAttempts > 0 && ` (attempt ${reconnectAttempts})`}...
          </span>
        </div>
      )}

      {connectionState === 'disconnected' && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <div className="w-2 h-2 bg-red-600 rounded-full" />
          <span>Disconnected - Messages will be queued</span>
        </div>
      )}
    </div>
  );
}
