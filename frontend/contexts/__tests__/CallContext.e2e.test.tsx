/**
 * End-to-End Tests for Call Flow
 * 
 * Tests complete call flow scenarios including:
 * - Voice and video call initiation and acceptance
 * - Call decline flow
 * - Call timeout after 30 seconds
 * - Rapid call attempts prevention
 * - State management after call ends
 * - Ringtone playback
 * - Error message display
 * 
 * Requirements: All (1.1-6.5)
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { CallProvider, useCall } from '../CallContext';
import { AuthProvider } from '../AuthContext';
import { ToastProvider } from '../ToastContext';
import { ReactNode } from 'react';

// Mock dependencies
jest.mock('@/hooks/useSocket');
jest.mock('@/lib/webrtc');
jest.mock('@/contexts/AuthContext', () => ({
  ...jest.requireActual('@/contexts/AuthContext'),
  useAuth: jest.fn(),
}));

const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  connected: true,
};

const mockWebRTCService = {
  acquireLocalStream: jest.fn(),
  createPeerConnection: jest.fn(),
  createOffer: jest.fn(),
  createAnswer: jest.fn(),
  setRemoteDescription: jest.fn(),
  addIceCandidate: jest.fn(),
  onIceCandidate: jest.fn(),
  onTrack: jest.fn(),
  onConnectionStateChange: jest.fn(),
  onIceConnectionStateChange: jest.fn(),
  getPeerConnection: jest.fn(),
  toggleAudio: jest.fn(),
  toggleVideo: jest.fn(),
  switchCamera: jest.fn(),
  cleanup: jest.fn(),
  getConnectionStats: jest.fn(),
};

const mockUser = {
  _id: 'user1',
  name: 'Test User',
  email: 'test@example.com',
  profilePicture: '',
  bio: '',
  location: '',
  website: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockRecipient = {
  _id: 'user2',
  name: 'Recipient User',
  email: 'recipient@example.com',
  profilePicture: '',
  bio: '',
  location: '',
  website: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock Audio with instance tracking
const audioInstances: any[] = [];

class MockAudio {
  src = '';
  loop = false;
  currentTime = 0;
  paused = true;
  
  play = jest.fn().mockResolvedValue(undefined);
  pause = jest.fn();
  
  constructor(src?: string) {
    if (src) this.src = src;
    audioInstances.push(this);
  }
}

global.Audio = MockAudio as any;

// Mock MediaStream
class MockMediaStream {
  id = 'mock-stream-id';
  active = true;
  
  getTracks = jest.fn().mockReturnValue([]);
  getAudioTracks = jest.fn().mockReturnValue([]);
  getVideoTracks = jest.fn().mockReturnValue([]);
  addTrack = jest.fn();
  removeTrack = jest.fn();
}

global.MediaStream = MockMediaStream as any;

// Mock fetch for presence check
global.fetch = jest.fn();

describe('CallContext E2E Tests', () => {
  let socketEventHandlers: Record<string, Function>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    socketEventHandlers = {};
    audioInstances.length = 0; // Clear audio instances
    
    // Setup socket mock
    mockSocket.on.mockImplementation((event: string, handler: Function) => {
      socketEventHandlers[event] = handler;
      return mockSocket;
    });
    
    mockSocket.off.mockImplementation((event: string) => {
      delete socketEventHandlers[event];
      return mockSocket;
    });
    
    // Setup WebRTC mocks
    const { getWebRTCService } = require('@/lib/webrtc');
    getWebRTCService.mockReturnValue(mockWebRTCService);
    
    mockWebRTCService.acquireLocalStream.mockResolvedValue(new MediaStream());
    mockWebRTCService.createPeerConnection.mockResolvedValue(undefined);
    mockWebRTCService.createOffer.mockResolvedValue({ type: 'offer', sdp: 'mock-offer-sdp' });
    mockWebRTCService.createAnswer.mockResolvedValue({ type: 'answer', sdp: 'mock-answer-sdp' });
    mockWebRTCService.setRemoteDescription.mockResolvedValue(undefined);
    mockWebRTCService.addIceCandidate.mockResolvedValue(undefined);
    mockWebRTCService.getPeerConnection.mockReturnValue({
      remoteDescription: { type: 'offer', sdp: 'mock-sdp' },
      createAnswer: jest.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-answer-sdp' }),
      setLocalDescription: jest.fn().mockResolvedValue(undefined),
    });
    mockWebRTCService.getConnectionStats.mockResolvedValue({
      quality: 'good',
      packetsLost: 0,
      jitter: 0,
      roundTripTime: 50,
    });
    
    // Setup auth mock
    const { useAuth } = require('@/contexts/AuthContext');
    useAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    });
    
    // Setup socket hook mock
    const { useSocket } = require('@/hooks/useSocket');
    useSocket.mockReturnValue({
      socket: mockSocket,
      isConnected: true,
    });
    
    // Mock fetch for presence check
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, presence: { isOnline: true } }),
    });
    
    // Mock timers
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    try {
      jest.runOnlyPendingTimers();
    } catch (e) {
      // Ignore timer errors in cleanup
    }
    jest.useRealTimers();
  });
  
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ToastProvider>
      <AuthProvider>
        <CallProvider>{children}</CallProvider>
      </AuthProvider>
    </ToastProvider>
  );
  
  describe('Voice Call Flow', () => {
    it('should successfully initiate and accept a voice call', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Initial state
      expect(result.current.callStatus).toBe('idle');
      
      // Initiate voice call
      await act(async () => {
        await result.current.initiateCall('user2', 'voice');
      });
      
      // Should be in calling state
      expect(result.current.callStatus).toBe('calling');
      expect(result.current.callType).toBe('voice');
      expect(mockSocket.emit).toHaveBeenCalledWith('call:initiate', {
        recipientId: 'user2',
        callType: 'voice',
      });
      
      // Simulate server response with callId
      await act(async () => {
        await socketEventHandlers['call:initiated']({
          callId: 'call123',
          recipientId: 'user2',
          callType: 'voice',
          status: 'initiated',
        });
      });
      
      // Should have sent offer
      expect(mockSocket.emit).toHaveBeenCalledWith('webrtc:offer', expect.objectContaining({
        callId: 'call123',
        recipientId: 'user2',
        offer: expect.any(Object),
      }));
      
      // Simulate recipient accepting call
      await act(async () => {
        await socketEventHandlers['call:accepted']({
          callId: 'call123',
          answer: { type: 'answer', sdp: 'mock-answer-sdp' },
          recipientId: 'user2',
        });
      });
      
      // Should be connected
      await waitFor(() => {
        expect(result.current.callStatus).toBe('connected');
      });
      
      // Advance timer to check call duration
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(result.current.callDuration).toBeGreaterThan(0);
    });
  });
  
  describe('Video Call Flow', () => {
    it('should successfully initiate and accept a video call', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Initiate video call
      await act(async () => {
        await result.current.initiateCall('user2', 'video');
      });
      
      expect(result.current.callStatus).toBe('calling');
      expect(result.current.callType).toBe('video');
      expect(result.current.isVideoEnabled).toBe(true);
      
      // Simulate server response
      await act(async () => {
        await socketEventHandlers['call:initiated']({
          callId: 'call456',
          recipientId: 'user2',
          callType: 'video',
          status: 'initiated',
        });
      });
      
      // Simulate acceptance
      await act(async () => {
        await socketEventHandlers['call:accepted']({
          callId: 'call456',
          answer: { type: 'answer', sdp: 'mock-answer-sdp' },
          recipientId: 'user2',
        });
      });
      
      await waitFor(() => {
        expect(result.current.callStatus).toBe('connected');
      });
    });
  });
  
  describe('Call Decline Flow', () => {
    it('should handle call decline properly', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Initiate call
      await act(async () => {
        await result.current.initiateCall('user2', 'voice');
      });
      
      await act(async () => {
        await socketEventHandlers['call:initiated']({
          callId: 'call789',
          recipientId: 'user2',
          callType: 'voice',
          status: 'initiated',
        });
      });
      
      expect(result.current.callStatus).toBe('calling');
      
      // Simulate decline
      await act(async () => {
        socketEventHandlers['call:declined']();
      });
      
      // Should return to idle
      expect(result.current.callStatus).toBe('idle');
      expect(result.current.callId).toBeNull();
      expect(mockWebRTCService.cleanup).toHaveBeenCalled();
    });
    
    it('should allow recipient to decline incoming call', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Simulate incoming call
      await act(async () => {
        await socketEventHandlers['call:ringing']({
          callId: 'call999',
          callType: 'voice',
          caller: mockRecipient,
        });
      });
      
      expect(result.current.callStatus).toBe('ringing');
      
      // Decline the call
      act(() => {
        result.current.declineCall();
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('call:decline', {
        callId: 'call999',
      });
      expect(result.current.callStatus).toBe('idle');
    });
  });
  
  describe('Call Timeout', () => {
    it('should timeout after 30 seconds with no answer', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Initiate call
      await act(async () => {
        await result.current.initiateCall('user2', 'voice');
      });
      
      await act(async () => {
        await socketEventHandlers['call:initiated']({
          callId: 'call-timeout',
          recipientId: 'user2',
          callType: 'voice',
          status: 'initiated',
        });
      });
      
      expect(result.current.callStatus).toBe('calling');
      
      // Advance time by 30 seconds to trigger timeout
      await act(async () => {
        jest.advanceTimersByTime(30000);
      });
      
      // Should have timed out and returned to idle
      expect(result.current.callStatus).toBe('idle');
      
      // Check that timeout was emitted (check all calls, not just after clear)
      const timeoutCalls = mockSocket.emit.mock.calls.filter(
        call => call[0] === 'call:timeout' && call[1]?.callId === 'call-timeout'
      );
      expect(timeoutCalls.length).toBeGreaterThan(0);
      expect(mockWebRTCService.cleanup).toHaveBeenCalled();
    });
    
    it('should handle timeout event from server', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Simulate incoming call
      await act(async () => {
        await socketEventHandlers['call:ringing']({
          callId: 'call-timeout-2',
          callType: 'voice',
          caller: mockRecipient,
        });
      });
      
      expect(result.current.callStatus).toBe('ringing');
      
      // Simulate timeout from server
      act(() => {
        socketEventHandlers['call:timeout']({
          callId: 'call-timeout-2',
          message: 'Call timeout',
        });
      });
      
      expect(result.current.callStatus).toBe('idle');
    });
  });
  
  describe('Rapid Call Attempts', () => {
    it('should prevent duplicate calls when already calling', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Initiate first call
      await act(async () => {
        await result.current.initiateCall('user2', 'voice');
      });
      
      expect(result.current.callStatus).toBe('calling');
      
      // Try to initiate second call immediately
      await act(async () => {
        await result.current.initiateCall('user3', 'voice');
      });
      
      // Should still be on first call
      expect(mockSocket.emit).toHaveBeenCalledTimes(1);
      expect(mockSocket.emit).toHaveBeenCalledWith('call:initiate', {
        recipientId: 'user2',
        callType: 'voice',
      });
    });
    
    it('should prevent duplicate calls during initiation', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Initiate call but don't wait
      const promise1 = act(async () => {
        await result.current.initiateCall('user2', 'voice');
      });
      
      // Try to initiate another call immediately
      const promise2 = act(async () => {
        await result.current.initiateCall('user3', 'voice');
      });
      
      await Promise.all([promise1, promise2]);
      
      // Should only have initiated one call
      const initiateCallCount = mockSocket.emit.mock.calls.filter(
        call => call[0] === 'call:initiate'
      ).length;
      
      expect(initiateCallCount).toBe(1);
    });
  });
  
  describe('State Management After Call Ends', () => {
    it('should not show "already on call" error after call ends', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Complete a full call cycle
      await act(async () => {
        await result.current.initiateCall('user2', 'voice');
      });
      
      await act(async () => {
        await socketEventHandlers['call:initiated']({
          callId: 'call-state-test',
          recipientId: 'user2',
          callType: 'voice',
          status: 'initiated',
        });
      });
      
      await act(async () => {
        await socketEventHandlers['call:accepted']({
          callId: 'call-state-test',
          answer: { type: 'answer', sdp: 'mock-answer-sdp' },
          recipientId: 'user2',
        });
      });
      
      await waitFor(() => {
        expect(result.current.callStatus).toBe('connected');
      });
      
      // End the call
      act(() => {
        result.current.endCall();
      });
      
      expect(result.current.callStatus).toBe('idle');
      expect(result.current.callId).toBeNull();
      
      // Should be able to initiate a new call
      await act(async () => {
        await result.current.initiateCall('user3', 'voice');
      });
      
      expect(result.current.callStatus).toBe('calling');
      expect(mockSocket.emit).toHaveBeenCalledWith('call:initiate', {
        recipientId: 'user3',
        callType: 'voice',
      });
    });
    
    it('should reset state properly after decline', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Receive and decline a call
      await act(async () => {
        await socketEventHandlers['call:ringing']({
          callId: 'call-decline-test',
          callType: 'voice',
          caller: mockRecipient,
        });
      });
      
      act(() => {
        result.current.declineCall();
      });
      
      expect(result.current.callStatus).toBe('idle');
      
      // Should be able to make a new call
      await act(async () => {
        await result.current.initiateCall('user3', 'voice');
      });
      
      expect(result.current.callStatus).toBe('calling');
    });
    
    it('should reset state properly after timeout', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Initiate call and let it timeout
      await act(async () => {
        await result.current.initiateCall('user2', 'voice');
      });
      
      await act(async () => {
        await socketEventHandlers['call:initiated']({
          callId: 'call-timeout-state',
          recipientId: 'user2',
          callType: 'voice',
          status: 'initiated',
        });
      });
      
      // Advance time to trigger timeout
      act(() => {
        jest.advanceTimersByTime(30000);
      });
      
      await waitFor(() => {
        expect(result.current.callStatus).toBe('idle');
      });
      
      // Should be able to make a new call
      await act(async () => {
        await result.current.initiateCall('user3', 'voice');
      });
      
      expect(result.current.callStatus).toBe('calling');
    });
  });
  
  describe('Ringtone Playback', () => {
    it('should play outgoing ringtone when calling', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      await act(async () => {
        await result.current.initiateCall('user2', 'voice');
      });
      
      // Check that Audio was created and play was called
      expect(audioInstances.length).toBeGreaterThan(0);
      
      const outgoingAudio = audioInstances.find((instance: any) => 
        instance.src.includes('ringing.mp3')
      );
      expect(outgoingAudio).toBeDefined();
      expect(outgoingAudio.play).toHaveBeenCalled();
    });
    
    it('should play incoming ringtone when receiving call', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      await act(async () => {
        await socketEventHandlers['call:ringing']({
          callId: 'call-ringtone',
          callType: 'voice',
          caller: mockRecipient,
        });
      });
      
      // Wait for ringtone to be created and played
      await waitFor(() => {
        const incomingAudio = audioInstances.find((instance: any) => 
          instance.src.includes('ringing.mp3')
        );
        expect(incomingAudio).toBeDefined();
        expect(incomingAudio.play).toHaveBeenCalled();
      });
    });
    
    it('should stop ringtone when call is answered', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Initiate call
      await act(async () => {
        await result.current.initiateCall('user2', 'voice');
      });
      
      await act(async () => {
        await socketEventHandlers['call:initiated']({
          callId: 'call-ringtone-stop',
          recipientId: 'user2',
          callType: 'voice',
          status: 'initiated',
        });
      });
      
      const outgoingAudio = audioInstances.find((instance: any) => 
        instance.src.includes('ringing.mp3')
      );
      
      // Accept call
      await act(async () => {
        await socketEventHandlers['call:accepted']({
          callId: 'call-ringtone-stop',
          answer: { type: 'answer', sdp: 'mock-answer-sdp' },
          recipientId: 'user2',
        });
      });
      
      // Ringtone should be paused
      expect(outgoingAudio.pause).toHaveBeenCalled();
    });
    
    it('should stop ringtone when call is declined', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Receive call
      await act(async () => {
        await socketEventHandlers['call:ringing']({
          callId: 'call-ringtone-decline',
          callType: 'voice',
          caller: mockRecipient,
        });
      });
      
      const incomingAudio = audioInstances.find((instance: any) => 
        instance.src.includes('ringing.mp3')
      );
      
      // Decline call
      act(() => {
        result.current.declineCall();
      });
      
      expect(incomingAudio.pause).toHaveBeenCalled();
    });
  });
  
  describe('Error Message Display', () => {
    it('should display error when media permission is denied', async () => {
      mockWebRTCService.acquireLocalStream.mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
      );
      
      const { result } = renderHook(() => useCall(), { wrapper });
      
      await act(async () => {
        await result.current.initiateCall('user2', 'voice');
      });
      
      // Should be back to idle with error
      expect(result.current.callStatus).toBe('idle');
      expect(result.current.error).toContain('denied');
    });
    
    it('should display error when device not found', async () => {
      mockWebRTCService.acquireLocalStream.mockRejectedValueOnce(
        Object.assign(new Error('No device found'), { name: 'NotFoundError' })
      );
      
      const { result } = renderHook(() => useCall(), { wrapper });
      
      await act(async () => {
        await result.current.initiateCall('user2', 'video');
      });
      
      expect(result.current.callStatus).toBe('idle');
      expect(result.current.error).toBe('No device found');
    });
    
    it('should display error when device is in use', async () => {
      mockWebRTCService.acquireLocalStream.mockRejectedValueOnce(
        Object.assign(new Error('Device in use'), { name: 'NotReadableError' })
      );
      
      const { result } = renderHook(() => useCall(), { wrapper });
      
      await act(async () => {
        await result.current.initiateCall('user2', 'voice');
      });
      
      expect(result.current.callStatus).toBe('idle');
      expect(result.current.error).toBe('Device in use');
    });
    
    it('should handle recipient busy error', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      await act(async () => {
        await result.current.initiateCall('user2', 'voice');
      });
      
      // Simulate busy error from server
      act(() => {
        socketEventHandlers['call:error']({
          message: 'Recipient is busy',
          code: 'RECIPIENT_BUSY',
        });
      });
      
      expect(result.current.callStatus).toBe('idle');
      expect(result.current.error).toContain('on another call');
    });
    
    it('should handle recipient offline error', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      await act(async () => {
        await result.current.initiateCall('user2', 'voice');
      });
      
      // Simulate offline error from server
      act(() => {
        socketEventHandlers['call:error']({
          message: 'Recipient is offline',
          code: 'RECIPIENT_OFFLINE',
        });
      });
      
      expect(result.current.callStatus).toBe('idle');
      expect(result.current.error).toContain('offline');
    });
  });
  
  describe('Incoming Call Acceptance', () => {
    it('should properly accept incoming call with answer', async () => {
      const { result } = renderHook(() => useCall(), { wrapper });
      
      // Simulate incoming call
      await act(async () => {
        await socketEventHandlers['call:ringing']({
          callId: 'call-accept-test',
          callType: 'voice',
          caller: mockRecipient,
        });
      });
      
      // Simulate offer
      await act(async () => {
        await socketEventHandlers['webrtc:offer']({
          callId: 'call-accept-test',
          callerId: 'user2',
          offer: { type: 'offer', sdp: 'mock-offer-sdp' },
        });
      });
      
      expect(result.current.callStatus).toBe('ringing');
      
      // Accept the call
      await act(async () => {
        await result.current.acceptCall();
      });
      
      // Should have sent answer
      expect(mockSocket.emit).toHaveBeenCalledWith('call:accept', expect.objectContaining({
        callId: 'call-accept-test',
        answer: expect.any(Object),
      }));
      
      expect(result.current.callStatus).toBe('connected');
    });
  });
});
