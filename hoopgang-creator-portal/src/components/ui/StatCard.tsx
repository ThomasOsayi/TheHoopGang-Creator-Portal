// src/components/ui/StatCard.tsx

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: 'up' | 'down';
  trendLabel?: string;
  highlight?: boolean;
}

export default function StatCard({ 
  label, 
  value, 
  icon, 
  trend,
  trendLabel,
  highlight = false 
}: StatCardProps) {
  return (
    <div 
      className={`group relative bg-white/5 backdrop-blur-md border rounded-2xl p-5 transition-all duration-300 hover:bg-white/[0.08] hover:shadow-lg cursor-default ${
        highlight 
          ? 'border-orange-500/30 hover:shadow-orange-500/10' 
          : 'border-white/10 hover:border-white/20 hover:shadow-black/20'
      }`}
    >
      {/* Icon */}
      {icon && (
        <div className="absolute top-4 right-4 text-2xl opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300">
          {icon}
        </div>
      )}
      
      {/* Label */}
      <div className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
        {label}
      </div>
      
      {/* Value */}
      <div className={`text-3xl font-bold mb-1 ${highlight ? 'text-orange-400' : 'text-white'}`}>
        {value}
      </div>
      
      {/* Trend */}
      {trendLabel && (
        <div className={`text-xs font-medium flex items-center gap-1 ${
          trend === 'up' ? 'text-green-400' : 
          trend === 'down' ? 'text-red-400' : 
          'text-white/40'
        }`}>
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
          {trendLabel}
        </div>
      )}
      
      {/* Highlight glow effect */}
      {highlight && (
        <div className="absolute inset-0 rounded-2xl bg-orange-500/5 pointer-events-none" />
      )}
    </div>
  );
}