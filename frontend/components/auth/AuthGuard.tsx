'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
}

/**
 * AuthGuard component for protecting routes based on authentication status
 * 
 * @param children - The components to render when access is allowed
 * @param requireAuth - Whether authentication is required (default: true)
 * @param redirectTo - Where to redirect if access is denied (default: /login for auth required, /feed for auth not required)
 * @param fallback - Component to show while loading or during redirect
 */
export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo,
  fallback = <AuthGuardFallback />
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Still loading, don't redirect yet
    }

    const isAuthenticated = !!user;
    const shouldRedirect = requireAuth ? !isAuthenticated : isAuthenticated;

    if (shouldRedirect) {
      const defaultRedirect = requireAuth ? '/login' : '/feed';
      router.push(redirectTo || defaultRedirect);
    }
  }, [user, loading, requireAuth, redirectTo, router]);

  // Show fallback while loading or if redirect is needed
  if (loading) {
    return <>{fallback}</>;
  }

  const isAuthenticated = !!user;
  const hasAccess = requireAuth ? isAuthenticated : !isAuthenticated;

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Default fallback component shown during loading or redirect
 */
function AuthGuardFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Higher-order component version of AuthGuard for wrapping components
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<AuthGuardProps, 'children'> = {}
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

/**
 * Convenience components for common use cases
 */
export function ProtectedRoute({ children, ...props }: Omit<AuthGuardProps, 'requireAuth'>) {
  return (
    <AuthGuard requireAuth={true} {...props}>
      {children}
    </AuthGuard>
  );
}

export function PublicOnlyRoute({ children, ...props }: Omit<AuthGuardProps, 'requireAuth'>) {
  return (
    <AuthGuard requireAuth={false} {...props}>
      {children}
    </AuthGuard>
  );
}