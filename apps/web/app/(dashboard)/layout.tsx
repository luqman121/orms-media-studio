'use client';
// Route-group layout for authenticated pages. Combines the old App.jsx RequireAuth
// guard with the DashboardShell (sidebar + content).
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';
import DashboardShell from '../../components/DashboardShell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
  }, [loading, user, router]);

  if (loading || !user) return <Spinner />;
  return <DashboardShell>{children}</DashboardShell>;
}
