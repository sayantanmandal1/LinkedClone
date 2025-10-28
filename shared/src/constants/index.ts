export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  
  // Post endpoints
  POSTS: {
    BASE: '/api/posts',
    BY_ID: (id: string) => `/api/posts/${id}`,
    LIKE: (id: string) => `/api/posts/${id}/like`,
    COMMENT: (id: string) => `/api/posts/${id}/comment`,
  },
  
  // User endpoints
  USERS: {
    BY_ID: (id: string) => `/api/users/${id}`,
    POSTS: (id: string) => `/api/users/${id}/posts`,
  },
  
  // Upload endpoints
  UPLOAD: {
    IMAGE: '/api/upload/image',
  },
} as const;

export const VALIDATION_LIMITS = {
  POST_CONTENT_MAX: 1000,
  COMMENT_CONTENT_MAX: 500,
  NAME_MIN: 2,
  NAME_MAX: 50,
  PASSWORD_MIN: 6,
  IMAGE_SIZE_MAX: 5 * 1024 * 1024, // 5MB
} as const;

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

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

export const JWT_CONFIG = {
  EXPIRES_IN: '15m',
  REFRESH_EXPIRES_IN: '7d',
} as const;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
] as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  PROFILE: '/profile',
  USER_PROFILE: (id: string) => `/profile/${id}`,
} as const;