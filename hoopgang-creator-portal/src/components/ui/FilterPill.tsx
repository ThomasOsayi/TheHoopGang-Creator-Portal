// src/components/ui/FilterPill.tsx

interface FilterPillProps {
    label: string;
    active: boolean;
    onClick: () => void;
    count?: number;
    color?: 'orange' | 'yellow' | 'green' | 'blue' | 'red' | 'purple';
    icon?: string;  // Add icon support
  }
  
  export function FilterPill({ label, active, onClick, count, color = 'orange', icon }: FilterPillProps) {
    const colors: Record<string, { active: string; text: string }> = {
      orange: { active: 'bg-orange-500 shadow-orange-500/25', text: 'text-orange-400' },
      yellow: { active: 'bg-yellow-500 shadow-yellow-500/25', text: 'text-yellow-400' },
      blue: { active: 'bg-blue-500 shadow-blue-500/25', text: 'text-blue-400' },
      green: { active: 'bg-green-500 shadow-green-500/25', text: 'text-green-400' },
      red: { active: 'bg-red-500 shadow-red-500/25', text: 'text-red-400' },
      purple: { active: 'bg-purple-500 shadow-purple-500/25', text: 'text-purple-400' },
    };
  
    const colorStyle = colors[color] || colors.orange;
  
    return (
      <button
        onClick={onClick}
        className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
          active
            ? `${colorStyle.active} text-white shadow-lg`
            : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700'
        }`}
      >
        {icon && <span>{icon}</span>}
        {label}
        {count !== undefined && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-zinc-700'}`}>
            {count}
          </span>
        )}
      </button>
    );
  }