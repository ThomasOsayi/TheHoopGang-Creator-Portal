// src/app/apply/tiktok/page.tsx

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getCreatorByUserId } from '@/lib/firestore';
import { useToast } from '@/components/ui';
import { TiktokLookupResult, Size } from '@/types';

// TikTok Logo Component with gradient
const TiktokLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"
      fill="url(#tiktok-gradient-flow)"
    />
    <defs>
      <linearGradient id="tiktok-gradient-flow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#25F4EE" />
        <stop offset="50%" stopColor="#FE2C55" />
        <stop offset="100%" stopColor="#25F4EE" />
      </linearGradient>
    </defs>
  </svg>
);

type Step = 1 | 2 | 3;

function TiktokApplyContent() {
  const router = useRouter();
  const { user, refreshUserData } = useAuth();
  const { showToast } = useToast();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>(1);
  
  // Step 1: Username lookup
  const [username, setUsername] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<TiktokLookupResult | null>(null);
  
  // Step 3: Account creation
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  
  // General
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check for existing application
  useEffect(() => {
    const checkExistingApplication = async () => {
      if (user) {
        try {
          const existingCreator = await getCreatorByUserId(user.uid);
          if (existingCreator) {
            if (existingCreator.isBlocked) {
              setError('Your account has been blocked from future collaborations.');
              return;
            }
            if (existingCreator.activeCollaborationId) {
              router.push('/creator/dashboard');
              return;
            }
            if (existingCreator.totalCollaborations > 0) {
              router.push('/creator/request-product');
              return;
            }
          }
        } catch (err) {
          console.log('No existing application found');
        }
      }
    };
    checkExistingApplication();
  }, [user, router]);

  // Step 1: Look up username
  const handleLookup = async () => {
    if (!username.trim()) {
      setError('Please enter your TikTok username');
      return;
    }

    setError(null);
    setLookupLoading(true);

    try {
      const response = await fetch('/api/auth/lookup-tiktok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiktokUsername: username.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to look up username');
      }

      if (!data.found) {
        setError(
          "We couldn't find your TikTok username in our system. Make sure you've ordered from our TikTok Shop, or try the Instagram application instead."
        );
        return;
      }

      if (data.alreadyClaimed) {
        setError(
          'This TikTok account has already been registered. Please sign in instead.'
        );
        return;
      }

      // Success - move to step 2
      setLookupResult(data);
      setCurrentStep(2);
    } catch (err) {
      console.error('Lookup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to look up username');
    } finally {
      setLookupLoading(false);
    }
  };

  // Step 2: Confirm identity
  const handleConfirmIdentity = (confirmed: boolean) => {
    if (confirmed) {
      setCurrentStep(3);
      setError(null);
    } else {
      // Go back to step 1
      setCurrentStep(1);
      setLookupResult(null);
      setUsername('');
      setError(null);
    }
  };

  // Step 3: Create account
  const handleCreateAccount = async () => {
    // Validate
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!lookupResult?.importId) {
      setError('Session expired. Please start over.');
      setCurrentStep(1);
      return;
    }

    setError(null);
    setClaimLoading(true);

    try {
      const response = await fetch('/api/auth/claim-tiktok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiktokUsername: username.trim(),
          importId: lookupResult.importId,
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Success!
      setSuccess(true);
      showToast('Account created! Check your email to verify.', 'success');

      // Refresh auth context
      if (refreshUserData) {
        await refreshUserData();
      }

      // Redirect to dashboard after a moment
      setTimeout(() => {
        router.push('/creator/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Claim error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setClaimLoading(false);
    }
  };

  // Go back a step
  const handleBack = () => {
    setError(null);
    if (currentStep === 2) {
      setCurrentStep(1);
      setLookupResult(null);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  const inputClasses =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:bg-white/[0.08] transition-all';
  const labelClasses = 'block text-white/50 text-xs uppercase tracking-wider mb-2';

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4 relative overflow-hidden">
      {/* Background Gradient Orbs - TikTok colors */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#25F4EE]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-[#FE2C55]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-[#25F4EE]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-lg mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Back Link */}
          <Link 
            href="/apply" 
            className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to platform selection
          </Link>

          {/* TikTok Badge */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-zinc-800">
              <TiktokLogo className="w-7 h-7" />
            </div>
            <div className="text-left">
              <p className="text-white/50 text-xs uppercase tracking-wider">Signing up via</p>
              <p className="text-white font-semibold">TikTok Shop</p>
            </div>
          </div>

          <h1 className="text-3xl font-black text-white mb-2">
            Quick Creator Setup
          </h1>
          <p className="text-white/60">
            Your shipping info is already on file from your order
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                    ${currentStep >= step 
                      ? 'bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] text-white' 
                      : 'bg-zinc-800 text-zinc-500'
                    }
                  `}
                >
                  {currentStep > step ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                {step < 3 && (
                  <div 
                    className={`
                      w-16 sm:w-24 h-1 mx-2 rounded transition-all
                      ${currentStep > step ? 'bg-gradient-to-r from-[#25F4EE] to-[#FE2C55]' : 'bg-zinc-800'}
                    `}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-white/40 px-1">
            <span>Username</span>
            <span>Confirm</span>
            <span>Account</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all duration-300">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-3 mb-6">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                {error}
                {error.includes('Instagram') && (
                  <Link 
                    href="/apply/instagram" 
                    className="block mt-2 text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Apply via Instagram instead →
                  </Link>
                )}
                {error.includes('sign in') && (
                  <Link 
                    href="/login" 
                    className="block mt-2 text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Sign in to your account →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Success State */}
          {success ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 mb-6">
                <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
              <p className="text-white/60 mb-4">
                Check your email to verify your account.
              </p>
              <p className="text-white/40 text-sm">
                Redirecting to your dashboard...
              </p>
              <div className="mt-6">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            </div>
          ) : (
            <>
              {/* ============================================ */}
              {/* STEP 1: Enter Username */}
              {/* ============================================ */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-2">
                    <h2 className="text-xl font-bold text-white mb-2">Enter Your TikTok Username</h2>
                    <p className="text-white/50 text-sm">
                      Use the same username you ordered with on TikTok Shop
                    </p>
                  </div>

                  <div>
                    <label htmlFor="username" className={labelClasses}>
                      TikTok Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">@</span>
                      <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                        onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                        placeholder="your_tiktok_handle"
                        className={`${inputClasses} pl-8`}
                        autoFocus
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleLookup}
                    disabled={lookupLoading || !username.trim()}
                    className="w-full py-4 bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] hover:opacity-90 text-white font-bold text-lg rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FE2C55]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {lookupLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Looking up...
                      </>
                    ) : (
                      <>
                        Find My Order
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </>
                    )}
                  </button>

                  <p className="text-center text-white/40 text-sm">
                    Haven&apos;t ordered from TikTok Shop?{' '}
                    <Link href="/apply/instagram" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                      Apply via Instagram
                    </Link>
                  </p>
                </div>
              )}

              {/* ============================================ */}
              {/* STEP 2: Confirm Identity */}
              {/* ============================================ */}
              {currentStep === 2 && lookupResult && (
                <div className="space-y-6">
                  <div className="text-center mb-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 mb-4">
                      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">We Found Your Order!</h2>
                    <p className="text-white/50 text-sm">
                      Please confirm this is your information
                    </p>
                  </div>

                  {/* Order Info Card */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                        <TiktokLogo className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-white/50 text-xs">TikTok Username</p>
                        <p className="text-white font-medium">@{username}</p>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-white/50 text-sm">Name</span>
                        <span className="text-white font-medium">{lookupResult.maskedName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50 text-sm">Ships to</span>
                        <span className="text-white font-medium text-right">
                          {lookupResult.maskedAddress}<br />
                          <span className="text-white/70">{lookupResult.maskedCity}</span>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50 text-sm">Size Ordered</span>
                        <span className="text-white font-medium">{lookupResult.sizeOrdered}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
                    <p className="text-cyan-400 text-sm text-center">
                      🔒 Your full information is protected and will be revealed after you create your account
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleConfirmIdentity(false)}
                      className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all"
                    >
                      No, go back
                    </button>
                    <button
                      onClick={() => handleConfirmIdentity(true)}
                      className="flex-1 py-3 bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] hover:opacity-90 text-white font-bold rounded-xl transition-all hover:scale-[1.02]"
                    >
                      Yes, this is me
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================ */}
              {/* STEP 3: Create Account */}
              {/* ============================================ */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-2">
                    <h2 className="text-xl font-bold text-white mb-2">Create Your Account</h2>
                    <p className="text-white/50 text-sm">
                      Just add your email and password to finish
                    </p>
                  </div>

                  {/* Pre-filled info reminder */}
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="text-sm">
                      <p className="text-green-400 font-medium">Shipping info ready!</p>
                      <p className="text-white/50">Your address from TikTok Shop will be used</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="email" className={labelClasses}>
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={inputClasses}
                        autoComplete="email"
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className={labelClasses}>
                        Create Password <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className={inputClasses}
                        autoComplete="new-password"
                      />
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className={labelClasses}>
                        Confirm Password <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateAccount()}
                        placeholder="Confirm password"
                        className={inputClasses}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleBack}
                      disabled={claimLoading}
                      className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleCreateAccount}
                      disabled={claimLoading || !email || !password || !confirmPassword}
                      className="flex-1 py-3 bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] hover:opacity-90 text-white font-bold rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                      {claimLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Create Account
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-center text-white/40 text-xs">
                    By creating an account, you agree to post 3 TikToks within 14 days of receiving your product.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Already have account */}
        {!success && (
          <p className="text-center text-white/50 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Sign in here
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function TiktokApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#FE2C55] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TiktokApplyContent />
    </Suspense>
  );
}