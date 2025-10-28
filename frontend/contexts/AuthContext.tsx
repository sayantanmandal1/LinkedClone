'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/lib/types';
import { authApi, tokenManager } from '@/lib/api';

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

  const refreshUser = async () => {
    try {
      // Only try to get current user if we have a token
      const token = tokenManager.getToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await authApi.getCurrentUser();
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        // If the token is invalid, remove it
        tokenManager.removeToken();
        setUser(null);
      }
    } catch (error) {
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
      if (response.success && response.user && response.token) {
        // Store the JWT token
        tokenManager.setToken(response.token);
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