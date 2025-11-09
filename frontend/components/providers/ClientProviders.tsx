'use client';

import { ReactNode, useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import { CallProvider } from '@/contexts/CallContext';
import ToastContainer from '@/components/ui/ToastContainer';
import CallManager from '@/components/call/CallManager';
import { ErrorHandler } from '@/lib/errorHandler';

interface ClientProvidersProps {
  children: ReactNode;
}

function ToastInitializer() {
  const toast = useToast();

  useEffect(() => {
    // Initialize the error handler with toast functions
    ErrorHandler.setToastHandler({
      showError: toast.showError,
      showWarning: toast.showWarning,
      showSuccess: toast.showSuccess,
    } as any);
  }, [toast]);

  return null;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CallProvider>
          <ToastInitializer />
          {children}
          <ToastContainer />
          <CallManager />
        </CallProvider>
      </AuthProvider>
    </ToastProvider>
  );
}