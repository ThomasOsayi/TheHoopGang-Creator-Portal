'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, loading, signOut, isAdmin } = useAuth();

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🏀</span>
            <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{link.icon}</span>
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}

            {/* Auth Button */}
            {!loading && (
              <>
                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all ml-2"
                  >
                    <span>👋</span>
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-all ml-2"
                  >
                    <span>🔐</span>
                    <span className="hidden sm:inline">Sign In</span>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

