"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const User_1 = require("../models/User");
const Post_1 = require("../models/Post");
const shared_1 = require("@linkedin-clone/shared");
const mongoose_1 = __importDefault(require("mongoose"));
class UserService {
    /**
     * Get user profile by ID with statistics
     */
    static async getUserProfile(userId) {
        try {
            // Validate ObjectId format
            if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
                return {
                    success: false,
                    message: 'Invalid user ID format',
                    code: shared_1.ERROR_CODES.VALIDATION_ERROR,
                };
            }
            // Find user by ID
            const user = await User_1.User.findById(userId);
            if (!user) {
                return {
                    success: false,
                    message: 'User not found',
                    code: shared_1.ERROR_CODES.NOT_FOUND_ERROR,
                };
            }
            // Get post count for the user
            const postCount = await Post_1.Post.countDocuments({ author: userId });
            // Create user profile with statistics
            const userProfile = {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                postCount,
                joinDate: user.createdAt,
            };
            return {
                success: true,
                user: userProfile,
            };
        }
        catch (error) {
            console.error('Get user profile error:', error);
            return {
                success: false,
                message: 'Failed to retrieve user profile',
                code: shared_1.ERROR_CODES.SERVER_ERROR,
            };
        }
    }
    /**
     * Get posts by user ID with pagination
     */
    static async getUserPosts(userId, paginationParams = {}) {
        try {
            // Validate ObjectId format
            if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
                return {
                    success: false,
                    message: 'Invalid user ID format',
                    code: shared_1.ERROR_CODES.VALIDATION_ERROR,
                };
            }
            // Check if user exists
            const userExists = await User_1.User.findById(userId);
            if (!userExists) {
                return {
                    success: false,
                    message: 'User not found',
                    code: shared_1.ERROR_CODES.NOT_FOUND_ERROR,
                };
            }
            // Set up pagination
            const page = Math.max(1, paginationParams.page || 1);
            const limit = Math.min(100, Math.max(1, paginationParams.limit || 10));
            const skip = (page - 1) * limit;
            // Get total count for pagination
            const totalCount = await Post_1.Post.countDocuments({ author: userId });
            const totalPages = Math.ceil(totalCount / limit);
            // Find posts by user with pagination and populated data
            const posts = await Post_1.Post.findWithPopulatedData({ author: userId }, {
                sort: { createdAt: -1 }, // Most recent first
                skip,
                limit,
            });
            // Convert posts to plain objects with proper typing
            const postsData = posts.map(post => ({
                _id: post._id.toString(),
                author: {
                    _id: post.author._id.toString(),
                    name: post.author.name,
                    email: post.author.email,
                    createdAt: post.author.createdAt,
                    updatedAt: post.author.updatedAt,
                },
                content: post.content,
                imageUrl: post.imageUrl,
                likes: post.likes.map(like => like._id.toString()),
                comments: post.comments.map(comment => ({
                    _id: comment._id.toString(),
                    author: {
                        _id: comment.author._id.toString(),
                        name: comment.author.name,
                        email: comment.author.email,
                        createdAt: comment.author.createdAt,
                        updatedAt: comment.author.updatedAt,
                    },
                    content: comment.content,
                    createdAt: comment.createdAt,
                })),
                likeCount: post.likes.length,
                commentCount: post.comments.length,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
            }));
            return {
                success: true,
                posts: postsData,
                totalCount,
                page,
                limit,
                totalPages,
            };
        }
        catch (error) {
            console.error('Get user posts error:', error);
            return {
                success: false,
                message: 'Failed to retrieve user posts',
                code: shared_1.ERROR_CODES.SERVER_ERROR,
            };
        }
    }
    /**
     * Update user's profile picture
     */
    static async updateProfilePicture(userId, profilePictureUrl) {
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
                return {
                    success: false,
                    message: 'Invalid user ID',
                    code: shared_1.ERROR_CODES.VALIDATION_ERROR,
                };
            }
            const user = await User_1.User.findByIdAndUpdate(userId, { profilePicture: profilePictureUrl }, { new: true, runValidators: true });
            if (!user) {
                return {
                    success: false,
                    message: 'User not found',
                    code: shared_1.ERROR_CODES.NOT_FOUND_ERROR,
                };
            }
            const userObject = {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
            return {
                success: true,
                user: userObject,
            };
        }
        catch (error) {
            console.error('Update profile picture error:', error);
            return {
                success: false,
                message: 'Failed to update profile picture',
                code: shared_1.ERROR_CODES.SERVER_ERROR,
            };
        }
    }
}
exports.UserService = UserService;
