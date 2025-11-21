import { Router, Request, Response } from 'express';
import { ChatService } from '../services/chatService';
import { CleanupService } from '../services/cleanupService';
import { authenticate } from '../middleware/auth';
import { HTTP_STATUS, ERROR_CODES } from '@linkedin-clone/shared';
import { socketService } from '../index';

const router = Router();

/**
 * Authorization middleware to verify conversation participant access
 * Ensures user is a participant in the conversation before allowing access
 */
const verifyConversationAccess = async (
  req: Request,
  res: Response,
  next: Function
): Promise<void> => {
  try {
    const conversationId = req.params.id || req.params.conversationId;
    const userId = req.userId;

    if (!userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
      return;
    }

    if (!conversationId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Conversation ID is required',
        code: ERROR_CODES.VALIDATION_ERROR,
      });
      return;
    }

    // Verify user is a participant in the conversation
    const isParticipant = await ChatService.isConversationParticipant(
      conversationId,
      userId
    );

    if (!isParticipant) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
        code: ERROR_CODES.AUTHORIZATION_ERROR,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error verifying conversation access:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to verify conversation access',
      code: ERROR_CODES.SERVER_ERROR,
    });
  }
};

/**
 * GET /api/conversations
 * List user's conversations with pagination
 * Sorted by most recent activity
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
    }

    // Parse pagination parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    // Get user's conversations
    const result = await ChatService.getUserConversations(userId, page, limit);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      conversations: result.conversations,
      pagination: {
        page,
        limit,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch conversations',
      code: ERROR_CODES.SERVER_ERROR,
    });
  }
});

/**
 * POST /api/conversations
 * Create or get existing conversation with another user
 * Returns existing conversation if one already exists between the two users
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { otherUserId } = req.body;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
    }

    // Validate input
    if (!otherUserId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Other user ID is required',
        code: ERROR_CODES.VALIDATION_ERROR,
        errors: { otherUserId: 'Other user ID is required' },
      });
    }

    // Prevent creating conversation with self
    if (userId === otherUserId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Cannot create conversation with yourself',
        code: ERROR_CODES.VALIDATION_ERROR,
        errors: { otherUserId: 'Cannot create conversation with yourself' },
      });
    }

    // Get or create conversation
    const conversation = await ChatService.getOrCreateConversation(userId, otherUserId);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      conversation,
      message: 'Conversation retrieved successfully',
    });
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create/get conversation',
      code: ERROR_CODES.SERVER_ERROR,
    });
  }
});

/**
 * GET /api/conversations/:id/messages
 * Get messages for a conversation with cursor-based pagination
 * Returns 50 messages per page by default
 * Messages are returned in reverse chronological order (newest first)
 */
router.get(
  '/:id/messages',
  authenticate,
  verifyConversationAccess,
  async (req: Request, res: Response) => {
    try {
      const conversationId = req.params.id;
      const userId = req.userId;

      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required',
          code: ERROR_CODES.AUTHENTICATION_ERROR,
        });
      }

      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 50));

      // Get conversation messages
      const result = await ChatService.getConversationMessages(
        conversationId,
        userId,
        page,
        limit
      );

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        messages: result.messages,
        pagination: {
          page,
          limit,
          totalCount: result.totalCount,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch messages',
        code: ERROR_CODES.SERVER_ERROR,
      });
    }
  }
);

/**
 * POST /api/conversations/:id/messages
 * Send a message in a conversation (fallback for offline message sending)
 * This endpoint is used when WebSocket connection is unavailable
 * Normally, messages are sent via WebSocket for real-time delivery
 */
