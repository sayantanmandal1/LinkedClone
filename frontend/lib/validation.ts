// Local validation utilities for frontend
// Copied from shared package to resolve build issues

import { VALIDATION_LIMITS } from './constants';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= VALIDATION_LIMITS.PASSWORD_MIN;
};

export const validateName = (name: string): boolean => {
  const trimmed = name.trim();
  return trimmed.length >= VALIDATION_LIMITS.NAME_MIN && trimmed.length <= VALIDATION_LIMITS.NAME_MAX;
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