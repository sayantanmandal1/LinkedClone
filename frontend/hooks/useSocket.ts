'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { tokenManager, authApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

interface UseSocketReturn {
  socket: Socket | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  reconnectAttempts: number;
  error: string | null;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'https://linkedclone.onrender.com';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff in ms

export function useSocket(): UseSocketReturn {
  const { user } = useAuth();
  const { showToast } = useToast();
  const socketRef = useRef<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAuthenticatedRef = useRef(false);
  const hasShownConnectionErrorRef = useRef(false);
  const hasShownAuthErrorRef = useRef(false);

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const attemptReconnect = () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[Socket] Max reconnection attempts reached');
      setConnectionState('disconnected');
      setError('Unable to connect to chat server. Please check your connection.');
      
      if (!hasShownConnectionErrorRef.current) {
        showToast('Unable to connect to chat server. Messages will be queued.', 'error', 7000);
        hasShownConnectionErrorRef.current = true;
      }
      return;
    }

    const delay = RECONNECT_DELAYS[reconnectAttempts] || RECONNECT_DELAYS[RECONNECT_DELAYS.length - 1];
    console.log(`[Socket] Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    setConnectionState('reconnecting');
    setError(null);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.connect();
        setReconnectAttempts(prev => prev + 1);
      }
    }, delay);
  };

  const authenticateSocket = async (socket: Socket) => {
    let token = tokenManager.getToken();
    
    if (!token) {
      console.error('[Socket] No authentication token available');
      socket.disconnect();
      return;
    }

    // Check if token is expiring soon and refresh if needed
    if (tokenManager.isTokenExpiringSoon() || tokenManager.isTokenExpired()) {
      console.log('[Socket] Token expiring soon, refreshing before authentication');
      try {
        const response = await authApi.refreshToken();
        if (response.success && response.token) {
          tokenManager.setToken(response.token);
          token = response.token;
          console.log('[Socket] Token refreshed successfully');
        } else {
          console.error('[Socket] Token refresh failed');
          socket.disconnect();
          return;
        }
      } catch (error) {
        console.error('[Socket] Token refresh error:', error);
        socket.disconnect();
        return;
      }
    }

    console.log('[Socket] Authenticating connection...');
    socket.emit('authenticate', { token });
  };

  useEffect(() => {
    // Only initialize socket if user is logged in
    if (!user) {
      // Clean up socket if user logs out
      if (socketRef.current) {
        console.log('[Socket] User logged out, disconnecting socket');
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnectionState('disconnected');
        isAuthenticatedRef.current = false;
      }
      return;
    }

    // Initialize socket connection
    if (!socketRef.current) {
      console.log('[Socket] Initializing socket connection to:', SOCKET_URL);
      
      // Don't pass expired token in initial auth
      const token = tokenManager.getToken();
      const shouldIncludeToken = token && !tokenManager.isTokenExpired();
      
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: false, // We handle reconnection manually
        auth: shouldIncludeToken ? { token } : {}
      });

      socketRef.current = socket;

      // Connection event handlers
      socket.on('connect', () => {
        console.log('[Socket] Connected successfully');
        setConnectionState('connected');
        setReconnectAttempts(0);
        setError(null);
        clearReconnectTimeout();
        
        // Reset error flags
        hasShownConnectionErrorRef.current = false;
        
        // Show reconnection success toast if we were previously disconnected
        if (reconnectAttempts > 0) {
          showToast('Reconnected to chat server', 'success', 3000);
        }
        
        // Authenticate after connection
        if (!isAuthenticatedRef.current) {
          authenticateSocket(socket);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        setConnectionState('disconnected');
        isAuthenticatedRef.current = false;

        // Attempt reconnection for certain disconnect reasons
        if (reason === 'io server disconnect') {
          // Server disconnected the socket, don't reconnect automatically
          console.log('[Socket] Server disconnected, not attempting reconnection');
          setError('Disconnected from chat server');
          showToast('Disconnected from chat server', 'warning', 5000);
        } else if (reason === 'io client disconnect') {
          // Client disconnected intentionally, don't reconnect
          console.log('[Socket] Client disconnected intentionally');
        } else {
          // Network issues or other reasons - attempt reconnection
          setError('Connection lost. Attempting to reconnect...');
          attemptReconnect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
        setConnectionState('disconnected');
        setError(`Connection error: ${error.message}`);
        
        // Show toast on first connection error
        if (reconnectAttempts === 0 && !hasShownConnectionErrorRef.current) {
          showToast('Failed to connect to chat server. Retrying...', 'error', 5000);
          hasShownConnectionErrorRef.current = true;
        }
        
        // Attempt reconnection on connection error
        attemptReconnect();
      });

      // Authentication event handlers
      socket.on('authenticated', (data) => {
        console.log('[Socket] Authentication successful:', data);
        isAuthenticatedRef.current = true;
        setReconnectAttempts(0); // Reset attempts on successful auth
      });

      socket.on('error', async (error) => {
        console.error('[Socket] Socket error:', error);
        
        // Check if it's an authentication error
        if (error.message && (error.message.includes('auth') || error.message.includes('expired'))) {
          console.error('[Socket] Authentication failed, attempting token refresh');
          isAuthenticatedRef.current = false;
          
          // Try to refresh the token
          try {
            const response = await authApi.refreshToken();
            if (response.success && response.token) {
              tokenManager.setToken(response.token);
              console.log('[Socket] Token refreshed, re-authenticating');
              authenticateSocket(socket);
              hasShownAuthErrorRef.current = false; // Reset error flag
              return;
            }
          } catch (refreshError) {
            console.error('[Socket] Token refresh failed:', refreshError);
          }
          
          // If refresh failed, disconnect
          socket.disconnect();
          setConnectionState('disconnected');
          setError('Authentication failed. Please log in again.');
          
          // Show auth error toast
          if (!hasShownAuthErrorRef.current) {
            showToast('Chat authentication failed. Please refresh the page.', 'error', 7000);
            hasShownAuthErrorRef.current = true;
          }
          
          // Don't attempt reconnection on auth failure
          setReconnectAttempts(MAX_RECONNECT_ATTEMPTS);
        } else {
          setError(`Socket error: ${error.message || 'Unknown error'}`);
        }
      });

      // Reconnection event handlers
      socket.io.on('reconnect_attempt', (attempt) => {
        console.log(`[Socket] Reconnection attempt ${attempt}`);
        setConnectionState('reconnecting');
      });

      socket.io.on('reconnect_failed', () => {
        console.error('[Socket] Reconnection failed');
        setConnectionState('disconnected');
      });
    }

    // Cleanup function
    return () => {
      clearReconnectTimeout();
      
      if (socketRef.current) {
        console.log('[Socket] Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
        isAuthenticatedRef.current = false;
      }
    };
  }, [user?._id]); // Only re-run when user ID changes (login/logout)

  return {
    socket: socketRef.current,
    connectionState,
    isConnected: connectionState === 'connected' && isAuthenticatedRef.current,
    reconnectAttempts,
    error,
  };
}
