import { CreatorStatus } from '@/types';

interface StatusBadgeProps {
  status: CreatorStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  
  const colorMap: Record<CreatorStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    denied: 'bg-red-500/20 text-red-400',
    approved: 'bg-blue-500/20 text-blue-400',
    shipped: 'bg-purple-500/20 text-purple-400',
    delivered: 'bg-green-500/20 text-green-400',
    completed: 'bg-cyan-500/20 text-cyan-400',
    ghosted: 'bg-red-500/20 text-red-400',
  };

  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${colorMap[status]}`}
    >
      {statusText}
    </span>
  );
}

