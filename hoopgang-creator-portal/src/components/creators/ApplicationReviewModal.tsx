// src/components/creators/ApplicationReviewModal.tsx

'use client';

import { Creator } from '@/types';
import { Button, StatusBadge } from '@/components/ui';

interface ApplicationReviewModalProps {
  creator: Creator | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  loading?: boolean;
}

/**
 * Formats follower count for display
 */
function formatFollowers(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}K`.replace('.0', '');
  }
  return `${(count / 1000000).toFixed(1)}M`.replace('.0', '');
}

/**
 * Formats a date to a readable string
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ApplicationReviewModal({
  creator,
  isOpen,
  onClose,
  onApprove,
  onDeny,
  loading = false,
}: ApplicationReviewModalProps) {
  if (!isOpen || !creator) return null;

  const formattedAddress = [
    creator.shippingAddress.street,
    creator.shippingAddress.unit,
    creator.shippingAddress.city,
    `${creator.shippingAddress.state} ${creator.shippingAddress.zipCode}`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Review Application</h2>
            <p className="text-white/50 text-sm mt-0.5">
              Applied: {formatDate(creator.createdAt)} • ID: {creator.creatorId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Creator Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-white/50 text-xs uppercase tracking-wider mb-1">Full Name</h3>
              <p className="text-white font-medium">{creator.fullName}</p>
            </div>
            <div>
              <h3 className="text-white/50 text-xs uppercase tracking-wider mb-1">Email</h3>
              <p className="text-white">{creator.email}</p>
            </div>
            <div>
              <h3 className="text-white/50 text-xs uppercase tracking-wider mb-1">Phone</h3>
              <p className="text-white">{creator.phone}</p>
            </div>
            <div>
              <h3 className="text-white/50 text-xs uppercase tracking-wider mb-1">Status</h3>
              <StatusBadge status={creator.status} size="sm" />
            </div>
          </div>

          {/* Social Stats */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>📱</span> Social Presence
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-pink-400">📸</span>
                  <span className="text-white/70 text-sm">Instagram</span>
                </div>
                <a 
                  href={`https://instagram.com/${creator.instagramHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-orange-300 text-sm"
                >
                  @{creator.instagramHandle.replace('@', '')}
                </a>
                <p className="text-white font-bold text-lg">
                  {formatFollowers(creator.instagramFollowers)} followers
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span>🎵</span>
                  <span className="text-white/70 text-sm">TikTok</span>
                </div>
                <a 
                  href={`https://tiktok.com/@${creator.tiktokHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-orange-300 text-sm"
                >
                  @{creator.tiktokHandle.replace('@', '')}
                </a>
                <p className="text-white font-bold text-lg">
                  {formatFollowers(creator.tiktokFollowers)} followers
                </p>
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-white/50 text-xs uppercase tracking-wider mb-1">Best Content Sample</h4>
              <a 
                href={creator.bestContentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 text-sm break-all"
              >
                {creator.bestContentUrl}
              </a>
            </div>
          </div>

          {/* Product Selection */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>📦</span> Product Selection
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-white/50 text-xs uppercase tracking-wider mb-1">Product</h4>
                <p className="text-white">{creator.product}</p>
              </div>
              <div>
                <h4 className="text-white/50 text-xs uppercase tracking-wider mb-1">Size</h4>
                <p className="text-white">{creator.size}</p>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>🏠</span> Shipping Address
            </h3>
            <p className="text-white">{formattedAddress}</p>
          </div>

          {/* Application Questions */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>💬</span> Application Details
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-white/50 text-xs uppercase tracking-wider mb-1">
                  Why do they want to collab?
                </h4>
                <p className="text-white/90 text-sm leading-relaxed bg-white/5 rounded-lg p-3">
                  {creator.whyCollab}
                </p>
              </div>
              <div>
                <h4 className="text-white/50 text-xs uppercase tracking-wider mb-1">
                  Previous Brand Experience
                </h4>
                <p className="text-white">
                  {creator.previousBrands ? (
                    <span className="text-green-400">✓ Yes, has worked with brands before</span>
                  ) : (
                    <span className="text-white/70">No previous brand collaborations</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-white/10 px-6 py-4 flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => onDeny(creator.id)}
              disabled={loading}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              Deny Application
            </Button>
            <Button
              variant="primary"
              onClick={() => onApprove(creator.id)}
              disabled={loading}
              loading={loading}
            >
              Approve Application
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}