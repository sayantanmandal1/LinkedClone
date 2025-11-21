import { Socket } from 'socket.io';
import mongoose from 'mongoose';
import { Call, CallStatus, CallType } from '../models/Call';
import { v4 as uuidv4 } from 'uuid';
import { RTCSessionDescriptionInit, RTCIceCandidateInit } from '../types/webrtc';

/**
 * Extended Socket interface with authenticated user
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
}

/**
 * Call initiation data
 */
interface CallInitiateData {
  recipientId: string;
  callType: CallType;
}

/**
 * Call accept data
 */
interface CallAcceptData {
  callId: string;
  answer: RTCSessionDescriptionInit;
}

/**
 * Call decline data
 */
interface CallDeclineData {
  callId: string;
}

/**
 * Call end data
 */
interface CallEndData {
  callId: string;
}

/**
 * WebRTC offer data
 */
interface OfferData {
  callId: string;
  recipientId: string;
  offer: RTCSessionDescriptionInit;
}

/**
 * WebRTC answer data
 */
interface AnswerData {
  callId: string;
  callerId: string;
  answer: RTCSessionDescriptionInit;
}

/**
 * ICE candidate data
 */
interface IceCandidateData {
  callId: string;
  recipientId: string;
  candidate: RTCIceCandidateInit;
}

/**
 * Active call tracking
 */
interface ActiveCall {
  callId: string;
  callerId: string;
  recipientId: string;
  callType: CallType;
  status: CallStatus;
}

/**
 * SignalingService handles WebRTC signaling for voice and video calls
 * Manages call lifecycle, SDP exchange, and ICE candidate exchange
 */
export class SignalingService {
  private activeCalls: Map<string, ActiveCall>; // callId -> ActiveCall
  private userCalls: Map<string, string>; // userId -> callId

  constructor() {
    this.activeCalls = new Map();
    this.userCalls = new Map();
  }

