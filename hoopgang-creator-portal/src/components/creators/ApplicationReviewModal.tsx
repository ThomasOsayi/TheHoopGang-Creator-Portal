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

function formatFollowers(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`.replace('.0', '');
  return `${(count / 1000000).toFixed(1)}M`.replace('.0', '');
}

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

  // Calculate total followers
  const totalFollowers = creator.instagramFollowers + creator.tiktokFollowers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-4 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {/* Avatar */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-lg sm:text-xl font-bold text-white/70">
                {creator.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{creator.fullName}</h2>
                <p className="text-white/50 text-xs sm:text-sm truncate">
                  Applied {formatDate(creator.createdAt)} • <span className="font-mono">{creator.creatorId}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-white/40 hover:text-white hover:bg-white/10 transition-all p-2 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick Stats Bar - Scrollable on mobile */}
          <div className="flex items-center gap-3 sm:gap-4 mt-4 pt-4 border-t border-white/10 overflow-x-auto scrollbar-hide">
            <div className="flex-shrink-0">
              <StatusBadge status={creator.status} size="sm" />
            </div>
            <div className="h-4 w-px bg-white/10 flex-shrink-0" />
            <div className="flex items-center gap-1.5 text-sm flex-shrink-0">
              <span className="text-white/50">Reach:</span>
              <span className="text-white font-semibold">{formatFollowers(totalFollowers)}</span>
            </div>
            {(creator.height || creator.weight) && (
              <>
                <div className="h-4 w-px bg-white/10 flex-shrink-0" />
                <div className="flex items-center gap-1.5 text-sm text-white/50 flex-shrink-0">
                  <span>📏</span>
                  {creator.height && <span>{creator.height}</span>}
                  {creator.height && creator.weight && <span>•</span>}
                  {creator.weight && <span>{creator.weight}</span>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4 sm:space-y-5">
          {/* Contact Info - Stacks on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 sm:p-4 hover:bg-white/[0.05] hover:border-white/10 transition-all">
              <h3 className="text-white/40 text-xs uppercase tracking-wider mb-1">Email</h3>
              <p className="text-white font-medium text-sm sm:text-base truncate">{creator.email}</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 sm:p-4 hover:bg-white/[0.05] hover:border-white/10 transition-all">
              <h3 className="text-white/40 text-xs uppercase tracking-wider mb-1">Product Request</h3>
              <p className="text-white font-medium text-sm sm:text-base">
                {creator.product} <span className="text-white/50">• Size {creator.size}</span>
              </p>
            </div>
          </div>

          {/* Social Stats */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 sm:p-5 hover:border-white/10 transition-all">
            <h3 className="text-white font-semibold mb-3 sm:mb-4 flex items-center gap-2">
              <span>📱</span> Social Presence
            </h3>
            {/* Stacks on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <a
                href={`https://instagram.com/${creator.instagramHandle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-white/5 rounded-xl p-3 sm:p-4 hover:border-pink-500/30 hover:shadow-lg hover:shadow-pink-500/10 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-pink-400 text-lg">📸</span>
                    <span className="text-white/70 text-sm">Instagram</span>
                  </div>
                  <span className="text-white font-bold text-lg sm:text-xl sm:hidden">
                    {formatFollowers(creator.instagramFollowers)}
                  </span>
                </div>
                <p className="text-orange-400 group-hover:text-orange-300 text-sm font-medium transition-colors">
                  @{creator.instagramHandle.replace('@', '')}
                </p>
                <p className="text-white font-bold text-xl mt-1 hidden sm:block">
                  {formatFollowers(creator.instagramFollowers)}
                  <span className="text-white/50 text-sm font-normal ml-1">followers</span>
                </p>
              </a>
              <a
                href={`https://tiktok.com/@${creator.tiktokHandle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-white/5 rounded-xl p-3 sm:p-4 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-cyan-400 text-lg">🎵</span>
                    <span className="text-white/70 text-sm">TikTok</span>
                  </div>
                  <span className="text-white font-bold text-lg sm:text-xl sm:hidden">
                    {formatFollowers(creator.tiktokFollowers)}
                  </span>
                </div>
                <p className="text-orange-400 group-hover:text-orange-300 text-sm font-medium transition-colors">
                  @{creator.tiktokHandle.replace('@', '')}
                </p>
                <p className="text-white font-bold text-xl mt-1 hidden sm:block">
                  {formatFollowers(creator.tiktokFollowers)}
                  <span className="text-white/50 text-sm font-normal ml-1">followers</span>
                </p>
              </a>
            </div>

            {/* Best Content */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <h4 className="text-white/40 text-xs uppercase tracking-wider mb-2">Best Content Sample</h4>
              <a
                href={creator.bestContentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm transition-colors group break-all"
              >
                <span className="line-clamp-2">{creator.bestContentUrl}</span>
                <svg className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          {/* Fit Recommendation (if height/weight provided) */}
          {(creator.height || creator.weight) && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                <span>📏</span> Fit Information
              </h3>
              {/* Stacks on mobile */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <h4 className="text-white/40 text-xs uppercase tracking-wider mb-1">Height</h4>
                  <p className="text-white text-sm sm:text-base">{creator.height || '—'}</p>
                </div>
                <div>
                  <h4 className="text-white/40 text-xs uppercase tracking-wider mb-1">Weight</h4>
                  <p className="text-white text-sm sm:text-base">{creator.weight || '—'}</p>
                </div>
              </div>
              <p className="text-blue-300/70 text-xs mt-3">
                Use this info to recommend the best size if needed.
              </p>
            </div>
          )}

          {/* Shipping Address */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 sm:p-5 hover:border-white/10 transition-all">
            <h3 className="text-white font-semibold mb-2 sm:mb-3 flex items-center gap-2">
              <span>📍</span> Shipping Address
            </h3>
            <p className="text-white/80 text-sm sm:text-base">{formattedAddress}</p>
          </div>

          {/* Application Details */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 sm:p-5 hover:border-white/10 transition-all">
            <h3 className="text-white font-semibold mb-3 sm:mb-4 flex items-center gap-2">
              <span>💬</span> Why They Want to Collab
            </h3>
            <p className="text-white/80 text-sm leading-relaxed bg-white/[0.03] rounded-lg p-3 sm:p-4 border border-white/5">
              "{creator.whyCollab}"
            </p>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/40 text-xs uppercase tracking-wider">Previous Brand Experience:</span>
                {creator.previousBrands ? (
                  <span className="text-green-400 text-sm font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Yes
                  </span>
                ) : (
                  <span className="text-white/50 text-sm">No</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions - Stacks on mobile */}
        <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-md border-t border-white/10 px-4 sm:px-6 py-4">
          {/* Mobile: Stack vertically */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="w-full sm:w-auto justify-center"
            >
              Cancel
            </Button>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                variant="ghost"
                onClick={() => onDeny(creator.id)}
                disabled={loading}
                className="w-full sm:w-auto justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
              >
                Deny Application
              </Button>
              <Button
                variant="primary"
                onClick={() => onApprove(creator.id)}
                disabled={loading}
                loading={loading}
                className="w-full sm:w-auto justify-center shadow-lg shadow-orange-500/20"
              >
                Approve Application
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}