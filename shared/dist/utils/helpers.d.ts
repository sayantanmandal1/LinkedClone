/**
 * Format a date to a human-readable string
 */
export declare const formatDate: (date: Date | string) => string;
/**
 * Truncate text to a specified length with ellipsis
 */
export declare const truncateText: (text: string, maxLength: number) => string;
/**
 * Generate a random string for temporary IDs or keys
 */
export declare const generateRandomId: (length?: number) => string;
/**
 * Sanitize HTML content to prevent XSS
 */
export declare const sanitizeHtml: (html: string) => string;
/**
 * Check if a string is empty or only whitespace
 */
export declare const isEmpty: (str: string | null | undefined) => boolean;
/**
 * Capitalize the first letter of a string
 */
export declare const capitalize: (str: string) => string;
/**
 * Format file size in human-readable format
 */
export declare const formatFileSize: (bytes: number) => string;
/**
 * Deep clone an object
 */
export declare const deepClone: <T>(obj: T) => T;
