// src/components/ui/Navbar.tsx

'use client';

import { useState, useEffect, type MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getCreatorWithActiveCollab } from '@/lib/firestore';
import { CollaborationStatus } from '@/types';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, loading, signOut, isAdmin } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showActiveCollabModal, setShowActiveCollabModal] = useState(false);
  // V2: Status is on Collaboration, not Creator
  const [collabStatus, setCollabStatus] = useState<CollaborationStatus | null>(null);

  // Track scroll position for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // V2: Fetch creator with active collaboration to get status
  useEffect(() => {
    const fetchCollabStatus = async () => {
      if (user && userData?.role === 'creator' && userData?.creatorId) {
        try {
          const result = await getCreatorWithActiveCollab(userData.creatorId);
          if (result?.collaboration) {
            setCollabStatus(result.collaboration.status);
          } else {
            // No active collaboration - creator can reapply
            setCollabStatus(null);
          }
        } catch (error) {
          console.error('Error fetching collaboration status:', error);
          setCollabStatus(null);
        }
      } else {
        setCollabStatus(null);
      }
    };
    fetchCollabStatus();
  }, [user, userData]);

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
    router.push('/');
  };

  // V2: Check if creator has an active collaboration (can't reapply yet)
  const hasActiveCollab = (): boolean => {
    if (!collabStatus) return false;
    // These statuses mean the collab is "done" and they can request a new one
    const canReapplyStatuses: CollaborationStatus[] = ['completed', 'denied', 'ghosted'];
    return !canReapplyStatuses.includes(collabStatus);
  };

  // Handle Apply link click - show modal if they have active collab
  const handleApplyClick = (e: MouseEvent<HTMLElement>) => {
    if (userData?.role === 'creator' && hasActiveCollab()) {
      e.preventDefault();
      setMobileMenuOpen(false);
      setShowActiveCollabModal(true);
    }
  };

  // Don't show admin link to non-admins
  const navLinks = [
    { href: '/apply', label: 'Apply', icon: '📝', show: true },
    { href: '/admin/creators', label: 'Admin', icon: '👑', show: isAdmin },
    { href: '/admin/submissions', label: 'Submissions', icon: '📋', show: isAdmin },
    { href: '/admin/leaderboard/gmv', label: 'GMV Admin', icon: '💰', show: isAdmin },
    { href: '/creator/dashboard', label: 'Dashboard', icon: '🎯', show: user && !isAdmin && userData?.creatorId },
    { href: '/creator/submit', label: 'Submit Content', icon: '📤', show: user && !isAdmin && userData?.creatorId },
    { href: '/creator/leaderboard', label: 'Leaderboard', icon: '🏆', show: user && (isAdmin || userData?.creatorId) },
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

            {/* Desktop Nav Links + Auth */}
            <div className="hidden items-center gap-1">
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
                      <span>{link.label}</span>
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
                      <span>Sign Out</span>
                      
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 bg-white/30 rounded-full transition-all duration-300 group-hover:w-4 group-hover:opacity-50" />
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="group flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-105"
                    >
                      <span className="transition-transform duration-200 group-hover:scale-110">🔐</span>
                      <span>Sign In</span>
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
              aria-label="Toggle menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span 
                  className={`block h-0.5 w-full bg-white rounded-full transition-all duration-300 ${
                    mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''
                  }`} 
                />
                <span 
                  className={`block h-0.5 w-full bg-white rounded-full transition-all duration-300 ${
                    mobileMenuOpen ? 'opacity-0' : ''
                  }`} 
                />
                <span 
                  className={`block h-0.5 w-full bg-white rounded-full transition-all duration-300 ${
                    mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
                  }`} 
                />
              </div>
            </button>
          </div>
        </div>
        
        {/* Subtle gradient line at bottom when scrolled */}
        <div 
          className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent transition-opacity duration-300 ${
            scrolled ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Mobile Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <span className="text-white font-semibold">Menu</span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile Nav Links */}
        <div className="p-4 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            const isApplyLink = link.href === '/apply';
            
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  if (isApplyLink) handleApplyClick(e);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-xl">{link.icon}</span>
                <span>{link.label}</span>
                {isActive && (
                  <span className="ml-auto w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Mobile Auth Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-zinc-950/50">
          {!loading && (
            <>
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-base font-medium bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
                >
                  <span>👋</span>
                  <span>Sign Out</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-base font-semibold bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all duration-200"
                >
                  <span>🔐</span>
                  <span>Sign In</span>
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Active Collaboration Modal - V2 updated */}
      {showActiveCollabModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowActiveCollabModal(false)}
          />
          
          <div className="relative bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowActiveCollabModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-5xl sm:text-6xl text-center mb-4">🏀</div>
            
            <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-3">
              You've Got an Active Collab!
            </h3>
            
            <p className="text-white/60 text-sm sm:text-base text-center mb-2">
              Complete your current collaboration first, then you can apply for another round of free gear.
            </p>
            
            <p className="text-white/40 text-xs sm:text-sm text-center mb-6">
              Current status: <span className="text-orange-400 capitalize">{collabStatus}</span>
            </p>
            
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