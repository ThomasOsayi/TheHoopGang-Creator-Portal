'use client';

type CreatorSource = 'tiktok' | 'instagram' | 'manual';

interface CreatorSourceBadgeProps {
  source: CreatorSource;
  size?: 'sm' | 'md';
}

const sourceConfig: Record<CreatorSource, { 
  bg: string; 
  text: string; 
  border: string;
  label: string;
  icon: string;
}> = {
  tiktok: { 
    bg: 'bg-black/40', 
    text: 'text-white', 
    border: 'border-zinc-600',
    label: 'TikTok',
    icon: '🎵'
  },
  instagram: { 
    bg: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20', 
    text: 'text-pink-400', 
    border: 'border-pink-500/30',
    label: 'Instagram',
    icon: '📸'
  },
  manual: { 
    bg: 'bg-zinc-500/20', 
    text: 'text-zinc-400', 
    border: 'border-zinc-600',
    label: 'Manual',
    icon: '✏️'
  },
};

export function CreatorSourceBadge({ source, size = 'md' }: CreatorSourceBadgeProps) {
  const config = sourceConfig[source] || sourceConfig.manual;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span className={`
      inline-flex items-center gap-1.5 rounded-full font-medium border
      ${sizeClasses} ${config.bg} ${config.text} ${config.border}
    `}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

export default CreatorSourceBadge;