  /**
   * Handle call initiation
   * Creates a new call record and notifies the recipient
   */
  public async handleCallInitiate(
    socket: AuthenticatedSocket,
    io: any,
    userPresence: Map<string, any>,
    data: CallInitiateData
  ): Promise<void> {
    console.log('📞 [CALL:INITIATE] Starting call initiation', {
      socketId: socket.id,
      callerId: socket.userId,
      recipientId: data.recipientId,
      callType: data.callType,
    });

    try {
      // Check authentication
      if (!socket.userId) {
        console.log('❌ [CALL:INITIATE] Authentication required');
        socket.emit('error', { message: 'Authentication required to initiate call' });
        return;
      }

      const { recipientId, callType } = data;

      // Validate input
      if (!recipientId || !callType) {
        console.log('❌ [CALL:INITIATE] Missing required fields', { recipientId, callType });
        socket.emit('error', { message: 'Recipient ID and call type are required' });
        return;
      }

      // Validate call type
      if (callType !== 'voice' && callType !== 'video') {
        console.log('❌ [CALL:INITIATE] Invalid call type', { callType });
        socket.emit('error', { message: 'Invalid call type. Must be "voice" or "video"' });
        return;
      }

      // Prevent calling yourself
      if (socket.userId === recipientId) {
        console.log('❌ [CALL:INITIATE] Cannot call yourself', { userId: socket.userId });
        socket.emit('error', { message: 'Cannot call yourself' });
        return;
      }

      // Check if caller is already on a call
      if (this.userCalls.has(socket.userId)) {
        console.log('❌ [CALL:INITIATE] Caller already on a call', { callerId: socket.userId });
        socket.emit('call:error', { 
          message: 'You are already on a call',
          code: 'ALREADY_ON_CALL'
        });
        return;
      }

      // Check if recipient is already on a call
      if (this.userCalls.has(recipientId)) {
        console.log('❌ [CALL:INITIATE] Recipient busy', { recipientId });
        socket.emit('call:error', { 
          message: 'User is currently on another call',
          code: 'RECIPIENT_BUSY'
        });
        return;
      }

      // Check if recipient is online
      const recipientPresence = userPresence.get(recipientId);
      console.log('🔍 [CALL:INITIATE] Checking recipient presence', {
        recipientId,
        hasPresence: !!recipientPresence,
        isOnline: recipientPresence?.isOnline,
        socketId: recipientPresence?.socketId,
      });

      if (!recipientPresence || !recipientPresence.isOnline) {
        console.log('❌ [CALL:INITIATE] Recipient offline', { recipientId });
        socket.emit('call:error', { 
          message: 'User is currently offline',
          code: 'RECIPIENT_OFFLINE'
        });
        return;
      }

      // Generate unique call ID
      const callId = uuidv4();

      // Create call record in database
      const call = await Call.create({
        callId,
        caller: new mongoose.Types.ObjectId(socket.userId),
        recipient: new mongoose.Types.ObjectId(recipientId),
        callType,
        status: 'initiated',
      });

      // Track active call
      const activeCall: ActiveCall = {
        callId,
        callerId: socket.userId,
        recipientId,
        callType,
        status: 'initiated',
      };
      this.activeCalls.set(callId, activeCall);
      this.userCalls.set(socket.userId, callId);
      this.userCalls.set(recipientId, callId);

      // Update call status to ringing
      call.status = 'ringing';
      await call.save();
      activeCall.status = 'ringing';

      // Populate caller information
      await call.populate('caller', 'name email profilePicture');

      console.log('👤 [CALL:INITIATE] Caller info populated', {
        callId,
        callerName: (call.caller as any).name,
        callerEmail: (call.caller as any).email,
        hasProfilePicture: !!(call.caller as any).profilePicture,
      });

      // Notify recipient of incoming call
      const ringingPayload = {
        callId,
        caller: call.caller,
        callType,
      };

      console.log('🔔 [CALL:INITIATE] Emitting call:ringing to recipient', {
        recipientSocketId: recipientPresence.socketId,
        recipientId,
        payload: {
          callId,
          callerId: socket.userId,
          callerName: (call.caller as any).name,
          callType,
        },
      });

      io.to(recipientPresence.socketId).emit('call:ringing', ringingPayload);

      // Confirm call initiation to caller
      const initiatedPayload = {
        callId,
        recipientId,
        callType,
        status: 'ringing',
      };

      console.log('✅ [CALL:INITIATE] Emitting call:initiated to caller', {
        callerSocketId: socket.id,
        callerId: socket.userId,
        payload: initiatedPayload,
      });

      socket.emit('call:initiated', initiatedPayload);

      console.log(`📞 [CALL:INITIATE] Call successfully initiated: ${callId} from ${socket.userId} to ${recipientId} (${callType})`);

      // Set timeout for call (30 seconds)
      setTimeout(async () => {
        await this.handleCallTimeout(io, userPresence, callId);
      }, 30000);
    } catch (error) {
      console.error('❌ [CALL:INITIATE] Error handling call initiate:', error);
      
      // Clean up any partial state that might have been created
      const callId = this.userCalls.get(socket.userId!);
      if (callId) {
        const activeCall = this.activeCalls.get(callId);
        if (activeCall) {
          this.cleanupCallState(callId, activeCall);
          
          // Update database if call was created
          try {
            const call = await Call.findOne({ callId });
            if (call) {
              call.status = 'failed';
              call.endedAt = new Date();
              await call.save();
            }
          } catch (dbError) {
            console.error('❌ [CALL:INITIATE] Error updating failed call in database:', dbError);
          }
        }
      }
      
      socket.emit('call:error', { 
        message: error instanceof Error ? error.message : 'Failed to initiate call',
        code: 'INITIATE_FAILED'
      });
    }
  }

