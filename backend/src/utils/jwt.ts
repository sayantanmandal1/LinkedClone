import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../types';

export interface JwtPayload {
  userId: string;
  email: string;
}

export class JwtUtils {
  private static getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    return secret;
  }

  /**
   * Generate a JWT token for a user
   */
  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.getSecret(), {
      expiresIn: JWT_CONFIG.EXPIRES_IN,
      issuer: 'linkedin-clone-api',
      audience: 'linkedin-clone-app',
    });
  }

  /**
   * Generate a refresh token for a user
   */
  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.getSecret(), {
      expiresIn: JWT_CONFIG.REFRESH_EXPIRES_IN,
      issuer: 'linkedin-clone-api',
      audience: 'linkedin-clone-app',
    });
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.getSecret(), {
        issuer: 'linkedin-clone-api',
        audience: 'linkedin-clone-app',
      }) as JwtPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
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
  static getTokenExpirationTime(): number {
    // Convert JWT_CONFIG.EXPIRES_IN (15m) to seconds
    const expiresIn = JWT_CONFIG.EXPIRES_IN;
    if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn.slice(0, -1)) * 60;
    } else if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn.slice(0, -1)) * 3600;
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn.slice(0, -1)) * 86400;
    }
    // Default to 15 minutes if format is not recognized
    return 15 * 60;
  }
}