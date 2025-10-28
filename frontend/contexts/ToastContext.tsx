'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ToastNotification } from '@shared/types/ui';

interface ToastContextType {
    toasts: ToastNotification[];
    addToast: (toast: Omit<ToastNotification, 'id'>) => void;
    removeToast: (id: string) => void;
    showSuccess: (message: string, duration?: number) => void;
    showError: (message: string, duration?: number) => void;
    showWarning: (message: string, duration?: number) => void;
    showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

interface ToastProviderProps {
    children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<ToastNotification[]>([]);

    const addToast = useCallback((toast: Omit<ToastNotification, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: ToastNotification = {
            ...toast,
            id,
            duration: toast.duration ?? 5000,
        };

        setToasts(prev => [...prev, newToast]);

        // Auto-remove toast after duration
        if (newToast.duration && newToast.duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, newToast.duration);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const showSuccess = useCallback((message: string, duration?: number) => {
        addToast({ type: 'success', message, duration });
    }, [addToast]);

    const showError = useCallback((message: string, duration?: number) => {
        addToast({ type: 'error', message, duration: duration ?? 7000 });
    }, [addToast]);

    const showWarning = useCallback((message: string, duration?: number) => {
        addToast({ type: 'warning', message, duration });
    }, [addToast]);

    const showInfo = useCallback((message: string, duration?: number) => {
        addToast({ type: 'info', message, duration });
    }, [addToast]);

    const value: ToastContextType = {
        toasts,
        addToast,
        removeToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
        </ToastContext.Provider>
    );
}