  /**
   * Handle call acceptance
   * Updates call status and notifies caller to start WebRTC connection
   */
  public async handleCallAccept(
    socket: AuthenticatedSocket,
    io: any,
    userPresence: Map<string, any>,
    data: CallAcceptData
  ): Promise<void> {
    console.log('✅ [CALL:ACCEPT] Starting call acceptance', {
      socketId: socket.id,
      recipientId: socket.userId,
      callId: data.callId,
      hasAnswer: !!data.answer,
    });

    try {
      // Check authentication
      if (!socket.userId) {
        console.log('❌ [CALL:ACCEPT] Authentication required');
        socket.emit('error', { message: 'Authentication required to accept call' });
        return;
      }

      const { callId, answer } = data;

      // Validate input
      if (!callId) {
        console.log('❌ [CALL:ACCEPT] Missing call ID');
        socket.emit('error', { message: 'Call ID is required' });
        return;
      }

      if (!answer) {
        console.log('❌ [CALL:ACCEPT] Missing answer');
        socket.emit('error', { message: 'Answer is required' });
        return;
      }

      // Get active call
      const activeCall = this.activeCalls.get(callId);
      if (!activeCall) {
        socket.emit('call:error', { 
          message: 'Call not found or already ended',
          code: 'CALL_NOT_FOUND'
        });
        return;
      }

      // Verify user is the recipient
      if (activeCall.recipientId !== socket.userId) {
        socket.emit('call:error', { 
          message: 'Not authorized to accept this call',
          code: 'NOT_AUTHORIZED'
        });
        return;
      }

      // Update call status in database
      const call = await Call.findOne({ callId });
      if (!call) {
        socket.emit('call:error', { 
          message: 'Call record not found',
          code: 'CALL_NOT_FOUND'
        });
        return;
      }

      call.status = 'connected';
      call.startedAt = new Date();
      await call.save();

      // Update active call status
      activeCall.status = 'connected';

      // Notify caller that call was accepted with the answer
      const callerPresence = userPresence.get(activeCall.callerId);
      console.log('🔍 [CALL:ACCEPT] Checking caller presence', {
        callerId: activeCall.callerId,
        hasPresence: !!callerPresence,
        isOnline: callerPresence?.isOnline,
        socketId: callerPresence?.socketId,
      });

      if (callerPresence && callerPresence.isOnline) {
        const acceptedPayload = {
          callId,
          recipientId: socket.userId,
          answer,
        };

        console.log('🔔 [CALL:ACCEPT] Emitting call:accepted to caller', {
          callerSocketId: callerPresence.socketId,
          callerId: activeCall.callerId,
          payload: { callId, recipientId: socket.userId, hasAnswer: !!answer },
        });

        io.to(callerPresence.socketId).emit('call:accepted', acceptedPayload);
      } else {
        console.log('⚠️ [CALL:ACCEPT] Caller not online, cannot notify');
      }

      // Confirm acceptance to recipient
      socket.emit('call:accepted', {
        callId,
        callerId: activeCall.callerId,
      });

      console.log(`✅ [CALL:ACCEPT] Call successfully accepted: ${callId} by ${socket.userId}`);
    } catch (error) {
      console.error('❌ [CALL:ACCEPT] Error handling call accept:', error);
      
      // Clean up call state on error
      const { callId } = data;
      if (callId) {
        const activeCall = this.activeCalls.get(callId);
        if (activeCall) {
          this.cleanupCallState(callId, activeCall);
          
          // Update database
          try {
            const call = await Call.findOne({ callId });
            if (call) {
              call.status = 'failed';
              call.endedAt = new Date();
              await call.save();
            }
          } catch (dbError) {
            console.error('❌ [CALL:ACCEPT] Error updating failed call in database:', dbError);
          }
          
          // Notify caller of failure
          const callerPresence = userPresence.get(activeCall.callerId);
          if (callerPresence && callerPresence.isOnline) {
            io.to(callerPresence.socketId).emit('call:error', {
              callId,
              message: 'Call failed to connect',
              code: 'CONNECTION_FAILED',
            });
          }
        }
      }
      
      socket.emit('call:error', { 
        message: error instanceof Error ? error.message : 'Failed to accept call',
        code: 'ACCEPT_FAILED'
      });
    }
  }

