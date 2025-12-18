'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireApplication?: boolean;
  requireEmailVerification?: boolean; // NEW: Check email verification
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  requireApplication = false,
  requireEmailVerification = true // Default true - creators must verify email
}: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Not logged in - redirect to login
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Check email verification for creators (skip for admins)
      if (
        requireEmailVerification && 
        userData?.role === 'creator' && 
        !user.emailVerified
      ) {
        router.push('/verify-email');
        return;
      }
      
      // Check role permissions
      if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
        // User is logged in but doesn't have the right role
        router.push('/');
        return;
      }

      // Check if application is required but not submitted
      if (requireApplication && userData?.role === 'creator' && !userData.creatorId) {
        // Creator hasn't submitted application yet - redirect to apply
        router.push('/apply');
        return;
      }
    }
  }, [user, userData, loading, allowedRoles, requireApplication, requireEmailVerification, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/60">Loading...</span>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return null;
  }

  // Email not verified (for creators)
  if (
    requireEmailVerification && 
    userData?.role === 'creator' && 
    !user.emailVerified
  ) {
    return null;
  }

  // Wrong role
  if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
    return null;
  }

  // Application required but not submitted
  if (requireApplication && userData?.role === 'creator' && !userData.creatorId) {
    return null;
  }

  return <>{children}</>;
}