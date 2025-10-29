// Local type definitions for backend
// Copied from shared package to make backend self-contained

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

// API Request types
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

// API Response types
export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string>;
  code?: string;
}

// Utility types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Constants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export const JWT_CONFIG = {
  EXPIRES_IN: '15m',
  REFRESH_EXPIRES_IN: '7d',
} as const;