'use client';
import type { ReactNode } from 'react';
import { AuthProvider } from '../context/AuthContext';

// Client-side providers wrapper (auth lives in localStorage / client state).
export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
