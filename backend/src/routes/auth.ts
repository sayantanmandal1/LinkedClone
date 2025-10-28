import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { authenticate } from '../middleware/auth';
import { HTTP_STATUS } from '../../../shared/src/constants';
import { CreateUserRequest, LoginRequest, AuthResponse } from '../../../shared/src/types/user';
import { ErrorResponse } from '../../../shared/src/types/api';

const router = Router();

// POST /api/auth/register - Register a new user
router.post('/register', async (req: Request<{}, AuthResponse, CreateUserRequest>, res: Response<AuthResponse>) => {
  try {
    const { name, email, password } = req.body;

    // Basic input validation
    if (!name || !email || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const result = await AuthService.register({ name, email, password });

    if (result.success) {
      return res.status(HTTP_STATUS.CREATED).json(result);
    } else {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    }
  } catch (error) {
    console.error('Registration route error:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Registration failed due to server error',
    });
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req: Request<{}, AuthResponse, LoginRequest>, res: Response<AuthResponse>) => {
  try {
    const { email, password } = req.body;

    // Basic input validation
    if (!email || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const result = await AuthService.login({ email, password });

    if (result.success) {
      return res.status(HTTP_STATUS.OK).json(result);
    } else {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(result);
    }
  } catch (error) {
    console.error('Login route error:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Login failed due to server error',
    });
  }
});

// POST /api/auth/logout - Logout user (placeholder for token invalidation)
router.post('/logout', authenticate, async (_req: Request, res: Response<{ success: boolean; message: string }>) => {
  try {
    // In a more sophisticated implementation, you would:
    // 1. Add the token to a blacklist
    // 2. Clear HTTP-only cookies if using them
    // 3. Invalidate refresh tokens
    
    // For now, we'll just return success since JWT tokens are stateless
    // The client should remove the token from storage
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout route error:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Logout failed due to server error',
    });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticate, async (req: Request, res: Response<AuthResponse | ErrorResponse>) => {
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const result = await AuthService.getUserById(req.user._id.toString());

    if (result.success && result.user) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        user: result.user,
        message: 'User information retrieved successfully',
      });
    } else {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: result.message || 'User not found',
        code: result.code,
      });
    }
  } catch (error) {
    console.error('Get current user route error:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve user information',
    });
  }
});

export default router;