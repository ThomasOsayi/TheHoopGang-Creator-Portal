// src/components/ui/EmptyState.tsx

import Link from 'next/link';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/50 text-sm max-w-sm mb-6">{description}</p>
      
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

// Pre-built empty states for common scenarios
export function EmptyStateNoContent() {
  return (
    <EmptyState
      icon="🎬"
      title="No Content Yet"
      description="You haven't submitted any TikTok videos yet. Once your package arrives, post your content and add the links here."
    />
  );
}

export function EmptyStateNoTracking() {
  return (
    <EmptyState
      icon="📦"
      title="No Tracking Info"
      description="Tracking information will appear here once your package has been shipped."
    />
  );
}

export function EmptyStateNoCreators() {
  return (
    <EmptyState
      icon="👥"
      title="No Creators Found"
      description="No creators match your current filters. Try adjusting your search or filter criteria."
    />
  );
}

export function EmptyStatePendingApproval() {
  return (
    <EmptyState
      icon="⏳"
      title="Application Under Review"
      description="Your application is being reviewed by the TheHoopGang team. We'll notify you once there's an update!"
    />
  );
}

export function EmptyStateNoNotifications() {
  return (
    <EmptyState
      icon="🔔"
      title="All Caught Up!"
      description="You don't have any notifications right now. We'll let you know when something happens."
    />
  );
}

