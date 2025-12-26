// src/app/creator/request-product/page.tsx
// Mobile-Responsive Version

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth } from '@/lib/firebase';
import { Creator, Size } from '@/types';
import { SIZES } from '@/lib/constants';
import { 
  getCreatorByUserId, 
  createCollaboration,
  getCollaborationsByCreatorId 
} from '@/lib/firestore';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui';
import { ProtectedRoute } from '@/components/auth';

export default function RequestProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [product, setProduct] = useState('');
  const [size, setSize] = useState<Size>('M');
  
  // Past collaborations for reference
  const [pastProducts, setPastProducts] = useState<string[]>([]);

  useEffect(() => {
    const loadCreatorData = async () => {
      if (!user) return;
      
      try {
        const creatorData = await getCreatorByUserId(user.uid);
        
        if (!creatorData) {
          // No creator profile - redirect to apply
          router.push('/apply');
          return;
        }
        
        // Check if blocked
        if (creatorData.isBlocked) {
          setError('Your account has been blocked from future collaborations.');
          setLoading(false);
          return;
        }
        
        // Check if they have an active collaboration
        if (creatorData.activeCollaborationId) {
          // Already has active collab - go to dashboard
          router.push('/creator/dashboard');
          return;
        }
        
        // Check if they have any completed collaborations
        if (creatorData.totalCollaborations === 0) {
          // Never had a collab - redirect to apply
          router.push('/apply');
          return;
        }
        
        setCreator(creatorData);
        
        // Load past collaborations to show what they've already received
        const collabs = await getCollaborationsByCreatorId(creatorData.id);
        const products = collabs.map(c => `${c.product} (${c.size})`);
        setPastProducts(products);
        
      } catch (err) {
        console.error('Error loading creator:', err);
        setError('Failed to load your profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadCreatorData();
  }, [user, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    if (!product.trim()) {
      setError('Please enter the product you want');
      return;
    }
    
    if (!creator) {
      setError('Creator profile not found');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Create new collaboration
      await createCollaboration(creator.id, {
        product: product.trim(),
        size,
      });
      
      setSuccess(true);
      showToast('Product request submitted! 🎉', 'success');
      
      setTimeout(() => {
        router.push('/creator/dashboard');
      }, 1500);
      
    } catch (err) {
      console.error('Error creating collaboration:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit request. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses =
    'w-full bg-white/5 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-sm sm:text-base placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent hover:bg-white/[0.08] transition-all';
  const labelClasses = 'block text-white/50 text-[10px] sm:text-xs uppercase tracking-wider mb-1.5 sm:mb-2';
  const selectClasses =
    'w-full bg-white/5 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent hover:bg-white/[0.08] transition-all appearance-none cursor-pointer';

  // Loading state
  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['creator']}>
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60 text-sm sm:text-base">Loading your profile...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Blocked state
  if (error && creator?.isBlocked) {
    return (
      <ProtectedRoute allowedRoles={['creator']}>
        <div className="min-h-screen bg-zinc-950 py-8 sm:py-12 px-4 relative overflow-hidden">
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
          </div>
          
          <div className="max-w-md mx-auto relative z-10">
            <div className="bg-white/5 backdrop-blur-md border border-red-500/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl">🚫</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Account Blocked</h1>
              <p className="text-white/60 text-sm sm:text-base mb-5 sm:mb-6">
                Your account has been blocked from future collaborations due to unfulfilled content requirements from a previous collaboration.
              </p>
              <button
                onClick={() => router.push('/creator/dashboard')}
                className="text-orange-400 hover:text-orange-300 transition-colors text-sm sm:text-base"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['creator']}>
      <div className="min-h-screen bg-zinc-950 py-8 sm:py-12 px-4 relative overflow-hidden">
        {/* Background Gradient Orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-2xl mx-auto relative z-10">
          {/* Back Button */}
          <button
            onClick={() => router.push('/creator/dashboard')}
            className="group flex items-center gap-2 text-white/60 hover:text-white mb-5 sm:mb-6 transition-colors text-sm sm:text-base"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>Back to Dashboard</span>
          </button>

          {/* Header */}
          <div className="text-center mb-8 sm:mb-10">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6">
              <div className="w-full h-full bg-zinc-800/50 rounded-xl sm:rounded-2xl border border-white/10 flex items-center justify-center p-3 sm:p-4">
                <Image
                  src="/images/THG_logo_orange.png"
                  alt="TheHoopGang"
                  width={56}
                  height={56}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2 sm:mb-3">
              Request New Product
            </h1>
            <p className="text-white/60 text-sm sm:text-base">
              Ready for another collab? Choose your next piece of gear!
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 hover:border-white/20 transition-all duration-300">
            {success ? (
              <div className="text-center py-12 sm:py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500/20 border border-green-500/30 mb-4 sm:mb-6">
                  <span className="text-4xl sm:text-5xl">🎉</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Request Submitted!</h2>
                <p className="text-white/60 text-sm sm:text-base">Redirecting you to your dashboard...</p>
                <div className="mt-5 sm:mt-6">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 sm:gap-3">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}

                {/* Creator Info Card */}
                {creator && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-lg sm:text-xl font-bold text-white/70 flex-shrink-0">
                        {creator.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm sm:text-base truncate">{creator.fullName}</p>
                        <p className="text-white/50 text-xs sm:text-sm truncate">
                          @{creator.tiktokHandle.replace('@', '')} • Collab #{creator.totalCollaborations + 1}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Past Products Info */}
                {pastProducts.length > 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 sm:p-4">
                    <p className="text-blue-400 text-xs sm:text-sm font-medium mb-2">
                      Previous products you&apos;ve received:
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {pastProducts.map((prod, idx) => (
                        <span
                          key={idx}
                          className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/10 rounded-full text-white/70 text-xs sm:text-sm"
                        >
                          {prod}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Selection */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs sm:text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-white">Choose Your Product</h2>
                  </div>

                  {/* Store Link */}
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 sm:p-4">
                    <p className="text-white/70 text-xs sm:text-sm mb-2">
                      Browse our store to find the product you want:
                    </p>
                    
                    <a
                      href="https://thehoopgang.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 sm:gap-2 text-orange-400 hover:text-orange-300 transition-colors font-medium text-sm sm:text-base"
                    >
                      <span>Visit TheHoopGang Store</span>
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label htmlFor="product" className={labelClasses}>
                        Product Name <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="product"
                        name="product"
                        value={product}
                        onChange={(e) => setProduct(e.target.value)}
                        placeholder="e.g. Reversible Mesh Shorts"
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
                          value={size}
                          onChange={(e) => setSize(e.target.value as Size)}
                          required
                          className={selectClasses}
                        >
                          {SIZES.map((s) => (
                            <option key={s.value} value={s.value} className="bg-zinc-900">
                              {s.label}
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
                </div>

                {/* Shipping Address Confirmation */}
                {creator && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs sm:text-sm font-bold flex-shrink-0">
                        2
                      </div>
                      <h2 className="text-base sm:text-lg font-semibold text-white">Confirm Shipping Address</h2>
                    </div>

                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white text-sm sm:text-base">{creator.fullName}</p>
                          <p className="text-white/60 text-xs sm:text-sm">
                            {creator.shippingAddress.street}
                            {creator.shippingAddress.unit && `, ${creator.shippingAddress.unit}`}
                          </p>
                          <p className="text-white/60 text-xs sm:text-sm">
                            {creator.shippingAddress.city}, {creator.shippingAddress.state} {creator.shippingAddress.zipCode}
                          </p>
                        </div>
                        <span className="text-green-400 text-xs sm:text-sm flex items-center gap-1 flex-shrink-0">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="hidden xs:inline">Same address</span>
                          <span className="xs:hidden">✓</span>
                        </span>
                      </div>
                      <p className="text-white/40 text-[10px] sm:text-xs mt-2 sm:mt-3">
                        Need to update your address? Contact support after submitting.
                      </p>
                    </div>
                  </div>
                )}

                {/* Agreement Reminder */}
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 sm:p-5">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg sm:text-xl">📝</span>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-white">
                        Same terms apply
                      </p>
                      <p className="text-[10px] sm:text-xs text-white/50 mt-0.5 sm:mt-1">
                        You agree to post 3 TikToks within 14 days of receiving your product. 
                        Failure to post may result in being blocked from future collaborations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-base sm:text-lg rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm sm:text-base">Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm sm:text-base">Request Product</span>
                      <span>🔥</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}