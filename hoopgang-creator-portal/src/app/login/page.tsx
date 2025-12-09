'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);
  
  const { signIn, userData, loading: authLoading } = useAuth();
  const router = useRouter();

  // Handle redirect after successful login
  useEffect(() => {
    // Only redirect if login was attempted and we have userData
    if (loginAttempted && userData && !authLoading) {
      if (userData.role === 'admin') {
        router.push('/admin/creators');
      } else if (userData.role === 'creator') {
        router.push('/creator/dashboard');
      } else {
        router.push('/');
      }
    }
  }, [loginAttempted, userData, authLoading, router]);

  // Also redirect if user is already logged in when visiting login page
  useEffect(() => {
    if (!authLoading && userData) {
      if (userData.role === 'admin') {
        router.push('/admin/creators');
      } else if (userData.role === 'creator') {
        router.push('/creator/dashboard');
      }
    }
  }, [authLoading, userData, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      // Mark that login was attempted - useEffect will handle redirect
      setLoginAttempted(true);
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password');
      setLoading(false);
    }
    // Note: Don't setLoading(false) on success - let the redirect happen
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏀</div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-white/60 mt-2">Sign in to your HoopGang account</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
              loading={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-white/50 text-sm mt-6">
            Want to become a creator?{' '}
            <Link href="/apply" className="text-orange-400 hover:text-orange-300">
              Apply here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}