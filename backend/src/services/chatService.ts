import mongoose from 'mongoose';
import { Message, MessageDocument, MessageStatus } from '../models/Message';
import { Conversation, ConversationDocument } from '../models/Conversation';

export class ChatService {
  /**
   * Get or create a conversation between two users
   * Ensures participants are sorted for consistent indexing
   */
  static async getOrCreateConversation(
    user1Id: string,
    user2Id: string
  ): Promise<ConversationDocument> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(user1Id) || !mongoose.Types.ObjectId.isValid(user2Id)) {
      throw new Error('Invalid user ID format');
    }

    // Prevent self-conversation
    if (user1Id === user2Id) {
      throw new Error('Cannot create conversation with yourself');
    }

    const user1ObjectId = new mongoose.Types.ObjectId(user1Id);
    const user2ObjectId = new mongoose.Types.ObjectId(user2Id);

    // Sort participants to ensure consistent ordering for unique index
    const participants = [user1ObjectId, user2ObjectId].sort((a, b) =>
      a.toString().localeCompare(b.toString())
    ) as [mongoose.Types.ObjectId, mongoose.Types.ObjectId];

    // Try to find existing conversation
    let conversation = await Conversation.findOne({ participants })
      .populate('participants', 'name email profilePicture')
      .populate('lastMessage.sender', 'name email profilePicture');

    // Create new conversation if it doesn't exist
    if (!conversation) {
      const unreadCountMap = new Map<string, number>();
      unreadCountMap.set(user1Id, 0);
      unreadCountMap.set(user2Id, 0);

      conversation = await Conversation.create({
        participants,
        unreadCount: unreadCountMap,
      });

      // Populate the newly created conversation
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name email profilePicture')
        .populate('lastMessage.sender', 'name email profilePicture');

      if (!conversation) {
        throw new Error('Failed to create conversation');
      }
    }

    return conversation;
  }

  /**
   * Get all conversations for a user with pagination
   * Sorted by most recent activity (updatedAt)
   */
  static async getUserConversations(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ conversations: ConversationDocument[]; totalCount: number; totalPages: number }> {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID format');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const skip = (page - 1) * limit;

    // Find conversations where user is a participant
    const [conversations, totalCount] = await Promise.all([
      Conversation.find({ participants: userObjectId })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('participants', 'name email profilePicture')
        .populate('lastMessage.sender', 'name email profilePicture'),
      Conversation.countDocuments({ participants: userObjectId }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      conversations,
      totalCount,
      totalPages,
    };
  }

  /**
   * Create a new message in a conversation
   * Automatically sets status to 'sent' and expiresAt to 30 days from now
   */
  static async createMessage(
    conversationId: string,
    senderId: string,
    content: string
  ): Promise<MessageDocument> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(senderId)) {
      throw new Error('Invalid conversation or sender ID format');
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    if (content.length > 2000) {
      throw new Error('Message content cannot exceed 2000 characters');
    }

    const conversationObjectId = new mongoose.Types.ObjectId(conversationId);
    const senderObjectId = new mongoose.Types.ObjectId(senderId);

    // Verify conversation exists and sender is a participant
    const conversation = await Conversation.findById(conversationObjectId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Validate sender is a participant
    const isParticipant = conversation.participants.some(
      (participantId) => participantId.toString() === senderId
    );
    if (!isParticipant) {
      throw new Error('User is not a participant in this conversation');
    }

    // Create the message with expiresAt set to 30 days from now
    const thirtyDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + thirtyDaysInMs);
    
    const message = await Message.create({
      conversationId: conversationObjectId,
      sender: senderObjectId,
      content: content.trim(),
      status: 'sent',
      expiresAt,
    });

    // Update conversation's lastMessage field atomically
    await this.updateConversationLastMessage(
      conversationId,
      senderId,
      content.trim(),
      message.createdAt
    );

    // Increment unread count for the recipient
    const recipientId = conversation.participants.find(
      (participantId) => participantId.toString() !== senderId
    )?.toString();

    if (recipientId) {
      const currentUnreadCount = conversation.unreadCount.get(recipientId) || 0;
      conversation.unreadCount.set(recipientId, currentUnreadCount + 1);
      await conversation.save();
    }

    // Populate sender data before returning
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email profilePicture');

    if (!populatedMessage) {
      throw new Error('Failed to retrieve created message');
    }

    return populatedMessage;
  }

  /**
   * Get messages for a conversation with pagination
   * Returns messages in reverse chronological order (newest first)
   */
  static async getConversationMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: MessageDocument[]; totalCount: number; totalPages: number }> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid conversation or user ID format');
    }

    const conversationObjectId = new mongoose.Types.ObjectId(conversationId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Verify conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationObjectId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (participantId) => participantId.toString() === userId
    );
    if (!isParticipant) {
      throw new Error('User is not a participant in this conversation');
    }

    const skip = (page - 1) * limit;

    // Fetch messages with pagination
    const [messages, totalCount] = await Promise.all([
      Message.find({ conversationId: conversationObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name email profilePicture'),
      Message.countDocuments({ conversationId: conversationObjectId }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      messages,
      totalCount,
      totalPages,
    };
  }

  /**
   * Update the status of a single message
   * Validates that the message exists and updates timestamps accordingly
   */
  static async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    userId?: string
  ): Promise<MessageDocument> {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new Error('Invalid message ID format');
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // If userId is provided, verify they are the recipient (not the sender)
    if (userId && message.sender.toString() === userId) {
      throw new Error('Cannot update status of own message');
    }

    // Update status and corresponding timestamp
    message.status = status;

    if (status === 'delivered' && !message.deliveredAt) {
      message.deliveredAt = new Date();
    } else if (status === 'seen' && !message.seenAt) {
      message.seenAt = new Date();
      // Ensure deliveredAt is also set
      if (!message.deliveredAt) {
        message.deliveredAt = new Date();
      }
    }

    await message.save();

    // Return populated message
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email profilePicture');

    if (!populatedMessage) {
      throw new Error('Failed to retrieve updated message');
    }

    return populatedMessage;
  }

  /**
   * Mark multiple messages as read in a conversation
   * Uses batch update for efficiency
   * Resets unread count for the user
   */
  static async markMessagesAsRead(
    conversationId: string,
    userId: string,
    messageIds?: string[]
  ): Promise<number> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid conversation or user ID format');
    }

    const conversationObjectId = new mongoose.Types.ObjectId(conversationId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Verify conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationObjectId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (participantId) => participantId.toString() === userId
    );
    if (!isParticipant) {
      throw new Error('User is not a participant in this conversation');
    }

    const now = new Date();

    // Build query to find messages to mark as read
    const query: any = {
      conversationId: conversationObjectId,
      sender: { $ne: userObjectId }, // Not sent by the user
      status: { $ne: 'seen' }, // Not already seen
    };

    // If specific message IDs provided, only update those
    if (messageIds && messageIds.length > 0) {
      const messageObjectIds = messageIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      if (messageObjectIds.length === 0) {
        throw new Error('No valid message IDs provided');
      }

      query._id = { $in: messageObjectIds };
    }

    // Batch update all matching messages
    const result = await Message.updateMany(query, {
      $set: {
        status: 'seen',
        seenAt: now,
        deliveredAt: now, // Ensure deliveredAt is set if not already
      },
    });

    // Reset unread count for this user in the conversation
    conversation.unreadCount.set(userId, 0);
    await conversation.save();

    return result.modifiedCount;
  }

  /**
   * Update conversation's lastMessage field atomically
   * Called when a new message is created
   */
  static async updateConversationLastMessage(
    conversationId: string,
    senderId: string,
    content: string,
    createdAt: Date
  ): Promise<void> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(senderId)) {
      throw new Error('Invalid conversation or sender ID format');
    }

    const conversationObjectId = new mongoose.Types.ObjectId(conversationId);
    const senderObjectId = new mongoose.Types.ObjectId(senderId);

    // Atomic update of lastMessage
    await Conversation.findByIdAndUpdate(
      conversationObjectId,
      {
        $set: {
          lastMessage: {
            content: content.substring(0, 2000), // Ensure it doesn't exceed max length
            sender: senderObjectId,
            createdAt,
          },
          updatedAt: new Date(),
        },
      },
      { new: true }
    );
  }

  /**
   * Validate that a user is a participant in a conversation
   * Used for authorization checks
   */
  static async isConversationParticipant(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return false;
    }

    const conversationObjectId = new mongoose.Types.ObjectId(conversationId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const conversation = await Conversation.findById(conversationObjectId);
    if (!conversation) {
      return false;
    }

    return conversation.participants.some(
      (participantId) => participantId.toString() === userId
    );
  }

  /**
   * Get the other participant in a conversation
   * Useful for displaying recipient information
   */
  static async getOtherParticipant(
    conversationId: string,
    userId: string
  ): Promise<any> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid conversation or user ID format');
    }

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'name email profilePicture');

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const otherParticipant = (conversation.participants as any[]).find(
      (participant) => participant._id.toString() !== userId
    );

    if (!otherParticipant) {
      throw new Error('Other participant not found');
    }

    return otherParticipant;
  }

  /**
   * Determine tick display for a message based on status and recipient online state
   * Returns tick type: 'single' | 'double' | 'blue'
   * 
   * Tick Logic:
   * - Single tick: Message delivered to server but recipient is offline (status: 'sent')
   * - Double tick: Message delivered and recipient is online but hasn't seen it (status: 'delivered')
   * - Blue double tick: Message has been seen by recipient (status: 'seen')
   */
  static getMessageTickDisplay(
    messageStatus: MessageStatus,
    isRecipientOnline: boolean
  ): 'single' | 'double' | 'blue' {
    switch (messageStatus) {
      case 'sent':
        // Message delivered to server but recipient is offline
        return 'single';
      
      case 'delivered':
        // Message delivered and recipient is online but hasn't opened conversation
        return 'double';
      
      case 'seen':
        // Message has been seen by recipient
        return 'blue';
      
      default:
        // Default to single tick for unknown status
        return 'single';
    }
  }

  /**
   * Get message with tick display information
   * Enriches message data with tick display type for frontend rendering
   */
  static async getMessageWithTickDisplay(
    messageId: string,
    isRecipientOnline: boolean
  ): Promise<{ message: MessageDocument; tickDisplay: 'single' | 'double' | 'blue' }> {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new Error('Invalid message ID format');
    }

    const message = await Message.findById(messageId)
      .populate('sender', 'name email profilePicture');

    if (!message) {
      throw new Error('Message not found');
    }

    const tickDisplay = this.getMessageTickDisplay(message.status, isRecipientOnline);

    return {
      message,
      tickDisplay,
    };
  }
}
