'use client';

import { ProfilePage } from '@/components/profile';
import { useParams } from 'next/navigation';

export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.id as string;

  return <ProfilePage userId={userId} />;
}