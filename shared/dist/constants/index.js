"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROUTES = exports.ALLOWED_IMAGE_TYPES = exports.JWT_CONFIG = exports.PAGINATION_DEFAULTS = exports.ERROR_CODES = exports.HTTP_STATUS = exports.VALIDATION_LIMITS = exports.API_ENDPOINTS = void 0;
exports.API_ENDPOINTS = {
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
        BY_ID: (id) => `/api/posts/${id}`,
        LIKE: (id) => `/api/posts/${id}/like`,
        COMMENT: (id) => `/api/posts/${id}/comment`,
    },
    // User endpoints
    USERS: {
        BY_ID: (id) => `/api/users/${id}`,
        POSTS: (id) => `/api/users/${id}/posts`,
    },
    // Upload endpoints
    UPLOAD: {
        IMAGE: '/api/upload/image',
    },
};
exports.VALIDATION_LIMITS = {
    POST_CONTENT_MAX: 1000,
    COMMENT_CONTENT_MAX: 500,
    NAME_MIN: 2,
    NAME_MAX: 50,
    PASSWORD_MIN: 6,
    IMAGE_SIZE_MAX: 5 * 1024 * 1024, // 5MB
};
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
};
exports.ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
    DUPLICATE_ERROR: 'DUPLICATE_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
};
exports.PAGINATION_DEFAULTS = {
    PAGE: 1,
    LIMIT: 10,
    MAX_LIMIT: 100,
};
exports.JWT_CONFIG = {
    EXPIRES_IN: '15m',
    REFRESH_EXPIRES_IN: '7d',
};
exports.ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
];
exports.ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    SIGNUP: '/signup',
    PROFILE: '/profile',
    USER_PROFILE: (id) => `/profile/${id}`,
};
