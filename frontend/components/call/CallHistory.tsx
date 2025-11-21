'use client';

import { Call, CallType, CallStatus } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useCallHistory } from '@/hooks/useCallHistory';
import { useCall } from '@/contexts/CallContext';
import Avatar from '@/components/ui/Avatar';

interface CallHistoryProps {
  limit?: number;
  showFilters?: boolean;
}

export default function CallHistory({ limit = 20, showFilters = true }: CallHistoryProps) {
  const { user } = useAuth();
  const { initiateCall } = useCall();
  const {
    calls,
    loading,
    error,
    page,
    totalPages,
    setFilters,
    nextPage,
    prevPage,
    loadCallHistory,
  } = useCallHistory({ limit, autoLoad: true });

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatCallTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCallStatusIcon = (call: Call) => {
    const isCaller = call.caller._id === user?._id;
    const isIncoming = !isCaller;

    if (call.status === 'missed' && isIncoming) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
      );
    }

    if (call.status === 'declined') {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
      );
    }

    if (isCaller) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
      </svg>
    );
  };

  const getCallTypeIcon = (callType: CallType) => {
    if (callType === 'video') {
      return (
        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
      </svg>
    );
  };

  const getCallStatusText = (call: Call): string => {
    const isCaller = call.caller._id === user?._id;
    
    switch (call.status) {
      case 'connected':
      case 'ended':
        return formatDuration(call.duration);
      case 'missed':
        return isCaller ? 'No answer' : 'Missed';
      case 'declined':
        return 'Declined';
      default:
        return call.status;
    }
  };

  const getOtherParticipant = (call: Call) => {
    return call.caller._id === user?._id ? call.recipient : call.caller;
  };

  const handleCallBack = (call: Call, callType: CallType) => {
    const otherParticipant = getOtherParticipant(call);
    initiateCall(otherParticipant._id, callType);
  };

  if (loading && calls.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadCallHistory}
          className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
        </div>
        <p className="text-gray-500">No call history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showFilters && (
        <div className="flex gap-2 px-4 py-2 border-b border-gray-200">
          <select
            onChange={(e) => setFilters({ callType: e.target.value as CallType || undefined })}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="">All types</option>
            <option value="voice">Voice</option>
            <option value="video">Video</option>
          </select>
          <select
            onChange={(e) => setFilters({ status: e.target.value as CallStatus || undefined })}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="">All status</option>
            <option value="connected">Connected</option>
            <option value="missed">Missed</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {calls.map((call) => {
          const otherParticipant = getOtherParticipant(call);
          return (
            <div
              key={call._id}
              className="px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={otherParticipant.profilePicture}
                  alt={otherParticipant.name}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getCallStatusIcon(call)}
                    <p className="font-medium text-gray-900 truncate">
                      {otherParticipant.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {getCallTypeIcon(call.callType)}
                    <span>{getCallStatusText(call)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-400">
                    {formatCallTime(call.createdAt)}
                  </div>
                  {/* Call back buttons */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleCallBack(call, 'voice')}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                      title="Voice call"
                      aria-label="Voice call"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleCallBack(call, 'video')}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Video call"
                      aria-label="Video call"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 px-4 py-3 border-t border-gray-200">
          <button
            onClick={prevPage}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={nextPage}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
