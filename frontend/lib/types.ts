// Local type definitions for frontend
// Copied from shared package to resolve build issues

export interface User {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  _id: string;
  content: string;
  author: User;
  imageUrl?: string;
  likes: string[];
  comments: Comment[];
  likeCount?: number;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  author: User;
  post: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AuthResponse extends ApiResponse {
  user?: User;
  token?: string;
}

export interface PostsResponse extends ApiResponse {
  posts?: Post[];
  hasMore?: boolean;
  page?: number;
  totalCount?: number;
}

export interface UsersResponse extends ApiResponse {
  user?: User;
  users?: User[];
}

export interface DeleteResponse extends ApiResponse {
  deletedId?: string;
}

// Request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreatePostRequest {
  content: string;
  imageUrl?: string;
}

export interface UpdatePostRequest {
  content?: string;
  imageUrl?: string;
}

export interface AddCommentRequest {
  content: string;
}

// Additional response types
export interface PostResponse extends ApiResponse {
  post?: Post;
}

export interface LikeResponse extends ApiResponse {
  liked?: boolean;
  likeCount?: number;
}

export interface CommentResponse extends ApiResponse {
  comment?: Comment;
}

export interface UploadResponse extends ApiResponse {
  data?: {
    url: string;
    filename: string;
  };
}

// Chat types
export type MessageStatus = 'sent' | 'delivered' | 'seen' | 'pending' | 'failed';

export interface Message {
  _id: string;
  conversationId: string;
  sender: string | User;
  content: string;
  status: MessageStatus;
  deliveredAt?: string;
  seenAt?: string;
  createdAt: string;
  expiresAt: string;
  retryCount?: number;
  error?: boolean;
}

export interface LastMessage {
  content: string;
  sender: string | User;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: LastMessage;
  unreadCount: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsResponse extends ApiResponse {
  conversations?: Conversation[];
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface ConversationResponse extends ApiResponse {
  conversation?: Conversation;
}

export interface MessagesResponse extends ApiResponse {
  messages?: Message[];
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastOnline: string | null;
}

// Call types
export type CallType = 'voice' | 'video';
export type CallStatus = 'initiated' | 'ringing' | 'connected' | 'ended' | 'declined' | 'missed';

export interface Call {
  _id: string;
  callId: string;
  caller: User;
  recipient: User;
  callType: CallType;
  status: CallStatus;
  startedAt?: string;
  endedAt?: string;
  duration: number; // in seconds
  createdAt: string;
  updatedAt: string;
}

export interface CallHistoryResponse extends ApiResponse {
  calls?: Call[];
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface CallDetailsResponse extends ApiResponse {
  call?: Call;
}

export interface CallStats {
  totalCalls: number;
  voiceCalls: number;
  videoCalls: number;
  connectedCalls: number;
  missedCalls: number;
  declinedCalls: number;
  totalDuration: number; // in seconds
}

export interface CallStatsResponse extends ApiResponse {
  stats?: CallStats;
}
