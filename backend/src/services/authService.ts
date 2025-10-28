import { User } from '../models/User';
import { JwtUtils } from '../utils/jwt';
import { validateUserRegistration } from '../../../shared/src/utils/validation';
import { 
  CreateUserRequest, 
  LoginRequest, 
  AuthResponse,
  User as IUser 
} from '../../../shared/src/types/user';
import { ERROR_CODES } from '../../../shared/src/constants';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      // Validate input data
      const validation = validateUserRegistration(userData);
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Validation failed',
          errors: validation.errors.reduce((acc, error, index) => {
            acc[`error_${index}`] = error;
            return acc;
          }, {} as Record<string, string>),
        };
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists',
          code: ERROR_CODES.DUPLICATE_ERROR,
        };
      }

      // Create new user
      const user = new User({
        name: userData.name.trim(),
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
      });

      await user.save();

      // Generate JWT token
      const token = JwtUtils.generateToken({
        userId: user._id.toString(),
        email: user.email,
      });

      // Convert to plain user object (password already excluded by toJSON transform)
      const userObject: IUser = {
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
        token,
        message: 'User registered successfully',
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle MongoDB duplicate key error
      if (error instanceof Error && 'code' in error && error.code === 11000) {
        return {
          success: false,
          message: 'User with this email already exists',
          code: ERROR_CODES.DUPLICATE_ERROR,
        };
      }

      return {
        success: false,
        message: 'Registration failed due to server error',
        code: ERROR_CODES.SERVER_ERROR,
      };
    }
  }

  /**
   * Login user with email and password
   */
  static async login(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      const { email, password } = loginData;

      // Find user by email with password
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password',
          code: ERROR_CODES.AUTHENTICATION_ERROR,
        };
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password',
          code: ERROR_CODES.AUTHENTICATION_ERROR,
        };
      }

      // Generate JWT token
      const token = JwtUtils.generateToken({
        userId: user._id.toString(),
        email: user.email,
      });

      // Convert to plain user object (password already excluded by toJSON transform)
      const userObject: IUser = {
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
        token,
        message: 'Login successful',
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed due to server error',
        code: ERROR_CODES.SERVER_ERROR,
      };
    }
  }

  /**
   * Get user by ID (for /me endpoint)
   */
  static async getUserById(userId: string): Promise<{ success: boolean; user?: IUser; message?: string; code?: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          code: ERROR_CODES.NOT_FOUND_ERROR,
        };
      }

      const userObject: IUser = {
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
    } catch (error) {
      console.error('Get user error:', error);
      return {
        success: false,
        message: 'Failed to retrieve user information',
        code: ERROR_CODES.SERVER_ERROR,
      };
    }
  }
}