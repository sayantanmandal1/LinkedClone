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
  
  // Audio refs for ringtones
  const outgoingRingtoneRef = useRef<HTMLAudioElement | null>(null);
  const incomingRingtoneRef = useRef<HTMLAudioElement | null>(null);
  const audioLoadedRef = useRef({ outgoing: false, incoming: false });

  // Initialize audio elements with proper preloading and fallback
  useEffect(() => {
    // Only initialize audio if user is logged in
    if (typeof window !== 'undefined' && user) {
      console.log('[Call] Initializing audio elements for user:', user._id);
      
      // Outgoing ringtone (for caller - ringing sound)
      const outgoingAudio = new Audio('/sounds/ringing.mp3');
      outgoingAudio.loop = true;
      outgoingAudio.preload = 'auto';
      
      // Add load event listener
      outgoingAudio.addEventListener('canplaythrough', () => {
        console.log('[Call] Outgoing ringtone loaded successfully');
        audioLoadedRef.current.outgoing = true;
      });
      
      // Add error event listener
      outgoingAudio.addEventListener('error', (e) => {
        console.error('[Call] Failed to load outgoing ringtone:', e);
        console.error('[Call] Audio error details:', {
          error: outgoingAudio.error,
          src: outgoingAudio.src,
          networkState: outgoingAudio.networkState,
          readyState: outgoingAudio.readyState,
        });
        audioLoadedRef.current.outgoing = false;
      });
      
      // Trigger load
      outgoingAudio.load();
      outgoingRingtoneRef.current = outgoingAudio;
      
      // Incoming ringtone (for recipient - phone ringing)
      const incomingAudio = new Audio('/sounds/ringing.mp3');
      incomingAudio.loop = true;
      incomingAudio.preload = 'auto';
      
      // Add load event listener
      incomingAudio.addEventListener('canplaythrough', () => {
        console.log('[Call] Incoming ringtone loaded successfully');
        audioLoadedRef.current.incoming = true;
      });
      
      // Add error event listener
      incomingAudio.addEventListener('error', (e) => {
        console.error('[Call] Failed to load incoming ringtone:', e);
        console.error('[Call] Audio error details:', {
          error: incomingAudio.error,
          src: incomingAudio.src,
          networkState: incomingAudio.networkState,
          readyState: incomingAudio.readyState,
        });
        audioLoadedRef.current.incoming = false;
      });
      
      // Trigger load
      incomingAudio.load();
      incomingRingtoneRef.current = incomingAudio;
      
      // Log audio initialization status after a short delay
      setTimeout(() => {
        console.log('[Call] Audio initialization status:', {
          outgoingLoaded: audioLoadedRef.current.outgoing,
          incomingLoaded: audioLoadedRef.current.incoming,
          outgoingReadyState: outgoingAudio.readyState,
          incomingReadyState: incomingAudio.readyState,
        });
      }, 1000);
      
      // Expose test function to window for browser console testing
      if (typeof window !== 'undefined') {
        (window as any).testCallAudio = () => {
          console.log('[Call] Testing audio playback...');
          console.log('[Call] Audio status:', {
            outgoingLoaded: audioLoadedRef.current.outgoing,
            incomingLoaded: audioLoadedRef.current.incoming,
            outgoingReadyState: outgoingAudio.readyState,
            incomingReadyState: incomingAudio.readyState,
          });
          
          console.log('[Call] Playing outgoing ringtone for 3 seconds...');
          outgoingAudio.play()
            .then(() => {
              console.log('[Call] ✓ Outgoing ringtone playing successfully');
              setTimeout(() => {
                outgoingAudio.pause();
                outgoingAudio.currentTime = 0;
                console.log('[Call] Outgoing ringtone stopped');
                
                console.log('[Call] Playing incoming ringtone for 3 seconds...');
                incomingAudio.play()
                  .then(() => {
                    console.log('[Call] ✓ Incoming ringtone playing successfully');
                    setTimeout(() => {
                      incomingAudio.pause();
                      incomingAudio.currentTime = 0;
                      console.log('[Call] Incoming ringtone stopped');
                      console.log('[Call] ✓ Audio test completed successfully');
                    }, 3000);
                  })
                  .catch(err => {
                    console.error('[Call] ✗ Failed to play incoming ringtone:', err);
                  });
              }, 3000);
            })
            .catch(err => {
              console.error('[Call] ✗ Failed to play outgoing ringtone:', err);
            });
        };
        
        console.log('[Call] Audio test function available: Run window.testCallAudio() in console to test audio playback');
      }
    }
    
    return () => {
      // Cleanup audio on unmount
      if (outgoingRingtoneRef.current) {
        outgoingRingtoneRef.current.pause();
        outgoingRingtoneRef.current.src = '';
        outgoingRingtoneRef.current = null;
      }
      if (incomingRingtoneRef.current) {
        incomingRingtoneRef.current.pause();
        incomingRingtoneRef.current.src = '';
        incomingRingtoneRef.current = null;
      }
      audioLoadedRef.current = { outgoing: false, incoming: false };
      
      // Remove test function
      if (typeof window !== 'undefined') {
        delete (window as any).testCallAudio;
      }
    };
  }, [user]); // Add user dependency

  // Helper functions for ringtones
  const playOutgoingRingtone = useCallback(() => {
    if (outgoingRingtoneRef.current) {
      // Check if audio is loaded
      if (!audioLoadedRef.current.outgoing) {
        console.warn('[Call] Outgoing ringtone not loaded yet, attempting to play anyway');
      }
      
      const playPromise = outgoingRingtoneRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[Call] Outgoing ringtone playing');
          })
          .catch(err => {
            console.error('[Call] Failed to play outgoing ringtone:', err);
            console.error('[Call] Playback error details:', {
              name: err.name,
              message: err.message,
              audioSrc: outgoingRingtoneRef.current?.src,
              readyState: outgoingRingtoneRef.current?.readyState,
              networkState: outgoingRingtoneRef.current?.networkState,
            });
            
            // Fallback: Try to reload and play again
            if (outgoingRingtoneRef.current) {
              console.log('[Call] Attempting to reload outgoing ringtone');
              outgoingRingtoneRef.current.load();
              setTimeout(() => {
                outgoingRingtoneRef.current?.play().catch(retryErr => {
                  console.error('[Call] Retry failed for outgoing ringtone:', retryErr);
                });
              }, 500);
            }
          });
      }
    } else {
      console.warn('[Call] Outgoing ringtone ref is null');
    }
  }, []);

  const stopOutgoingRingtone = useCallback(() => {
    if (outgoingRingtoneRef.current) {
      outgoingRingtoneRef.current.pause();
      outgoingRingtoneRef.current.currentTime = 0;
    }
  }, []);

  const playIncomingRingtone = useCallback(() => {
    if (incomingRingtoneRef.current) {
      // Check if audio is loaded
      if (!audioLoadedRef.current.incoming) {
        console.warn('[Call] Incoming ringtone not loaded yet, attempting to play anyway');
      }
      
      const playPromise = incomingRingtoneRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[Call] Incoming ringtone playing');
          })
          .catch(err => {
            console.error('[Call] Failed to play incoming ringtone:', err);
            console.error('[Call] Playback error details:', {
              name: err.name,
              message: err.message,
              audioSrc: incomingRingtoneRef.current?.src,
              readyState: incomingRingtoneRef.current?.readyState,
              networkState: incomingRingtoneRef.current?.networkState,
            });
            
            // Fallback: Try to reload and play again
            if (incomingRingtoneRef.current) {
              console.log('[Call] Attempting to reload incoming ringtone');
              incomingRingtoneRef.current.load();
              setTimeout(() => {
                incomingRingtoneRef.current?.play().catch(retryErr => {
                  console.error('[Call] Retry failed for incoming ringtone:', retryErr);
                });
              }, 500);
            }
          });
      }
    } else {
      console.warn('[Call] Incoming ringtone ref is null');
    }
  }, []);

  const stopIncomingRingtone = useCallback(() => {
    if (incomingRingtoneRef.current) {
      incomingRingtoneRef.current.pause();
      incomingRingtoneRef.current.currentTime = 0;
    }
  }, []);

  // Start call duration timer
  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    
    // Reset duration to 0
    setCallState((prev) => ({ ...prev, callDuration: 0 }));

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
      console.log('[Call] Call timeout - no answer after 60 seconds');
      
      if (callState.callStatus === 'calling' || callState.callStatus === 'ringing') {
        showToast('No answer', 'warning', 3000);
        
        // Notify backend about timeout
        if (socket && callState.callId) {
          socket.emit('call:timeout', { callId: callState.callId });
        }
        
        // Use comprehensive cleanup (defined below)
        // Reset all refs
        isInitiatingRef.current = false;
        currentCallRef.current = null;
        
        // Stop all ringtones
        stopIncomingRingtone();
        stopOutgoingRingtone();
        
        // Stop all timers
        stopCallTimer();
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }
        stopQualityMonitoring();
        
        // Cleanup WebRTC resources
        webrtcService.current.cleanup();
        
        // Reset state to idle
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
      }
    }, 60000); // 60 seconds - more time to answer
  }, [callState.callStatus, callState.callId, socket, stopIncomingRingtone, stopOutgoingRingtone, stopCallTimer, stopQualityMonitoring, showToast]);

  // Clear call timeout
  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  /**
   * Comprehensive cleanup function to reset all call state
   * This ensures consistent cleanup across all error paths and call endings
   */
  const cleanupCallState = useCallback(() => {
    console.log('[Call] Performing comprehensive state cleanup');
    
    // Reset all refs
    isInitiatingRef.current = false;
    currentCallRef.current = null;
    
    // Stop all ringtones
    stopIncomingRingtone();
    stopOutgoingRingtone();
    
    // Stop all timers
    stopCallTimer();
    clearCallTimeout();
    stopQualityMonitoring();
    
    // Cleanup WebRTC resources
    webrtcService.current.cleanup();
    
    // Reset state to idle
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
  }, [stopIncomingRingtone, stopOutgoingRingtone, stopCallTimer, clearCallTimeout, stopQualityMonitoring]);

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
          console.error('[Call] WebRTC connection failed after reconnection attempts');
          
          showToast('Call connection failed. Please check your internet connection and try again.', 'error', 5000);
          
          // Use comprehensive cleanup
          cleanupCallState();
          
          // Set error message after cleanup
          setCallState((prev) => ({ ...prev, error: 'Connection failed' }));
        } else if (state === 'disconnected') {
          console.log('[Call] Connection disconnected, waiting for reconnection...');
          showToast('Connection lost, attempting to reconnect...', 'warning', 3000);
        }
      });

      webrtcService.current.onIceConnectionStateChange((state) => {
        console.log('[Call] ICE connection state:', state);
        
        if (state === 'failed') {
          console.error('[Call] ICE connection failed, attempting reconnection');
          // WebRTC will automatically attempt ICE restart
        } else if (state === 'disconnected') {
          console.warn('[Call] ICE connection disconnected');
        } else if (state === 'closed') {
          console.log('[Call] ICE connection closed');
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

      // Play outgoing ringtone
      playOutgoingRingtone();

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
      console.error('[Call] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      
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
      
      // Use comprehensive cleanup
      cleanupCallState();
      
      // Set error message after cleanup
      setCallState((prev) => ({ ...prev, error: errorMessage }));
    }
  }, [user, socket, isConnected, callState.callStatus, startCallTimeout, startCallTimer, playOutgoingRingtone, cleanupCallState, showToast]);

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

      // Verify that remote description is already set from the offer
      const peerConnection = webrtcService.current.getPeerConnection();
      if (!peerConnection || !peerConnection.remoteDescription) {
        throw new Error('Remote description not set - offer not received');
      }

      // Get local media stream
      const constraints = {
        audio: true,
        video: callState.callType === 'video',
      };

      const localStream = await webrtcService.current.acquireLocalStream(constraints);

      // Create answer (remote description is already set from webrtc:offer event)
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      console.log('[Call] Answer created and set as local description');

      // Update state to connected
      setCallState((prev) => ({
        ...prev,
        callStatus: 'connected',
        localStream,
        isMuted: false,
        isVideoEnabled: callState.callType === 'video',
      }));

      // Send answer to caller via backend
      socket.emit('call:accept', {
        callId: callState.callId,
        answer,
      });

      // Stop incoming ringtone
      stopIncomingRingtone();

      clearCallTimeout();
      startCallTimer();
      startQualityMonitoring();

      console.log('[Call] Call accepted successfully');
    } catch (error: any) {
      console.error('[Call] Failed to accept call:', error);
      console.error('[Call] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      
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
      if (socket && callState.callId) {
        socket.emit('call:decline', {
          callId: callState.callId,
        });
      }

      // Use comprehensive cleanup
      cleanupCallState();
      
      // Set error message after cleanup
      setCallState((prev) => ({ ...prev, error: errorMessage }));
    }
  }, [socket, user, callState.callStatus, callState.callType, callState.callId, startCallTimer, startQualityMonitoring, stopIncomingRingtone, cleanupCallState, showToast]);

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

    // Use comprehensive cleanup
    cleanupCallState();
  }, [socket, callState.callId, cleanupCallState]);

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

    // Use comprehensive cleanup
    cleanupCallState();
  }, [socket, callState.callId, cleanupCallState]);

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
    } catch (error: any) {
      console.error('[Call] Failed to switch camera:', error);
      console.error('[Call] Error details:', {
        name: error?.name,
        message: error?.message,
      });
      showToast('Failed to switch camera', 'error');
    }
  }, [showToast]);

  // Set up Socket.io event listeners
  // Use a ref to track if listeners are already registered
  const listenersRegisteredRef = useRef(false);

  useEffect(() => {
    if (!socket || !user) {
      console.log('[Call] Socket or user not available, skipping event listener setup');
      return;
    }

    // Prevent duplicate listener registration
    if (listenersRegisteredRef.current) {
      console.log('[Call] Event listeners already registered, skipping duplicate registration');
      return;
    }

    console.log('[Call] Setting up socket event listeners (socket connected:', socket.connected, ')');
    listenersRegisteredRef.current = true;

    // Incoming call (without offer initially)
    const handleIncomingCall = async (data: {
      callId: string;
      callType: CallType;
      caller: User;
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
            console.error('[Call] WebRTC connection failed after reconnection attempts');
            
            showToast('Call connection failed. Please check your internet connection and try again.', 'error', 5000);
            
            // Use comprehensive cleanup
            cleanupCallState();
            
            // Set error message after cleanup
            setCallState((prev) => ({ ...prev, error: 'Connection failed' }));
          } else if (state === 'disconnected') {
            console.log('[Call] Connection disconnected, waiting for reconnection...');
            showToast('Connection lost, attempting to reconnect...', 'warning', 3000);
          }
        });

        // Update state to ringing (offer will come via webrtc:offer event)
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

        // Play incoming ringtone
        playIncomingRingtone();

        // Start timeout
        startCallTimeout();
        
        console.log('[Call] Waiting for WebRTC offer...');
      } catch (error: any) {
        console.error('[Call] Failed to handle incoming call:', error);
        console.error('[Call] Error details:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
        });
        
        // Use comprehensive cleanup
        cleanupCallState();
        
        socket.emit('call:decline', { callId: data.callId });
      }
    };

    // Call accepted
    const handleCallAccepted = async (data: {
      callId: string;
      answer: RTCSessionDescriptionInit;
      recipientId: string;
    }) => {
      console.log('[Call] Call accepted by recipient');

      try {
        // Set remote description (answer)
        await webrtcService.current.setRemoteDescription(data.answer);

        setCallState((prev) => ({
          ...prev,
          callStatus: 'connected',
        }));

        // Stop outgoing ringtone
        stopOutgoingRingtone();

        clearCallTimeout();
        startCallTimer();
        startQualityMonitoring();
      } catch (error: any) {
        console.error('[Call] Failed to handle call acceptance:', error);
        console.error('[Call] Error details:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
        });
        
        showToast('Failed to establish call connection', 'error');
        
        // Use comprehensive cleanup
        cleanupCallState();
        
        // Set error message after cleanup
        setCallState((prev) => ({ ...prev, error: 'Failed to establish connection' }));
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

        // Start timeout timer (60 seconds instead of 30)
        startCallTimeout();

        console.log('[Call] Offer sent to recipient');
      } catch (error: any) {
        console.error('[Call] Failed to create/send offer:', error);
        console.error('[Call] Error details:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
        });
        
        showToast('Failed to establish call connection', 'error');
        
        // Use comprehensive cleanup
        cleanupCallState();
        
        // Set error message after cleanup
        setCallState((prev) => ({ ...prev, error: 'Failed to create offer' }));
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

    // Call timeout (deprecated - now handled via call:error with TIMEOUT code)
    const handleCallTimeout = (data: { callId: string; message?: string }) => {
      console.log('[Call] Call timeout (legacy handler):', data.message || 'No answer');
      
      // Handle as error for consistency
      handleCallError({
        callId: data.callId,
        message: data.message || 'No answer - call timed out',
        code: 'TIMEOUT',
      });
    };

    // WebRTC offer received (for incoming calls)
    const handleWebRTCOffer = async (data: {
      callId: string;
      callerId: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      console.log('[Call] Received WebRTC offer for call:', data.callId);
      
      try {
        // Set remote description (offer)
        await webrtcService.current.setRemoteDescription(data.offer);
        console.log('[Call] Remote description set, ready to accept call');
      } catch (error: any) {
        console.error('[Call] Failed to set remote description:', error);
        console.error('[Call] Error details:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
        });
        
        showToast('Failed to process incoming call', 'error');
        
        // Use comprehensive cleanup
        cleanupCallState();
        
        // Set error message after cleanup
        setCallState((prev) => ({ ...prev, error: 'Failed to process offer' }));
      }
    };

    // ICE candidate
    const handleIceCandidate = async (data: {
      candidate: RTCIceCandidateInit;
    }) => {
      console.log('[Call] Received ICE candidate');
      
      try {
        await webrtcService.current.addIceCandidate(data.candidate);
      } catch (error: any) {
        console.error('[Call] Failed to add ICE candidate:', error);
        console.error('[Call] ICE candidate error details:', {
          name: error?.name,
          message: error?.message,
        });
      }
    };

    // Call error
    const handleCallError = (data: {
      callId?: string;
      message: string;
      code?: string;
    }) => {
      console.error('[Call] Call error:', data.message, 'Code:', data.code, 'CallId:', data.callId);
      
      let errorMessage = data.message;
      let duration = 4000;
      
      // Map error codes to user-friendly messages
      switch (data.code) {
        case 'ALREADY_ON_CALL':
          errorMessage = 'You are already on a call';
          break;
        case 'RECIPIENT_BUSY':
          errorMessage = 'User is currently on another call';
          duration = 3000;
          break;
        case 'RECIPIENT_OFFLINE':
          errorMessage = 'User is currently offline';
          duration = 3000;
          break;
        case 'TIMEOUT':
          errorMessage = 'No answer - call timed out';
          duration = 3000;
          break;
        case 'INITIATE_FAILED':
          errorMessage = 'Failed to initiate call. Please try again.';
          break;
        case 'ACCEPT_FAILED':
          errorMessage = 'Failed to accept call. Please try again.';
          break;
        case 'DECLINE_FAILED':
          errorMessage = 'Failed to decline call';
          duration = 2000;
          break;
        case 'END_FAILED':
          errorMessage = 'Failed to end call properly';
          duration = 2000;
          break;
        case 'CONNECTION_FAILED':
          errorMessage = 'Call connection failed. Please check your internet connection.';
          duration = 5000;
          break;
        case 'CALL_NOT_FOUND':
          errorMessage = 'Call not found or already ended';
          duration = 3000;
          break;
        case 'NOT_AUTHORIZED':
          errorMessage = 'Not authorized to perform this action';
          break;
        case 'OFFER_FAILED':
          errorMessage = 'Failed to send call offer';
          break;
        case 'ANSWER_FAILED':
          errorMessage = 'Failed to send call answer';
          break;
        default:
          // Use the message from the server if no specific code mapping
          errorMessage = data.message || 'An error occurred during the call';
      }
      
      showToast(errorMessage, 'error', duration);
      
      // Clean up call state if we were trying to initiate or in a call
      if (callState.callStatus !== 'idle') {
        console.log('[Call] Cleaning up call state due to error');
        // Use comprehensive cleanup
        cleanupCallState();
        
        // Set error message after cleanup
        setCallState((prev) => ({ ...prev, error: errorMessage }));
      }
    };

    // Register event listeners
    console.log('[Call] Registering socket event listeners for user:', user._id);
    socket.on('call:initiated', handleCallInitiated);
    socket.on('call:ringing', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:declined', handleCallDeclined);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:timeout', handleCallTimeout);
    socket.on('call:error', handleCallError);
    socket.on('webrtc:offer', handleWebRTCOffer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    console.log('[Call] All socket event listeners registered successfully');

    // Cleanup
    return () => {
      console.log('[Call] Cleaning up socket event listeners');
      listenersRegisteredRef.current = false;
      socket.off('call:initiated', handleCallInitiated);
      socket.off('call:ringing', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:declined', handleCallDeclined);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:timeout', handleCallTimeout);
      socket.off('call:error', handleCallError);
      socket.off('webrtc:offer', handleWebRTCOffer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
    };
  }, [socket, user, callState.callStatus, startCallTimeout, clearCallTimeout, startCallTimer, startQualityMonitoring, stopOutgoingRingtone, playIncomingRingtone, endCall, cleanupCallState, showToast]);

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
