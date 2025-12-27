// src/app/apply/instagram/page.tsx
// Mobile-Responsive Version

'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { applyActionCode } from 'firebase/auth';
import { CreatorApplicationInput, Size } from '@/types';
import { SIZES } from '@/lib/constants';
import { createCreator, getCreatorByUserId, createCollaboration } from '@/lib/firestore';
import { useAuth } from '@/lib/auth-context';
import { useToast, Navbar } from '@/components/ui';

// Instagram Logo Component
const InstagramLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="white">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

type Step = 1 | 2 | 3 | 4;

const stepLabels = ['Account', 'Verify', 'Social', 'Details'];
const stepLabelsShort = ['1', '2', '3', '4'];

function InstagramApplyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUserData } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(false);

  // Redirect based on creator state (V2 model)
  useEffect(() => {
    const checkExistingApplication = async () => {
      if (user && !success && !loading) {
        try {
          const existingCreator = await getCreatorByUserId(user.uid);
          if (existingCreator) {
            if (existingCreator.isBlocked) {
              setError('Your account has been blocked from future collaborations due to unfulfilled content requirements.');
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
          console.log('No existing application found, allowing new application');
        }
      }
    };
    checkExistingApplication();
  }, [user, router, success, loading]);

  // Check if user is already logged in and verified
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFormData(prev => ({
              ...prev,
              email: user.email || '',
              fullName: userData.fullName || prev.fullName || '',
            }));
          } else {
            setFormData(prev => ({ ...prev, email: user.email || '' }));
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setFormData(prev => ({ ...prev, email: user.email || '' }));
        }

        // Set step based on email verification status
        if (user.emailVerified) {
          setCurrentStep(3);
        } else {
          setCurrentStep(2);
        }
      }
    };
    
    loadUserData();
  }, [user]);

  // Handle email verification from URL
  useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');
    
    if (mode === 'verifyEmail' && oobCode && !autoVerifying) {
      setAutoVerifying(true);
      setError(null);
      
      applyActionCode(auth, oobCode)
        .then(async () => {
          if (auth.currentUser) {
            await auth.currentUser.reload();
          }
          
          showToast('Email verified successfully!', 'success');
          
          setTimeout(() => {
            window.location.href = '/apply/instagram';
          }, 1000);
        })
        .catch((err: any) => {
          console.error('Auto-verification error:', err);
          setAutoVerifying(false);
          
          if (err.code === 'auth/invalid-action-code') {
            setError('This verification link has expired or already been used. Please request a new one.');
          } else if (err.code === 'auth/expired-action-code') {
            setError('This verification link has expired. Please request a new one.');
          } else {
            setError('Failed to verify email. Please try again or request a new link.');
          }
          
          setCurrentStep(2);
        });
    }
  }, [searchParams, autoVerifying, showToast]);

  const [formData, setFormData] = useState<CreatorApplicationInput>({
    fullName: '',
    email: '',
    instagramHandle: '',
    instagramFollowers: 0,
    tiktokHandle: '',
    tiktokFollowers: 0,
    bestContentUrl: '',
    product: '',
    size: 'M' as Size,
    height: '',
    weight: '',
    shippingAddress: {
      street: '',
      unit: '',
      city: '',
      state: '',
      zipCode: '',
    },
    whyCollab: '',
    previousBrands: false,
    agreedToTerms: false,
    source: 'instagram',
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Format number with commas as user types (for follower inputs)
  const formatFollowerInput = (value: string): string => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    // Format with commas
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Parse formatted number back to integer
  const parseFollowerInput = (value: string): number => {
    return parseInt(value.replace(/,/g, '')) || 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('shippingAddress.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        shippingAddress: {
          ...prev.shippingAddress,
          [field]: value,
        },
      }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else if (type === 'radio') {
      setFormData((prev) => ({
        ...prev,
        [name]: value === 'true',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Separate handler for follower inputs (numbers only with formatting)
  const handleFollowerChange = (field: 'instagramFollowers' | 'tiktokFollowers', value: string) => {
    const formattedValue = formatFollowerInput(value);
    const numericValue = parseFollowerInput(formattedValue);
    setFormData(prev => ({
      ...prev,
      [field]: numericValue,
    }));
  };

  // Get display value for follower inputs (formatted with commas)
  const getFollowerDisplayValue = (value: number): string => {
    if (value === 0) return '';
    return value.toLocaleString();
  };

  const validateStep1 = (): boolean => {
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Valid email is required');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (!formData.instagramHandle.trim()) {
      setError('Instagram handle is required');
      return false;
    }
    if (formData.instagramFollowers <= 0) {
      setError('Instagram followers must be greater than 0');
      return false;
    }
    if (!formData.tiktokHandle.trim()) {
      setError('TikTok handle is required');
      return false;
    }
    if (formData.tiktokFollowers <= 0) {
      setError('TikTok followers must be greater than 0');
      return false;
    }
    if (!formData.bestContentUrl.trim()) {
      setError('Best content URL is required');
      return false;
    }
    return true;
  };

  const validateStep4 = (): boolean => {
    if (!formData.product.trim()) {
      setError('Please enter the product you want');
      return false;
    }
    if (!formData.shippingAddress.street.trim()) {
      setError('Street address is required');
      return false;
    }
    if (!formData.shippingAddress.city.trim()) {
      setError('City is required');
      return false;
    }
    if (!formData.shippingAddress.state.trim()) {
      setError('State is required');
      return false;
    }
    if (!formData.shippingAddress.zipCode.trim()) {
      setError('ZIP code is required');
      return false;
    }
    if (!formData.whyCollab.trim()) {
      setError('Please tell us why you want to collaborate');
      return false;
    }
    if (!formData.agreedToTerms) {
      setError('You must agree to the terms to submit your application');
      return false;
    }
    return true;
  };

  const handleCreateAccount = async () => {
    setError(null);
    
    if (!validateStep1()) {
      return;
    }

    setVerifyingEmail(true);

    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, password);
      
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: formData.email,
        role: 'creator',
        fullName: formData.fullName,
      });
      
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userCredential.user.uid,
          email: formData.email,
          fullName: formData.fullName,
          source: 'instagram',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send verification email');
      }
      
      setCurrentStep(2);
      showToast('Verification email sent! Check your inbox.', 'success');
    } catch (err) {
      console.error('Verification error:', err);
      let errorMessage = 'Failed to send verification email. Please try again.';
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use')) {
          errorMessage = 'An account with this email already exists. Please log in instead.';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!auth.currentUser) {
      setError('No user found. Please try again.');
      return;
    }

    setVerifyingEmail(true);
    
    try {
      await auth.currentUser.reload();
      
      if (auth.currentUser.emailVerified) {
        setCurrentStep(3);
        setError(null);
        showToast('Email verified! Continue your application.', 'success');
      } else {
        setError('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (err) {
      console.error('Check verification error:', err);
      setError('Failed to check verification status. Please try again.');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) {
      setError('No user found. Please try again.');
      return;
    }

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          email: auth.currentUser.email || formData.email,
          fullName: formData.fullName,
          source: 'instagram',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend verification email');
      }

      showToast('Verification email resent! Check your inbox.', 'success');
    } catch (err) {
      console.error('Resend error:', err);
      setError('Failed to resend verification email. Please wait a moment and try again.');
    }
  };

  const handleStep3Continue = () => {
    setError(null);
    if (validateStep3()) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep === 3) {
      // Can't go back to verify step
    } else if (currentStep === 4) {
      setCurrentStep(3);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateStep4()) {
      return;
    }

    if (!auth.currentUser || !auth.currentUser.emailVerified) {
      setError('Please verify your email before submitting.');
      return;
    }

    setLoading(true);

    try {
      const existingCreator = await getCreatorByUserId(auth.currentUser.uid);
      
      if (existingCreator) {
        if (existingCreator.isBlocked) {
          setError('Your account has been blocked from future collaborations.');
          setLoading(false);
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

      const creatorDocId = await createCreator({
        ...formData,
        email: auth.currentUser.email || formData.email,
        source: 'instagram',
      }, auth.currentUser.uid);

      await createCollaboration(creatorDocId, {
        product: formData.product,
        size: formData.size,
      });

      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        creatorId: creatorDocId,
      });

      await refreshUserData();

      setSuccess(true);
      setLoading(false);
      showToast('Application submitted! Welcome to TheHoopGang!', 'success');

      setTimeout(() => {
        router.push('/creator/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Application error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit application. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      setLoading(false);
    }
  };

  const inputClasses =
    'w-full bg-white/5 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-sm sm:text-base placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent hover:bg-white/[0.08] transition-all';
  const labelClasses = 'block text-white/50 text-[10px] sm:text-xs uppercase tracking-wider mb-1.5 sm:mb-2';
  const selectClasses =
    'w-full bg-white/5 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent hover:bg-white/[0.08] transition-all appearance-none cursor-pointer';

  return (
    <div className="min-h-screen bg-zinc-950 py-8 sm:py-12 px-4 relative overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-pink-500/5 rounded-full blur-3xl" />
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

          {/* Instagram Badge */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              }}
            >
              <InstagramLogo className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div className="text-left">
              <p className="text-white/50 text-[10px] sm:text-xs uppercase tracking-wider">Applying via</p>
              <p className="text-white font-semibold text-sm sm:text-base">Instagram</p>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 sm:mb-2">
            Creator Application
          </h1>
          <p className="text-white/60 text-sm sm:text-base">
            Tell us about yourself and your content
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between relative">
            {/* Background line */}
            <div className="absolute top-3 sm:top-4 left-0 right-0 h-0.5 sm:h-1 bg-zinc-800 mx-6 sm:mx-8" />
            
            {/* Progress line */}
            <div 
              className="absolute top-3 sm:top-4 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-orange-500 to-pink-500 mx-6 sm:mx-8 transition-all duration-500"
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
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' 
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
                {error.includes('log in') && (
                  <Link 
                    href="/login" 
                    className="block mt-2 text-orange-400 hover:text-orange-300 underline"
                  >
                    Sign in to your account →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Auto-verifying State */}
          {autoVerifying ? (
            <div className="text-center py-12 sm:py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-500/20 border border-orange-500/30 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Verifying Your Email...</h2>
              <p className="text-white/60 text-sm sm:text-base">Please wait a moment</p>
            </div>
          ) : success ? (
            /* Success State */
            <div className="text-center py-6 sm:py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500/20 border border-green-500/30 mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Application Submitted!</h2>
              <p className="text-white/60 text-sm sm:text-base mb-3 sm:mb-4">
                Welcome to the TheHoopGang Creator Program!
              </p>
              <p className="text-white/40 text-xs sm:text-sm">
                Redirecting to your dashboard...
              </p>
              <div className="mt-4 sm:mt-6">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            </div>
          ) : (
            <>
              {/* ============================================ */}
              {/* STEP 1: Create Account */}
              {/* ============================================ */}
              {currentStep === 1 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Create Your Account</h2>
                    <p className="text-white/50 text-xs sm:text-sm">
                      We'll send you a verification email
                    </p>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label htmlFor="fullName" className={labelClasses}>
                        Full Name <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Jordan Smith"
                        required
                        className={inputClasses}
                        autoFocus
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className={labelClasses}>
                        Email <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="jordan@email.com"
                        required
                        className={inputClasses}
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className={labelClasses}>
                        Create Password <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className={inputClasses}
                        placeholder="Min 6 characters"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className={labelClasses}>
                        Confirm Password <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateAccount()}
                        required
                        className={inputClasses}
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateAccount}
                    disabled={verifyingEmail}
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white font-bold text-base sm:text-lg rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {verifyingEmail ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm sm:text-base">Creating Account...</span>
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

                  <p className="text-center text-white/40 text-xs sm:text-sm">
                    Already have an account?{' '}
                    <Link href="/login" className="text-orange-400 hover:text-orange-300 transition-colors">
                      Sign in here
                    </Link>
                  </p>
                </div>
              )}

              {/* ============================================ */}
              {/* STEP 2: Verify Email */}
              {/* ============================================ */}
              {currentStep === 2 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-500/20 border border-orange-500/30 mb-3 sm:mb-4">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Verify Your Email</h2>
                    <p className="text-white/50 text-xs sm:text-sm">
                      We sent a verification link to:
                    </p>
                    <p className="text-orange-400 font-medium text-sm sm:text-base mt-1 truncate px-2">
                      {formData.email || auth.currentUser?.email}
                    </p>
                  </div>

                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 sm:p-4">
                    <p className="text-white/70 text-xs sm:text-sm font-medium mb-2">Next steps:</p>
                    <ol className="text-white/50 text-xs sm:text-sm space-y-1 list-decimal list-inside">
                      <li>Check your inbox (and spam folder)</li>
                      <li>Click the verification link</li>
                      <li>Come back and click the button below</li>
                    </ol>
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckVerification}
                    disabled={verifyingEmail}
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white font-bold text-base sm:text-lg rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {verifyingEmail ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm sm:text-base">Checking...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm sm:text-base">I've Verified My Email</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="w-full text-white/50 hover:text-orange-400 text-xs sm:text-sm transition-colors"
                  >
                    Didn't receive the email? <span className="underline">Resend</span>
                  </button>
                </div>
              )}

              {/* ============================================ */}
              {/* STEP 3: Social Media */}
              {/* ============================================ */}
              {currentStep === 3 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-500/20 border border-green-500/30 mb-3 sm:mb-4">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Tell Us About Your Audience</h2>
                    <p className="text-white/50 text-xs sm:text-sm">
                      Share your social media stats
                    </p>
                  </div>

                  {/* Instagram Stats */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <div 
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                        }}
                      >
                        <InstagramLogo className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <span className="text-white font-medium text-sm sm:text-base">Instagram</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label htmlFor="instagramHandle" className={labelClasses}>
                          Handle <span className="text-orange-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                          <input
                            type="text"
                            id="instagramHandle"
                            name="instagramHandle"
                            value={formData.instagramHandle}
                            onChange={handleInputChange}
                            placeholder="yourhandle"
                            required
                            className={`${inputClasses} pl-7 sm:pl-8`}
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="instagramFollowers" className={labelClasses}>
                          Followers <span className="text-orange-500">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          id="instagramFollowers"
                          name="instagramFollowers"
                          value={getFollowerDisplayValue(formData.instagramFollowers)}
                          onChange={(e) => handleFollowerChange('instagramFollowers', e.target.value)}
                          placeholder="12,500"
                          required
                          className={inputClasses}
                        />
                      </div>
                    </div>
                  </div>

                  {/* TikTok Stats */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-black flex items-center justify-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"
                            fill="white"
                          />
                        </svg>
                      </div>
                      <span className="text-white font-medium text-sm sm:text-base">TikTok</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label htmlFor="tiktokHandle" className={labelClasses}>
                          Handle <span className="text-orange-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                          <input
                            type="text"
                            id="tiktokHandle"
                            name="tiktokHandle"
                            value={formData.tiktokHandle}
                            onChange={handleInputChange}
                            placeholder="yourhandle"
                            required
                            className={`${inputClasses} pl-7 sm:pl-8`}
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="tiktokFollowers" className={labelClasses}>
                          Followers <span className="text-orange-500">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          id="tiktokFollowers"
                          name="tiktokFollowers"
                          value={getFollowerDisplayValue(formData.tiktokFollowers)}
                          onChange={(e) => handleFollowerChange('tiktokFollowers', e.target.value)}
                          placeholder="8,300"
                          required
                          className={inputClasses}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Best Content URL */}
                  <div>
                    <label htmlFor="bestContentUrl" className={labelClasses}>
                      Link to Your Best Content <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/30">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </span>
                      <input
                        type="url"
                        id="bestContentUrl"
                        name="bestContentUrl"
                        value={formData.bestContentUrl}
                        onChange={handleInputChange}
                        placeholder="https://tiktok.com/@you/video/..."
                        required
                        className={`${inputClasses} pl-9 sm:pl-10`}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStep3Continue}
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white font-bold text-base sm:text-lg rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span className="text-sm sm:text-base">Continue</span>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* ============================================ */}
              {/* STEP 4: Product, Shipping & About */}
              {/* ============================================ */}
              {currentStep === 4 && (
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Final Details</h2>
                    <p className="text-white/50 text-xs sm:text-sm">
                      Product selection and shipping info
                    </p>
                  </div>

                  {/* Product Selection */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <span className="text-lg sm:text-xl">🛍️</span>
                      <span className="text-white font-medium text-sm sm:text-base">Product Selection</span>
                    </div>
                    
                    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
                      <p className="text-white/60 text-xs sm:text-sm mb-1.5 sm:mb-2">
                        Browse our store to find the product you want:
                      </p>
                      
                      <a
                        href="https://thehoopgang.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 sm:gap-2 text-orange-400 hover:text-orange-300 transition-colors font-medium text-xs sm:text-sm"
                      >
                        <span>Visit TheHoopGang Store</span>
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label htmlFor="product" className={labelClasses}>
                          Product <span className="text-orange-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="product"
                          name="product"
                          value={formData.product}
                          onChange={handleInputChange}
                          placeholder="Mesh Shorts"
                          required
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label htmlFor="size" className={labelClasses}>
                          Size <span className="text-orange-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            id="size"
                            name="size"
                            value={formData.size}
                            onChange={handleInputChange}
                            required
                            className={selectClasses}
                          >
                            {SIZES.map((size) => (
                              <option key={size.value} value={size.value} className="bg-zinc-900">
                                {size.label}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                      <div>
                        <label htmlFor="height" className={labelClasses}>
                          Height <span className="text-white/30 text-[8px] sm:text-[10px]">(opt)</span>
                        </label>
                        <input
                          type="text"
                          id="height"
                          name="height"
                          value={formData.height || ''}
                          onChange={handleInputChange}
                          placeholder={`5'10"`}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label htmlFor="weight" className={labelClasses}>
                          Weight <span className="text-white/30 text-[8px] sm:text-[10px]">(opt)</span>
                        </label>
                        <input
                          type="text"
                          id="weight"
                          name="weight"
                          value={formData.weight || ''}
                          onChange={handleInputChange}
                          placeholder="165lbs"
                          className={inputClasses}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <span className="text-lg sm:text-xl">📦</span>
                      <span className="text-white font-medium text-sm sm:text-base">Shipping Address</span>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label htmlFor="shippingAddress.street" className={labelClasses}>
                          Street Address <span className="text-orange-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="shippingAddress.street"
                          name="shippingAddress.street"
                          value={formData.shippingAddress.street}
                          onChange={handleInputChange}
                          placeholder="123 Main Street"
                          required
                          className={inputClasses}
                        />
                      </div>

                      <div>
                        <label htmlFor="shippingAddress.unit" className={labelClasses}>
                          Apt/Unit <span className="text-white/30 text-[8px] sm:text-[10px]">(opt)</span>
                        </label>
                        <input
                          type="text"
                          id="shippingAddress.unit"
                          name="shippingAddress.unit"
                          value={formData.shippingAddress.unit}
                          onChange={handleInputChange}
                          placeholder="Apt 4B"
                          className={inputClasses}
                        />
                      </div>

                      {/* City/State/ZIP - Stack on mobile */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <div className="col-span-2">
                          <label htmlFor="shippingAddress.city" className={labelClasses}>
                            City <span className="text-orange-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="shippingAddress.city"
                            name="shippingAddress.city"
                            value={formData.shippingAddress.city}
                            onChange={handleInputChange}
                            placeholder="Los Angeles"
                            required
                            className={inputClasses}
                          />
                        </div>
                        <div>
                          <label htmlFor="shippingAddress.state" className={labelClasses}>
                            State <span className="text-orange-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="shippingAddress.state"
                            name="shippingAddress.state"
                            value={formData.shippingAddress.state}
                            onChange={handleInputChange}
                            placeholder="CA"
                            required
                            className={inputClasses}
                          />
                        </div>
                        <div>
                          <label htmlFor="shippingAddress.zipCode" className={labelClasses}>
                            ZIP <span className="text-orange-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="shippingAddress.zipCode"
                            name="shippingAddress.zipCode"
                            value={formData.shippingAddress.zipCode}
                            onChange={handleInputChange}
                            placeholder="90012"
                            required
                            className={inputClasses}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* About You */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <span className="text-lg sm:text-xl">✨</span>
                      <span className="text-white font-medium text-sm sm:text-base">About You</span>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label htmlFor="whyCollab" className={labelClasses}>
                          Why collab with us? <span className="text-orange-500">*</span>
                        </label>
                        <textarea
                          id="whyCollab"
                          name="whyCollab"
                          value={formData.whyCollab}
                          onChange={handleInputChange}
                          placeholder="Tell us why you're excited..."
                          required
                          rows={3}
                          className={`${inputClasses} resize-none`}
                        />
                      </div>

                      <div>
                        <label className={labelClasses}>Worked with other brands?</label>
                        <div className="flex gap-4 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name="previousBrands"
                              value="true"
                              checked={formData.previousBrands === true}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white/20 peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-all flex items-center justify-center">
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100" />
                            </div>
                            <span className="text-white/80 group-hover:text-white transition-colors text-sm">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name="previousBrands"
                              value="false"
                              checked={formData.previousBrands === false}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white/20 peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-all flex items-center justify-center">
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100" />
                            </div>
                            <span className="text-white/80 group-hover:text-white transition-colors text-sm">No</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agreement */}
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 sm:p-4">
                    <label className="flex items-start gap-2.5 sm:gap-3 cursor-pointer group">
                      <div className="relative mt-0.5">
                        <input
                          type="checkbox"
                          name="agreedToTerms"
                          checked={formData.agreedToTerms}
                          onChange={handleInputChange}
                          required
                          className="sr-only peer"
                        />
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-white/20 peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-all flex items-center justify-center">
                          <svg
                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white opacity-0 peer-checked:opacity-100"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-orange-100 transition-colors">
                          I agree to post 1 TikTok within 14 days
                        </span>
                        <p className="text-[10px] sm:text-xs text-white/50 mt-0.5 sm:mt-1">
                          Failure to post may disqualify me from future collaborations.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm sm:text-base">Submitting...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm sm:text-base">Submit</span>
                          <span>🔥</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Already have account - only show on step 1 */}
        {currentStep === 1 && !success && (
          <p className="text-center text-white/50 text-xs sm:text-sm mt-4 sm:mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-orange-400 hover:text-orange-300 transition-colors">
              Sign in here
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function InstagramApplyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <InstagramApplyContent />
    </Suspense>
  );
}