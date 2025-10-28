import { Router, Request, Response } from 'express';
import { PostService } from '../services/postService';
import { authenticate as auth } from '../middleware/auth';
import { CreatePostRequest, UpdatePostRequest } from '../../../shared/src/types/post';

const router = Router();

/**
 * GET /api/posts
 * Get all posts with pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50); // Max 50 posts per page

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page and limit must be positive numbers',
      });
    }

    const result = await PostService.getAllPosts(page, limit);

    res.json({
      success: true,
      posts: result.posts,
      totalCount: result.totalCount,
      page,
      limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
    });
  }
});

/**
 * POST /api/posts
 * Create a new post (requires authentication)
 */
router.post('/', auth, async (req: Request, res: Response) => {
  try {
    const { content, imageUrl }: CreatePostRequest = req.body;
    const userId = req.user!.id;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Post content is required',
        errors: { content: 'Content cannot be empty' },
      });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Post content is too long',
        errors: { content: 'Content cannot exceed 1000 characters' },
      });
    }

    const post = await PostService.createPost(userId, { content, imageUrl });

    res.status(201).json({
      success: true,
      post,
      message: 'Post created successfully',
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
    });
  }
});

/**
 * GET /api/posts/:id
 * Get a specific post by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const post = await PostService.getPostById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    res.json({
      success: true,
      post,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
    });
  }
});

/**
 * PUT /api/posts/:id
 * Update a post (only by the author)
 */
router.put('/:id', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, imageUrl }: UpdatePostRequest = req.body;
    const userId = req.user!.id;

    // Validation
    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid post content',
          errors: { content: 'Content cannot be empty' },
        });
      }

      if (content.trim().length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Post content is too long',
          errors: { content: 'Content cannot exceed 1000 characters' },
        });
      }
    }

    const updatedPost = await PostService.updatePost(id, userId, { content, imageUrl });

    if (!updatedPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or you are not authorized to update this post',
      });
    }

    res.json({
      success: true,
      post: updatedPost,
      message: 'Post updated successfully',
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update post',
    });
  }
});

/**
 * DELETE /api/posts/:id
 * Delete a post (only by the author)
 */
router.delete('/:id', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const deleted = await PostService.deletePost(id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or you are not authorized to delete this post',
      });
    }

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
    });
  }
});

/**
 * POST /api/posts/:id/like
 * Toggle like on a post (requires authentication)
 */
router.post('/:id/like', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const updatedPost = await PostService.toggleLike(id, userId);

    if (!updatedPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const liked = updatedPost.likes.includes(userId);

    res.json({
      success: true,
      liked,
      likeCount: updatedPost.likeCount,
      message: 'Like toggled successfully',
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like',
    });
  }
});

/**
 * POST /api/posts/:id/comment
 * Add a comment to a post (requires authentication)
 */
router.post('/:id/comment', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;

    // Validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required',
        errors: { content: 'Content cannot be empty' },
      });
    }

    if (content.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Comment is too long',
        errors: { content: 'Comment cannot exceed 500 characters' },
      });
    }

    const updatedPost = await PostService.addComment(id, userId, content);

    if (!updatedPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // Get the newly added comment (last one in the array)
    const newComment = updatedPost.comments[updatedPost.comments.length - 1];

    res.status(201).json({
      success: true,
      comment: newComment,
      message: 'Comment added successfully',
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
    });
  }
});

export default router;