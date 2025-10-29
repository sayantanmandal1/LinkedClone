'use client';

import { ReactNode } from 'react';
import Navbar from './Navbar';
import { User } from '@/lib/types';

interface LayoutProps {
  children: ReactNode;
  user?: User | null;
  onLogout?: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={onLogout} />
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}