router.post(
  '/:id/messages',
  authenticate,
  verifyConversationAccess,
  async (req: Request, res: Response) => {
    try {
      const conversationId = req.params.id;
      const userId = req.userId;
      const { content } = req.body;

      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required',
          code: ERROR_CODES.AUTHENTICATION_ERROR,
        });
      }

      // Validate content
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Message content is required',
          code: ERROR_CODES.VALIDATION_ERROR,
          errors: { content: 'Content cannot be empty' },
        });
      }

      if (content.length > 2000) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Message content is too long',
          code: ERROR_CODES.VALIDATION_ERROR,
          errors: { content: 'Content cannot exceed 2000 characters' },
        });
      }

      // Create message
      const message = await ChatService.createMessage(conversationId, userId, content);

      // Get conversation to find recipient
      const conversation = await ChatService.getOrCreateConversation(
        userId,
        message.conversationId.toString()
      );

      // Find recipient
      const recipientId = conversation.participants.find(
        (participant: any) => participant._id.toString() !== userId
      )?._id.toString();

      if (recipientId) {
        // Check if recipient is online
        const isRecipientOnline = socketService.isUserOnline(recipientId);

        // Update message status to 'delivered' if recipient is online
        if (isRecipientOnline) {
          await ChatService.updateMessageStatus(message._id.toString(), 'delivered');
          message.status = 'delivered';
          message.deliveredAt = new Date();

          // Broadcast message to recipient via WebSocket
          socketService.deliverMessage(
            {
              message: message.toJSON(),
              conversation: conversation.toJSON(),
            },
            recipientId
          );

          // Broadcast status update to sender
          socketService.broadcastMessageStatus(
            userId,
            message._id.toString(),
            'delivered',
            message.deliveredAt
          );
        }
      }

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send message',
        code: ERROR_CODES.SERVER_ERROR,
      });
    }
  }
);

/**
 * GET /api/users/:id/presence
 * Get user's online status and last seen timestamp
 * Returns presence information from in-memory store
 */
router.get('/users/:id/presence', authenticate, async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.id;

    if (!targetUserId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'User ID is required',
        code: ERROR_CODES.VALIDATION_ERROR,
      });
    }

    // Get user presence from SocketService
    const presence = socketService.getUserPresence(targetUserId);

    if (!presence) {
      // User has never connected or presence data is not available
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        presence: {
          userId: targetUserId,
          isOnline: false,
          lastOnline: null,
        },
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      presence: {
        userId: presence.userId,
        isOnline: presence.isOnline,
        lastOnline: presence.lastOnline,
      },
    });
  } catch (error) {
    console.error('Error fetching user presence:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch user presence',
      code: ERROR_CODES.SERVER_ERROR,
    });
  }
});

/**
 * POST /api/conversations/admin/cleanup
 * Manual trigger for message cleanup (admin use)
 * Forces immediate cleanup operation and returns statistics
 * Note: MongoDB TTL index handles automatic deletion, this endpoint is for monitoring
 */
router.post('/admin/cleanup', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
    }

    // Note: In production, you should add admin role verification here
    // For now, any authenticated user can trigger cleanup for testing purposes

    // Perform manual cleanup
    const result = await CleanupService.forceCleanup();

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Manual cleanup completed',
      result: {
        expiredMessagesCount: result.expiredMessages,
        expiredCallsCount: result.expiredCalls,
        duration: `${result.duration}ms`,
        timestamp: result.timestamp,
      },
    });
  } catch (error) {
    console.error('Error performing manual cleanup:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to perform cleanup',
      code: ERROR_CODES.SERVER_ERROR,
    });
  }
});

/**
 * GET /api/conversations/admin/cleanup/stats
 * Get message cleanup statistics (admin use)
 * Returns information about message retention and cleanup status
 */
router.get('/admin/cleanup/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
    }

    // Note: In production, you should add admin role verification here

    // Get cleanup statistics
    const stats = await CleanupService.getCleanupStats();

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      stats: {
        messages: {
          totalMessages: stats.messages.totalMessages,
          activeMessages: stats.messages.activeMessages,
          expiredMessages: stats.messages.expiredMessages,
          oldestMessage: stats.messages.oldestMessage,
          newestMessage: stats.messages.newestMessage,
        },
        calls: {
          totalCalls: stats.calls.totalCalls,
          activeCalls: stats.calls.activeCalls,
          expiredCalls: stats.calls.expiredCalls,
          oldestCall: stats.calls.oldestCall,
          newestCall: stats.calls.newestCall,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching cleanup stats:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch cleanup stats',
      code: ERROR_CODES.SERVER_ERROR,
    });
  }
});

export default router;