  /**
   * Handle call decline
   * Updates call status and notifies caller
   */
  public async handleCallDecline(
    socket: AuthenticatedSocket,
    io: any,
    userPresence: Map<string, any>,
    data: CallDeclineData
  ): Promise<void> {
    console.log('❌ [CALL:DECLINE] Starting call decline', {
      socketId: socket.id,
      recipientId: socket.userId,
      callId: data.callId,
    });

    try {
      // Check authentication
      if (!socket.userId) {
        console.log('❌ [CALL:DECLINE] Authentication required');
        socket.emit('error', { message: 'Authentication required to decline call' });
        return;
      }

      const { callId } = data;

      // Validate input
      if (!callId) {
        console.log('❌ [CALL:DECLINE] Missing call ID');
        socket.emit('error', { message: 'Call ID is required' });
        return;
      }

      // Get active call
      const activeCall = this.activeCalls.get(callId);
      if (!activeCall) {
        socket.emit('call:error', { 
          message: 'Call not found or already ended',
          code: 'CALL_NOT_FOUND'
        });
        return;
      }

      // Verify user is the recipient
      if (activeCall.recipientId !== socket.userId) {
        socket.emit('call:error', { 
          message: 'Not authorized to decline this call',
          code: 'NOT_AUTHORIZED'
        });
        return;
      }

      // Update call status in database
      const call = await Call.findOne({ callId });
      if (call) {
        call.status = 'declined';
        call.endedAt = new Date();
        await call.save();
      }

      // Clean up active call tracking
      this.cleanupCallState(callId, activeCall);

      // Notify caller that call was declined
      const callerPresence = userPresence.get(activeCall.callerId);
      console.log('🔍 [CALL:DECLINE] Checking caller presence', {
        callerId: activeCall.callerId,
        hasPresence: !!callerPresence,
        isOnline: callerPresence?.isOnline,
      });

      if (callerPresence && callerPresence.isOnline) {
        console.log('🔔 [CALL:DECLINE] Emitting call:declined to caller', {
          callerSocketId: callerPresence.socketId,
          callerId: activeCall.callerId,
        });

        io.to(callerPresence.socketId).emit('call:declined', {
          callId,
          recipientId: socket.userId,
        });
      }

      // Confirm decline to recipient
      socket.emit('call:declined', {
        callId,
      });

      console.log(`❌ [CALL:DECLINE] Call successfully declined: ${callId} by ${socket.userId}`);
    } catch (error) {
      console.error('❌ [CALL:DECLINE] Error handling call decline:', error);
      
      // Ensure cleanup even on error
      const { callId } = data;
      if (callId) {
        const activeCall = this.activeCalls.get(callId);
        if (activeCall) {
          this.cleanupCallState(callId, activeCall);
        }
      }
      
      socket.emit('call:error', { 
        message: error instanceof Error ? error.message : 'Failed to decline call',
        code: 'DECLINE_FAILED'
      });
    }
  }

