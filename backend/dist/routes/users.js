"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userService_1 = require("../services/userService");
const auth_1 = require("../middleware/auth");
const shared_1 = require("@linkedin-clone/shared");
const router = express_1.default.Router();
/**
 * GET /api/users/:id
 * Get user profile data with statistics
 * Public endpoint - no authentication required
 */
router.get('/:id', auth_1.optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await userService_1.UserService.getUserProfile(id);
        if (!result.success) {
            const statusCode = result.code === 'NOT_FOUND_ERROR'
                ? shared_1.HTTP_STATUS.NOT_FOUND
                : result.code === 'VALIDATION_ERROR'
                    ? shared_1.HTTP_STATUS.BAD_REQUEST
                    : shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR;
            return res.status(statusCode).json({
                success: false,
                message: result.message,
                code: result.code,
            });
        }
        res.status(shared_1.HTTP_STATUS.OK).json({
            success: true,
            data: result.user,
            message: 'User profile retrieved successfully',
        });
    }
    catch (error) {
        console.error('Get user profile route error:', error);
        res.status(shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
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
router.get('/:id/posts', auth_1.optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        // Parse pagination parameters
        const paginationParams = {
            page: req.query.page ? parseInt(req.query.page, 10) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
        };
        const result = await userService_1.UserService.getUserPosts(id, paginationParams);
        if (!result.success) {
            const statusCode = result.code === 'NOT_FOUND_ERROR'
                ? shared_1.HTTP_STATUS.NOT_FOUND
                : result.code === 'VALIDATION_ERROR'
                    ? shared_1.HTTP_STATUS.BAD_REQUEST
                    : shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR;
            return res.status(statusCode).json({
                success: false,
                message: result.message,
                code: result.code,
            });
        }
        res.status(shared_1.HTTP_STATUS.OK).json({
            success: true,
            data: result.posts,
            totalCount: result.totalCount,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            message: 'User posts retrieved successfully',
        });
    }
    catch (error) {
        console.error('Get user posts route error:', error);
        res.status(shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to retrieve user posts',
            code: 'SERVER_ERROR',
        });
    }
});
/**
 * PUT /api/users/profile-picture
 * Update current user's profile picture
 * Requires authentication
 */
router.put('/profile-picture', auth_1.authenticate, async (req, res) => {
    try {
        const { profilePictureUrl } = req.body;
        const userId = req.user._id.toString();
        if (!profilePictureUrl) {
            return res.status(shared_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Profile picture URL is required',
            });
        }
        const result = await userService_1.UserService.updateProfilePicture(userId, profilePictureUrl);
        if (!result.success) {
            const statusCode = result.code === 'NOT_FOUND_ERROR'
                ? shared_1.HTTP_STATUS.NOT_FOUND
                : shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR;
            return res.status(statusCode).json({
                success: false,
                message: result.message,
                code: result.code,
            });
        }
        res.status(shared_1.HTTP_STATUS.OK).json({
            success: true,
            data: result.user,
            message: 'Profile picture updated successfully',
        });
    }
    catch (error) {
        console.error('Update profile picture route error:', error);
        res.status(shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to update profile picture',
            code: 'SERVER_ERROR',
        });
    }
});
exports.default = router;
