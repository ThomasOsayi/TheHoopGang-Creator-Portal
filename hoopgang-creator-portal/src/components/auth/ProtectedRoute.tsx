'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
        // User is logged in but doesn't have the right role
        router.push('/');
      }
    }
  }, [user, userData, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
    return null;
  }

  return <>{children}</>;
}

