"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Post = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Comment subdocument schema
const commentSchema = new mongoose_1.Schema({
    author: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: { createdAt: true, updatedAt: false },
});
const postSchema = new mongoose_1.Schema({
    author: {
        type: mongoose_1.Schema.Types.ObjectId,
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
            validator: function (v) {
                if (!v)
                    return true; // Optional field
                // Basic URL validation
                return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
            },
            message: 'Image URL must be a valid HTTP/HTTPS URL ending with jpg, jpeg, png, gif, or webp',
        },
    },
    likes: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        }],
    comments: [commentSchema],
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            // Remove __v from JSON output
            const { __v, ...cleanRet } = ret;
            return cleanRet;
        },
    },
});
// Virtual field for like count
postSchema.virtual('likeCount').get(function () {
    return this.likes.length;
});
// Virtual field for comment count
postSchema.virtual('commentCount').get(function () {
    return this.comments.length;
});
// Indexes for performance optimization
postSchema.index({ createdAt: -1 }); // For chronological ordering (most recent first)
postSchema.index({ author: 1 }); // For user-specific post queries
postSchema.index({ author: 1, createdAt: -1 }); // Compound index for user posts ordered by date
postSchema.index({ 'comments.createdAt': -1 }); // For comment ordering
// Static method to find posts with populated author and comment authors
postSchema.statics.findWithPopulatedData = function (filter = {}, options = {}) {
    return this.find(filter, null, options)
        .populate('author', 'name email profilePicture createdAt')
        .populate('comments.author', 'name email profilePicture createdAt')
        .populate('likes', 'name email profilePicture');
};
// Static method to find a single post with populated data
postSchema.statics.findOneWithPopulatedData = function (filter = {}) {
    return this.findOne(filter)
        .populate('author', 'name email profilePicture createdAt')
        .populate('comments.author', 'name email profilePicture createdAt')
        .populate('likes', 'name email profilePicture');
};
// Instance method to add a like
postSchema.methods.addLike = function (userId) {
    if (!this.likes.includes(userId)) {
        this.likes.push(userId);
    }
    return this.save();
};
// Instance method to remove a like
postSchema.methods.removeLike = function (userId) {
    this.likes = this.likes.filter((id) => !id.equals(userId));
    return this.save();
};
// Instance method to toggle like
postSchema.methods.toggleLike = function (userId) {
    const hasLiked = this.likes.some((id) => id.equals(userId));
    if (hasLiked) {
        return this.removeLike(userId);
    }
    else {
        return this.addLike(userId);
    }
};
// Instance method to add a comment
postSchema.methods.addComment = function (authorId, content) {
    this.comments.push({
        author: authorId,
        content: content.trim(),
        createdAt: new Date(),
    });
    return this.save();
};
exports.Post = mongoose_1.default.model('Post', postSchema);
