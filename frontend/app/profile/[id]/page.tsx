import { Metadata } from 'next';
import { ProfilePage } from '@/components/profile';

export const metadata: Metadata = {
  title: 'User Profile - LinkedIn Clone',
  description: 'View user profile and posts',
};

export default function UserProfilePage() {
  return <ProfilePage />;
}