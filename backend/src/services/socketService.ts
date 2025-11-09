import { Server as SocketIOServer, Socket } from 'socket.io';
import { JwtUtils } from '../utils/jwt';
import { User, UserDocument } from '../models/User';
import { ChatService } from './chatService';
import { Message, MessageStatus } from '../models/Message';
import { Conversation } from '../models/Conversation';

/**
 * User presence information stored in memory
 */
export interface UserPresence {
  userId: string;
  socketId: string;
  isOnline: boolean;
  lastOnline: Date;
  activeConversations: Set<string>;
}

/**
 * Rate limit tracking for message sending
 */
interface RateLimitEntry {
  timestamps: number[];
}

/**
 * Extended Socket interface with authenticated user
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: UserDocument;
}

/**
 * SocketService handles all WebSocket connections and real-time communication
 * Implements presence management, room management, and message broadcasting
 */
export class SocketService {
  private io: SocketIOServer;
  private userPresence: Map<string, UserPresence>;
  private socketToUser: Map<string, string>; // socketId -> userId
  private rateLimits: Map<string, RateLimitEntry>;
  
  // Rate limiting configuration
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
  private readonly RATE_LIMIT_MAX_MESSAGES = 10;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.userPresence = new Map();
    this.socketToUser = new Map();
    this.rateLimits = new Map();
    
