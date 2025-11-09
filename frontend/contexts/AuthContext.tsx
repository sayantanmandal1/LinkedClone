'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/lib/types';
import { authApi, tokenManager } from '@/lib/api';
import { debugLog, debugError, debugUser } from '@/lib/debug';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshToken = async () => {
    try {
      const response = await authApi.refreshToken();
      debugLog('TOKEN_REFRESH_RESPONSE', response);
      
      if (response.success && response.token) {
        tokenManager.setToken(response.token);
        if (response.user) {
          setUser(response.user);
        }
        return true;
      }
      return false;
    } catch (error) {
      debugError('TOKEN_REFRESH_ERROR', error);
      return false;
    }
  };

  const refreshUser = async () => {
    try {
      // Only try to get current user if we have a token
      const token = tokenManager.getToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Check if token is expired
      if (tokenManager.isTokenExpired()) {
        debugLog('TOKEN_EXPIRED', 'Token has expired, removing');
        tokenManager.removeToken();
        setUser(null);
        setLoading(false);
        return;
      }

      // Only refresh on initial load if expiring soon, not on every call
      // The interval will handle periodic refreshes
      const isInitialLoad = loading;
      if (isInitialLoad && tokenManager.isTokenExpiringSoon()) {
        debugLog('TOKEN_EXPIRING_SOON', 'Refreshing token on initial load');
        const refreshed = await refreshToken();
        if (!refreshed) {
          tokenManager.removeToken();
          setUser(null);
          setLoading(false);
          return;
        }
      }

      const response = await authApi.getCurrentUser();
      debugLog('AUTH_REFRESH_RESPONSE', response);
      
      if (response.success && response.user) {
        debugUser(response.user);
        setUser(response.user);
      } else {
        debugError('AUTH_REFRESH_FAILED', response);
        // If the token is invalid, remove it
        tokenManager.removeToken();
        setUser(null);
      }
    } catch (error) {
      debugError('AUTH_REFRESH_ERROR', error);
      // If there's an auth error, remove the token
      tokenManager.removeToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      debugLog('LOGIN_RESPONSE', response);
      
      if (response.success && response.user && response.token) {
        // Store the JWT token
        tokenManager.setToken(response.token);
        debugUser(response.user);
        setUser(response.user);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      // Re-throw to let form components handle the error
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await authApi.register({ name, email, password });
      if (response.success) {
        // Don't auto-login after registration - user should login separately
        // This follows requirement 1.4: redirect to login page after successful registration
        return;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      // Re-throw to let form components handle the error
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout error:', error);
    } finally {
      // Remove the JWT token
      tokenManager.removeToken();
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    // Set up automatic token refresh every 10 minutes
    // Only run if user is logged in
    if (!user) return;

    const refreshInterval = setInterval(() => {
      const token = tokenManager.getToken();
      if (token && tokenManager.isTokenExpiringSoon()) {
        debugLog('AUTO_TOKEN_REFRESH', 'Refreshing token');
        refreshToken();
      }
    }, 10 * 60 * 1000); // Check every 10 minutes

    return () => clearInterval(refreshInterval);
  }, [user?._id]); // Only re-run if user ID changes (login/logout)

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}