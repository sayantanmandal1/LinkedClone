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
    try {
      // Check authentication
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required to initiate call' });
        return;
      }

      const { recipientId, callType } = data;

      // Validate input
      if (!recipientId || !callType) {
        socket.emit('error', { message: 'Recipient ID and call type are required' });
        return;
      }

      // Validate call type
      if (callType !== 'voice' && callType !== 'video') {
        socket.emit('error', { message: 'Invalid call type. Must be "voice" or "video"' });
        return;
      }

      // Prevent calling yourself
      if (socket.userId === recipientId) {
        socket.emit('error', { message: 'Cannot call yourself' });
        return;
      }

      // Check if caller is already on a call
      if (this.userCalls.has(socket.userId)) {
        socket.emit('call:error', { 
          message: 'You are already on a call',
          code: 'ALREADY_ON_CALL'
        });
        return;
      }

      // Check if recipient is already on a call
      if (this.userCalls.has(recipientId)) {
        socket.emit('call:error', { 
          message: 'User is currently on another call',
          code: 'RECIPIENT_BUSY'
        });
        return;
      }

      // Check if recipient is online
      const recipientPresence = userPresence.get(recipientId);
      if (!recipientPresence || !recipientPresence.isOnline) {
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

      // Notify recipient of incoming call
      io.to(recipientPresence.socketId).emit('call:ringing', {
        callId,
        caller: call.caller,
        callType,
      });

      // Confirm call initiation to caller
      socket.emit('call:initiated', {
        callId,
        recipientId,
        callType,
        status: 'ringing',
      });

      console.log(`📞 Call initiated: ${callId} from ${socket.userId} to ${recipientId} (${callType})`);

      // Set timeout for call (30 seconds)
      setTimeout(async () => {
        await this.handleCallTimeout(io, userPresence, callId);
      }, 30000);
    } catch (error) {
      console.error('Error handling call initiate:', error);
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
    try {
      // Check authentication
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required to accept call' });
        return;
      }

      const { callId, answer } = data;

      // Validate input
      if (!callId) {
        socket.emit('error', { message: 'Call ID is required' });
        return;
      }

      if (!answer) {
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
      if (callerPresence && callerPresence.isOnline) {
        io.to(callerPresence.socketId).emit('call:accepted', {
          callId,
          recipientId: socket.userId,
          answer,
        });
      }

      // Confirm acceptance to recipient
      socket.emit('call:accepted', {
        callId,
        callerId: activeCall.callerId,
      });

      console.log(`✅ Call accepted: ${callId} by ${socket.userId}`);
    } catch (error) {
      console.error('Error handling call accept:', error);
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
    try {
      // Check authentication
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required to decline call' });
        return;
      }

      const { callId } = data;

      // Validate input
      if (!callId) {
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
      this.activeCalls.delete(callId);
      this.userCalls.delete(activeCall.callerId);
      this.userCalls.delete(activeCall.recipientId);

      // Notify caller that call was declined
      const callerPresence = userPresence.get(activeCall.callerId);
      if (callerPresence && callerPresence.isOnline) {
        io.to(callerPresence.socketId).emit('call:declined', {
          callId,
          recipientId: socket.userId,
        });
      }

      // Confirm decline to recipient
      socket.emit('call:declined', {
        callId,
      });

      console.log(`❌ Call declined: ${callId} by ${socket.userId}`);
    } catch (error) {
      console.error('Error handling call decline:', error);
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
    try {
      // Check authentication
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required to end call' });
        return;
      }

      const { callId } = data;

      // Validate input
      if (!callId) {
        socket.emit('error', { message: 'Call ID is required' });
        return;
      }

      // Get active call
      const activeCall = this.activeCalls.get(callId);
      if (!activeCall) {
        // Call might already be ended, just confirm
        socket.emit('call:ended', { callId });
        return;
      }

      // Verify user is a participant
      if (activeCall.callerId !== socket.userId && activeCall.recipientId !== socket.userId) {
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
      }

      // Determine other participant
      const otherParticipantId = activeCall.callerId === socket.userId 
        ? activeCall.recipientId 
        : activeCall.callerId;

      // Clean up active call tracking
      this.activeCalls.delete(callId);
      this.userCalls.delete(activeCall.callerId);
      this.userCalls.delete(activeCall.recipientId);

      // Notify other participant that call ended
      const otherParticipantPresence = userPresence.get(otherParticipantId);
      if (otherParticipantPresence && otherParticipantPresence.isOnline) {
        io.to(otherParticipantPresence.socketId).emit('call:ended', {
          callId,
          endedBy: socket.userId,
        });
      }

      // Confirm end to initiator
      socket.emit('call:ended', {
        callId,
      });

      console.log(`🔚 Call ended: ${callId} by ${socket.userId}`);
    } catch (error) {
      console.error('Error handling call end:', error);
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
    try {
      // Check authentication
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { callId, recipientId, offer } = data;

      // Validate input
      if (!callId || !recipientId || !offer) {
        socket.emit('error', { message: 'Call ID, recipient ID, and offer are required' });
        return;
      }

      // Get active call
      const activeCall = this.activeCalls.get(callId);
      if (!activeCall) {
        socket.emit('call:error', { 
          message: 'Call not found',
          code: 'CALL_NOT_FOUND'
        });
        return;
      }

      // Verify user is the caller
      if (activeCall.callerId !== socket.userId) {
        socket.emit('call:error', { 
          message: 'Not authorized to send offer for this call',
          code: 'NOT_AUTHORIZED'
        });
        return;
      }

      // Forward offer to recipient
      const recipientPresence = userPresence.get(recipientId);
      if (recipientPresence && recipientPresence.isOnline) {
        io.to(recipientPresence.socketId).emit('webrtc:offer', {
          callId,
          callerId: socket.userId,
          offer,
        });

        console.log(`📡 WebRTC offer forwarded for call ${callId}`);
      } else {
        socket.emit('call:error', { 
          message: 'Recipient is offline',
          code: 'RECIPIENT_OFFLINE'
        });
      }
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
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
    try {
      // Check authentication
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { callId, callerId, answer } = data;

      // Validate input
      if (!callId || !callerId || !answer) {
        socket.emit('error', { message: 'Call ID, caller ID, and answer are required' });
        return;
      }

      // Get active call
      const activeCall = this.activeCalls.get(callId);
      if (!activeCall) {
        socket.emit('call:error', { 
          message: 'Call not found',
          code: 'CALL_NOT_FOUND'
        });
        return;
      }

      // Verify user is the recipient
      if (activeCall.recipientId !== socket.userId) {
        socket.emit('call:error', { 
          message: 'Not authorized to send answer for this call',
          code: 'NOT_AUTHORIZED'
        });
        return;
      }

      // Forward answer to caller
      const callerPresence = userPresence.get(callerId);
      if (callerPresence && callerPresence.isOnline) {
        io.to(callerPresence.socketId).emit('webrtc:answer', {
          callId,
          recipientId: socket.userId,
          answer,
        });

        console.log(`📡 WebRTC answer forwarded for call ${callId}`);
      } else {
        socket.emit('call:error', { 
          message: 'Caller is offline',
          code: 'CALLER_OFFLINE'
        });
      }
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
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
    try {
      // Check authentication
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { callId, recipientId, candidate } = data;

      // Validate input
      if (!callId || !recipientId || !candidate) {
        socket.emit('error', { message: 'Call ID, recipient ID, and candidate are required' });
        return;
      }

      // Get active call
      const activeCall = this.activeCalls.get(callId);
      if (!activeCall) {
        // Call might have ended, silently ignore
        return;
      }

      // Verify user is a participant
      if (activeCall.callerId !== socket.userId && activeCall.recipientId !== socket.userId) {
        socket.emit('call:error', { 
          message: 'Not authorized to send ICE candidate for this call',
          code: 'NOT_AUTHORIZED'
        });
        return;
      }

      // Forward ICE candidate to recipient
      const recipientPresence = userPresence.get(recipientId);
      if (recipientPresence && recipientPresence.isOnline) {
        io.to(recipientPresence.socketId).emit('webrtc:ice-candidate', {
          callId,
          senderId: socket.userId,
          candidate,
        });

        console.log(`🧊 ICE candidate forwarded for call ${callId}`);
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
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
        return;
      }

      // Only timeout if still in ringing state
      if (activeCall.status !== 'ringing') {
        return;
      }

      // Update call status in database
      const call = await Call.findOne({ callId });
      if (call) {
        call.status = 'missed';
        call.endedAt = new Date();
        await call.save();
      }

      // Clean up active call tracking
      this.activeCalls.delete(callId);
      this.userCalls.delete(activeCall.callerId);
      this.userCalls.delete(activeCall.recipientId);

      // Notify both participants
      const callerPresence = userPresence.get(activeCall.callerId);
      if (callerPresence && callerPresence.isOnline) {
        io.to(callerPresence.socketId).emit('call:timeout', {
          callId,
          message: 'No answer',
        });
      }

      const recipientPresence = userPresence.get(activeCall.recipientId);
      if (recipientPresence && recipientPresence.isOnline) {
        io.to(recipientPresence.socketId).emit('call:timeout', {
          callId,
        });
      }

      console.log(`⏱️  Call timeout: ${callId}`);
    } catch (error) {
      console.error('Error handling call timeout:', error);
    }
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
      this.activeCalls.delete(callId);
      this.userCalls.delete(activeCall.callerId);
      this.userCalls.delete(activeCall.recipientId);

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
