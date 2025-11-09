"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCommentData = exports.validatePostData = exports.validateUserRegistration = exports.validateObjectId = exports.validateImageFile = exports.validateName = exports.validateCommentContent = exports.validatePostContent = exports.validatePassword = exports.validateEmail = void 0;
const constants_1 = require("../constants");
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    return password.length >= constants_1.VALIDATION_LIMITS.PASSWORD_MIN;
};
exports.validatePassword = validatePassword;
const validatePostContent = (content) => {
    const trimmed = content.trim();
    return trimmed.length > 0 && trimmed.length <= constants_1.VALIDATION_LIMITS.POST_CONTENT_MAX;
};
exports.validatePostContent = validatePostContent;
const validateCommentContent = (content) => {
    const trimmed = content.trim();
    return trimmed.length > 0 && trimmed.length <= constants_1.VALIDATION_LIMITS.COMMENT_CONTENT_MAX;
};
exports.validateCommentContent = validateCommentContent;
const validateName = (name) => {
    const trimmed = name.trim();
    return trimmed.length >= constants_1.VALIDATION_LIMITS.NAME_MIN && trimmed.length <= constants_1.VALIDATION_LIMITS.NAME_MAX;
};
exports.validateName = validateName;
// File validation for browser environments only
const validateImageFile = (file) => {
    // Check file size
    if (file.size > constants_1.VALIDATION_LIMITS.IMAGE_SIZE_MAX) {
        return false;
    }
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(file.type);
};
exports.validateImageFile = validateImageFile;
const validateObjectId = (id) => {
    // MongoDB ObjectId validation (24 character hex string)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
};
exports.validateObjectId = validateObjectId;
const validateUserRegistration = (data) => {
    const errors = [];
    if (!(0, exports.validateName)(data.name)) {
        errors.push(`Name must be between ${constants_1.VALIDATION_LIMITS.NAME_MIN} and ${constants_1.VALIDATION_LIMITS.NAME_MAX} characters`);
    }
    if (!(0, exports.validateEmail)(data.email)) {
        errors.push('Please provide a valid email address');
    }
    if (!(0, exports.validatePassword)(data.password)) {
        errors.push(`Password must be at least ${constants_1.VALIDATION_LIMITS.PASSWORD_MIN} characters long`);
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
exports.validateUserRegistration = validateUserRegistration;
const validatePostData = (data) => {
    const errors = [];
    if (!(0, exports.validatePostContent)(data.content)) {
        errors.push(`Post content must be between 1 and ${constants_1.VALIDATION_LIMITS.POST_CONTENT_MAX} characters`);
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
exports.validatePostData = validatePostData;
const validateCommentData = (data) => {
    const errors = [];
    if (!(0, exports.validateCommentContent)(data.content)) {
        errors.push(`Comment must be between 1 and ${constants_1.VALIDATION_LIMITS.COMMENT_CONTENT_MAX} characters`);
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
exports.validateCommentData = validateCommentData;
