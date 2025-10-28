// UI-specific types for frontend components

export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface ModalState {
  isOpen: boolean;
  title?: string;
  content?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface InfiniteScrollState<T> {
  items: T[];
  hasMore: boolean;
  isLoading: boolean;
  error?: string;
  page: number;
}

export interface SortOption {
  value: string;
  label: string;
}

export interface FilterState {
  searchTerm: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}