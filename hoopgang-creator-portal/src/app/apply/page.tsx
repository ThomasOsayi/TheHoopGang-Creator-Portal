// src/app/apply/page.tsx

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { getCreatorByUserId } from '@/lib/firestore';
import { Navbar } from '@/components/ui';

// TikTok Logo Component with gradient
const TiktokLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"
      fill="url(#tiktok-gradient-select)"
    />
    <defs>
      <linearGradient id="tiktok-gradient-select" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#25F4EE" />
        <stop offset="50%" stopColor="#FE2C55" />
        <stop offset="100%" stopColor="#25F4EE" />
      </linearGradient>
    </defs>
  </svg>
);

// Instagram Logo Component
const InstagramLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="white">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

function PlatformSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [hoveredCard, setHoveredCard] = useState<'tiktok' | 'instagram' | null>(null);

  // Check for existing application/redirect logic
  useEffect(() => {
    const checkExistingApplication = async () => {
      if (user) {
        try {
          const existingCreator = await getCreatorByUserId(user.uid);
          if (existingCreator) {
            // Blocked creator
            if (existingCreator.isBlocked) {
              // Will be handled by respective flow pages
              return;
            }
            
            // Has active collaboration - go to dashboard
            if (existingCreator.activeCollaborationId) {
              router.push('/creator/dashboard');
              return;
            }
            
            // Completed previous collab - can request new product
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

  // If there are verification params, redirect to Instagram flow (existing behavior)
  useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');
    
    if (mode === 'verifyEmail' && oobCode) {
      // Redirect to Instagram flow with verification params
      router.push(`/apply/instagram?mode=${mode}&oobCode=${oobCode}`);
    }
  }, [searchParams, router]);

  const handlePlatformSelect = (platform: 'tiktok' | 'instagram') => {
    router.push(`/apply/${platform}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4 relative overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-full h-full bg-zinc-800/50 rounded-2xl border border-white/10 flex items-center justify-center p-4">
              <Image
                src="/images/THG_logo_orange.png"
                alt="HoopGang"
                width={56}
                height={56}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white mb-3">
            Join the HoopGang Creator Squad
          </h1>
          <p className="text-white/60 text-lg">
            Get free gear. Create fire content. Get paid to hoop.
          </p>
        </div>

        {/* Platform Selection */}
        <div className="mb-8">
          <p className="text-center text-white/50 text-sm uppercase tracking-wider mb-6">
            Choose how you want to join
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TikTok Card */}
            <button
              onClick={() => handlePlatformSelect('tiktok')}
              onMouseEnter={() => setHoveredCard('tiktok')}
              onMouseLeave={() => setHoveredCard(null)}
              className={`
                relative group text-left p-6 rounded-2xl border-2 transition-all duration-300
                bg-black border-zinc-800
                hover:border-zinc-600 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/50
                ${hoveredCard === 'tiktok' ? 'border-zinc-600 scale-[1.02]' : ''}
              `}
            >
              {/* Gradient overlay on hover */}
              <div className={`
                absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
                bg-gradient-to-br from-[#25F4EE]/10 via-transparent to-[#FE2C55]/10
              `} />
              
              <div className="relative z-10">
                {/* Logo */}
                <div className="w-16 h-16 bg-zinc-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <TiktokLogo className="w-10 h-10" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-2">
                  TikTok Shop Creator
                </h3>

                {/* Description */}
                <p className="text-white/60 text-sm mb-4">
                  Already ordered from our TikTok Shop? Sign up instantly with your order info pre-filled.
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-zinc-800/80 rounded-full text-xs text-white/70">
                    ⚡ Quick setup
                  </span>
                  <span className="px-3 py-1 bg-zinc-800/80 rounded-full text-xs text-white/70">
                    📦 Pre-filled info
                  </span>
                  <span className="px-3 py-1 bg-zinc-800/80 rounded-full text-xs text-white/70">
                    ✓ 3 steps
                  </span>
                </div>

                {/* Arrow indicator */}
                <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                  <svg className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Instagram Card */}
            <button
              onClick={() => handlePlatformSelect('instagram')}
              onMouseEnter={() => setHoveredCard('instagram')}
              onMouseLeave={() => setHoveredCard(null)}
              className={`
                relative group text-left p-6 rounded-2xl border-2 transition-all duration-300
                border-zinc-800
                hover:border-zinc-600 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10
                ${hoveredCard === 'instagram' ? 'border-zinc-600 scale-[1.02]' : ''}
              `}
              style={{
                background: 'linear-gradient(135deg, rgba(131, 58, 180, 0.15) 0%, rgba(253, 29, 29, 0.15) 50%, rgba(252, 176, 69, 0.15) 100%)',
              }}
            >
              {/* Gradient border effect on hover */}
              <div className={`
                absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
                bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-orange-500/20
              `} />
              
              <div className="relative z-10">
                {/* Logo */}
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                  style={{
                    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  }}
                >
                  <InstagramLogo className="w-9 h-9" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-2">
                  Instagram Creator
                </h3>

                {/* Description */}
                <p className="text-white/60 text-sm mb-4">
                  Apply to become a HoopGang creator. Tell us about yourself and your content.
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/70">
                    📝 Full application
                  </span>
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/70">
                    ⏱️ ~5 minutes
                  </span>
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/70">
                    ✓ 5 steps
                  </span>
                </div>

                {/* Arrow indicator */}
                <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <svg className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center space-y-4">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 inline-block">
            <p className="text-white/50 text-sm">
              <span className="text-white/70 font-medium">Not sure which to choose?</span>
              <br />
              If you ordered from our TikTok Shop, use TikTok. Otherwise, use Instagram.
            </p>
          </div>

          {/* Already have account link */}
          <p className="text-white/50 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-orange-400 hover:text-orange-300 transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <PlatformSelectionContent />
    </Suspense>
  );
}