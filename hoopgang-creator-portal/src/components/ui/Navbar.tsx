// src/components/ui/Navbar.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, loading, signOut, isAdmin } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  // Track scroll position for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Don't show admin link to non-admins
  const navLinks = [
    { href: '/apply', label: 'Apply', icon: '📝', show: true },
    { href: '/admin/creators', label: 'Admin', icon: '👑', show: isAdmin },
    { href: '/creator/dashboard', label: 'Dashboard', icon: '🎯', show: user && !isAdmin },
  ].filter(link => link.show);

  return (
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
          <Link 
            href="/" 
            className="flex items-center gap-2.5 group"
          >
            <span className="text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              🏀
            </span>
            <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent group-hover:from-orange-400 group-hover:to-yellow-400 transition-all duration-300">
              HoopGang
            </span>
          </Link>

          {/* Nav Links + Auth */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
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
  );
}