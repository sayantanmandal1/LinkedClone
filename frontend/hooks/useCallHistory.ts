import { useState, useEffect, useCallback } from 'react';
import { callsApi } from '@/lib/api';
import { Call, CallType, CallStatus } from '@/lib/types';

interface UseCallHistoryOptions {
  limit?: number;
  autoLoad?: boolean;
  filters?: {
    callType?: CallType;
    status?: CallStatus;
  };
}

interface UseCallHistoryReturn {
  calls: Call[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalCount: number;
  loadCallHistory: () => Promise<void>;
  nextPage: () => void;
  prevPage: () => void;
  setFilters: (filters: { callType?: CallType; status?: CallStatus }) => void;
  refresh: () => Promise<void>;
}

export function useCallHistory(options: UseCallHistoryOptions = {}): UseCallHistoryReturn {
  const { limit = 20, autoLoad = true, filters: initialFilters = {} } = options;

  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState(initialFilters);

  const loadCallHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await callsApi.getCallHistory(page, limit, filters);

      if (response.success && response.calls) {
        setCalls(response.calls);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setTotalCount(response.pagination.totalCount);
        }
      } else {
        setError('Failed to load call history');
      }
    } catch (err) {
      console.error('Error loading call history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load call history');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    if (autoLoad) {
      loadCallHistory();
    }
  }, [autoLoad, loadCallHistory]);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(p => p + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(p => p - 1);
    }
  }, [page]);

  const refresh = useCallback(async () => {
    setPage(1);
    await loadCallHistory();
  }, [loadCallHistory]);

  return {
    calls,
    loading,
    error,
    page,
    totalPages,
    totalCount,
    loadCallHistory,
    nextPage,
    prevPage,
    setFilters,
    refresh,
  };
}
