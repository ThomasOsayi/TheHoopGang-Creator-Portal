// src/components/ui/index.ts

// Existing exports
export { default as StatusBadge } from './StatusBadge';
export { default as StatCard } from './StatCard';
export { default as SectionCard } from './SectionCard';
export { default as DetailRow } from './DetailRow';
export { default as StarRating } from './StarRating';
export { default as ProgressDots } from './ProgressDots';
export { Button } from './Button';
export { Navbar } from './Navbar';
export { ToastProvider, useToast } from './Toast';
export { Pagination } from './Pagination';
export { default as TrackingStatus, AddTrackingForm } from './TrackingStatus';
export { default as TrackingProgress } from './TrackingProgress';
export { Skeleton, SkeletonCard, SkeletonTable, SkeletonStats, SkeletonTimeline } from './Skeleton';
export { 
  EmptyState, 
  EmptyStateNoContent, 
  EmptyStateNoTracking, 
  EmptyStateNoCreators,
  EmptyStatePendingApproval,
  EmptyStateNoNotifications 
} from './EmptyState';

// HG-401: Creator-facing shared UI components
export { AnimatedCounter } from './AnimatedCounter';
export { LiveCountdown } from './LiveCountdown';
export { GlowCard } from './GlowCard';
export { FilterPill } from './FilterPill';
export { BackgroundOrbs } from './BackgroundOrbs';
export { Confetti } from './Confetti';
export { SuccessToast } from './SuccessToast';
export { ClaimModal } from './ClaimModal';

// HOOP-101: Admin portal shared UI components
import { SuccessAnimation } from './SuccessAnimation';
import { ConfirmModal } from './ConfirmModal';
import { SourceBadge } from './SourceBadge';
import { CreatorSourceBadge } from './CreatorSourceBadge';

export { SuccessAnimation, ConfirmModal, SourceBadge, CreatorSourceBadge };
export { AdminSidebar } from './AdminSidebar';

// Page Header component
export { PageHeader } from './PageHeader';