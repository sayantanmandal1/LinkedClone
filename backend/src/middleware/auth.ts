import { Request, Response, NextFunction } from 'express';
import { JwtUtils, JwtPayload } from '../utils/jwt';
import { User, UserDocument } from '../models/User';
import { HTTP_STATUS, ERROR_CODES } from '../../../shared/src/constants';
import { ErrorResponse } from '../../../shared/src/types/api';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
      userId?: string;
    }
  }
}

/**
 * Middleware to authenticate users using JWT tokens
 * Adds user information to the request object
 */
export const authenticate = async (
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const token = JwtUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
      return;
    }

    // Verify the token
    let decoded: JwtPayload;
    try {
      decoded = JwtUtils.verifyToken(token);
    } catch (error) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: error instanceof Error ? error.message : 'Invalid token',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
      return;
    }

    // Find the user in the database
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'User not found. Token may be invalid.',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
      return;
    }

    // Add user to request object
    req.user = user;
    req.userId = user._id.toString();
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Authentication failed due to server error',
      code: ERROR_CODES.SERVER_ERROR,
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user information to request if token is provided, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JwtUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    try {
      const decoded = JwtUtils.verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = user;
        req.userId = user._id.toString();
      }
    } catch (error) {
      // Invalid token, but we don't fail the request
      console.warn('Optional auth failed:', error);
    }
    
    next();
  } catch (error) {
    console.error('Optional authentication middleware error:', error);
    // Don't fail the request for optional auth errors
    next();
  }
};

/**
 * Middleware to check if the authenticated user owns a resource
 * Should be used after authenticate middleware
 */
export const requireOwnership = (resourceUserIdField: string = 'userId') => {
  return (req: Request, res: Response<ErrorResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
      return;
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (!resourceUserId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Resource user ID not provided',
        code: ERROR_CODES.VALIDATION_ERROR,
      });
      return;
    }

    if (req.user._id.toString() !== resourceUserId) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Access denied. You can only access your own resources.',
        code: ERROR_CODES.AUTHORIZATION_ERROR,
      });
      return;
    }

    next();
  };
};