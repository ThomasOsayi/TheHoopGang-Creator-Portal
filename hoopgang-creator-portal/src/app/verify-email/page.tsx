'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/components/ui';
import { BackgroundOrbs } from '@/components/ui';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const { showToast } = useToast();
  
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in or already verified
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.emailVerified) {
        // Already verified - redirect to dashboard
        router.push('/creator/dashboard');
      }
    }
  }, [user, loading, router]);

  const handleCheckVerification = async () => {
    if (!user) return;
    
    setChecking(true);
    setError(null);

    try {
      // Reload the user to get fresh emailVerified status
      await user.reload();
      
      // Get the updated user
      const currentUser = auth.currentUser;
      
      if (currentUser?.emailVerified) {
        showToast('Email verified! Redirecting...', 'success');
        setTimeout(() => {
          router.push('/creator/dashboard');
        }, 1000);
      } else {
        setError('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (err) {
      console.error('Error checking verification:', err);
      setError('Failed to check verification status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    
    setResending(true);
    setError(null);

    try {
      await sendEmailVerification(user);
      showToast('Verification email sent! Check your inbox.', 'success');
    } catch (err: any) {
      console.error('Error resending verification:', err);
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else {
        setError('Failed to send verification email. Please try again.');
      }
    } finally {
      setResending(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4 relative overflow-hidden">
      {/* Background */}
      <BackgroundOrbs colors={['orange', 'purple', 'orange']} />

      <div className="max-w-lg mx-auto relative z-10">
        {/* Back Link */}
        <div className="text-center mb-8">
          <Link 
            href="/apply" 
            className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to platform selection
          </Link>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8">
          {/* Email Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Verify Your Email
          </h1>
          <p className="text-white/60 text-center mb-2">
            We sent a verification link to:
          </p>
          <p className="text-orange-400 text-center font-medium mb-8">
            {user.email}
          </p>

          {/* Instructions Card */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 mb-6">
            <p className="text-white font-semibold mb-3">Next steps:</p>
            <ol className="space-y-2 text-white/70 text-sm">
              <li className="flex gap-2">
                <span className="text-white/50">1.</span>
                Check your inbox (and spam folder)
              </li>
              <li className="flex gap-2">
                <span className="text-white/50">2.</span>
                Click the verification link in the email
              </li>
              <li className="flex gap-2">
                <span className="text-white/50">3.</span>
                Come back here and click the button below
              </li>
            </ol>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          {/* Verify Button */}
          <button
            onClick={handleCheckVerification}
            disabled={checking}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-lg rounded-xl transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {checking ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                I&apos;ve Verified My Email
              </>
            )}
          </button>

          {/* Resend Link */}
          <div className="text-center mt-6">
            <p className="text-white/50 text-sm">
              Didn&apos;t receive the email?{' '}
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="text-orange-400 hover:text-orange-300 transition-colors underline disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend verification'}
              </button>
            </p>
          </div>
        </div>

        {/* Sign out option */}
        <p className="text-center text-white/40 text-sm mt-6">
          Wrong account?{' '}
          <Link href="/login" className="text-orange-400 hover:text-orange-300 transition-colors">
            Sign in with a different email
          </Link>
        </p>
      </div>
    </div>
  );
}