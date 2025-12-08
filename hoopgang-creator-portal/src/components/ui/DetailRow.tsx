import { cn } from '@/lib/utils';

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export default function DetailRow({ label, value, className }: DetailRowProps) {
  return (
    <div className={cn('flex justify-between items-start py-3 border-b border-white/10 hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors', className)}>
      <div className="text-white/60 text-sm font-medium">{label}</div>
      <div className="text-white text-sm text-right max-w-[60%]">{value}</div>
    </div>
  );
}

