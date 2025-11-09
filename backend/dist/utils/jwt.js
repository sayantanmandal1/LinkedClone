"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtUtils = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const shared_1 = require("@linkedin-clone/shared");
class JwtUtils {
    static getSecret() {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET environment variable is not set');
        }
        return secret;
    }
    /**
     * Generate a JWT token for a user
     */
    static generateToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.getSecret(), {
            expiresIn: shared_1.JWT_CONFIG.EXPIRES_IN,
            issuer: 'linkedin-clone-api',
            audience: 'linkedin-clone-app',
        });
    }
    /**
     * Generate a refresh token for a user
     */
    static generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.getSecret(), {
            expiresIn: shared_1.JWT_CONFIG.REFRESH_EXPIRES_IN,
            issuer: 'linkedin-clone-api',
            audience: 'linkedin-clone-app',
        });
    }
    /**
     * Verify and decode a JWT token
     */
    static verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.getSecret(), {
                issuer: 'linkedin-clone-api',
                audience: 'linkedin-clone-app',
            });
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new Error('Token has expired');
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new Error('Invalid token');
            }
            else {
                throw new Error('Token verification failed');
            }
        }
    }
    /**
     * Extract token from Authorization header
     */
    static extractTokenFromHeader(authHeader) {
        if (!authHeader) {
            return null;
        }
        // Check for Bearer token format
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        return parts[1];
    }
    /**
     * Get token expiration time in seconds
     */
    static getTokenExpirationTime() {
        // Convert JWT_CONFIG.EXPIRES_IN (15m) to seconds
        const expiresIn = shared_1.JWT_CONFIG.EXPIRES_IN;
        if (expiresIn.endsWith('m')) {
            return parseInt(expiresIn.slice(0, -1)) * 60;
        }
        else if (expiresIn.endsWith('h')) {
            return parseInt(expiresIn.slice(0, -1)) * 3600;
        }
        else if (expiresIn.endsWith('d')) {
            return parseInt(expiresIn.slice(0, -1)) * 86400;
        }
        // Default to 15 minutes if format is not recognized
        return 15 * 60;
    }
}
exports.JwtUtils = JwtUtils;
