// src/app/apply/tiktok/page.tsx
// Mobile-Responsive Version

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
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

// Instagram Logo Component
const InstagramLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFDC80" />
        <stop offset="25%" stopColor="#F77737" />
        <stop offset="50%" stopColor="#E1306C" />
        <stop offset="75%" stopColor="#C13584" />
        <stop offset="100%" stopColor="#833AB4" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#instagram-gradient)" strokeWidth="2" fill="none"/>
    <circle cx="12" cy="12" r="4" stroke="url(#instagram-gradient)" strokeWidth="2" fill="none"/>
    <circle cx="17.5" cy="6.5" r="1.5" fill="url(#instagram-gradient)"/>
  </svg>
);

type Step = 1 | 2 | 3 | 4;

const stepLabels = ['Username', 'Social', 'Confirm', 'Account'];
const stepLabelsShort = ['1', '2', '3', '4'];

function TiktokApplyContent() {
  const router = useRouter();
  const { user, refreshUserData } = useAuth();
  const { showToast } = useToast();
  
  // Step management - now 4 steps
  const [currentStep, setCurrentStep] = useState<Step>(1);
  
  // Step 1: Username lookup
  const [username, setUsername] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<TiktokLookupResult | null>(null);
  
  // Step 2: Social stats (NEW)
  const [tiktokFollowers, setTiktokFollowers] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [instagramFollowers, setInstagramFollowers] = useState('');
  
  // Step 4: Account creation
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

      // Success - move to step 2 (Social Stats)
      setLookupResult(data);
      setCurrentStep(2);
    } catch (err) {
      console.error('Lookup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to look up username');
    } finally {
      setLookupLoading(false);
    }
  };

  // Step 2: Submit social stats
  const handleSocialStatsSubmit = () => {
    if (!tiktokFollowers.trim()) {
      setError('Please enter your TikTok follower count');
      return;
    }
    
    // Validate that it's a number
    const tiktokCount = parseInt(tiktokFollowers.replace(/,/g, ''));
    if (isNaN(tiktokCount)) {
      setError('Please enter a valid number for TikTok followers');
      return;
    }
    
    // Instagram fields are now required
    if (!instagramHandle.trim()) {
      setError('Please enter your Instagram username');
      return;
    }
    
    if (!instagramFollowers.trim()) {
      setError('Please enter your Instagram follower count');
      return;
    }
    
    const igCount = parseInt(instagramFollowers.replace(/,/g, ''));
    if (isNaN(igCount)) {
      setError('Please enter a valid number for Instagram followers');
      return;
    }
    
    setError(null);
    setCurrentStep(3);
  };

  // Step 3: Confirm identity
  const handleConfirmIdentity = (confirmed: boolean) => {
    if (confirmed) {
      setCurrentStep(4);
      setError(null);
    } else {
      // Go back to step 1
      setCurrentStep(1);
      setLookupResult(null);
      setUsername('');
      setTiktokFollowers('');
      setInstagramHandle('');
      setInstagramFollowers('');
      setError(null);
    }
  };

  // Step 4: Create account
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
      console.log('1. Starting claim request...');
      
      // Parse follower counts
      const tiktokFollowerCount = parseInt(tiktokFollowers.replace(/,/g, '')) || 0;
      const instagramFollowerCount = instagramFollowers ? parseInt(instagramFollowers.replace(/,/g, '')) || 0 : 0;
      
      const response = await fetch('/api/auth/claim-tiktok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiktokUsername: username.trim(),
          importId: lookupResult.importId,
          email: email.trim(),
          password,
          // Include social stats
          tiktokFollowers: tiktokFollowerCount,
          instagramHandle: instagramHandle.trim() || null,
          instagramFollowers: instagramFollowerCount || null,
        }),
      });

      const data = await response.json();
      console.log('2. Claim response:', { success: data.success, userId: data.userId, fullName: data.fullName });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      console.log('3. Signing in user...');
      // Sign in the user on the client side
      await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log('4. User signed in, sending verification email...');

      // Send verification email via the SAME endpoint as Instagram
      const verifyResponse = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          email: email.trim(),
          fullName: data.fullName,
          source: 'tiktok',
        }),
      });
      
      console.log('5. Verification API response status:', verifyResponse.status);
      const verifyData = await verifyResponse.json();
      console.log('6. Verification API response:', verifyData);

      if (!verifyResponse.ok) {
        console.error('Failed to send verification email:', verifyData);
      }

      // Refresh auth context
      if (refreshUserData) {
        await refreshUserData();
      }

      // Success!
      setSuccess(true);
      showToast('Account created! Check your email to verify.', 'success');

      // Redirect to email verification page
      setTimeout(() => {
        router.push('/verify-email');
      }, 2000);
    } catch (err) {
      console.error('Error in handleCreateAccount:', err);
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
    } else if (currentStep === 4) {
      setCurrentStep(3);
    }
  };

  // Format number with commas as user types
  const formatFollowerInput = (value: string) => {
    // Remove non-numeric characters except commas
    const numericValue = value.replace(/[^0-9]/g, '');
    // Format with commas
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const inputClasses =
    'w-full bg-white/5 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-sm sm:text-base placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:bg-white/[0.08] transition-all';
  const labelClasses = 'block text-white/50 text-[10px] sm:text-xs uppercase tracking-wider mb-1.5 sm:mb-2';

  return (
    <div className="min-h-screen bg-zinc-950 py-8 sm:py-12 px-4 relative overflow-hidden">
      {/* Background Gradient Orbs - TikTok colors */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#25F4EE]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-[#FE2C55]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-[#25F4EE]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-lg mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          {/* Back Link */}
          <Link 
            href="/apply" 
            className="inline-flex items-center gap-1.5 sm:gap-2 text-white/50 hover:text-white/80 transition-colors mb-4 sm:mb-6 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back to platform selection</span>
            <span className="sm:hidden">Back</span>
          </Link>

          {/* TikTok Badge */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black rounded-lg sm:rounded-xl flex items-center justify-center border border-zinc-800">
              <TiktokLogo className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div className="text-left">
              <p className="text-white/50 text-[10px] sm:text-xs uppercase tracking-wider">Signing up via</p>
              <p className="text-white font-semibold text-sm sm:text-base">TikTok Shop</p>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 sm:mb-2">
            Quick Creator Setup
          </h1>
          <p className="text-white/60 text-sm sm:text-base">
            Your shipping info is already on file
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between relative">
            {/* Background line */}
            <div className="absolute top-3 sm:top-4 left-0 right-0 h-0.5 sm:h-1 bg-zinc-800 mx-6 sm:mx-8" />
            
            {/* Progress line */}
            <div 
              className="absolute top-3 sm:top-4 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] mx-6 sm:mx-8 transition-all duration-500"
              style={{ 
                width: `calc(${((currentStep - 1) / 3) * 100}% - ${currentStep === 1 ? 0 : (4 - currentStep) * 16}px)`,
              }}
            />
            
            {/* Step circles */}
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="relative z-10 flex flex-col items-center">
                <div
                  className={`
                    w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all
                    ${currentStep >= step 
                      ? 'bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] text-white' 
                      : 'bg-zinc-800 text-zinc-500'
                    }
                  `}
                >
                  {currentStep > step ? (
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                <span className="text-[10px] sm:text-xs text-white/40 mt-1.5 sm:mt-2 whitespace-nowrap hidden xs:block">
                  {stepLabels[step - 1]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 hover:border-white/20 transition-all duration-300">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm flex items-start gap-2 sm:gap-3 mb-4 sm:mb-6">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="text-center py-6 sm:py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500/20 border border-green-500/30 mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Account Created!</h2>
              <p className="text-white/60 text-sm sm:text-base mb-3 sm:mb-4">
                Check your email to verify your account.
              </p>
              <p className="text-white/40 text-xs sm:text-sm">
                Redirecting to your dashboard...
              </p>
              <div className="mt-4 sm:mt-6">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            </div>
          ) : (
            <>
              {/* ============================================ */}
              {/* STEP 1: Enter Username */}
              {/* ============================================ */}
              {currentStep === 1 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Enter Your TikTok Username</h2>
                    <p className="text-white/50 text-xs sm:text-sm">
                      Use the same username you ordered with
                    </p>
                  </div>

                  <div>
                    <label htmlFor="username" className={labelClasses}>
                      TikTok Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                      <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                        onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                        placeholder="your_tiktok_handle"
                        className={`${inputClasses} pl-7 sm:pl-8`}
                        autoFocus
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleLookup}
                    disabled={lookupLoading || !username.trim()}
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] hover:opacity-90 text-white font-bold text-base sm:text-lg rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-[#FE2C55]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {lookupLoading ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm sm:text-base">Looking up...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm sm:text-base">Find My Order</span>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </>
                    )}
                  </button>

                  <p className="text-center text-white/40 text-xs sm:text-sm">
                    Haven&apos;t ordered from TikTok Shop?{' '}
                    <Link href="/apply/instagram" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                      Apply via Instagram
                    </Link>
                  </p>
                </div>
              )}

              {/* ============================================ */}
              {/* STEP 2: Social Stats */}
              {/* ============================================ */}
              {currentStep === 2 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Tell Us About Your Audience</h2>
                    <p className="text-white/50 text-xs sm:text-sm">
                      Helps us match you with opportunities
                    </p>
                  </div>

                  {/* TikTok Stats */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <TiktokLogo className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-white font-medium text-sm sm:text-base">TikTok</span>
                      <span className="text-white/50 text-xs sm:text-sm">@{username}</span>
                    </div>
                    
                    <div>
                      <label htmlFor="tiktokFollowers" className={labelClasses}>
                        How many followers? <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        id="tiktokFollowers"
                        value={tiktokFollowers}
                        onChange={(e) => setTiktokFollowers(formatFollowerInput(e.target.value))}
                        placeholder="e.g. 10,000"
                        className={inputClasses}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Instagram Stats */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <InstagramLogo className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-white font-medium text-sm sm:text-base">Instagram</span>
                    </div>
                    
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label htmlFor="instagramHandle" className={labelClasses}>
                          Instagram Username <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                          <input
                            type="text"
                            id="instagramHandle"
                            value={instagramHandle}
                            onChange={(e) => setInstagramHandle(e.target.value.replace('@', ''))}
                            placeholder="your_instagram_handle"
                            className={`${inputClasses} pl-7 sm:pl-8`}
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="instagramFollowers" className={labelClasses}>
                          Instagram Followers <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          id="instagramFollowers"
                          value={instagramFollowers}
                          onChange={(e) => setInstagramFollowers(formatFollowerInput(e.target.value))}
                          placeholder="e.g. 5,000"
                          className={inputClasses}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={handleBack}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleSocialStatsSubmit}
                      disabled={!tiktokFollowers.trim() || !instagramHandle.trim() || !instagramFollowers.trim()}
                      className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] hover:opacity-90 text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                      <span className="text-sm sm:text-base">Continue</span>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================ */}
              {/* STEP 3: Confirm Identity */}
              {/* ============================================ */}
              {currentStep === 3 && lookupResult && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-500/20 border border-green-500/30 mb-3 sm:mb-4">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">We Found Your Order!</h2>
                    <p className="text-white/50 text-xs sm:text-sm">
                      Confirm this is your information
                    </p>
                  </div>

                  {/* Order Info Card */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-lg flex items-center justify-center">
                        <TiktokLogo className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <p className="text-white/50 text-[10px] sm:text-xs">TikTok Username</p>
                        <p className="text-white font-medium text-sm sm:text-base">@{username}</p>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-3 sm:pt-4 space-y-2 sm:space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Name</span>
                        <span className="text-white font-medium">{lookupResult.maskedName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Ships to</span>
                        <span className="text-white font-medium text-right">
                          {lookupResult.maskedAddress}<br />
                          <span className="text-white/70">{lookupResult.maskedCity}</span>
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Size</span>
                        <span className="text-white font-medium">{lookupResult.sizeOrdered}</span>
                      </div>
                    </div>
                  </div>

                  {/* Social Stats Summary */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 sm:p-4">
                    <p className="text-white/50 text-[10px] sm:text-xs uppercase tracking-wider mb-2 sm:mb-3">Your Social Stats</p>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <div className="flex items-center gap-1.5 sm:gap-2 bg-black/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">
                        <TiktokLogo className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="text-white font-medium text-xs sm:text-sm">{tiktokFollowers}</span>
                      </div>
                      {instagramHandle && (
                        <div className="flex items-center gap-1.5 sm:gap-2 bg-black/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">
                          <InstagramLogo className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="text-white font-medium text-xs sm:text-sm">{instagramFollowers || '—'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 sm:p-4">
                    <p className="text-cyan-400 text-xs sm:text-sm text-center">
                      🔒 Your full info is protected until you create your account
                    </p>
                  </div>

                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => handleConfirmIdentity(false)}
                      className="flex-1 py-2.5 sm:py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all active:scale-[0.98] text-sm sm:text-base"
                    >
                      No, go back
                    </button>
                    <button
                      onClick={() => handleConfirmIdentity(true)}
                      className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] hover:opacity-90 text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
                    >
                      Yes, this is me
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================ */}
              {/* STEP 4: Create Account */}
              {/* ============================================ */}
              {currentStep === 4 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Create Your Account</h2>
                    <p className="text-white/50 text-xs sm:text-sm">
                      Add your email and password to finish
                    </p>
                  </div>

                  {/* Pre-filled info reminder */}
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="text-xs sm:text-sm">
                      <p className="text-green-400 font-medium">Shipping info ready!</p>
                      <p className="text-white/50">Your address from TikTok Shop will be used</p>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
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

                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={handleBack}
                      disabled={claimLoading}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleCreateAccount}
                      disabled={claimLoading || !email || !password || !confirmPassword}
                      className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] hover:opacity-90 text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                      {claimLoading ? (
                        <>
                          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm sm:text-base hidden xs:inline">Creating...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm sm:text-base">Create Account</span>
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-center text-white/40 text-[10px] sm:text-xs">
                    By creating an account, you agree to post 1 TikTok within 14 days.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Already have account */}
        {!success && (
          <p className="text-center text-white/50 text-xs sm:text-sm mt-4 sm:mt-6">
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