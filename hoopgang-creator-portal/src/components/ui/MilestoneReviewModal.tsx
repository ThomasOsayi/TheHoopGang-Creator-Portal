// src/components/ui/MilestoneReviewModal.tsx
'use client';

import { useState } from 'react';
import { V3ContentSubmission, MilestoneTier } from '@/types';

interface CreatorInfo {
  creatorName: string;
  creatorHandle: string;
  creatorEmail: string;
}

interface MilestoneReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: (V3ContentSubmission & CreatorInfo) | null;
  onApprove: (submissionId: string, verifiedViews: number) => Promise<void>;
  onReject: (submissionId: string, reason: string) => Promise<void>;
}

// Tier configuration
const tierConfig: Record<MilestoneTier, { label: string; minViews: number; color: string; bg: string; border: string }> = {
  '100k': { label: '100K Views', minViews: 100000, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  '500k': { label: '500K Views', minViews: 500000, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  '1m': { label: '1M+ Views', minViews: 1000000, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
};

// Quick rejection reasons
const quickRejectReasons = [
  'Video does not meet view threshold',
  'Unable to verify view count',
  'Video not featuring HoopGang product',
  'Duplicate submission',
  'Invalid TikTok URL',
];

function XMarkIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ExternalLinkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return num.toString();
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MilestoneReviewModal({
  isOpen,
  onClose,
  submission,
  onApprove,
  onReject,
}: MilestoneReviewModalProps) {
  const [mode, setMode] = useState<'review' | 'reject'>('review');
  const [verifiedViews, setVerifiedViews] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !submission) return null;

  const tier = submission.claimedTier ? tierConfig[submission.claimedTier] : null;
  const viewsNumber = parseInt(verifiedViews.replace(/,/g, ''), 10) || 0;
  const meetsThreshold = tier ? viewsNumber >= tier.minViews : false;

  const handleApprove = async () => {
    if (!verifiedViews || viewsNumber <= 0) {
      setError('Please enter the verified view count');
      return;
    }

    if (tier && !meetsThreshold) {
      setError(`View count must be at least ${formatNumber(tier.minViews)} to approve this tier`);
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      await onApprove(submission.id, viewsNumber);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      await onReject(submission.id, rejectionReason.trim());
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    setMode('review');
    setVerifiedViews('');
    setRejectionReason('');
    setError(null);
    onClose();
  };

  const handleViewsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and format with commas
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw) {
      const num = parseInt(raw, 10);
      setVerifiedViews(num.toLocaleString());
    } else {
      setVerifiedViews('');
    }
    setError(null);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) handleClose();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">
            {mode === 'review' ? 'Review Milestone' : 'Reject Milestone'}
          </h2>
          <button 
            onClick={handleClose}
            disabled={isProcessing}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Creator Info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-lg">
              {submission.creatorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-white font-medium">{submission.creatorName}</div>
              <div className="text-zinc-500 text-sm">@{submission.creatorHandle}</div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800" />

          {/* Milestone Details */}
          <div className="grid grid-cols-2 gap-4">
            {/* Claimed Tier */}
            <div>
              <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5">Claimed Tier</div>
              {tier && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold ${tier.bg} ${tier.color} ${tier.border} border`}>
                  {tier.label}
                </span>
              )}
            </div>

            {/* TikTok Video */}
            <div>
              <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5">TikTok Video</div>
              <a
                href={submission.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
              >
                Open in TikTok
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Submitted Date */}
          <div>
            <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5">Submitted</div>
            <div className="text-zinc-300 text-sm">{formatDate(submission.submittedAt)}</div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800" />

          {mode === 'review' ? (
            <>
              {/* Verified Views Input */}
              <div>
                <label className="block text-zinc-300 text-sm font-medium mb-2">
                  Verified View Count <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={verifiedViews}
                  onChange={handleViewsChange}
                  placeholder="Enter view count from TikTok"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all text-lg font-medium"
                  disabled={isProcessing}
                />
                {tier && (
                  <div className={`mt-2 text-sm ${meetsThreshold ? 'text-green-400' : 'text-zinc-500'}`}>
                    {meetsThreshold ? (
                      <span className="flex items-center gap-1.5">
                        <span>✓</span> Meets {tier.label} threshold
                      </span>
                    ) : (
                      <span>Minimum {formatNumber(tier.minViews)} views required for this tier</span>
                    )}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Rejection Reason */}
              <div>
                <label className="block text-zinc-300 text-sm font-medium mb-2">
                  Rejection Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    setError(null);
                  }}
                  placeholder="Explain why this milestone is being rejected..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none h-24"
                  disabled={isProcessing}
                />
              </div>

              {/* Quick Reasons */}
              <div>
                <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Quick Select</div>
                <div className="flex flex-wrap gap-2">
                  {quickRejectReasons.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setRejectionReason(reason)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        rejectionReason === reason
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700'
                      }`}
                      disabled={isProcessing}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900/50">
          {mode === 'review' ? (
            <div className="flex gap-3">
              <button
                onClick={() => setMode('reject')}
                disabled={isProcessing}
                className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>✕</span> Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing || !verifiedViews}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Approving...
                  </>
                ) : (
                  <>
                    <span>✓</span> Approve & Unlock Reward
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMode('review');
                  setRejectionReason('');
                  setError(null);
                }}
                disabled={isProcessing}
                className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <span>✕</span> Confirm Rejection
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MilestoneReviewModal;