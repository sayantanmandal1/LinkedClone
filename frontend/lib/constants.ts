// Constants for the frontend application

export const VALIDATION_LIMITS = {
  POST_CONTENT_MAX: 1000,
  COMMENT_CONTENT_MAX: 500,
  NAME_MIN: 2,
  NAME_MAX: 50,
  PASSWORD_MIN: 6,
  IMAGE_SIZE_MAX: 5 * 1024 * 1024, // 5MB
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
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
  FEED: '/feed',
  USER_PROFILE: (id: string) => `/profile/${id}`,
} as const;

export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
} as const;