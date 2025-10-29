import { User } from '../models/User';
import { Post } from '../models/Post';
import { transformUserUrls, transformPostUrls } from '../utils/urlHelper';
import { User as IUser, Post as IPost, ERROR_CODES, PaginationParams } from '@linkedin-clone/shared';
import mongoose from 'mongoose';

export interface UserProfileResponse {
  success: boolean;
  user?: IUser & { postCount: number; joinDate: Date };
  message?: string;
  code?: string;
}

export interface UserPostsResponse {
  success: boolean;
  posts?: IPost[];
  totalCount?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  message?: string;
  code?: string;
}

export class UserService {
  /**
   * Get user profile by ID with statistics
   */
  static async getUserProfile(userId: string): Promise<UserProfileResponse> {
    try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return {
          success: false,
          message: 'Invalid user ID format',
          code: ERROR_CODES.VALIDATION_ERROR,
        };
      }

      // Find user by ID
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          code: ERROR_CODES.NOT_FOUND_ERROR,
        };
      }

      // Get post count for the user
      const postCount = await Post.countDocuments({ author: userId });

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
        user: transformUserUrls(userProfile),
      };
    } catch (error) {
      console.error('Get user profile error:', error);
      return {
        success: false,
        message: 'Failed to retrieve user profile',
        code: ERROR_CODES.SERVER_ERROR,
      };
    }
  }

  /**
   * Get posts by user ID with pagination
   */
  static async getUserPosts(
    userId: string, 
    paginationParams: PaginationParams = {}
  ): Promise<UserPostsResponse> {
    try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return {
          success: false,
          message: 'Invalid user ID format',
          code: ERROR_CODES.VALIDATION_ERROR,
        };
      }

      // Check if user exists
      const userExists = await User.findById(userId);
      if (!userExists) {
        return {
          success: false,
          message: 'User not found',
          code: ERROR_CODES.NOT_FOUND_ERROR,
        };
      }

      // Set up pagination
      const page = Math.max(1, paginationParams.page || 1);
      const limit = Math.min(100, Math.max(1, paginationParams.limit || 10));
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const totalCount = await Post.countDocuments({ author: userId });
      const totalPages = Math.ceil(totalCount / limit);

      // Find posts by user with pagination and populated data
      const posts = await Post.findWithPopulatedData(
        { author: userId },
        {
          sort: { createdAt: -1 }, // Most recent first
          skip,
          limit,
        }
      );

      // Convert posts to plain objects with proper typing and ensure HTTPS URLs
      const postsData: IPost[] = posts.map(post => transformPostUrls({
        _id: post._id.toString(),
        author: {
          _id: (post.author as any)._id.toString(),
          name: (post.author as any).name,
          email: (post.author as any).email,
          createdAt: (post.author as any).createdAt,
          updatedAt: (post.author as any).updatedAt,
        },
        content: post.content,
        imageUrl: post.imageUrl,
        likes: post.likes.map(like => (like as any)._id.toString()),
        comments: post.comments.map(comment => ({
          _id: comment._id.toString(),
          author: {
            _id: (comment.author as any)._id.toString(),
            name: (comment.author as any).name,
            email: (comment.author as any).email,
            createdAt: (comment.author as any).createdAt,
            updatedAt: (comment.author as any).updatedAt,
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
    } catch (error) {
      console.error('Get user posts error:', error);
      return {
        success: false,
        message: 'Failed to retrieve user posts',
        code: ERROR_CODES.SERVER_ERROR,
      };
    }
  }

  /**
   * Update user's profile picture
   */
  static async updateProfilePicture(
    userId: string, 
    profilePictureUrl: string
  ): Promise<{ success: boolean; user?: IUser; message?: string; code?: string }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return {
          success: false,
          message: 'Invalid user ID',
          code: ERROR_CODES.VALIDATION_ERROR,
        };
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { profilePicture: profilePictureUrl },
        { new: true, runValidators: true }
      );

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
        user: transformUserUrls(userObject),
      };
    } catch (error) {
      console.error('Update profile picture error:', error);
      return {
        success: false,
        message: 'Failed to update profile picture',
        code: ERROR_CODES.SERVER_ERROR,
      };
    }
  }
}