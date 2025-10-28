import express, { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { optionalAuth } from '../middleware/auth';
import { HTTP_STATUS } from '../../../shared/src/constants';
import { PaginationParams } from '../../../shared/src/types/api';

const router = express.Router();

/**
 * GET /api/users/:id
 * Get user profile data with statistics
 * Public endpoint - no authentication required
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await UserService.getUserProfile(id);
    
    if (!result.success) {
      const statusCode = result.code === 'NOT_FOUND_ERROR' 
        ? HTTP_STATUS.NOT_FOUND 
        : result.code === 'VALIDATION_ERROR'
        ? HTTP_STATUS.BAD_REQUEST
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
        
      return res.status(statusCode).json({
        success: false,
        message: result.message,
        code: result.code,
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result.user,
      message: 'User profile retrieved successfully',
    });
  } catch (error) {
    console.error('Get user profile route error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve user profile',
      code: 'SERVER_ERROR',
    });
  }
});

/**
 * GET /api/users/:id/posts
 * Get posts by specific user with pagination
 * Public endpoint - no authentication required
 */
router.get('/:id/posts', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Parse pagination parameters
    const paginationParams: PaginationParams = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const result = await UserService.getUserPosts(id, paginationParams);
    
    if (!result.success) {
      const statusCode = result.code === 'NOT_FOUND_ERROR' 
        ? HTTP_STATUS.NOT_FOUND 
        : result.code === 'VALIDATION_ERROR'
        ? HTTP_STATUS.BAD_REQUEST
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
        
      return res.status(statusCode).json({
        success: false,
        message: result.message,
        code: result.code,
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result.posts,
      totalCount: result.totalCount,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      message: 'User posts retrieved successfully',
    });
  } catch (error) {
    console.error('Get user posts route error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve user posts',
      code: 'SERVER_ERROR',
    });
  }
});

export default router;