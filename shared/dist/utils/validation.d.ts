export declare const validateEmail: (email: string) => boolean;
export declare const validatePassword: (password: string) => boolean;
export declare const validatePostContent: (content: string) => boolean;
export declare const validateCommentContent: (content: string) => boolean;
export declare const validateName: (name: string) => boolean;
export declare const validateImageFile: (file: {
    size: number;
    type: string;
}) => boolean;
export declare const validateObjectId: (id: string) => boolean;
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
export declare const validateUserRegistration: (data: {
    name: string;
    email: string;
    password: string;
}) => ValidationResult;
export declare const validatePostData: (data: {
    content: string;
}) => ValidationResult;
export declare const validateCommentData: (data: {
    content: string;
}) => ValidationResult;
