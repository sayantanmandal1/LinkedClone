export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string>;
  code?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  totalCount?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string>;
  code?: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface LikeResponse {
  success: boolean;
  liked: boolean;
  likeCount: number;
  message?: string;
}

export interface UploadResponse {
  success: boolean;
  data?: {
    filename: string;
    originalName: string;
    size: number;
    mimetype: string;
    url: string;
  };
  message?: string;
}

export interface DeleteResponse {
  success: boolean;
  message?: string;
}