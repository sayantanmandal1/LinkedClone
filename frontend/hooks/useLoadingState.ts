import { useState, useCallback } from 'react';
import { ErrorHandler } from '@/lib/errorHandler';

interface UseLoadingStateOptions {
  showErrorToast?: boolean;
  onError?: (error: Error) => void;
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

interface LoadingActions {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  executeAsync: <T>(
    asyncFn: () => Promise<T>,
    options?: { onSuccess?: (result: T) => void; onError?: (error: Error) => void }
  ) => Promise<T | null>;
}

export function useLoadingState(options: UseLoadingStateOptions = {}): [LoadingState, LoadingActions] {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showErrorToast = true, onError: globalOnError } = options;

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (loading) {
      setError(null); // Clear error when starting new operation
    }
  }, []);

  const setErrorState = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: { onSuccess?: (result: T) => void; onError?: (error: Error) => void } = {}
  ): Promise<T | null> => {
    const { onSuccess, onError: localOnError } = options;

    setLoading(true);
    
    try {
      const result = await asyncFn();
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      const errorMessage = ErrorHandler.handleError(err, {
        showToast: showErrorToast,
        onError: localOnError || globalOnError,
      });
      
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, showErrorToast, globalOnError]);

  return [
    { isLoading, error },
    { setLoading, setError: setErrorState, clearError, executeAsync }
  ];
}