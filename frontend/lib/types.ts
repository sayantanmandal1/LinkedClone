// Local type definitions for frontend
// Copied from shared package to resolve build issues

export interface User {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  _id: string;
  content: string;
  author: User;
  imageUrl?: string;
  likes: string[];
  comments: Comment[];
  likeCount?: number;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  author: User;
  post: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AuthResponse extends ApiResponse {
  user?: User;
  token?: string;
}

export interface PostsResponse extends ApiResponse {
  posts?: Post[];
  hasMore?: boolean;
  page?: number;
  totalCount?: number;
}

export interface UsersResponse extends ApiResponse {
  user?: User;
  users?: User[];
}

export interface DeleteResponse extends ApiResponse {
  deletedId?: string;
}

// Request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreatePostRequest {
  content: string;
  imageUrl?: string;
}

export interface UpdatePostRequest {
  content?: string;
  imageUrl?: string;
}

export interface AddCommentRequest {
  content: string;
}

// Additional response types
export interface PostResponse extends ApiResponse {
  post?: Post;
}

export interface LikeResponse extends ApiResponse {
  liked?: boolean;
  likeCount?: number;
}

export interface CommentResponse extends ApiResponse {
  comment?: Comment;
}

export interface UploadResponse extends ApiResponse {
  data?: {
    url: string;
    filename: string;
  };
}