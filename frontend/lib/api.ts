import type {
  AuthResponse,
  LoginRequest,
  CreateUserRequest,
  PostsResponse,
  PostResponse,
  CreatePostRequest,
  UpdatePostRequest,
  LikeResponse,
  CommentResponse,
  AddCommentRequest,
  UploadResponse,
  DeleteResponse,
  User
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://linkedclone.onrender.com/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Token management
const TOKEN_KEY = 'auth_token';

export const tokenManager = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  }
};

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  // Add Authorization header if token exists
  const token = tokenManager.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    headers,
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || 'An error occurred',
        response.status,
        data.errors
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error occurred', 0);
  }
}

// Authentication API
export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await fetchApi<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return {
      ...response,
      user: response.user ? normalizeUser(response.user) : response.user
    };
  },

  register: (userData: CreateUserRequest): Promise<AuthResponse> =>
    fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  logout: (): Promise<{ success: boolean; message: string }> =>
    fetchApi('/auth/logout', {
      method: 'POST',
    }),

  getCurrentUser: async (): Promise<{ success: boolean; user: User }> => {
    const response = await fetchApi<{ success: boolean; user: any }>('/auth/me');
    return {
      ...response,
      user: response.user ? normalizeUser(response.user) : response.user
    };
  },
};

// Posts API
export const postsApi = {
  getPosts: async (page = 1, limit = 10): Promise<PostsResponse> => {
    const response = await fetchApi<PostsResponse>(`/posts?page=${page}&limit=${limit}`);
    return {
      ...response,
      posts: response.posts ? normalizePosts(response.posts) : []
    };
  },

  getPost: async (id: string): Promise<PostResponse> => {
    const response = await fetchApi<PostResponse>(`/posts/${id}`);
    return {
      ...response,
      post: response.post ? normalizePost(response.post) : response.post
    };
  },

  createPost: async (postData: CreatePostRequest): Promise<PostResponse> => {
    const response = await fetchApi<PostResponse>('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
    return {
      ...response,
      post: response.post ? normalizePost(response.post) : response.post
    };
  },

  updatePost: async (id: string, postData: UpdatePostRequest): Promise<PostResponse> => {
    const response = await fetchApi<PostResponse>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
    return {
      ...response,
      post: response.post ? normalizePost(response.post) : response.post
    };
  },

  deletePost: (id: string): Promise<DeleteResponse> =>
    fetchApi(`/posts/${id}`, {
      method: 'DELETE',
    }),

  likePost: (id: string): Promise<LikeResponse> =>
    fetchApi(`/posts/${id}/like`, {
      method: 'POST',
    }),

  addComment: (id: string, commentData: AddCommentRequest): Promise<CommentResponse> =>
    fetchApi(`/posts/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify(commentData),
    }),
};

// Users API
export const usersApi = {
  getUser: async (id: string): Promise<{ success: boolean; user: User }> => {
    const response = await fetchApi<{ success: boolean; data: any; message: string }>(`/users/${id}`);
    return {
      success: response.success,
      user: response.data ? normalizeUser(response.data) : response.data
    };
  },

  getUserPosts: async (id: string, page = 1, limit = 10): Promise<PostsResponse> => {
    const response = await fetchApi<{
      success: boolean;
      data: any[];
      totalCount: number;
      page: number;
      limit: number;
      totalPages: number;
      message: string
    }>(`/users/${id}/posts?page=${page}&limit=${limit}`);
    return {
      success: response.success,
      posts: normalizePosts(response.data),
      totalCount: response.totalCount,
      page: response.page,
      hasMore: response.page < response.totalPages
    };
  },

  updateProfilePicture: async (profilePictureUrl: string): Promise<{ success: boolean; user: User }> => {
    const response = await fetchApi<{ success: boolean; data: User; message: string }>('/users/profile-picture', {
      method: 'PUT',
      body: JSON.stringify({ profilePictureUrl }),
    });
    return {
      success: response.success,
      user: response.data
    };
  },
};

// Upload API
export const uploadApi = {
  uploadImage: (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('image', file);

    // For FormData, we need to handle headers differently
    const token = tokenManager.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData - let browser set it with boundary

    return fetch(`${API_BASE_URL}/upload/image`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new ApiError(
          data.message || 'Upload failed',
          response.status,
          data.errors
        );
      }
      return data;
    });
  },
};

// Helper function to ensure posts have required array properties
const normalizePost = (post: any): any => {
  return {
    ...post,
    likes: post.likes || [],
    comments: post.comments || [],
    likeCount: post.likeCount || (post.likes || []).length,
    commentCount: post.commentCount || (post.comments || []).length,
    author: post.author ? {
      ...post.author,
      name: post.author.name || 'Unknown User'
    } : {
      _id: 'unknown',
      name: 'Unknown User',
      email: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
};

// Helper function to normalize comments
const normalizeComment = (comment: any): any => {
  return {
    ...comment,
    author: comment.author ? {
      ...comment.author,
      name: comment.author.name || 'Unknown User'
    } : {
      _id: 'unknown',
      name: 'Unknown User',
      email: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
};

// Helper function to normalize posts array
const normalizePosts = (posts: any[]): any[] => {
  return (posts || []).map(post => ({
    ...normalizePost(post),
    comments: (post.comments || []).map(normalizeComment)
  }));
};

// Helper function to normalize user data
const normalizeUser = (user: any): User => {
  return {
    ...user,
    _id: user._id || user.id,
    name: user.name || 'Unknown User',
    email: user.email || '',
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || new Date().toISOString()
  };
};

// Chat API
export const chatApi = {
  getConversations: (page = 1, limit = 20): Promise<import('./types').ConversationsResponse> =>
    fetchApi(`/conversations?page=${page}&limit=${limit}`),

  createOrGetConversation: (otherUserId: string): Promise<import('./types').ConversationResponse> =>
    fetchApi('/conversations', {
      method: 'POST',
      body: JSON.stringify({ otherUserId }),
    }),

  getConversationMessages: (
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<import('./types').MessagesResponse> =>
    fetchApi(`/conversations/${conversationId}/messages?page=${page}&limit=${limit}`),

  sendMessage: (conversationId: string, content: string): Promise<{ success: boolean; message: import('./types').Message }> =>
    fetchApi(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getUserPresence: (userId: string): Promise<{ success: boolean; presence: import('./types').UserPresence }> =>
    fetchApi(`/conversations/users/${userId}/presence`),
};

export { ApiError };