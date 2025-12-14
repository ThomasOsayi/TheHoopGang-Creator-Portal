import { cn } from '@/lib/utils';

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

/**
 * Filter button with optional count badge
 */
export function FilterPill({ 
  label, 
  active, 
  onClick, 
  count 
}: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full font-medium text-sm",
        "transition-all duration-300 flex items-center gap-2",
        active
          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
          : "bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700"
      )}
    >
      {label}
      {count !== undefined && (
        <span 
          className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            active ? "bg-white/20" : "bg-zinc-700"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default FilterPill;