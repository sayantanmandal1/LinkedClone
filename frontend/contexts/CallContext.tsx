'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { getWebRTCService, ConnectionQuality } from '@/lib/webrtc';
import { useToast } from '@/contexts/ToastContext';

/**
 * Get browser-specific permission instructions
 */
function getBrowserPermissionInstructions(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    return 'Chrome: Click the camera icon in the address bar, then select "Always allow" and reload the page.';
  } else if (userAgent.includes('firefox')) {
    return 'Firefox: Click the permissions icon in the address bar, remove the camera/microphone block, and reload the page.';
  } else if (userAgent.includes('safari')) {
    return 'Safari: Go to Safari > Settings > Websites > Camera/Microphone, and allow access for this site.';
  } else if (userAgent.includes('edg')) {
    return 'Edge: Click the camera icon in the address bar, then select "Always allow" and reload the page.';
  } else {
    return 'Please check your browser settings to allow camera and microphone access for this site.';
  }
}

export type CallType = 'voice' | 'video';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export interface CallState {
  callId: string | null;
  callType: CallType | null;
  callStatus: CallStatus;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  caller: User | null;
  recipient: User | null;
  error: string | null;
  callDuration: number; // in seconds
  connectionQuality: ConnectionQuality;
}

export interface CallContextValue extends CallState {
  initiateCall: (recipientId: string, callType: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { showToast } = useToast();
  
  const [callState, setCallState] = useState<CallState>({
    callId: null,
    callType: null,
    callStatus: 'idle',
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoEnabled: true,
    caller: null,
    recipient: null,
    error: null,
    callDuration: 0,
    connectionQuality: 'unknown',
  });

  const webrtcService = useRef(getWebRTCService());
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const qualityMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const currentCallRef = useRef<{ callId: string; recipientId: string } | null>(null);
  const isInitiatingRef = useRef(false);

  // Start call duration timer
  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    setCallState((prev) => ({ ...prev, callDuration: 0 }));

    callTimerRef.current = setInterval(() => {
      setCallState((prev) => ({ ...prev, callDuration: prev.callDuration + 1 }));
    }, 1000);
  }, []);

  // Stop call duration timer
  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  // Start connection quality monitoring
  const startQualityMonitoring = useCallback(() => {
    if (qualityMonitorRef.current) {
      clearInterval(qualityMonitorRef.current);
    }

    // Monitor connection quality every 2 seconds
    qualityMonitorRef.current = setInterval(async () => {
      const stats = await webrtcService.current.getConnectionStats();
      if (stats) {
        setCallState((prev) => ({ ...prev, connectionQuality: stats.quality }));
        
        // Log detailed stats for debugging
        console.log('[Call] Connection stats:', {
          quality: stats.quality,
          packetsLost: stats.packetsLost,
          jitter: stats.jitter,
          roundTripTime: stats.roundTripTime,
        });
      }
    }, 2000);
  }, []);

  // Stop connection quality monitoring
  const stopQualityMonitoring = useCallback(() => {
    if (qualityMonitorRef.current) {
      clearInterval(qualityMonitorRef.current);
      qualityMonitorRef.current = null;
    }
  }, []);

  // Start call timeout (30 seconds)
  const startCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
    }

    callTimeoutRef.current = setTimeout(() => {
      console.log('[Call] Call timeout - no answer');
      
      if (callState.callStatus === 'calling' || callState.callStatus === 'ringing') {
        showToast('No answer', 'warning', 3000);
        endCall();
        
        // Notify backend about timeout
        if (socket && callState.callId) {
          socket.emit('call:timeout', { callId: callState.callId });
        }
      }
    }, 30000); // 30 seconds
  }, [callState.callStatus, callState.callId, socket]);

  // Clear call timeout
  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  /**
   * Initiate a call to another user
   */
  const initiateCall = useCallback(async (recipientId: string, callType: CallType) => {
    if (!user) {
      showToast('You must be logged in to make calls', 'error');
      return;
    }

    if (!isConnected || !socket) {
      showToast('Not connected to server. Please check your connection.', 'error');
      return;
    }

    if (callState.callStatus !== 'idle' || isInitiatingRef.current) {
      showToast('You are already on a call', 'warning');
      return;
    }

    // Set flag to prevent duplicate calls
    isInitiatingRef.current = true;

    // Check recipient presence before initiating call
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations/users/${recipientId}/presence`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.presence && !data.presence.isOnline) {
          showToast('User is currently offline', 'warning', 4000);
          return;
        }
      }
    } catch (error) {
      console.error('[Call] Failed to check recipient presence:', error);
      // Continue with call attempt even if presence check fails
    }

    try {
      console.log('[Call] Initiating', callType, 'call to', recipientId);

      // Get local media stream
      const constraints = {
        audio: true,
        video: callType === 'video',
      };

      const localStream = await webrtcService.current.acquireLocalStream(constraints);
      
      // Create peer connection
      await webrtcService.current.createPeerConnection();

      // Set up WebRTC event handlers
      webrtcService.current.onIceCandidate((candidate) => {
        // Only send ICE candidates if we have an active call
        if (currentCallRef.current) {
          console.log('[Call] Sending ICE candidate to recipient');
          socket.emit('webrtc:ice-candidate', {
            callId: currentCallRef.current.callId,
            recipientId: currentCallRef.current.recipientId,
            candidate: candidate.toJSON(),
          });
        } else {
          console.log('[Call] Skipping ICE candidate - call not active');
        }
      });

      webrtcService.current.onTrack((remoteStream) => {
        console.log('[Call] Received remote stream');
        setCallState((prev) => ({ ...prev, remoteStream }));
      });

      webrtcService.current.onConnectionStateChange((state) => {
        console.log('[Call] Connection state:', state);
        
        if (state === 'connected') {
          console.log('[Call] Call connected successfully');
          clearCallTimeout();
          startCallTimer();
          startQualityMonitoring();
        } else if (state === 'failed') {
          console.log('[Call] Connection failed after reconnection attempts');
          showToast('Call connection failed. Please check your internet connection and try again.', 'error', 5000);
          endCall();
        } else if (state === 'disconnected') {
          console.log('[Call] Connection disconnected, waiting for reconnection...');
          showToast('Connection lost, attempting to reconnect...', 'warning', 3000);
        }
      });

      webrtcService.current.onIceConnectionStateChange((state) => {
        console.log('[Call] ICE connection state:', state);
        
        if (state === 'failed') {
          console.log('[Call] ICE connection failed, attempting reconnection');
          // WebRTC will automatically attempt ICE restart
        }
      });

      // Update state to calling (without callId yet)
      setCallState({
        callId: null, // Will be set when we receive call:initiated
        callType,
        callStatus: 'calling',
        localStream,
        remoteStream: null,
        isMuted: false,
        isVideoEnabled: callType === 'video',
        caller: user,
        recipient: null,
        error: null,
        callDuration: 0,
        connectionQuality: 'unknown',
      });

      // Send call initiation to server (without offer)
      socket.emit('call:initiate', {
        recipientId,
        callType,
      });

      // The server will respond with call:initiated event containing the callId
      // Then we'll create and send the offer
      console.log('[Call] Call initiation request sent to server');

      console.log('[Call] Call initiated successfully');
      
      // Clear initiating flag after a short delay
      setTimeout(() => {
        isInitiatingRef.current = false;
      }, 1000);
    } catch (error: any) {
      console.error('[Call] Failed to initiate call:', error);
      
      let errorMessage = 'Failed to start call';
      let errorDetails = '';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = error.message || 'Camera/microphone access denied';
        errorDetails = getBrowserPermissionInstructions();
        showToast(`${errorMessage}\n\n${errorDetails}`, 'error', 8000);
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = error.message || 'No camera or microphone found';
        errorDetails = 'Please ensure your camera and microphone are properly connected and not being used by another application.';
        showToast(`${errorMessage}\n\n${errorDetails}`, 'error', 6000);
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = error.message || 'Camera or microphone is already in use';
        errorDetails = 'Please close other applications that might be using your camera or microphone and try again.';
        showToast(`${errorMessage}\n\n${errorDetails}`, 'error', 6000);
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = error.message || 'Camera or microphone does not meet requirements';
        showToast(errorMessage, 'error', 5000);
      } else if (error.message) {
        errorMessage = error.message;
        showToast(errorMessage, 'error', 5000);
      } else {
        showToast(errorMessage, 'error', 5000);
      }
      
      // Clear current call ref
      currentCallRef.current = null;

      setCallState((prev) => ({
        ...prev,
        error: errorMessage,
        callStatus: 'idle',
        connectionQuality: 'unknown',
      }));

      // Cleanup
      webrtcService.current.cleanup();
    }
  }, [user, socket, isConnected, callState.callStatus, startCallTimeout, clearCallTimeout, startCallTimer, showToast]);

  /**
   * Accept an incoming call
   */
  const acceptCall = useCallback(async () => {
    if (!socket || !user) {
      showToast('Cannot accept call', 'error');
      return;
    }

    if (callState.callStatus !== 'ringing') {
      console.warn('[Call] Cannot accept call - not in ringing state');
      return;
    }

    try {
      console.log('[Call] Accepting call');

      // Get local media stream
      const constraints = {
        audio: true,
        video: callState.callType === 'video',
      };

      const localStream = await webrtcService.current.acquireLocalStream(constraints);

      // The peer connection and remote description should already be set from the offer
      // Create answer
      const answer = await webrtcService.current.createAnswer(
        // The offer was already set when we received call:ringing
        {} as RTCSessionDescriptionInit
      );

      // Update state
      setCallState((prev) => ({
        ...prev,
        callStatus: 'connected',
        localStream,
        isMuted: false,
        isVideoEnabled: callState.callType === 'video',
      }));

      // Send answer to caller
      socket.emit('call:accept', {
        callId: callState.callId,
        answer,
      });

      clearCallTimeout();
      startCallTimer();
      startQualityMonitoring();

      console.log('[Call] Call accepted successfully');
    } catch (error: any) {
      console.error('[Call] Failed to accept call:', error);
      
      let errorMessage = 'Failed to accept call';
      let errorDetails = '';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = error.message || 'Camera/microphone access denied';
        errorDetails = getBrowserPermissionInstructions();
        showToast(`${errorMessage}\n\n${errorDetails}`, 'error', 8000);
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = error.message || 'No camera or microphone found';
        errorDetails = 'Please ensure your camera and microphone are properly connected and not being used by another application.';
        showToast(`${errorMessage}\n\n${errorDetails}`, 'error', 6000);
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = error.message || 'Camera or microphone is already in use';
        errorDetails = 'Please close other applications that might be using your camera or microphone and try again.';
        showToast(`${errorMessage}\n\n${errorDetails}`, 'error', 6000);
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = error.message || 'Camera or microphone does not meet requirements';
        showToast(errorMessage, 'error', 5000);
      } else if (error.message) {
        errorMessage = error.message;
        showToast(errorMessage, 'error', 5000);
      } else {
        showToast(errorMessage, 'error', 5000);
      }
      
      // Decline the call if we can't accept it
      declineCall();
    }
  }, [socket, user, callState.callStatus, callState.callType, callState.callId, clearCallTimeout, startCallTimer, showToast]);

  /**
   * Decline an incoming call
   */
  const declineCall = useCallback(() => {
    if (!socket) {
      return;
    }

    console.log('[Call] Declining call');

    if (callState.callId) {
      socket.emit('call:decline', {
        callId: callState.callId,
      });
    }

    // Cleanup
    clearCallTimeout();
    stopQualityMonitoring();
    webrtcService.current.cleanup();

    setCallState({
      callId: null,
      callType: null,
      callStatus: 'idle',
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoEnabled: true,
      caller: null,
      recipient: null,
      error: null,
      callDuration: 0,
      connectionQuality: 'unknown',
    });
  }, [socket, callState.callId, clearCallTimeout, stopQualityMonitoring]);

  /**
   * End an active call
   */
  const endCall = useCallback(() => {
    console.log('[Call] Ending call');

    if (socket && callState.callId) {
      socket.emit('call:end', {
        callId: callState.callId,
      });
    }

    // Clear current call ref to stop ICE candidate sending
    currentCallRef.current = null;

    // Stop timers
    stopCallTimer();
    clearCallTimeout();
    stopQualityMonitoring();

    // Cleanup WebRTC resources
    webrtcService.current.cleanup();

    setCallState({
      callId: null,
      callType: null,
      callStatus: 'idle',
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoEnabled: true,
      caller: null,
      recipient: null,
      error: null,
      callDuration: 0,
      connectionQuality: 'unknown',
    });
  }, [socket, callState.callId, stopCallTimer, clearCallTimeout, stopQualityMonitoring]);

  /**
   * Toggle microphone mute
   */
  const toggleMute = useCallback(() => {
    const newMutedState = !callState.isMuted;
    webrtcService.current.toggleAudio(!newMutedState);
    setCallState((prev) => ({ ...prev, isMuted: newMutedState }));
    console.log('[Call] Microphone', newMutedState ? 'muted' : 'unmuted');
  }, [callState.isMuted]);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(() => {
    const newVideoState = !callState.isVideoEnabled;
    webrtcService.current.toggleVideo(newVideoState);
    setCallState((prev) => ({ ...prev, isVideoEnabled: newVideoState }));
    console.log('[Call] Video', newVideoState ? 'enabled' : 'disabled');
  }, [callState.isVideoEnabled]);

  /**
   * Switch between front and rear camera (mobile)
   */
  const switchCamera = useCallback(async () => {
    try {
      await webrtcService.current.switchCamera();
      showToast('Camera switched', 'success', 2000);
    } catch (error) {
      console.error('[Call] Failed to switch camera:', error);
      showToast('Failed to switch camera', 'error');
    }
  }, [showToast]);

  // Set up Socket.io event listeners
  useEffect(() => {
    if (!socket || !user) {
      return;
    }

    console.log('[Call] Setting up socket event listeners');

    // Incoming call
    const handleIncomingCall = async (data: {
      callId: string;
      callType: CallType;
      caller: User;
      offer: RTCSessionDescriptionInit;
    }) => {
      console.log('[Call] Incoming call from', data.caller.name);

      // Check if already on a call
      if (callState.callStatus !== 'idle') {
        console.log('[Call] Already on a call, rejecting incoming call');
        socket.emit('call:decline', { callId: data.callId });
        return;
      }

      try {
        // Create peer connection
        await webrtcService.current.createPeerConnection();

        // Store current call info for ICE candidate handling
        currentCallRef.current = { callId: data.callId, recipientId: data.caller._id };

        // Set up WebRTC event handlers
        webrtcService.current.onIceCandidate((candidate) => {
          // Only send ICE candidates if we have an active call
          if (currentCallRef.current) {
            console.log('[Call] Sending ICE candidate to caller');
            socket.emit('webrtc:ice-candidate', {
              callId: currentCallRef.current.callId,
              recipientId: currentCallRef.current.recipientId,
              candidate: candidate.toJSON(),
            });
          } else {
            console.log('[Call] Skipping ICE candidate - call not active');
          }
        });

        webrtcService.current.onTrack((remoteStream) => {
          console.log('[Call] Received remote stream');
          setCallState((prev) => ({ ...prev, remoteStream }));
        });

        webrtcService.current.onConnectionStateChange((state) => {
          console.log('[Call] Connection state:', state);
          
          if (state === 'failed') {
            console.log('[Call] Connection failed after reconnection attempts');
            showToast('Call connection failed. Please check your internet connection and try again.', 'error', 5000);
            endCall();
          } else if (state === 'disconnected') {
            console.log('[Call] Connection disconnected, waiting for reconnection...');
            showToast('Connection lost, attempting to reconnect...', 'warning', 3000);
          }
        });

        // Set remote description (offer)
        await webrtcService.current.setRemoteDescription(data.offer);

        // Update state to ringing
        setCallState({
          callId: data.callId,
          callType: data.callType,
          callStatus: 'ringing',
          localStream: null,
          remoteStream: null,
          isMuted: false,
          isVideoEnabled: data.callType === 'video',
          caller: data.caller,
          recipient: user,
          error: null,
          callDuration: 0,
          connectionQuality: 'unknown',
        });

        // Start timeout
        startCallTimeout();
      } catch (error) {
        console.error('[Call] Failed to handle incoming call:', error);
        socket.emit('call:decline', { callId: data.callId });
      }
    };

    // Call accepted
    const handleCallAccepted = async (data: {
      callId: string;
      answer: RTCSessionDescriptionInit;
      recipient: User;
    }) => {
      console.log('[Call] Call accepted by', data.recipient.name);

      try {
        // Set remote description (answer)
        await webrtcService.current.setRemoteDescription(data.answer);

        setCallState((prev) => ({
          ...prev,
          callStatus: 'connected',
          recipient: data.recipient,
        }));

        clearCallTimeout();
        startCallTimer();
        startQualityMonitoring();
      } catch (error) {
        console.error('[Call] Failed to handle call acceptance:', error);
        showToast('Failed to establish call connection', 'error');
        endCall();
      }
    };

    // Call initiated (response from server with callId)
    const handleCallInitiated = async (data: {
      callId: string;
      recipientId: string;
      callType: CallType;
      status: string;
    }) => {
      console.log('[Call] Call initiated on server:', data.callId);
      
      try {
        // Store current call info for ICE candidate handling
        currentCallRef.current = { callId: data.callId, recipientId: data.recipientId };

        // Create and send offer
        const offer = await webrtcService.current.createOffer();

        // Update state with callId
        setCallState((prev) => ({
          ...prev,
          callId: data.callId,
          callStatus: 'calling',
        }));

        // Send offer to recipient via server
        socket.emit('webrtc:offer', {
          callId: data.callId,
          recipientId: data.recipientId,
          offer,
        });

        // Start timeout timer
        startCallTimeout();

        console.log('[Call] Offer sent to recipient');
      } catch (error) {
        console.error('[Call] Failed to create/send offer:', error);
        showToast('Failed to establish call connection', 'error');
        endCall();
      }
    };

    // Call declined
    const handleCallDeclined = () => {
      console.log('[Call] Call declined');
      showToast('Call declined', 'warning', 3000);
      endCall();
    };

    // Call ended
    const handleCallEnded = () => {
      console.log('[Call] Call ended by other party');
      showToast('Call ended', 'info', 3000);
      endCall();
    };

    // Call timeout
    const handleCallTimeout = (data: { callId: string; message?: string }) => {
      console.log('[Call] Call timeout:', data.message || 'No answer');
      
      if (data.message) {
        showToast(data.message, 'warning', 3000);
      } else {
        showToast('Call timeout', 'warning', 3000);
      }
      
      endCall();
    };

    // ICE candidate
    const handleIceCandidate = async (data: {
      candidate: RTCIceCandidateInit;
    }) => {
      console.log('[Call] Received ICE candidate');
      
      try {
        await webrtcService.current.addIceCandidate(data.candidate);
      } catch (error) {
        console.error('[Call] Failed to add ICE candidate:', error);
      }
    };

    // Call error
    const handleCallError = (data: {
      message: string;
      code?: string;
    }) => {
      console.error('[Call] Call error:', data.message, data.code);
      
      let errorMessage = data.message;
      let duration = 4000;
      
      if (data.code === 'ALREADY_ON_CALL') {
        errorMessage = 'You are already on a call';
      } else if (data.code === 'RECIPIENT_BUSY') {
        errorMessage = 'User is currently on another call';
      } else if (data.code === 'RECIPIENT_OFFLINE') {
        errorMessage = 'User is currently offline';
      }
      
      showToast(errorMessage, 'error', duration);
      
      // Clean up call state if we were trying to initiate
      if (callState.callStatus === 'calling') {
        webrtcService.current.cleanup();
        setCallState({
          callId: null,
          callType: null,
          callStatus: 'idle',
          localStream: null,
          remoteStream: null,
          isMuted: false,
          isVideoEnabled: true,
          caller: null,
          recipient: null,
          error: errorMessage,
          callDuration: 0,
          connectionQuality: 'unknown',
        });
      }
    };

    // Register event listeners
    socket.on('call:initiated', handleCallInitiated);
    socket.on('call:ringing', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:declined', handleCallDeclined);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:timeout', handleCallTimeout);
    socket.on('call:error', handleCallError);
    socket.on('webrtc:ice-candidate', handleIceCandidate);

    // Cleanup
    return () => {
      socket.off('call:initiated', handleCallInitiated);
      socket.off('call:ringing', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:declined', handleCallDeclined);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:timeout', handleCallTimeout);
      socket.off('call:error', handleCallError);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
    };
  }, [socket, user, callState.callStatus, startCallTimeout, clearCallTimeout, startCallTimer, endCall, showToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCallTimer();
      clearCallTimeout();
      stopQualityMonitoring();
      webrtcService.current.cleanup();
    };
  }, [stopCallTimer, clearCallTimeout, stopQualityMonitoring]);

  const value: CallContextValue = {
    ...callState,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
}