  /**
   * Handle call end
   * Updates call status and notifies other participant
   */
  public async handleCallEnd(
    socket: AuthenticatedSocket,
    io: any,
    userPresence: Map<string, any>,
    data: CallEndData
  ): Promise<void> {
    console.log('🔚 [CALL:END] Starting call end', {
      socketId: socket.id,
      userId: socket.userId,
      callId: data.callId,
    });

    try {
      // Check authentication
      if (!socket.userId) {
        console.log('❌ [CALL:END] Authentication required');
        socket.emit('error', { message: 'Authentication required to end call' });
        return;
      }

      const { callId } = data;

      // Validate input
      if (!callId) {
        console.log('❌ [CALL:END] Missing call ID');
        socket.emit('error', { message: 'Call ID is required' });
        return;
      }

      // Get active call
      const activeCall = this.activeCalls.get(callId);
      if (!activeCall) {
        console.log('⚠️ [CALL:END] Call not found or already ended', { callId });
        // Call might already be ended, just confirm
        socket.emit('call:ended', { callId });
        return;
      }

      console.log('🔍 [CALL:END] Active call found', {
        callId,
        callerId: activeCall.callerId,
        recipientId: activeCall.recipientId,
        status: activeCall.status,
      });

      // Verify user is a participant
      if (activeCall.callerId !== socket.userId && activeCall.recipientId !== socket.userId) {
        console.log('❌ [CALL:END] User not authorized', { userId: socket.userId });
        socket.emit('call:error', { 
          message: 'Not authorized to end this call',
          code: 'NOT_AUTHORIZED'
        });
        return;
      }

      // Update call status in database
      const call = await Call.findOne({ callId });
      if (call) {
        call.status = 'ended';
        call.endedAt = new Date();
        await call.save();
        console.log('💾 [CALL:END] Call status updated in database');
      }

      // Determine other participant
      const otherParticipantId = activeCall.callerId === socket.userId 
        ? activeCall.recipientId 
        : activeCall.callerId;

      console.log('🔍 [CALL:END] Other participant', { otherParticipantId });

      // Clean up active call tracking
      this.cleanupCallState(callId, activeCall);

      // Notify other participant that call ended
      const otherParticipantPresence = userPresence.get(otherParticipantId);
      console.log('🔍 [CALL:END] Checking other participant presence', {
        otherParticipantId,
        hasPresence: !!otherParticipantPresence,
        isOnline: otherParticipantPresence?.isOnline,
      });

      if (otherParticipantPresence && otherParticipantPresence.isOnline) {
        console.log('🔔 [CALL:END] Emitting call:ended to other participant', {
          socketId: otherParticipantPresence.socketId,
        });

        io.to(otherParticipantPresence.socketId).emit('call:ended', {
          callId,
          endedBy: socket.userId,
        });
      }

      // Confirm end to initiator
      socket.emit('call:ended', {
        callId,
      });

      console.log(`🔚 [CALL:END] Call successfully ended: ${callId} by ${socket.userId}`);
    } catch (error) {
      console.error('❌ [CALL:END] Error handling call end:', error);
      
      // Ensure cleanup even on error
      const { callId } = data;
      if (callId) {
        const activeCall = this.activeCalls.get(callId);
        if (activeCall) {
          this.cleanupCallState(callId, activeCall);
        }
      }
      
      socket.emit('call:error', { 
        message: error instanceof Error ? error.message : 'Failed to end call',
        code: 'END_FAILED'
      });
    }
  }

