'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireApplication?: boolean; // NEW: Require completed application
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  requireApplication = false // Default false for backwards compatibility
}: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
        // User is logged in but doesn't have the right role
        router.push('/');
        return;
      }

      // NEW: Check if application is required but not submitted
      if (requireApplication && userData?.role === 'creator' && !userData.creatorId) {
        // Creator hasn't submitted application yet - redirect to apply
        router.push('/apply');
        return;
      }
    }
  }, [user, userData, loading, allowedRoles, requireApplication, router]);

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

  // NEW: Block render if application required but not submitted
  if (requireApplication && userData?.role === 'creator' && !userData.creatorId) {
    return null;
  }

  return <>{children}</>;
}
