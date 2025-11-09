import { Router, Request, Response } from 'express';
import { Call } from '../models/Call';
import { authenticate } from '../middleware/auth';
import { HTTP_STATUS, ERROR_CODES } from '@linkedin-clone/shared';
import mongoose from 'mongoose';

const router = Router();

/**
 * GET /api/calls/history
 * Get user's call history with pagination
 * Returns calls where user is either caller or recipient
 * Sorted by most recent first
 */
router.get('/history', authenticate, async (req: Request, res: Response) => {
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
    const skip = (page - 1) * limit;

    // Parse filter parameters
    const callType = req.query.callType as string | undefined;
    const status = req.query.status as string | undefined;

    // Build query
    const query: any = {
      $or: [
        { caller: new mongoose.Types.ObjectId(userId) },
        { recipient: new mongoose.Types.ObjectId(userId) },
      ],
    };

    // Add optional filters
    if (callType && (callType === 'voice' || callType === 'video')) {
      query.callType = callType;
    }

    if (status && ['initiated', 'ringing', 'connected', 'ended', 'declined', 'missed'].includes(status)) {
      query.status = status;
    }

    // Get total count for pagination
    const totalCount = await Call.countDocuments(query);

    // Fetch calls with pagination
    const calls = await Call.find(query)
      .populate('caller', 'name email profilePicture')
      .populate('recipient', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      calls,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching call history:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch call history',
      code: ERROR_CODES.SERVER_ERROR,
    });
  }
});

/**
 * GET /api/calls/:callId
 * Get details of a specific call
 * User must be a participant in the call
 */
router.get('/:callId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { callId } = req.params;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
    }

    if (!callId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Call ID is required',
        code: ERROR_CODES.VALIDATION_ERROR,
      });
    }

    // Find call
    const call = await Call.findOne({ callId })
      .populate('caller', 'name email profilePicture')
      .populate('recipient', 'name email profilePicture')
      .lean();

    if (!call) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Call not found',
        code: ERROR_CODES.NOT_FOUND_ERROR,
      });
    }

    // Verify user is a participant
    const isParticipant =
      call.caller._id.toString() === userId ||
      call.recipient._id.toString() === userId;

    if (!isParticipant) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Access denied. You are not a participant in this call.',
        code: ERROR_CODES.AUTHORIZATION_ERROR,
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      call,
    });
  } catch (error) {
    console.error('Error fetching call details:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch call details',
      code: ERROR_CODES.SERVER_ERROR,
    });
  }
});

/**
 * GET /api/calls/stats/summary
 * Get call statistics summary for the authenticated user
 * Returns counts by call type and status
 */
router.get('/stats/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Aggregate call statistics
    const stats = await Call.aggregate([
      {
        $match: {
          $or: [
            { caller: userObjectId },
            { recipient: userObjectId },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          voiceCalls: {
            $sum: { $cond: [{ $eq: ['$callType', 'voice'] }, 1, 0] },
          },
          videoCalls: {
            $sum: { $cond: [{ $eq: ['$callType', 'video'] }, 1, 0] },
          },
          connectedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'connected'] }, 1, 0] },
          },
          missedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] },
          },
          declinedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'declined'] }, 1, 0] },
          },
          totalDuration: { $sum: '$duration' },
        },
      },
    ]);

    const summary = stats.length > 0 ? stats[0] : {
      totalCalls: 0,
      voiceCalls: 0,
      videoCalls: 0,
      connectedCalls: 0,
      missedCalls: 0,
      declinedCalls: 0,
      totalDuration: 0,
    };

    // Remove the _id field
    delete summary._id;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      stats: summary,
    });
  } catch (error) {
    console.error('Error fetching call statistics:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch call statistics',
      code: ERROR_CODES.SERVER_ERROR,
    });
  }
});

export default router;
