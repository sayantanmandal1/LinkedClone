import type { User } from './user';
import type { Comment } from './comment';
export interface Post {
    _id: string;
    author: User;
    content: string;
    imageUrl?: string;
    likes: string[];
    comments: Comment[];
    likeCount: number;
    commentCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreatePostRequest {
    content: string;
    imageUrl?: string;
}
export interface UpdatePostRequest {
    content?: string;
    imageUrl?: string;
}
export interface PostResponse {
    success: boolean;
    post?: Post;
    message?: string;
}
export interface PostsResponse {
    success: boolean;
    posts?: Post[];
    totalCount?: number;
    page?: number;
    limit?: number;
    message?: string;
}
export interface AddCommentRequest {
    content: string;
}
