interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
}

export default function StatCard({ label, value, change, icon }: StatCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors relative">
      {icon && (
        <div className="absolute top-6 right-6 text-2xl">
          {icon}
        </div>
      )}
      <div className="text-white/60 text-sm mb-1">{label}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {change && (
        <div className="text-sm text-orange-400 mt-2">{change}</div>
      )}
    </div>
  );
}

