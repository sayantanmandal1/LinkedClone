"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Post_1 = require("../models/Post");
class PostService {
    /**
     * Create a new post
     */
    static async createPost(authorId, postData) {
        const post = new Post_1.Post({
            author: new mongoose_1.default.Types.ObjectId(authorId),
            content: postData.content.trim(),
            imageUrl: postData.imageUrl?.trim() || undefined,
            likes: [],
            comments: [],
        });
        await post.save();
        // Return the post with populated author data
        const populatedPost = await Post_1.Post.findOneWithPopulatedData({ _id: post._id });
        if (!populatedPost) {
            throw new Error('Failed to retrieve created post');
        }
        return populatedPost;
    }
    /**
     * Get all posts with pagination
     */
    static async getAllPosts(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [posts, totalCount] = await Promise.all([
            Post_1.Post.findWithPopulatedData({}, {
                sort: { createdAt: -1 },
                skip,
                limit,
            }),
            Post_1.Post.countDocuments(),
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
    static async getPostById(postId) {
        if (!mongoose_1.default.Types.ObjectId.isValid(postId)) {
            return null;
        }
        return Post_1.Post.findOneWithPopulatedData({ _id: postId });
    }
    /**
     * Get posts by a specific user
     */
    static async getPostsByUser(userId, page = 1, limit = 10) {
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return { posts: [], totalCount: 0, totalPages: 0 };
        }
        const skip = (page - 1) * limit;
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const [posts, totalCount] = await Promise.all([
            Post_1.Post.findWithPopulatedData({ author: userObjectId }, {
                sort: { createdAt: -1 },
                skip,
                limit,
            }),
            Post_1.Post.countDocuments({ author: userObjectId }),
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
    static async updatePost(postId, authorId, updateData) {
        if (!mongoose_1.default.Types.ObjectId.isValid(postId)) {
            return null;
        }
        const post = await Post_1.Post.findOne({
            _id: postId,
            author: new mongoose_1.default.Types.ObjectId(authorId),
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
        return Post_1.Post.findOneWithPopulatedData({ _id: post._id });
    }
    /**
     * Delete a post (only by the author)
     */
    static async deletePost(postId, authorId) {
        if (!mongoose_1.default.Types.ObjectId.isValid(postId)) {
            return false;
        }
        const result = await Post_1.Post.deleteOne({
            _id: postId,
            author: new mongoose_1.default.Types.ObjectId(authorId),
        });
        return result.deletedCount > 0;
    }
    /**
     * Toggle like on a post
     */
    static async toggleLike(postId, userId) {
        if (!mongoose_1.default.Types.ObjectId.isValid(postId) || !mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return null;
        }
        const post = await Post_1.Post.findById(postId);
        if (!post) {
            return null;
        }
        await post.toggleLike(new mongoose_1.default.Types.ObjectId(userId));
        // Return the updated post with populated data
        return Post_1.Post.findOneWithPopulatedData({ _id: post._id });
    }
    /**
     * Add a comment to a post
     */
    static async addComment(postId, authorId, content) {
        if (!mongoose_1.default.Types.ObjectId.isValid(postId) || !mongoose_1.default.Types.ObjectId.isValid(authorId)) {
            return null;
        }
        const post = await Post_1.Post.findById(postId);
        if (!post) {
            return null;
        }
        await post.addComment(new mongoose_1.default.Types.ObjectId(authorId), content);
        // Return the updated post with populated data
        return Post_1.Post.findOneWithPopulatedData({ _id: post._id });
    }
    /**
     * Check if a user is the author of a post
     */
    static async isPostAuthor(postId, userId) {
        if (!mongoose_1.default.Types.ObjectId.isValid(postId) || !mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return false;
        }
        const post = await Post_1.Post.findOne({
            _id: postId,
            author: new mongoose_1.default.Types.ObjectId(userId),
        });
        return !!post;
    }
}
exports.PostService = PostService;
