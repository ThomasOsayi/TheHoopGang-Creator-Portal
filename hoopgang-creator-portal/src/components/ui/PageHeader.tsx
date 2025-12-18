'use client';

import { useEffect, useState } from 'react';

type AccentColor = 'orange' | 'purple' | 'gold' | 'green' | 'blue' | 'pink';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon?: string;
  accentColor?: AccentColor;
  align?: 'left' | 'center';
}

const colorConfig: Record<AccentColor, {
  gradient: string;
  glow: string;
  iconBg: string;
}> = {
  orange: {
    gradient: 'from-orange-400 via-amber-400 to-orange-500',
    glow: 'rgba(249, 115, 22, 0.4)',
    iconBg: 'bg-orange-500/20',
  },
  purple: {
    gradient: 'from-purple-400 via-pink-400 to-purple-500',
    glow: 'rgba(168, 85, 247, 0.4)',
    iconBg: 'bg-purple-500/20',
  },
  gold: {
    gradient: 'from-yellow-400 via-amber-300 to-yellow-500',
    glow: 'rgba(234, 179, 8, 0.4)',
    iconBg: 'bg-yellow-500/20',
  },
  green: {
    gradient: 'from-green-400 via-emerald-400 to-green-500',
    glow: 'rgba(34, 197, 94, 0.4)',
    iconBg: 'bg-green-500/20',
  },
  blue: {
    gradient: 'from-blue-400 via-cyan-400 to-blue-500',
    glow: 'rgba(59, 130, 246, 0.4)',
    iconBg: 'bg-blue-500/20',
  },
  pink: {
    gradient: 'from-pink-400 via-rose-400 to-pink-500',
    glow: 'rgba(236, 72, 153, 0.4)',
    iconBg: 'bg-pink-500/20',
  },
};

export function PageHeader({ 
  title, 
  subtitle, 
  icon, 
  accentColor = 'orange',
  align = 'center' 
}: PageHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const colors = colorConfig[accentColor];
  const alignClass = align === 'center' ? 'text-center' : 'text-left';

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={`mb-8 ${alignClass}`}>
      {/* Title Row */}
      <div 
        className={`flex items-center gap-3 ${align === 'center' ? 'justify-center' : 'justify-start'}`}
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }}
      >
        {/* Animated Icon */}
        {icon && (
          <div 
            className={`relative ${colors.iconBg} rounded-2xl p-3`}
            style={{
              animation: mounted ? 'float 3s ease-in-out infinite' : 'none',
            }}
          >
            {/* Glow behind icon */}
            <div 
              className="absolute inset-0 rounded-2xl blur-xl opacity-60"
              style={{ backgroundColor: colors.glow }}
            />
            <span className="relative text-4xl">{icon}</span>
          </div>
        )}

        {/* Animated Title */}
        <h1 
          className="text-3xl sm:text-4xl font-bold relative"
          style={{
            animation: mounted ? 'titleGlow 3s ease-in-out infinite' : 'none',
          }}
        >
          <span 
            className={`bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent`}
            style={{
              backgroundSize: '200% auto',
              animation: mounted ? 'shimmerText 3s linear infinite' : 'none',
            }}
          >
            {title}
          </span>
          
          {/* Inline icon (alternative placement) */}
          {!icon && (
            <span className="inline-block ml-2 animate-bounce">
              {getDefaultIcon(accentColor)}
            </span>
          )}
        </h1>
      </div>

      {/* Animated Subtitle */}
      <p 
        className="text-zinc-400 mt-2 text-base sm:text-lg"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.5s ease-out 0.2s, transform 0.5s ease-out 0.2s',
        }}
      >
        {subtitle}
      </p>

      {/* Decorative underline */}
      <div 
        className={`mt-4 h-1 rounded-full ${align === 'center' ? 'mx-auto' : ''}`}
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.glow}, transparent)`,
          width: mounted ? '120px' : '0px',
          transition: 'width 0.8s ease-out 0.4s',
        }}
      />

      {/* Keyframe animations (scoped) */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes shimmerText {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes titleGlow {
          0%, 100% { filter: drop-shadow(0 0 0px ${colors.glow}); }
          50% { filter: drop-shadow(0 0 12px ${colors.glow}); }
        }
      `}</style>
    </div>
  );
}

// Helper: default icons per color theme
function getDefaultIcon(color: AccentColor): string {
  const icons: Record<AccentColor, string> = {
    orange: '🔥',
    purple: '✨',
    gold: '🏆',
    green: '🚀',
    blue: '💎',
    pink: '🎁',
  };
  return icons[color];
}