  /**
   * Handle WebRTC offer
   * Forwards SDP offer from caller to recipient
   */
  public handleOffer(
    socket: AuthenticatedSocket,
    io: any,
    userPresence: Map<string, any>,
    data: OfferData
  ): void {
    console.log('📡 [WEBRTC:OFFER] Handling WebRTC offer', {
      socketId: socket.id,
      callerId: socket.userId,
      callId: data.callId,
      recipientId: data.recipientId,
      hasOffer: !!data.offer,
    });

    try {
      // Check authentication
      if (!socket.userId) {
        console.log('❌ [WEBRTC:OFFER] Authentication required');
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { callId, recipientId, offer } = data;

      // Validate input
      if (!callId || !recipientId || !offer) {
        console.log('❌ [WEBRTC:OFFER] Missing required fields');
        socket.emit('error', { message: 'Call ID, recipient ID, and offer are required' });
        return;
      }

      // Get active call
      const activeCall = this.activeCalls.get(callId);
      if (!activeCall) {
        console.log('❌ [WEBRTC:OFFER] Call not found', { callId });
        socket.emit('call:error', { 
          message: 'Call not found',
          code: 'CALL_NOT_FOUND'
        });
        return;
      }

      // Verify user is the caller
      if (activeCall.callerId !== socket.userId) {
        console.log('❌ [WEBRTC:OFFER] Not authorized', { userId: socket.userId, callerId: activeCall.callerId });
        socket.emit('call:error', { 
          message: 'Not authorized to send offer for this call',
          code: 'NOT_AUTHORIZED'
        });
        return;
      }

      // Forward offer to recipient
      const recipientPresence = userPresence.get(recipientId);
      console.log('🔍 [WEBRTC:OFFER] Checking recipient presence', {
        recipientId,
        hasPresence: !!recipientPresence,
        isOnline: recipientPresence?.isOnline,
        socketId: recipientPresence?.socketId,
      });

      if (recipientPresence && recipientPresence.isOnline) {
        console.log('🔔 [WEBRTC:OFFER] Forwarding offer to recipient', {
          recipientSocketId: recipientPresence.socketId,
        });

        io.to(recipientPresence.socketId).emit('webrtc:offer', {
          callId,
          callerId: socket.userId,
          offer,
        });

        console.log(`📡 [WEBRTC:OFFER] WebRTC offer forwarded for call ${callId}`);
      } else {
        console.log('❌ [WEBRTC:OFFER] Recipient offline');
        socket.emit('call:error', { 
          message: 'Recipient is offline',
          code: 'RECIPIENT_OFFLINE'
        });
      }
    } catch (error) {
      console.error('❌ [WEBRTC:OFFER] Error handling WebRTC offer:', error);
      socket.emit('call:error', { 
        message: 'Failed to send offer',
        code: 'OFFER_FAILED'
      });
    }
  }

  /**
   * Handle WebRTC answer
   * Forwards SDP answer from recipient to caller
   */
  public handleAnswer(
    socket: AuthenticatedSocket,
    io: any,
    userPresence: Map<string, any>,
    data: AnswerData
  ): void {
    console.log('📡 [WEBRTC:ANSWER] Handling WebRTC answer', {
      socketId: socket.id,
      recipientId: socket.userId,
      callId: data.callId,
      callerId: data.callerId,
      hasAnswer: !!data.answer,
    });

    try {
      // Check authentication
      if (!socket.userId) {
        console.log('❌ [WEBRTC:ANSWER] Authentication required');
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { callId, callerId, answer } = data;

      // Validate input
      if (!callId || !callerId || !answer) {
        console.log('❌ [WEBRTC:ANSWER] Missing required fields');
        socket.emit('error', { message: 'Call ID, caller ID, and answer are required' });
        return;
      }

      // Get active call
      const activeCall = this.activeCalls.get(callId);
      if (!activeCall) {
        console.log('❌ [WEBRTC:ANSWER] Call not found', { callId });
        socket.emit('call:error', { 
          message: 'Call not found',
          code: 'CALL_NOT_FOUND'
        });
        return;
      }

      // Verify user is the recipient
      if (activeCall.recipientId !== socket.userId) {
        console.log('❌ [WEBRTC:ANSWER] Not authorized', { userId: socket.userId, recipientId: activeCall.recipientId });
        socket.emit('call:error', { 
          message: 'Not authorized to send answer for this call',
          code: 'NOT_AUTHORIZED'
        });
        return;
      }

      // Forward answer to caller
      const callerPresence = userPresence.get(callerId);
      console.log('🔍 [WEBRTC:ANSWER] Checking caller presence', {
        callerId,
        hasPresence: !!callerPresence,
        isOnline: callerPresence?.isOnline,
        socketId: callerPresence?.socketId,
      });

      if (callerPresence && callerPresence.isOnline) {
        console.log('🔔 [WEBRTC:ANSWER] Forwarding answer to caller', {
          callerSocketId: callerPresence.socketId,
        });

        io.to(callerPresence.socketId).emit('webrtc:answer', {
          callId,
          recipientId: socket.userId,
          answer,
        });

        console.log(`📡 [WEBRTC:ANSWER] WebRTC answer forwarded for call ${callId}`);
      } else {
        console.log('❌ [WEBRTC:ANSWER] Caller offline');
        socket.emit('call:error', { 
          message: 'Caller is offline',
          code: 'CALLER_OFFLINE'
        });
      }
    } catch (error) {
      console.error('❌ [WEBRTC:ANSWER] Error handling WebRTC answer:', error);
      socket.emit('call:error', { 
        message: 'Failed to send answer',
        code: 'ANSWER_FAILED'
      });
    }
  }

  /**
   * Handle ICE candidate
   * Forwards ICE candidate to the other participant
   */
  public handleIceCandidate(
    socket: AuthenticatedSocket,
    io: any,
    userPresence: Map<string, any>,
    data: IceCandidateData
  ): void {
    console.log('🧊 [WEBRTC:ICE] Handling ICE candidate', {
      socketId: socket.id,
      senderId: socket.userId,
      callId: data.callId,
      recipientId: data.recipientId,
      hasCandidate: !!data.candidate,
    });

    try {
      // Check authentication
      if (!socket.userId) {
        console.log('❌ [WEBRTC:ICE] Authentication required');
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { callId, recipientId, candidate } = data;

      // Validate input
      if (!callId || !recipientId || !candidate) {
        console.log('❌ [WEBRTC:ICE] Missing required fields');
        socket.emit('error', { message: 'Call ID, recipient ID, and candidate are required' });
        return;
      }

      // Get active call
      const activeCall = this.activeCalls.get(callId);
      if (!activeCall) {
        console.log('⚠️ [WEBRTC:ICE] Call not found, silently ignoring', { callId });
        // Call might have ended, silently ignore
        return;
      }

      // Verify user is a participant
      if (activeCall.callerId !== socket.userId && activeCall.recipientId !== socket.userId) {
        console.log('❌ [WEBRTC:ICE] Not authorized', { userId: socket.userId });
        socket.emit('call:error', { 
          message: 'Not authorized to send ICE candidate for this call',
          code: 'NOT_AUTHORIZED'
        });
        return;
      }

      // Forward ICE candidate to recipient
      const recipientPresence = userPresence.get(recipientId);
      console.log('🔍 [WEBRTC:ICE] Checking recipient presence', {
        recipientId,
        hasPresence: !!recipientPresence,
        isOnline: recipientPresence?.isOnline,
      });

      if (recipientPresence && recipientPresence.isOnline) {
        console.log('🔔 [WEBRTC:ICE] Forwarding ICE candidate to recipient', {
          recipientSocketId: recipientPresence.socketId,
        });

        io.to(recipientPresence.socketId).emit('webrtc:ice-candidate', {
          callId,
          senderId: socket.userId,
          candidate,
        });

        console.log(`🧊 [WEBRTC:ICE] ICE candidate forwarded for call ${callId}`);
      } else {
        console.log('⚠️ [WEBRTC:ICE] Recipient offline, cannot forward ICE candidate');
      }
    } catch (error) {
      console.error('❌ [WEBRTC:ICE] Error handling ICE candidate:', error);
    }
  }

  /**
   * Handle call timeout
   * Automatically ends call if not answered within timeout period
   */
  private async handleCallTimeout(
    io: any,
    userPresence: Map<string, any>,
    callId: string
  ): Promise<void> {
    try {
      // Get active call
      const activeCall = this.activeCalls.get(callId);
      if (!activeCall) {
        // Call already ended or accepted
        console.log(`⏱️  [CALL:TIMEOUT] Call ${callId} already ended or accepted`);
        return;
      }

      // Only timeout if still in ringing state
      if (activeCall.status !== 'ringing') {
        console.log(`⏱️  [CALL:TIMEOUT] Call ${callId} not in ringing state (${activeCall.status}), skipping timeout`);
        return;
      }

      console.log(`⏱️  [CALL:TIMEOUT] Processing timeout for call ${callId}`);

      // Update call status in database
      const call = await Call.findOne({ callId });
      if (call) {
        call.status = 'missed';
        call.endedAt = new Date();
        await call.save();
        console.log(`💾 [CALL:TIMEOUT] Updated call ${callId} status to 'missed' in database`);
      }

      // Clean up active call tracking
      this.cleanupCallState(callId, activeCall);

      // Notify both participants with specific error code
      const callerPresence = userPresence.get(activeCall.callerId);
      if (callerPresence && callerPresence.isOnline) {
        io.to(callerPresence.socketId).emit('call:error', {
          callId,
          message: 'No answer - call timed out',
          code: 'TIMEOUT',
        });
        console.log(`🔔 [CALL:TIMEOUT] Notified caller ${activeCall.callerId} of timeout`);
      }

      const recipientPresence = userPresence.get(activeCall.recipientId);
      if (recipientPresence && recipientPresence.isOnline) {
        io.to(recipientPresence.socketId).emit('call:ended', {
          callId,
          reason: 'timeout',
        });
        console.log(`🔔 [CALL:TIMEOUT] Notified recipient ${activeCall.recipientId} of timeout`);
      }

      console.log(`⏱️  [CALL:TIMEOUT] Call timeout completed: ${callId}`);
    } catch (error) {
      console.error('❌ [CALL:TIMEOUT] Error handling call timeout:', error);
      // Still try to clean up state even if database update fails
      const activeCall = this.activeCalls.get(callId);
      if (activeCall) {
        this.cleanupCallState(callId, activeCall);
      }
    }
  }

  /**
   * Clean up call state
   * Centralized method to ensure consistent cleanup
   */
  private cleanupCallState(callId: string, activeCall: ActiveCall): void {
    this.activeCalls.delete(callId);
    this.userCalls.delete(activeCall.callerId);
    this.userCalls.delete(activeCall.recipientId);
    console.log(`🧹 [CLEANUP] Cleaned up state for call ${callId}`);
  }

  /**
   * Clean up call when user disconnects
   * Ends any active calls for the disconnected user
   */
  public async handleUserDisconnect(
    io: any,
    userPresence: Map<string, any>,
    userId: string
  ): Promise<void> {
    try {
      const callId = this.userCalls.get(userId);
      if (!callId) {
        return;
      }

      const activeCall = this.activeCalls.get(callId);
      if (!activeCall) {
        return;
      }

      // Update call status in database
      const call = await Call.findOne({ callId });
      if (call && call.status !== 'ended') {
        call.status = 'ended';
        call.endedAt = new Date();
        await call.save();
      }

      // Determine other participant
      const otherParticipantId = activeCall.callerId === userId 
        ? activeCall.recipientId 
        : activeCall.callerId;

      // Clean up active call tracking
      this.cleanupCallState(callId, activeCall);

      // Notify other participant
      const otherParticipantPresence = userPresence.get(otherParticipantId);
      if (otherParticipantPresence && otherParticipantPresence.isOnline) {
        io.to(otherParticipantPresence.socketId).emit('call:ended', {
          callId,
          endedBy: userId,
          reason: 'disconnect',
        });
      }

      console.log(`🔌 Call ended due to disconnect: ${callId} (User: ${userId})`);
    } catch (error) {
      console.error('Error handling user disconnect for call:', error);
    }
  }

  /**
   * Check if user is currently on a call
   */
  public isUserOnCall(userId: string): boolean {
    return this.userCalls.has(userId);
  }

  /**
   * Get active call for a user
   */
  public getUserActiveCall(userId: string): ActiveCall | null {
    const callId = this.userCalls.get(userId);
    if (!callId) {
      return null;
    }
    return this.activeCalls.get(callId) || null;
  }
}
