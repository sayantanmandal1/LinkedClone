import mongoose from 'mongoose';
import { Post, PostDocument } from '../models/Post';
import { CreatePostRequest, UpdatePostRequest } from '../types';

export class PostService {
  /**
   * Create a new post
   */
  static async createPost(
    authorId: string,
    postData: CreatePostRequest
  ): Promise<PostDocument> {
    const post = new Post({
      author: new mongoose.Types.ObjectId(authorId),
      content: postData.content.trim(),
      imageUrl: postData.imageUrl?.trim() || undefined,
      likes: [],
      comments: [],
    });

    await post.save();
    
    // Return the post with populated author data
    const populatedPost = await Post.findOneWithPopulatedData({ _id: post._id });
    if (!populatedPost) {
      throw new Error('Failed to retrieve created post');
    }
    
    return populatedPost;
  }

  /**
   * Get all posts with pagination
   */
  static async getAllPosts(
    page: number = 1,
    limit: number = 10
  ): Promise<{ posts: PostDocument[]; totalCount: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    
    const [posts, totalCount] = await Promise.all([
      Post.findWithPopulatedData({}, {
        sort: { createdAt: -1 },
        skip,
        limit,
      }),
      Post.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      posts,
      totalCount,
      totalPages,
    };
  }

  /**
   * Get a single post by ID
   */
  static async getPostById(postId: string): Promise<PostDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return null;
    }

    return Post.findOneWithPopulatedData({ _id: postId });
  }

  /**
   * Get posts by a specific user
   */
  static async getPostsByUser(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ posts: PostDocument[]; totalCount: number; totalPages: number }> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { posts: [], totalCount: 0, totalPages: 0 };
    }

    const skip = (page - 1) * limit;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    const [posts, totalCount] = await Promise.all([
      Post.findWithPopulatedData({ author: userObjectId }, {
        sort: { createdAt: -1 },
        skip,
        limit,
      }),
      Post.countDocuments({ author: userObjectId }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      posts,
      totalCount,
      totalPages,
    };
  }

  /**
   * Update a post (only by the author)
   */
  static async updatePost(
    postId: string,
    authorId: string,
    updateData: UpdatePostRequest
  ): Promise<PostDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return null;
    }

    const post = await Post.findOne({
      _id: postId,
      author: new mongoose.Types.ObjectId(authorId),
    });

    if (!post) {
      return null;
    }

    // Update only provided fields
    if (updateData.content !== undefined) {
      post.content = updateData.content.trim();
    }
    if (updateData.imageUrl !== undefined) {
      post.imageUrl = updateData.imageUrl?.trim() || undefined;
    }

    await post.save();

    // Return the updated post with populated data
    return Post.findOneWithPopulatedData({ _id: post._id });
  }

  /**
   * Delete a post (only by the author)
   */
  static async deletePost(postId: string, authorId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return false;
    }

    const result = await Post.deleteOne({
      _id: postId,
      author: new mongoose.Types.ObjectId(authorId),
    });

    return result.deletedCount > 0;
  }

  /**
   * Toggle like on a post
   */
  static async toggleLike(postId: string, userId: string): Promise<PostDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    const post = await Post.findById(postId);
    if (!post) {
      return null;
    }

    await post.toggleLike(new mongoose.Types.ObjectId(userId));

    // Return the updated post with populated data
    return Post.findOneWithPopulatedData({ _id: post._id });
  }

  /**
   * Add a comment to a post
   */
  static async addComment(
    postId: string,
    authorId: string,
    content: string
  ): Promise<PostDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(authorId)) {
      return null;
    }

    const post = await Post.findById(postId);
    if (!post) {
      return null;
    }

    await post.addComment(new mongoose.Types.ObjectId(authorId), content);

    // Return the updated post with populated data
    return Post.findOneWithPopulatedData({ _id: post._id });
  }

  /**
   * Check if a user is the author of a post
   */
  static async isPostAuthor(postId: string, userId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return false;
    }

    const post = await Post.findOne({
      _id: postId,
      author: new mongoose.Types.ObjectId(userId),
    });

    return !!post;
  }
}