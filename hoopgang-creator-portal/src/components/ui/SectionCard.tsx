import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SectionCard({ title, icon, children, className }: SectionCardProps) {
  return (
    <div className={cn('bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6', className)}>
      {title && (
        <div className="flex items-center gap-2 mb-4">
          {icon && <span className="text-xl">{icon}</span>}
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

