'use client';

import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';

export default function ToastContainer() {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto rounded-lg shadow-lg p-4 flex items-start space-x-3 animate-slide-in',
            toast.type === 'success' && 'bg-green-50 border border-green-200',
            toast.type === 'error' && 'bg-red-50 border border-red-200',
            toast.type === 'warning' && 'bg-yellow-50 border border-yellow-200',
            toast.type === 'info' && 'bg-blue-50 border border-blue-200'
          )}
        >
          {/* Icon */}
          <div className="flex-shrink-0">
            {toast.type === 'success' && (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium',
              toast.type === 'success' && 'text-green-800',
              toast.type === 'error' && 'text-red-800',
              toast.type === 'warning' && 'text-yellow-800',
              toast.type === 'info' && 'text-blue-800'
            )}>
              {toast.message}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={() => hideToast(toast.id)}
            className={cn(
              'flex-shrink-0 rounded-md p-1 hover:bg-opacity-20 focus:outline-none',
              toast.type === 'success' && 'text-green-600 hover:bg-green-600',
              toast.type === 'error' && 'text-red-600 hover:bg-red-600',
              toast.type === 'warning' && 'text-yellow-600 hover:bg-yellow-600',
              toast.type === 'info' && 'text-blue-600 hover:bg-blue-600'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
