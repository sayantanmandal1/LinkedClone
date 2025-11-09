import { User } from './user';
export interface Comment {
    _id: string;
    author: User;
    content: string;
    createdAt: Date;
}
export interface CreateCommentRequest {
    content: string;
}
export interface CommentResponse {
    success: boolean;
    comment?: Comment;
    message?: string;
}
