import { ApiError } from './api';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  onError?: (error: Error) => void;
}

export interface FormErrorResult {
  fieldErrors: Record<string, string>;
  generalError?: string;
}

export class ErrorHandler {
  private static toastHandler: {
    showError: (message: string) => void;
    showWarning: (message: string) => void;
  } | null = null;

  static setToastHandler(handler: {
    showError: (message: string) => void;
    showWarning: (message: string) => void;
  }) {
    this.toastHandler = handler;
  }

  /**
   * Handle API errors and extract field-specific errors for forms
   */
  static handleFormError(error: unknown, options: ErrorHandlerOptions = {}): FormErrorResult {
    const { showToast = false, fallbackMessage = 'An unexpected error occurred' } = options;

    if (error instanceof ApiError) {
      const result: FormErrorResult = {
        fieldErrors: error.errors || {},
      };

      // If there are no field-specific errors, treat as general error
      if (!error.errors || Object.keys(error.errors).length === 0) {
        result.generalError = error.message;
        if (showToast && this.toastHandler) {
          this.toastHandler.showError(error.message);
        }
      } else if (showToast && this.toastHandler) {
        // Show toast for field errors if requested
        this.toastHandler.showWarning('Please check the form for errors');
      }

      return result;
    }

    // Handle network errors
    if (error instanceof Error) {
      const message = error.message.includes('fetch') 
        ? 'Network error. Please check your connection and try again.'
        : error.message || fallbackMessage;

      if (showToast && this.toastHandler) {
        this.toastHandler.showError(message);
      }

      return {
        fieldErrors: {},
        generalError: message,
      };
    }

    // Handle unknown errors
    const message = fallbackMessage;
    if (showToast && this.toastHandler) {
      this.toastHandler.showError(message);
    }

    return {
      fieldErrors: {},
      generalError: message,
    };
  }

  /**
   * Handle general application errors with toast notifications
   */
  static handleError(error: unknown, options: ErrorHandlerOptions = {}) {
    const { showToast = true, fallbackMessage = 'An unexpected error occurred', onError } = options;

    let message: string;

    if (error instanceof ApiError) {
      message = error.message;
    } else if (error instanceof Error) {
      message = error.message.includes('fetch') 
        ? 'Network error. Please check your connection and try again.'
        : error.message || fallbackMessage;
    } else {
      message = fallbackMessage;
    }

    if (showToast && this.toastHandler) {
      this.toastHandler.showError(message);
    }

    if (onError && error instanceof Error) {
      onError(error);
    }

    // Log error for debugging
    console.error('Application error:', error);

    return message;
  }

  /**
   * Handle success messages with toast notifications
   */
  static handleSuccess(message: string, showToast = true) {
    if (showToast && this.toastHandler) {
      const successHandler = (this.toastHandler as any).showSuccess;
      if (successHandler) {
        successHandler(message);
      }
    }
  }

  /**
   * Validate network connectivity and show appropriate error
   */
  static handleNetworkError(error: unknown): string {
    if (!navigator.onLine) {
      const message = 'You appear to be offline. Please check your internet connection.';
      if (this.toastHandler) {
        this.toastHandler.showError(message);
      }
      return message;
    }

    return this.handleError(error, {
      fallbackMessage: 'Network error. Please try again.',
    });
  }

  /**
   * Handle authentication errors specifically
   */
  static handleAuthError(error: unknown): string {
    if (error instanceof ApiError && error.status === 401) {
      const message = 'Your session has expired. Please log in again.';
      if (this.toastHandler) {
        this.toastHandler.showWarning(message);
      }
      return message;
    }

    return this.handleError(error, {
      fallbackMessage: 'Authentication failed. Please try again.',
    });
  }
}