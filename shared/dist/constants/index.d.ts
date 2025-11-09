export declare const API_ENDPOINTS: {
    readonly AUTH: {
        readonly REGISTER: "/api/auth/register";
        readonly LOGIN: "/api/auth/login";
        readonly LOGOUT: "/api/auth/logout";
        readonly ME: "/api/auth/me";
    };
    readonly POSTS: {
        readonly BASE: "/api/posts";
        readonly BY_ID: (id: string) => string;
        readonly LIKE: (id: string) => string;
        readonly COMMENT: (id: string) => string;
    };
    readonly USERS: {
        readonly BY_ID: (id: string) => string;
        readonly POSTS: (id: string) => string;
    };
    readonly UPLOAD: {
        readonly IMAGE: "/api/upload/image";
    };
};
export declare const VALIDATION_LIMITS: {
    readonly POST_CONTENT_MAX: 1000;
    readonly COMMENT_CONTENT_MAX: 500;
    readonly NAME_MIN: 2;
    readonly NAME_MAX: 50;
    readonly PASSWORD_MIN: 6;
    readonly IMAGE_SIZE_MAX: number;
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly INTERNAL_SERVER_ERROR: 500;
};
export declare const ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR";
    readonly AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR";
    readonly NOT_FOUND_ERROR: "NOT_FOUND_ERROR";
    readonly DUPLICATE_ERROR: "DUPLICATE_ERROR";
    readonly SERVER_ERROR: "SERVER_ERROR";
};
export declare const PAGINATION_DEFAULTS: {
    readonly PAGE: 1;
    readonly LIMIT: 10;
    readonly MAX_LIMIT: 100;
};
export declare const JWT_CONFIG: {
    readonly EXPIRES_IN: "15m";
    readonly REFRESH_EXPIRES_IN: "7d";
};
export declare const ALLOWED_IMAGE_TYPES: readonly ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
export declare const ROUTES: {
    readonly HOME: "/";
    readonly LOGIN: "/login";
    readonly SIGNUP: "/signup";
    readonly PROFILE: "/profile";
    readonly USER_PROFILE: (id: string) => string;
};