    this.initializeSocketHandlers();
  }

  /**
   * Initialize Socket.io connection handlers
   */
  private initializeSocketHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);
      
      // Handle authentication
      socket.on('authenticate', async (data: { token: string }) => {
        await this.handleAuthentication(socket, data.token);
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
      
      // Message event handlers
      socket.on('message:send', async (data: { conversationId: string; content: string }) => {
        await this.handleMessageSend(socket, data);
      });
      
      socket.on('message:read', async (data: { conversationId: string; messageIds: string[] }) => {
        await this.handleMessageRead(socket, data);
      });
      
      // Typing indicator handlers
      socket.on('typing:start', (data: { conversationId: string }) => {
        this.handleTypingStart(socket, data);
      });
      
      socket.on('typing:stop', (data: { conversationId: string }) => {
        this.handleTypingStop(socket, data);
      });
      
      // Conversation presence handlers
      socket.on('conversation:open', (data: { conversationId: string }) => {
        this.handleConversationOpen(socket, data);
      });
      
      socket.on('conversation:close', (data: { conversationId: string }) => {
        this.handleConversationClose(socket, data);
      });
    });
  }

  /**
   * Authenticate a WebSocket connection using JWT token
   */
  private async handleAuthentication(
    socket: AuthenticatedSocket,
    token: string
  ): Promise<void> {
    try {
      // Verify JWT token
      const decoded = JwtUtils.verifyToken(token);
      
      // Find user in database
      const user = await User.findById(decoded.userId);
      if (!user) {
        socket.emit('error', { message: 'Authentication failed: User not found' });
        socket.disconnect();
        return;
      }
      
      // Attach user information to socket
      socket.userId = user._id.toString();
      socket.user = user;
      
      // Set user as online
      this.setUserOnline(socket.userId, socket.id);
      
      // Emit authenticated event
      socket.emit('authenticated', { userId: socket.userId });
      
      // Broadcast presence update to relevant users
      this.broadcastPresence(socket.userId);
      
      console.log(`✅ Socket authenticated: ${socket.id} (User: ${user.name})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      console.error('Socket authentication error:', errorMessage);
      
      // Provide specific error message for token expiration
      if (errorMessage.includes('expired')) {
        socket.emit('error', { 
          message: 'Token has expired. Please refresh your session.',
          code: 'TOKEN_EXPIRED'
        });
      } else {
        socket.emit('error', { 
          message: errorMessage,
          code: 'AUTH_FAILED'
        });
      }
      socket.disconnect();
    }
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId;
    
    if (userId) {
      this.setUserOffline(userId);
      this.socketToUser.delete(socket.id);
      
      // Broadcast presence update
      this.broadcastPresence(userId);
      
      console.log(`❌ Socket disconnected: ${socket.id} (User ID: ${userId})`);
    } else {
      console.log(`❌ Socket disconnected: ${socket.id} (Unauthenticated)`);
    }
  }

  /**
   * Set a user as online and track their presence
   */
  public setUserOnline(userId: string, socketId: string): void {
    const existingPresence = this.userPresence.get(userId);
    
    const presence: UserPresence = {
      userId,
      socketId,
      isOnline: true,
      lastOnline: new Date(),
      activeConversations: existingPresence?.activeConversations || new Set(),
    };
    
    this.userPresence.set(userId, presence);
    this.socketToUser.set(socketId, userId);
  }

  /**
   * Set a user as offline and update their last online timestamp
   */
  public setUserOffline(userId: string): void {
    const presence = this.userPresence.get(userId);
    
    if (presence) {
      presence.isOnline = false;
      presence.lastOnline = new Date();
      this.userPresence.set(userId, presence);
    }
  }

  /**
   * Get user presence information
   */
  public getUserPresence(userId: string): UserPresence | null {
    return this.userPresence.get(userId) || null;
  }

  /**
   * Broadcast presence update to all users in active conversations
   */
  public broadcastPresence(userId: string): void {
    const presence = this.userPresence.get(userId);
    
    if (!presence) {
      return;
    }
    
    const presenceData = {
      userId,
      isOnline: presence.isOnline,
      lastOnline: presence.lastOnline,
    };
    
    // Broadcast to all active conversations
    presence.activeConversations.forEach((conversationId) => {
      this.io.to(conversationId).emit('presence:update', presenceData);
    });
  }

  /**
   * Join a conversation room
   */
  public joinConversationRoom(socket: AuthenticatedSocket, conversationId: string): void {
    if (!socket.userId) {
      socket.emit('error', { message: 'Authentication required to join conversation' });
      return;
    }
    
    socket.join(conversationId);
    
    // Track active conversation for presence
    const presence = this.userPresence.get(socket.userId);
    if (presence) {
      presence.activeConversations.add(conversationId);
    }
    
    console.log(`👥 User ${socket.userId} joined conversation room: ${conversationId}`);
  }

  /**
   * Leave a conversation room
   */
  public leaveConversationRoom(socket: AuthenticatedSocket, conversationId: string): void {
    if (!socket.userId) {
      return;
    }
    
    socket.leave(conversationId);
    
    // Remove from active conversations
    const presence = this.userPresence.get(socket.userId);
    if (presence) {
      presence.activeConversations.delete(conversationId);
    }
    
    console.log(`👋 User ${socket.userId} left conversation room: ${conversationId}`);
  }

  /**
   * Deliver a message to a specific user
   */
  public deliverMessage(messageData: any, recipientId: string): void {
    const presence = this.userPresence.get(recipientId);
    
    if (presence && presence.isOnline) {
      this.io.to(presence.socketId).emit('message:new', messageData);
    }
  }

  /**
   * Broadcast a message to a conversation room
   */
  public broadcastToConversation(conversationId: string, event: string, data: any): void {
    this.io.to(conversationId).emit(event, data);
  }

  /**
   * Broadcast typing indicator to conversation
   */
  public broadcastTyping(
    conversationId: string,
    userId: string,
    isTyping: boolean
  ): void {
    this.io.to(conversationId).emit('typing:update', {
      conversationId,
      userId,
      isTyping,
    });
  }

  /**
   * Broadcast message status update to sender
   */
  public broadcastMessageStatus(
    senderId: string,
    messageId: string,
    status: string,
    timestamp: Date
  ): void {
    const presence = this.userPresence.get(senderId);
    
    if (presence && presence.isOnline) {
      this.io.to(presence.socketId).emit('message:status', {
        messageId,
        status,
        timestamp,
      });
    }
  }

  /**
   * Check rate limit for message sending
   * Returns true if user is within rate limit, false if exceeded
   */
  public checkRateLimit(userId: string): boolean {
    const now = Date.now();
    let entry = this.rateLimits.get(userId);
    
    if (!entry) {
      entry = { timestamps: [] };
      this.rateLimits.set(userId, entry);
    }
    
    // Remove timestamps older than the rate limit window
    entry.timestamps = entry.timestamps.filter(
      (timestamp) => now - timestamp < this.RATE_LIMIT_WINDOW
    );
    
    // Check if user has exceeded rate limit
    if (entry.timestamps.length >= this.RATE_LIMIT_MAX_MESSAGES) {
      return false;
    }
    
    // Add current timestamp
    entry.timestamps.push(now);
    
    return true;
  }

  /**
   * Get socket instance for a user
   */
  public getUserSocket(userId: string): Socket | null {
    const presence = this.userPresence.get(userId);
    
    if (presence && presence.isOnline) {
      return this.io.sockets.sockets.get(presence.socketId) || null;
    }
    
    return null;
  }

  /**
   * Check if a user is online
   */
  public isUserOnline(userId: string): boolean {
    const presence = this.userPresence.get(userId);
    return presence?.isOnline || false;
  }

  /**
   * Get all online users (for debugging/monitoring)
   */
  public getOnlineUsers(): string[] {
    const onlineUsers: string[] = [];
    
    this.userPresence.forEach((presence, userId) => {
      if (presence.isOnline) {
        onlineUsers.push(userId);
      }
    });
    
    return onlineUsers;
  }

  /**
   * Clean up stale presence data (optional maintenance method)
   */
  public cleanupStalePresence(): void {
    const now = Date.now();
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    this.userPresence.forEach((presence, userId) => {
      if (!presence.isOnline && now - presence.lastOnline.getTime() > staleThreshold) {
        this.userPresence.delete(userId);
      }
    });
  }

  /**
   * Handle message send event
   * Saves message to database and broadcasts to recipient
   */
  private async handleMessageSend(
    socket: AuthenticatedSocket,
    data: { conversationId: string; content: string }
  ): Promise<void> {
    try {
      // Check authentication
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required to send messages' });
        return;
      }

      // Check rate limit
      if (!this.checkRateLimit(socket.userId)) {
        socket.emit('error', { 
          message: 'Rate limit exceeded. Please wait before sending more messages.' 
        });
        return;
      }

      const { conversationId, content } = data;

      // Validate input
      if (!conversationId || !content) {
        socket.emit('error', { message: 'Conversation ID and content are required' });
        return;
      }

      // Create message in database
      const message = await ChatService.createMessage(
        conversationId,
        socket.userId,
        content
      );

      // Get conversation to find recipient
      const conversation = await Conversation.findById(conversationId)
        .populate('participants', 'name email profilePicture');

      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }

      // Find recipient (the other participant)
      const recipientId = conversation.participants.find(
        (participant: any) => participant._id.toString() !== socket.userId
      )?._id.toString();

      if (!recipientId) {
        socket.emit('error', { message: 'Recipient not found' });
        return;
      }

      // Check if recipient is online
      const recipientPresence = this.getUserPresence(recipientId);
      const isRecipientOnline = recipientPresence?.isOnline || false;

      // Update message status to 'delivered' if recipient is online
      if (isRecipientOnline) {
        await ChatService.updateMessageStatus(message._id.toString(), 'delivered');
        message.status = 'delivered';
        message.deliveredAt = new Date();
      }

      // Prepare message data for broadcast
      const messageData = {
        message: message.toJSON(),
        conversation: conversation.toJSON(),
      };

      // Broadcast to recipient if online
      if (isRecipientOnline && recipientPresence) {
        this.io.to(recipientPresence.socketId).emit('message:new', messageData);
      }

      // Send confirmation to sender
      socket.emit('message:new', messageData);

      // Broadcast message status update to sender if delivered
      if (isRecipientOnline) {
        this.broadcastMessageStatus(
          socket.userId,
          message._id.toString(),
          'delivered',
          message.deliveredAt!
        );
      }

      console.log(`📨 Message sent from ${socket.userId} to ${recipientId} in conversation ${conversationId}`);
    } catch (error) {
      console.error('Error handling message send:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to send message' 
      });
    }
  }

  /**
   * Handle message read event
   * Batch updates message status and notifies sender
   */
  private async handleMessageRead(
    socket: AuthenticatedSocket,
    data: { conversationId: string; messageIds: string[] }
  ): Promise<void> {
    try {
      // Check authentication
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required to mark messages as read' });
        return;
      }

      const { conversationId, messageIds } = data;

      // Validate input
      if (!conversationId) {
        socket.emit('error', { message: 'Conversation ID is required' });
        return;
      }

      // Mark messages as read (batch update)
      const modifiedCount = await ChatService.markMessagesAsRead(
        conversationId,
        socket.userId,
        messageIds
      );

      if (modifiedCount > 0) {
        // Get the messages that were updated to notify senders
        const messages = await Message.find({
          conversationId,
          _id: { $in: messageIds },
          sender: { $ne: socket.userId },
        });

        // Notify senders of status change
        const now = new Date();
        messages.forEach((message) => {
          const senderId = message.sender.toString();
          this.broadcastMessageStatus(
            senderId,
            message._id.toString(),
            'seen',
            now
          );
        });

        console.log(`✅ ${modifiedCount} messages marked as read in conversation ${conversationId} by user ${socket.userId}`);
      }
    } catch (error) {
      console.error('Error handling message read:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to mark messages as read' 
      });
    }
  }

  /**
   * Handle typing start event
   * Broadcasts typing indicator without database writes
   */
  private handleTypingStart(
    socket: AuthenticatedSocket,
    data: { conversationId: string }
  ): void {
    try {
      // Check authentication
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { conversationId } = data;

      // Validate input
      if (!conversationId) {
        socket.emit('error', { message: 'Conversation ID is required' });
        return;
      }

      // Broadcast typing indicator to conversation room (excluding sender)
      socket.to(conversationId).emit('typing:update', {
        conversationId,
        userId: socket.userId,
        isTyping: true,
      });

      console.log(`⌨️  User ${socket.userId} started typing in conversation ${conversationId}`);
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  }

  /**
   * Handle typing stop event
   * Broadcasts typing indicator removal without database writes
   */
  private handleTypingStop(
    socket: AuthenticatedSocket,
    data: { conversationId: string }
  ): void {
    try {
      // Check authentication
      if (!socket.userId) {
        return;
      }

      const { conversationId } = data;

      // Validate input
      if (!conversationId) {
        return;
      }

      // Broadcast typing stop to conversation room (excluding sender)
      socket.to(conversationId).emit('typing:update', {
        conversationId,
        userId: socket.userId,
        isTyping: false,
      });

      console.log(`⌨️  User ${socket.userId} stopped typing in conversation ${conversationId}`);
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  }

  /**
   * Handle conversation open event
   * Joins conversation room and tracks presence
   */
  private async handleConversationOpen(
    socket: AuthenticatedSocket,
    data: { conversationId: string }
  ): Promise<void> {
    try {
      // Check authentication
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { conversationId } = data;

      // Validate input
      if (!conversationId) {
        socket.emit('error', { message: 'Conversation ID is required' });
        return;
      }

      // Verify user is a participant in the conversation
      const isParticipant = await ChatService.isConversationParticipant(
        conversationId,
        socket.userId
      );

      if (!isParticipant) {
        socket.emit('error', { message: 'Not authorized to access this conversation' });
        return;
      }

      // Join conversation room
      this.joinConversationRoom(socket, conversationId);

      // Deliver any offline messages
      await this.deliverOfflineMessages(socket, conversationId);

      // Broadcast presence update to the conversation
      this.broadcastPresence(socket.userId);

      console.log(`👁️  User ${socket.userId} opened conversation ${conversationId}`);
    } catch (error) {
      console.error('Error handling conversation open:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to open conversation' 
      });
    }
  }

  /**
   * Handle conversation close event
   * Leaves conversation room and updates presence
   */
  private handleConversationClose(
    socket: AuthenticatedSocket,
    data: { conversationId: string }
  ): void {
    try {
      // Check authentication
      if (!socket.userId) {
        return;
      }

      const { conversationId } = data;

      // Validate input
      if (!conversationId) {
        return;
      }

      // Leave conversation room
      this.leaveConversationRoom(socket, conversationId);

      console.log(`👁️  User ${socket.userId} closed conversation ${conversationId}`);
    } catch (error) {
      console.error('Error handling conversation close:', error);
    }
  }

  /**
   * Deliver offline messages to user when they connect or open a conversation
   * Updates message status to 'delivered' for messages sent while user was offline
   */
  private async deliverOfflineMessages(
    socket: AuthenticatedSocket,
    conversationId: string
  ): Promise<void> {
    try {
      if (!socket.userId) {
        return;
      }

      // Find messages that were sent to this user while they were offline
      const offlineMessages = await Message.find({
        conversationId,
        sender: { $ne: socket.userId },
        status: 'sent', // Only messages that haven't been delivered yet
      }).populate('sender', 'name email profilePicture');

      if (offlineMessages.length > 0) {
        // Update all offline messages to 'delivered' status
        const messageIds = offlineMessages.map((msg) => msg._id);
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { 
            $set: { 
              status: 'delivered',
              deliveredAt: new Date(),
            } 
          }
        );

        // Get conversation data
        const conversation = await Conversation.findById(conversationId)
          .populate('participants', 'name email profilePicture');

        // Emit each offline message to the user
        for (const message of offlineMessages) {
          message.status = 'delivered';
          message.deliveredAt = new Date();

          socket.emit('message:new', {
            message: message.toJSON(),
            conversation: conversation?.toJSON(),
          });

          // Notify sender that message was delivered
          const senderId = message.sender._id?.toString() || message.sender.toString();
          this.broadcastMessageStatus(
            senderId,
            message._id.toString(),
            'delivered',
            message.deliveredAt
          );
        }

        console.log(`📬 Delivered ${offlineMessages.length} offline messages to user ${socket.userId} in conversation ${conversationId}`);
      }
    } catch (error) {
      console.error('Error delivering offline messages:', error);
    }
  }

  /**
   * Update message status and broadcast to sender
   * Centralized method for status tracking with real-time updates
   */
  public async updateMessageStatusAndBroadcast(
    messageId: string,
    status: MessageStatus,
    senderId: string
  ): Promise<void> {
    try {
      // Update message status in database
      const updatedMessage = await ChatService.updateMessageStatus(messageId, status);

      // Determine timestamp based on status
      const timestamp = status === 'delivered' 
        ? updatedMessage.deliveredAt 
        : status === 'seen' 
          ? updatedMessage.seenAt 
          : updatedMessage.createdAt;

      // Broadcast status update to sender
      this.broadcastMessageStatus(
        senderId,
        messageId,
        status,
        timestamp || new Date()
      );

      console.log(`✅ Message ${messageId} status updated to '${status}' and broadcast to sender ${senderId}`);
    } catch (error) {
      console.error('Error updating message status and broadcasting:', error);
      throw error;
    }
  }

  /**
   * Get tick display for a message
   * Helper method that uses ChatService to determine tick type
   */
  public getMessageTickDisplay(
    messageStatus: MessageStatus,
    recipientId: string
  ): 'single' | 'double' | 'blue' {
    const isRecipientOnline = this.isUserOnline(recipientId);
    return ChatService.getMessageTickDisplay(messageStatus, isRecipientOnline);
  }
}
