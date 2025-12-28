// src/app/creator/request-product/page.tsx
// Updated UI with corrected 1-video terms + modern glassmorphism design

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Creator, Size } from '@/types';
import { SIZES } from '@/lib/constants';
import { 
  getCreatorByUserId, 
  createCollaboration,
  getCollaborationsByCreatorId 
} from '@/lib/firestore';
import { useAuth } from '@/lib/auth-context';
import { useToast, GlowCard } from '@/components/ui';
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
  const [pastCollabs, setPastCollabs] = useState<{ product: string; size: string; completedAt?: Date }[]>([]);

  useEffect(() => {
    const loadCreatorData = async () => {
      if (!user) return;
      
      try {
        const creatorData = await getCreatorByUserId(user.uid);
        
        if (!creatorData) {
          router.push('/apply');
          return;
        }
        
        if (creatorData.isBlocked) {
          setError('Your account has been blocked from future collaborations.');
          setLoading(false);
          return;
        }
        
        if (creatorData.activeCollaborationId) {
          router.push('/creator/dashboard');
          return;
        }
        
        if (creatorData.totalCollaborations === 0) {
          router.push('/apply');
          return;
        }
        
        setCreator(creatorData);
        
        // Load past collaborations
        const collabs = await getCollaborationsByCreatorId(creatorData.id);
        const completedCollabs = collabs
          .filter(c => c.status === 'completed')
          .map(c => ({
            product: c.product,
            size: c.size,
            completedAt: c.completedAt,
          }));
        setPastCollabs(completedCollabs);
        
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

  // Loading state
  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['creator']}>
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Loading your profile...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Blocked state
  if (error && creator?.isBlocked) {
    return (
      <ProtectedRoute allowedRoles={['creator']}>
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-8 sm:py-16 px-4 relative overflow-hidden">
          {/* Background */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
          </div>
          
          <div className="max-w-md mx-auto relative z-10">
            <GlowCard glowColor="red" className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl sm:text-4xl">🚫</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-3">Account Blocked</h1>
              <p className="text-white/60 text-sm sm:text-base mb-6">
                Your account has been blocked from future collaborations due to unfulfilled content requirements.
              </p>
              <Link
                href="/creator/dashboard"
                className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
              >
                <span>←</span>
                <span>Back to Dashboard</span>
              </Link>
            </GlowCard>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['creator']}>
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-6 sm:py-12 px-4 relative overflow-hidden">
        {/* Background Gradient Orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-xl mx-auto relative z-10">
          {/* Back Button */}
          <Link
            href="/creator/dashboard"
            className="group inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors text-sm"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>Back to Dashboard</span>
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4">
              <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-amber-500/10 rounded-2xl border border-orange-500/20 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm">
                <Image
                  src="/images/THG_logo_orange.png"
                  alt="TheHoopGang"
                  width={56}
                  height={56}
                  className="w-full h-full object-contain"
                />
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 bg-orange-500/20 rounded-2xl blur-xl -z-10" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Request New Product
            </h1>
            <p className="text-white/60 text-sm sm:text-base">
              Ready for another collab? Choose your next piece of gear!
            </p>
          </div>

          {/* Success State */}
          {success ? (
            <GlowCard glowColor="green" className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-500/20 border border-green-500/30 mb-6">
                <span className="text-5xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Request Submitted!</h2>
              <p className="text-white/60 mb-6">Redirecting you to your dashboard...</p>
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </GlowCard>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Creator Info Card */}
              {creator && (
                <GlowCard glowColor="orange" className="!p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-orange-500/30 to-purple-500/20 border border-white/10 flex items-center justify-center text-xl sm:text-2xl font-bold text-white flex-shrink-0">
                      {creator.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold text-base sm:text-lg truncate">{creator.fullName}</p>
                      <p className="text-white/50 text-sm truncate">
                        @{creator.tiktokHandle.replace('@', '')} • Collab #{creator.totalCollaborations + 1}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-green-400 text-xs font-medium">Eligible</span>
                    </div>
                  </div>
                </GlowCard>
              )}

              {/* Past Products */}
              {pastCollabs.length > 0 && (
                <GlowCard glowColor="purple" className="!p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📦</span>
                    <span className="text-white/70 text-sm font-medium">Previous Products</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pastCollabs.map((collab, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-white/70 text-sm"
                      >
                        <span className="text-green-400">✓</span>
                        {collab.product} ({collab.size})
                      </span>
                    ))}
                  </div>
                </GlowCard>
              )}

              {/* Product Selection Section */}
              <GlowCard>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <h2 className="text-lg font-semibold text-white">Choose Your Product</h2>
                </div>

                {/* Store Link Card */}
                <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-xl p-4 mb-5">
                  <p className="text-white/70 text-sm mb-2">
                    Browse our store to find the product you want:
                  </p>
                  <a
                    href="https://thehoopgang.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors font-semibold group"
                  >
                    <span>Visit TheHoopGang Store</span>
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                {/* Product & Size Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="product" className="block text-white/50 text-xs uppercase tracking-wider mb-2">
                      Product Name <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="product"
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      placeholder="e.g. Reversible Mesh Shorts"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent hover:bg-white/[0.08] transition-all text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label htmlFor="size" className="block text-white/50 text-xs uppercase tracking-wider mb-2">
                      Size <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="size"
                        value={size}
                        onChange={(e) => setSize(e.target.value as Size)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent hover:bg-white/[0.08] transition-all appearance-none cursor-pointer text-sm sm:text-base"
                      >
                        {SIZES.map((s) => (
                          <option key={s.value} value={s.value} className="bg-zinc-900">
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </GlowCard>

              {/* Shipping Address Section */}
              {creator && (
                <GlowCard>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <h2 className="text-lg font-semibold text-white">Confirm Shipping Address</h2>
                  </div>

                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-white font-medium">{creator.fullName}</p>
                        <p className="text-white/60 text-sm mt-1">
                          {creator.shippingAddress.street}
                          {creator.shippingAddress.unit && `, ${creator.shippingAddress.unit}`}
                        </p>
                        <p className="text-white/60 text-sm">
                          {creator.shippingAddress.city}, {creator.shippingAddress.state} {creator.shippingAddress.zipCode}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 border border-green-500/30 rounded-full flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-400 text-xs font-medium hidden sm:inline">Confirmed</span>
                      </div>
                    </div>
                    <p className="text-white/40 text-xs mt-3">
                      Need to update your address? Contact support after submitting.
                    </p>
                  </div>
                </GlowCard>
              )}

              {/* Terms Reminder - FIXED: 1 TikTok instead of 3 */}
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📋</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm sm:text-base">
                      Collaboration Terms
                    </p>
                    <p className="text-white/60 text-xs sm:text-sm mt-1">
                      You agree to post <span className="text-amber-400 font-semibold">1 TikTok</span> featuring your HoopGang gear within <span className="text-amber-400 font-semibold">14 days</span> of receiving your product. You can also submit additional videos to climb the leaderboard and earn rewards!
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !product.trim()}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Request Product</span>
                    <span className="text-xl">🚀</span>
                  </>
                )}
              </button>

              {/* Helper Text */}
              <p className="text-center text-white/40 text-xs">
                Your request will be reviewed by our team. You&apos;ll be notified when it&apos;s approved!
              </p>
            </form>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}