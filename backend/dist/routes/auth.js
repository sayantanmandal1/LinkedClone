"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authService_1 = require("../services/authService");
const auth_1 = require("../middleware/auth");
const shared_1 = require("@linkedin-clone/shared");
const router = (0, express_1.Router)();
// POST /api/auth/register - Register a new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Basic input validation
        if (!name || !email || !password) {
            return res.status(shared_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Name, email, and password are required',
            });
        }
        const result = await authService_1.AuthService.register({ name, email, password });
        if (result.success) {
            return res.status(shared_1.HTTP_STATUS.CREATED).json(result);
        }
        else {
            return res.status(shared_1.HTTP_STATUS.BAD_REQUEST).json(result);
        }
    }
    catch (error) {
        console.error('Registration route error:', error);
        return res.status(shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Registration failed due to server error',
        });
    }
});
// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Basic input validation
        if (!email || !password) {
            return res.status(shared_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Email and password are required',
            });
        }
        const result = await authService_1.AuthService.login({ email, password });
        if (result.success) {
            return res.status(shared_1.HTTP_STATUS.OK).json(result);
        }
        else {
            return res.status(shared_1.HTTP_STATUS.UNAUTHORIZED).json(result);
        }
    }
    catch (error) {
        console.error('Login route error:', error);
        return res.status(shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Login failed due to server error',
        });
    }
});
// POST /api/auth/logout - Logout user (placeholder for token invalidation)
router.post('/logout', auth_1.authenticate, async (_req, res) => {
    try {
        // In a more sophisticated implementation, you would:
        // 1. Add the token to a blacklist
        // 2. Clear HTTP-only cookies if using them
        // 3. Invalidate refresh tokens
        // For now, we'll just return success since JWT tokens are stateless
        // The client should remove the token from storage
        return res.status(shared_1.HTTP_STATUS.OK).json({
            success: true,
            message: 'Logged out successfully',
        });
    }
    catch (error) {
        console.error('Logout route error:', error);
        return res.status(shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Logout failed due to server error',
        });
    }
});
// GET /api/auth/me - Get current user info
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(shared_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        const result = await authService_1.AuthService.getUserById(req.user._id.toString());
        if (result.success && result.user) {
            return res.status(shared_1.HTTP_STATUS.OK).json({
                success: true,
                user: result.user,
                message: 'User information retrieved successfully',
            });
        }
        else {
            return res.status(shared_1.HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: result.message || 'User not found',
                code: result.code,
            });
        }
    }
    catch (error) {
        console.error('Get current user route error:', error);
        return res.status(shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to retrieve user information',
        });
    }
});
exports.default = router;
