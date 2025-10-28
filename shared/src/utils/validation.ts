import { VALIDATION_LIMITS } from '../constants';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= VALIDATION_LIMITS.PASSWORD_MIN;
};

export const validatePostContent = (content: string): boolean => {
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= VALIDATION_LIMITS.POST_CONTENT_MAX;
};

export const validateCommentContent = (content: string): boolean => {
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= VALIDATION_LIMITS.COMMENT_CONTENT_MAX;
};

export const validateName = (name: string): boolean => {
  const trimmed = name.trim();
  return trimmed.length >= VALIDATION_LIMITS.NAME_MIN && trimmed.length <= VALIDATION_LIMITS.NAME_MAX;
};

export const validateImageFile = (file: File): boolean => {
  // Check file size
  if (file.size > VALIDATION_LIMITS.IMAGE_SIZE_MAX) {
    return false;
  }
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return allowedTypes.includes(file.type);
};

export const validateObjectId = (id: string): boolean => {
  // MongoDB ObjectId validation (24 character hex string)
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

// Validation result type for more detailed feedback
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateUserRegistration = (data: {
  name: string;
  email: string;
  password: string;
}): ValidationResult => {
  const errors: string[] = [];
  
  if (!validateName(data.name)) {
    errors.push(`Name must be between ${VALIDATION_LIMITS.NAME_MIN} and ${VALIDATION_LIMITS.NAME_MAX} characters`);
  }
  
  if (!validateEmail(data.email)) {
    errors.push('Please provide a valid email address');
  }
  
  if (!validatePassword(data.password)) {
    errors.push(`Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN} characters long`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePostData = (data: {
  content: string;
}): ValidationResult => {
  const errors: string[] = [];
  
  if (!validatePostContent(data.content)) {
    errors.push(`Post content must be between 1 and ${VALIDATION_LIMITS.POST_CONTENT_MAX} characters`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateCommentData = (data: {
  content: string;
}): ValidationResult => {
  const errors: string[] = [];
  
  if (!validateCommentContent(data.content)) {
    errors.push(`Comment must be between 1 and ${VALIDATION_LIMITS.COMMENT_CONTENT_MAX} characters`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};