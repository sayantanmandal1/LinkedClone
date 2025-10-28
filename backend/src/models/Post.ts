import mongoose, { Document, Schema } from 'mongoose';
import { Post as IPost, Comment } from '@linkedin-clone/shared';

// Define the comment subdocument interface
interface CommentSubdocument {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

// Extend the Post interface to include document methods
export interface PostDocument extends Omit<IPost, '_id' | 'author' | 'likes' | 'comments'>, Document {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  likes: mongoose.Types.ObjectId[];
  comments: CommentSubdocument[];
  // Instance methods
  addLike(userId: mongoose.Types.ObjectId): Promise<PostDocument>;
  removeLike(userId: mongoose.Types.ObjectId): Promise<PostDocument>;
  toggleLike(userId: mongoose.Types.ObjectId): Promise<PostDocument>;
  addComment(authorId: mongoose.Types.ObjectId, content: string): Promise<PostDocument>;
}

// Add static methods interface
export interface PostModel extends mongoose.Model<PostDocument> {
  findWithPopulatedData(filter?: any, options?: any): mongoose.Query<PostDocument[], PostDocument>;
  findOneWithPopulatedData(filter?: any): mongoose.Query<PostDocument | null, PostDocument>;
}

// Comment subdocument schema
const commentSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment author is required'],
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
      minlength: [1, 'Comment must have at least 1 character'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const postSchema = new Schema<PostDocument>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post author is required'],
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
      maxlength: [1000, 'Post content cannot exceed 1000 characters'],
      minlength: [1, 'Post must have at least 1 character'],
    },
    imageUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Optional field
          // Basic URL validation
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'Image URL must be a valid HTTP/HTTPS URL ending with jpg, jpeg, png, gif, or webp',
      },
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    comments: [commentSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Remove __v from JSON output
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
  }
);

// Virtual field for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual field for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Indexes for performance optimization
postSchema.index({ createdAt: -1 }); // For chronological ordering (most recent first)
postSchema.index({ author: 1 }); // For user-specific post queries
postSchema.index({ author: 1, createdAt: -1 }); // Compound index for user posts ordered by date
postSchema.index({ 'comments.createdAt': -1 }); // For comment ordering

// Static method to find posts with populated author and comment authors
postSchema.statics.findWithPopulatedData = function(filter = {}, options = {}) {
  return this.find(filter, null, options)
    .populate('author', 'name email profilePicture createdAt')
    .populate('comments.author', 'name email profilePicture createdAt')
    .populate('likes', 'name email profilePicture');
};

// Static method to find a single post with populated data
postSchema.statics.findOneWithPopulatedData = function(filter = {}) {
  return this.findOne(filter)
    .populate('author', 'name email profilePicture createdAt')
    .populate('comments.author', 'name email profilePicture createdAt')
    .populate('likes', 'name email profilePicture');
};

// Instance method to add a like
postSchema.methods.addLike = function(userId: mongoose.Types.ObjectId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
  }
  return this.save();
};

// Instance method to remove a like
postSchema.methods.removeLike = function(userId: mongoose.Types.ObjectId) {
  this.likes = this.likes.filter((id: mongoose.Types.ObjectId) => !id.equals(userId));
  return this.save();
};

// Instance method to toggle like
postSchema.methods.toggleLike = function(userId: mongoose.Types.ObjectId) {
  const hasLiked = this.likes.some((id: mongoose.Types.ObjectId) => id.equals(userId));
  if (hasLiked) {
    return this.removeLike(userId);
  } else {
    return this.addLike(userId);
  }
};

// Instance method to add a comment
postSchema.methods.addComment = function(authorId: mongoose.Types.ObjectId, content: string) {
  this.comments.push({
    author: authorId,
    content: content.trim(),
    createdAt: new Date(),
  });
  return this.save();
};

export const Post = mongoose.model<PostDocument, PostModel>('Post', postSchema);