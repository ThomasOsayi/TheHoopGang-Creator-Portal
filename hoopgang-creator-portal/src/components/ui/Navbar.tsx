// src/components/ui/Navbar.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getCreatorByUserId } from '@/lib/firestore';
import { Creator } from '@/types';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, loading, signOut, isAdmin } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [showActiveCollabModal, setShowActiveCollabModal] = useState(false);
  const [creatorStatus, setCreatorStatus] = useState<Creator['status'] | null>(null);

  // Track scroll position for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch creator status when user is logged in as a creator
  useEffect(() => {
    const fetchCreatorStatus = async () => {
      if (user && userData?.role === 'creator') {
        try {
          const creator = await getCreatorByUserId(user.uid);
          if (creator) {
            setCreatorStatus(creator.status);
          }
        } catch (error) {
          console.error('Error fetching creator status:', error);
        }
      } else {
        setCreatorStatus(null);
      }
    };
    fetchCreatorStatus();
  }, [user, userData]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Check if creator has an active collaboration (can't reapply yet)
  const hasActiveCollab = (): boolean => {
    if (!creatorStatus) return false;
    // These statuses mean they CAN apply again
    const canReapplyStatuses: Creator['status'][] = ['completed', 'denied', 'ghosted'];
    return !canReapplyStatuses.includes(creatorStatus);
  };

  // Handle Apply link click - show modal if they have active collab
  const handleApplyClick = (e: React.MouseEvent) => {
    if (userData?.role === 'creator' && hasActiveCollab()) {
      e.preventDefault();
      setShowActiveCollabModal(true);
    }
    // Otherwise, normal Link navigation happens
  };

  // Don't show admin link to non-admins
  const navLinks = [
    { href: '/apply', label: 'Apply', icon: '📝', show: true },
    { href: '/admin/creators', label: 'Admin', icon: '👑', show: isAdmin },
    { href: '/creator/dashboard', label: 'Dashboard', icon: '🎯', show: user && !isAdmin },
  ].filter(link => link.show);

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-zinc-950/95 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-white/10' 
            : 'bg-transparent backdrop-blur-sm border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-9 h-9 transition-transform duration-300 group-hover:scale-110">
                <Image
                  src="/images/THG_logo_orange.png"
                  alt="HoopGang"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-orange-400 font-bold text-xl tracking-tight">
                HoopGang
              </span>
            </Link>

            {/* Nav Links + Auth */}
            <div className="flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                const isApplyLink = link.href === '/apply';
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={isApplyLink ? handleApplyClick : undefined}
                    className="relative group"
                  >
                    <div
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'text-orange-400'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                        {link.icon}
                      </span>
                      <span className="hidden sm:inline">{link.label}</span>
                    </div>
                    
                    {/* Active indicator line */}
                    <div 
                      className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-300 ${
                        isActive ? 'w-8 opacity-100' : 'w-0 opacity-0 group-hover:w-4 group-hover:opacity-50'
                      }`}
                    />
                  </Link>
                );
              })}

              {/* Divider */}
              {navLinks.length > 0 && (
                <div className="w-px h-6 bg-white/10 mx-2" />
              )}

              {/* Auth Button */}
              {!loading && (
                <>
                  {user ? (
                    <button
                      onClick={handleSignOut}
                      className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200"
                    >
                      <span className="transition-transform duration-200 group-hover:scale-110">👋</span>
                      <span className="hidden sm:inline">Sign Out</span>
                      
                      {/* Hover indicator */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 bg-white/30 rounded-full transition-all duration-300 group-hover:w-4 group-hover:opacity-50" />
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="group flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-105"
                    >
                      <span className="transition-transform duration-200 group-hover:scale-110">🔐</span>
                      <span className="hidden sm:inline">Sign In</span>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Subtle gradient line at bottom when scrolled */}
        <div 
          className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent transition-opacity duration-300 ${
            scrolled ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </nav>

      {/* Active Collaboration Modal */}
      {showActiveCollabModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowActiveCollabModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowActiveCollabModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Icon */}
            <div className="text-6xl text-center mb-4">🏀</div>
            
            {/* Title */}
            <h3 className="text-xl font-bold text-white text-center mb-3">
              You've Got an Active Collab!
            </h3>
            
            {/* Message */}
            <p className="text-white/60 text-center mb-2">
              Complete your current collaboration first, then you can apply for another round of free gear.
            </p>
            
            {/* Status hint */}
            <p className="text-white/40 text-sm text-center mb-6">
              Current status: <span className="text-orange-400 capitalize">{creatorStatus}</span>
            </p>
            
            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowActiveCollabModal(false)}
                className="flex-1 px-4 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-all duration-200"
              >
                Got It
              </button>
              <Link
                href="/creator/dashboard"
                onClick={() => setShowActiveCollabModal(false)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 text-center"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}