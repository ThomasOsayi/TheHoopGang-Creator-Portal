import { cn } from '@/lib/utils';

type OrbColor = 'orange' | 'purple' | 'blue' | 'green' | 'amber';

interface BackgroundOrbsProps {
  colors?: OrbColor[];
  className?: string;
}

const orbColorClasses: Record<OrbColor, string> = {
  orange: 'bg-orange-500/10',
  purple: 'bg-purple-500/10',
  blue: 'bg-blue-500/10',
  green: 'bg-green-500/10',
  amber: 'bg-amber-500/10',
};

/**
 * Floating animated background orbs for visual depth
 */
export function BackgroundOrbs({ 
  colors = ['orange', 'purple', 'orange'],
  className,
}: BackgroundOrbsProps) {
  // Default positions for 3 orbs
  const orbPositions = [
    { position: '-top-40 -right-40', size: 'w-96 h-96', animation: 'animate-float-slow' },
    { position: 'top-1/2 -left-40', size: 'w-80 h-80', animation: 'animate-float-drift' },
    { position: '-bottom-40 right-1/3', size: 'w-72 h-72', animation: 'animate-float-slow' },
  ];

  return (
    <div className={cn("fixed inset-0 pointer-events-none overflow-hidden", className)}>
      {colors.slice(0, 3).map((color, index) => (
        <div
          key={index}
          className={cn(
            "absolute rounded-full blur-3xl",
            orbPositions[index].position,
            orbPositions[index].size,
            orbPositions[index].animation,
            orbColorClasses[color]
          )}
        />
      ))}
    </div>
  );
}

export default BackgroundOrbs;