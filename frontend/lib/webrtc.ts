/**
 * WebRTC Service for managing peer-to-peer audio/video connections
 * Handles peer connection lifecycle, media streams, and ICE candidate exchange
 */

export type ConnectionQuality = 'good' | 'fair' | 'poor' | 'unknown';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export interface MediaConstraints {
  audio: boolean | MediaTrackConstraints;
  video: boolean | MediaTrackConstraints;
}

export interface ConnectionStats {
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
  quality: ConnectionQuality;
}

/**
 * Default STUN server configuration
 * In production, you should add TURN servers for better connectivity
 */
const DEFAULT_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Default media constraints for voice and video calls
 */
const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: 'user',
};

/**
 * WebRTC Service class for managing peer connections
 * Singleton pattern - only one active call at a time
 */
export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private config: WebRTCConfig;
  private onIceCandidateCallback: ((candidate: RTCIceCandidate) => void) | null = null;
  private onTrackCallback: ((stream: MediaStream) => void) | null = null;
  private onConnectionStateChangeCallback: ((state: RTCPeerConnectionState) => void) | null = null;
  private onIceConnectionStateChangeCallback: ((state: RTCIceConnectionState) => void) | null = null;
  private reconnectionAttempts: number = 0;
  private maxReconnectionAttempts: number = 3;
  private reconnectionTimeout: NodeJS.Timeout | null = null;

  constructor(config?: Partial<WebRTCConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Create a new RTCPeerConnection with configured STUN/TURN servers
   */
  async createPeerConnection(): Promise<RTCPeerConnection> {
    if (this.peerConnection) {
      console.warn('[WebRTC] Peer connection already exists, cleaning up first');
      this.cleanup();
    }

    console.log('[WebRTC] Creating peer connection with config:', this.config);
    
    this.peerConnection = new RTCPeerConnection(this.config);
    this.remoteStream = new MediaStream();

    // Set up event handlers
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        console.log('[WebRTC] New ICE candidate:', event.candidate);
        this.onIceCandidateCallback(event.candidate);
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
      
      if (this.onTrackCallback && this.remoteStream) {
        this.onTrackCallback(this.remoteStream);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('[WebRTC] Connection state changed:', state);
      
      if (state && this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(state);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('[WebRTC] ICE connection state changed:', state);
      
      if (state === 'failed') {
        console.log('[WebRTC] ICE connection failed, attempting reconnection...');
        this.handleConnectionFailure();
      } else if (state === 'connected' || state === 'completed') {
        // Reset reconnection attempts on successful connection
        this.reconnectionAttempts = 0;
        if (this.reconnectionTimeout) {
          clearTimeout(this.reconnectionTimeout);
          this.reconnectionTimeout = null;
        }
      }
      
      if (state && this.onIceConnectionStateChangeCallback) {
        this.onIceConnectionStateChangeCallback(state);
      }
    };

    return this.peerConnection;
  }

  /**
   * Acquire local media stream (camera and/or microphone)
   */
  async acquireLocalStream(constraints: MediaConstraints): Promise<MediaStream> {
    try {
      console.log('[WebRTC] Requesting media with constraints:', constraints);
      
      const mediaConstraints: MediaStreamConstraints = {
        audio: constraints.audio === true ? DEFAULT_AUDIO_CONSTRAINTS : constraints.audio,
        video: constraints.video === true ? DEFAULT_VIDEO_CONSTRAINTS : constraints.video,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      console.log('[WebRTC] Local stream acquired:', {
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
      });

      // Add local stream tracks to peer connection if it exists
      if (this.peerConnection) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }

      return this.localStream;
    } catch (error: any) {
      console.error('[WebRTC] Failed to get local stream:', error);
      
      // Enhanced error handling with specific error types
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        const enhancedError = new Error('Camera/microphone access denied. Please enable permissions in your browser settings.');
        enhancedError.name = 'NotAllowedError';
        throw enhancedError;
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        const enhancedError = new Error('No camera or microphone found. Please connect a device and try again.');
        enhancedError.name = 'NotFoundError';
        throw enhancedError;
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        const enhancedError = new Error('Camera or microphone is already in use by another application.');
        enhancedError.name = 'NotReadableError';
        throw enhancedError;
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        const enhancedError = new Error('Camera or microphone does not meet the required specifications.');
        enhancedError.name = 'OverconstrainedError';
        throw enhancedError;
      } else if (error.name === 'TypeError') {
        const enhancedError = new Error('Invalid media constraints. Please try again.');
        enhancedError.name = 'TypeError';
        throw enhancedError;
      } else if (error.name === 'AbortError') {
        const enhancedError = new Error('Media request was aborted. Please try again.');
        enhancedError.name = 'AbortError';
        throw enhancedError;
      }
      
      throw error;
    }
  }

  /**
   * Create an SDP offer for initiating a call
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('[WebRTC] Creating offer...');
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await this.peerConnection.setLocalDescription(offer);
      console.log('[WebRTC] Offer created and set as local description');

      return offer;
    } catch (error) {
      console.error('[WebRTC] Failed to create offer:', error);
      throw error;
    }
  }

  /**
   * Create an SDP answer in response to an offer
   */
  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('[WebRTC] Setting remote description and creating answer...');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('[WebRTC] Answer created and set as local description');

      return answer;
    } catch (error) {
      console.error('[WebRTC] Failed to create answer:', error);
      throw error;
    }
  }

  /**
   * Set remote description (answer from the other peer)
   */
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('[WebRTC] Setting remote description:', description.type);
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
    } catch (error) {
      console.error('[WebRTC] Failed to set remote description:', error);
      throw error;
    }
  }

  /**
   * Add an ICE candidate received from the other peer
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('[WebRTC] Adding ICE candidate');
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[WebRTC] Failed to add ICE candidate:', error);
      throw error;
    }
  }

  /**
   * Toggle audio track enabled state (mute/unmute)
   */
  toggleAudio(enabled: boolean): void {
    if (!this.localStream) {
      console.warn('[WebRTC] No local stream available');
      return;
    }

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    console.log('[WebRTC] Audio', enabled ? 'enabled' : 'disabled');
  }

  /**
   * Toggle video track enabled state
   */
  toggleVideo(enabled: boolean): void {
    if (!this.localStream) {
      console.warn('[WebRTC] No local stream available');
      return;
    }

    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    console.log('[WebRTC] Video', enabled ? 'enabled' : 'disabled');
  }

  /**
   * Switch between front and rear camera (mobile devices)
   */
  async switchCamera(): Promise<void> {
    if (!this.localStream) {
      throw new Error('No local stream available');
    }

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error('No video track available');
    }

    try {
      // Get current facing mode
      const currentFacingMode = videoTrack.getSettings().facingMode || 'user';
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

      console.log('[WebRTC] Switching camera from', currentFacingMode, 'to', newFacingMode);

      // Stop current video track
      videoTrack.stop();

      // Get new video stream with different facing mode
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...DEFAULT_VIDEO_CONSTRAINTS,
          facingMode: newFacingMode,
        },
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace track in local stream
      this.localStream.removeTrack(videoTrack);
      this.localStream.addTrack(newVideoTrack);

      // Replace track in peer connection
      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      console.log('[WebRTC] Camera switched successfully');
    } catch (error) {
      console.error('[WebRTC] Failed to switch camera:', error);
      throw error;
    }
  }

  /**
   * Handle connection failure and attempt reconnection
   */
  private async handleConnectionFailure(): Promise<void> {
    if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
      console.error('[WebRTC] Max reconnection attempts reached, giving up');
      
      // Notify via connection state callback
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback('failed');
      }
      return;
    }

    this.reconnectionAttempts++;
    console.log(`[WebRTC] Reconnection attempt ${this.reconnectionAttempts}/${this.maxReconnectionAttempts}`);

    try {
      // Clear any existing timeout
      if (this.reconnectionTimeout) {
        clearTimeout(this.reconnectionTimeout);
      }

      // Wait before attempting reconnection (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, this.reconnectionAttempts - 1), 5000);
      
      this.reconnectionTimeout = setTimeout(async () => {
        if (!this.peerConnection) {
          console.log('[WebRTC] Peer connection no longer exists, aborting reconnection');
          return;
        }

        try {
          // Trigger ICE restart by creating a new offer with iceRestart option
          console.log('[WebRTC] Creating new offer with ICE restart...');
          const offer = await this.peerConnection.createOffer({ iceRestart: true });
          await this.peerConnection.setLocalDescription(offer);

          // Notify via ICE candidate callback to send new offer
          console.log('[WebRTC] ICE restart initiated, new offer created');
        } catch (error) {
          console.error('[WebRTC] Failed to restart ICE:', error);
          
          // Try again if we haven't exceeded max attempts
          if (this.reconnectionAttempts < this.maxReconnectionAttempts) {
            await this.handleConnectionFailure();
          }
        }
      }, delay);
    } catch (error) {
      console.error('[WebRTC] Error during reconnection attempt:', error);
    }
  }

  /**
   * Get connection statistics for quality monitoring
   */
  async getConnectionStats(): Promise<ConnectionStats | null> {
    if (!this.peerConnection) {
      return null;
    }

    try {
      const stats = await this.peerConnection.getStats();
      let packetsLost = 0;
      let jitter = 0;
      let roundTripTime = 0;
      let hasStats = false;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp') {
          packetsLost += report.packetsLost || 0;
          jitter += report.jitter || 0;
          hasStats = true;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          roundTripTime = report.currentRoundTripTime || 0;
        }
      });

      if (!hasStats) {
        return {
          packetsLost: 0,
          jitter: 0,
          roundTripTime: 0,
          quality: 'unknown',
        };
      }

      // Calculate quality based on metrics
      let quality: ConnectionQuality = 'good';
      if (packetsLost > 50 || jitter > 0.1 || roundTripTime > 0.3) {
        quality = 'poor';
      } else if (packetsLost > 20 || jitter > 0.05 || roundTripTime > 0.15) {
        quality = 'fair';
      }

      return {
        packetsLost,
        jitter,
        roundTripTime,
        quality,
      };
    } catch (error) {
      console.error('[WebRTC] Failed to get connection stats:', error);
      return null;
    }
  }

  /**
   * Set callback for ICE candidate events
   */
  onIceCandidate(callback: (candidate: RTCIceCandidate) => void): void {
    this.onIceCandidateCallback = callback;
  }

  /**
   * Set callback for remote track events
   */
  onTrack(callback: (stream: MediaStream) => void): void {
    this.onTrackCallback = callback;
  }

  /**
   * Set callback for connection state changes
   */
  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateChangeCallback = callback;
  }

  /**
   * Set callback for ICE connection state changes
   */
  onIceConnectionStateChange(callback: (state: RTCIceConnectionState) => void): void {
    this.onIceConnectionStateChangeCallback = callback;
  }

  /**
   * Get current local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get current remote stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Get current peer connection
   */
  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  /**
   * Clean up all resources (streams, peer connection)
   */
  cleanup(): void {
    console.log('[WebRTC] Cleaning up resources...');

    // Clear reconnection timeout
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }
    this.reconnectionAttempts = 0;

    // Stop all local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }

    // Stop all remote stream tracks
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.remoteStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Clear callbacks
    this.onIceCandidateCallback = null;
    this.onTrackCallback = null;
    this.onConnectionStateChangeCallback = null;
    this.onIceConnectionStateChangeCallback = null;

    console.log('[WebRTC] Cleanup complete');
  }
}

// Export a singleton instance
let webrtcServiceInstance: WebRTCService | null = null;

export function getWebRTCService(): WebRTCService {
  if (!webrtcServiceInstance) {
    webrtcServiceInstance = new WebRTCService();
  }
  return webrtcServiceInstance;
}

export function resetWebRTCService(): void {
  if (webrtcServiceInstance) {
    webrtcServiceInstance.cleanup();
    webrtcServiceInstance = null;
  }
}
