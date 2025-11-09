"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOwnership = exports.optionalAuth = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = require("../models/User");
const shared_1 = require("@linkedin-clone/shared");
/**
 * Middleware to authenticate users using JWT tokens
 * Adds user information to the request object
 */
const authenticate = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const token = jwt_1.JwtUtils.extractTokenFromHeader(req.headers.authorization);
        if (!token) {
            res.status(shared_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Access denied. No token provided.',
                code: shared_1.ERROR_CODES.AUTHENTICATION_ERROR,
            });
            return;
        }
        // Verify the token
        let decoded;
        try {
            decoded = jwt_1.JwtUtils.verifyToken(token);
        }
        catch (error) {
            res.status(shared_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: error instanceof Error ? error.message : 'Invalid token',
                code: shared_1.ERROR_CODES.AUTHENTICATION_ERROR,
            });
            return;
        }
        // Find the user in the database
        const user = await User_1.User.findById(decoded.userId);
        if (!user) {
            res.status(shared_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'User not found. Token may be invalid.',
                code: shared_1.ERROR_CODES.AUTHENTICATION_ERROR,
            });
            return;
        }
        // Add user to request object
        req.user = user;
        req.userId = user._id.toString();
        next();
    }
    catch (error) {
        console.error('Authentication middleware error:', error);
        res.status(shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Authentication failed due to server error',
            code: shared_1.ERROR_CODES.SERVER_ERROR,
        });
    }
};
exports.authenticate = authenticate;
/**
 * Optional authentication middleware
 * Adds user information to request if token is provided, but doesn't require it
 */
const optionalAuth = async (req, _res, next) => {
    try {
        const token = jwt_1.JwtUtils.extractTokenFromHeader(req.headers.authorization);
        if (!token) {
            // No token provided, continue without authentication
            next();
            return;
        }
        try {
            const decoded = jwt_1.JwtUtils.verifyToken(token);
            const user = await User_1.User.findById(decoded.userId);
            if (user) {
                req.user = user;
                req.userId = user._id.toString();
            }
        }
        catch (error) {
            // Invalid token, but we don't fail the request
            console.warn('Optional auth failed:', error);
        }
        next();
    }
    catch (error) {
        console.error('Optional authentication middleware error:', error);
        // Don't fail the request for optional auth errors
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Middleware to check if the authenticated user owns a resource
 * Should be used after authenticate middleware
 */
const requireOwnership = (resourceUserIdField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(shared_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Authentication required',
                code: shared_1.ERROR_CODES.AUTHENTICATION_ERROR,
            });
            return;
        }
        const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
        if (!resourceUserId) {
            res.status(shared_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Resource user ID not provided',
                code: shared_1.ERROR_CODES.VALIDATION_ERROR,
            });
            return;
        }
        if (req.user._id.toString() !== resourceUserId) {
            res.status(shared_1.HTTP_STATUS.FORBIDDEN).json({
                success: false,
                message: 'Access denied. You can only access your own resources.',
                code: shared_1.ERROR_CODES.AUTHORIZATION_ERROR,
            });
            return;
        }
        next();
    };
};
exports.requireOwnership = requireOwnership;
