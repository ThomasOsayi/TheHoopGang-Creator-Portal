// src/components/ui/SourceBadge.tsx
'use client';

type RedemptionSource = 'volume_competition' | 'gmv_competition' | 'milestone' | 'manual';

interface SourceBadgeProps {
  source: RedemptionSource;
  size?: 'sm' | 'md';
}

const sourceConfig: Record<RedemptionSource, { 
  bg: string; 
  text: string; 
  label: string;
  icon: string;
}> = {
  volume_competition: { 
    bg: 'bg-blue-500/20', 
    text: 'text-blue-400', 
    label: 'Volume Win',
    icon: '🏆'
  },
  gmv_competition: { 
    bg: 'bg-green-500/20', 
    text: 'text-green-400', 
    label: 'GMV Win',
    icon: '💰'
  },
  milestone: { 
    bg: 'bg-purple-500/20', 
    text: 'text-purple-400', 
    label: 'Milestone',
    icon: '⭐'
  },
  manual: { 
    bg: 'bg-zinc-500/20', 
    text: 'text-zinc-400', 
    label: 'Manual',
    icon: '✏️'
  },
};

export function SourceBadge({ source, size = 'md' }: SourceBadgeProps) {
  const config = sourceConfig[source];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full font-medium
      ${sizeClasses} ${config.bg} ${config.text}
    `}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

export default SourceBadge;