"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepClone = exports.formatFileSize = exports.capitalize = exports.isEmpty = exports.sanitizeHtml = exports.generateRandomId = exports.truncateText = exports.formatDate = void 0;
/**
 * Format a date to a human-readable string
 */
const formatDate = (date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    if (diffInMinutes < 1) {
        return 'Just now';
    }
    else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
    }
    else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    }
    else if (diffInDays < 7) {
        return `${diffInDays}d ago`;
    }
    else {
        return dateObj.toLocaleDateString();
    }
};
exports.formatDate = formatDate;
/**
 * Truncate text to a specified length with ellipsis
 */
const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength - 3) + '...';
};
exports.truncateText = truncateText;
/**
 * Generate a random string for temporary IDs or keys
 */
const generateRandomId = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
exports.generateRandomId = generateRandomId;
/**
 * Sanitize HTML content to prevent XSS
 */
const sanitizeHtml = (html) => {
    // Basic HTML sanitization - remove script tags and dangerous attributes
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/javascript:/gi, '');
};
exports.sanitizeHtml = sanitizeHtml;
/**
 * Check if a string is empty or only whitespace
 */
const isEmpty = (str) => {
    return !str || str.trim().length === 0;
};
exports.isEmpty = isEmpty;
/**
 * Capitalize the first letter of a string
 */
const capitalize = (str) => {
    if (!str)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
exports.capitalize = capitalize;
/**
 * Format file size in human-readable format
 */
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
exports.formatFileSize = formatFileSize;
/**
 * Deep clone an object
 */
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (Array.isArray(obj)) {
        return obj.map(item => (0, exports.deepClone)(item));
    }
    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = (0, exports.deepClone)(obj[key]);
        }
    }
    return cloned;
};
exports.deepClone = deepClone;
