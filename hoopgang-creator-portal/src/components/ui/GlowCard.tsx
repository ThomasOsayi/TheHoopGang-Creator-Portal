// src/components/ui/GlowCard.tsx

import { cn } from '@/lib/utils';

type GlowColor = 'orange' | 'green' | 'blue' | 'amber' | 'purple' | 'yellow' | 'red';

interface GlowCardProps {
  children: React.ReactNode;
  glowColor?: GlowColor;
  className?: string;
  noPadding?: boolean;
  delay?: string;
}

const glowColorClasses: Record<GlowColor, string> = {
  orange: 'hover:shadow-glow-orange hover:border-orange-500/50',
  green: 'hover:shadow-glow-green hover:border-green-500/50',
  blue: 'hover:shadow-glow-blue hover:border-blue-500/50',
  amber: 'hover:shadow-glow-amber hover:border-amber-500/50',
  purple: 'hover:shadow-glow-purple hover:border-purple-500/50',
  yellow: 'hover:shadow-glow-yellow hover:border-yellow-500/50',
  red: 'hover:shadow-glow-red hover:border-red-500/50',
};

/**
 * Card wrapper with hover glow effect
 */
export function GlowCard({ 
  children, 
  glowColor = 'orange', 
  className,
  noPadding = false,
  delay = '0s',
}: GlowCardProps) {
  return (
    <div
      className={cn(
        "bg-zinc-900/50 border border-zinc-800 rounded-2xl",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.01] hover:-translate-y-1",
        "animate-fade-in-up",
        glowColorClasses[glowColor],
        !noPadding && "p-6",
        className
      )}
      style={{ animationDelay: delay }}
    >
      {children}
    </div>
  );
}

export default GlowCard;