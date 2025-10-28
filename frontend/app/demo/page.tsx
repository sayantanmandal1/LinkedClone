'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth';
import { PostCreator, PostCard } from '@/components/posts';
import { Post } from '@/lib/types';

// Sample post data for demonstration
const samplePost: Post = {
  _id: 'sample-post-1',
  author: {
    _id: 'sample-user-1',
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  content: 'This is a sample post to demonstrate the PostCard component with all its features including likes, comments, and edit/delete actions for post owners.',
  image: undefined,
  likes: ['user-1', 'user-2'],
  comments: [
    {
      _id: 'comment-1',
      author: {
        _id: 'sample-user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        createdAt: '2024-01-16T10:00:00Z',
        updatedAt: '2024-01-16T10:00:00Z',
      },
      content: 'Great post! Thanks for sharing.',
      post: 'sample-post-1',
      createdAt: '2024-01-16T10:30:00Z',
      updatedAt: '2024-01-16T10:30:00Z',
    },
    {
      _id: 'comment-2',
      author: {
        _id: 'sample-user-3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        createdAt: '2024-01-17T10:00:00Z',
        updatedAt: '2024-01-17T10:00:00Z',
      },
      content: 'I completely agree with this perspective.',
      post: 'sample-post-1',
      createdAt: '2024-01-16T14:15:00Z',
      updatedAt: '2024-01-16T14:15:00Z',
    },
  ],
  createdAt: '2024-01-15T09:00:00Z',
  updatedAt: '2024-01-15T09:00:00Z',
};

export default function DemoPage() {
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState<Post[]>([samplePost]);

  const handlePostCreated = () => {
    // In a real app, this would fetch the latest posts
    console.log('Post created successfully');
  };

  const handlePostUpdated = () => {
    // In a real app, this would refresh the specific post
    console.log('Post updated successfully');
  };

  const handlePostDeleted = () => {
    // In a real app, this would remove the post from the list
    console.log('Post deleted successfully');
  };

  return (
    <ProtectedRoute>
      <Layout user={user!} onLogout={logout}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Post Components Demo
            </h1>
            <p className="text-gray-600 mb-4">
              This page demonstrates all the post-related components: PostCreator, PostCard, PostActions, and CommentSection.
            </p>
          </div>

          {/* Post Creator */}
          <PostCreator onPostCreated={handlePostCreated} />

          {/* Sample Posts */}
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onPostUpdated={handlePostUpdated}
                onPostDeleted={handlePostDeleted}
              />
            ))}
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Component Features:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• PostCreator: Create posts with text and image upload</li>
              <li>• PostCard: Display posts with author info, content, and images</li>
              <li>• PostActions: Like, comment, edit (owner only), delete (owner only)</li>
              <li>• CommentSection: View and add comments with real-time updates</li>
              <li>• PostEditModal: Edit post content and images</li>
              <li>• Conditional rendering based on post ownership</li>
              <li>• Responsive design for mobile and desktop</li>
            </ul>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}