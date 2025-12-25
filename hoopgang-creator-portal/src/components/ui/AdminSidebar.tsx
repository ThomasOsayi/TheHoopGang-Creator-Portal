// src/components/ui/AdminSidebar.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
    router.push('/');
  };

  // Navigation sections with grouped items
  const navSections: NavSection[] = [
    {
      items: [
        { href: '/admin/creators', label: 'Dashboard', icon: '👑' },
        { href: '/admin/submissions', label: 'Content', icon: '📹' },
        { href: '/admin/rewards', label: 'Rewards', icon: '🎁' },
        { href: '/admin/redemptions', label: 'Redemptions', icon: '🎟️' },
      ],
    },
    {
      title: 'Competitions',
      items: [
        { href: '/admin/leaderboard/volume', label: 'Volume Comp', icon: '📊' },
        { href: '/admin/leaderboard/gmv', label: 'GMV Comp', icon: '💰' },
      ],
    },
    {
      title: 'Tools',
      items: [
        { href: '/admin/tiktok-imports', label: 'Imports', icon: '🎵' },
        { href: '/apply', label: 'Apply Page', icon: '📝' },
      ],
    },
  ];

  // Flatten for mobile
  const allNavItems = navSections.flatMap(section => section.items);

  const NavLink = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
        }`}
      >
        <span className={`text-lg transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
          {item.icon}
        </span>
        <span className="flex-1">{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full">
            {item.badge}
          </span>
        )}
        {isActive && (
          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Sidebar - Always visible on lg+ */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-zinc-900/95 border-r border-white/10 z-40">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 transition-transform duration-300 group-hover:scale-110">
              <Image
                src="/images/THG_logo_orange.png"
                alt="TheHoopGang"
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-orange-400 font-bold text-xl tracking-tight">
              TheHoopGang
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {section.title && (
                <h3 className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign Out - Bottom */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-all duration-200"
          >
            <span className="text-lg">👋</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header Bar - Only on mobile/tablet */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-zinc-900/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between h-full px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/THG_logo_orange.png"
              alt="TheHoopGang"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
            />
            <span className="text-orange-400 font-bold text-lg">TheHoopGang</span>
          </Link>

          {/* Hamburger Button */}
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
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu Drawer */}
      <div
        className={`lg:hidden fixed top-0 right-0 z-50 h-full w-72 bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Mobile Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <span className="text-white font-semibold">Admin Menu</span>
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
        <div className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
          {allNavItems.map((item) => (
            <NavLink 
              key={item.href} 
              item={item} 
              onClick={() => setMobileMenuOpen(false)} 
            />
          ))}
        </div>

        {/* Mobile Sign Out */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-zinc-950/50">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-base font-medium bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            <span>👋</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}