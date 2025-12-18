// src/components/creators/ApplicationReviewModal.tsx

'use client';

import { CreatorWithCollab } from '@/types';
import { StatusBadge } from '@/components/ui';

interface ApplicationReviewModalProps {
  creator: CreatorWithCollab | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  loading?: boolean;
}

// Helper functions
function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`.replace('.0', '');
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`.replace('.0', '');
  return count.toString();
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Instagram Logo Component
function InstagramIcon() {
  return (
    <div 
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{
        background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      }}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    </div>
  );
}

// TikTok Logo Component
function TikTokIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path
          d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"
          fill="white"
        />
      </svg>
    </div>
  );
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

  // V2: Get collaboration data
  const collab = creator.collaboration;
  const status = collab?.status;
  const product = collab?.product;
  const size = collab?.size;

  // If no active collaboration, show error state
  if (!collab) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 text-center shadow-2xl">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">No Active Collaboration</h2>
          <p className="text-zinc-400 mb-6">
            This creator doesn't have an active collaboration to review.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Format shipping address
  const formattedAddress = [
    creator.shippingAddress?.street,
    creator.shippingAddress?.unit,
    creator.shippingAddress?.city,
    `${creator.shippingAddress?.state || ''} ${creator.shippingAddress?.zipCode || ''}`.trim(),
  ].filter(Boolean).join(', ');

  // Calculate total followers
  const totalFollowers = (creator.instagramFollowers || 0) + (creator.tiktokFollowers || 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-200">
        {/* Glow Effects */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[90vh]">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-orange-500/20 flex-shrink-0">
                  {creator.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">{creator.fullName}</h2>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="text-zinc-400">Applied {formatDate(collab.createdAt)}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-orange-400 font-mono text-xs">{collab.collabDisplayId || creator.creatorId}</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <StatusBadge status={status!} size="sm" />
              <div className="flex items-center gap-1 text-sm">
                <span className="text-zinc-500">Reach:</span>
                <span className="text-white font-semibold">{formatFollowers(totalFollowers)}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-zinc-500">Collab</span>
                <span className="text-white font-semibold">#{collab.collabNumber}</span>
              </div>
              {(creator.height || creator.weight) && (
                <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                  <span>📏</span>
                  {creator.height && <span>{creator.height}</span>}
                  {creator.height && creator.weight && <span>•</span>}
                  {creator.weight && <span>{creator.weight}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Contact & Product Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl hover:border-zinc-600 transition-colors">
                <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Email</div>
                <div className="text-white font-medium truncate">{creator.email}</div>
              </div>
              <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl hover:border-zinc-600 transition-colors">
                <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Product Request</div>
                <div className="text-white font-medium">
                  {product} <span className="text-zinc-400">•</span> <span className="text-orange-400">Size {size}</span>
                </div>
              </div>
            </div>

            {/* Returning Creator Notice */}
            {creator.totalCollaborations > 1 && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-purple-400">🔄</span>
                  <span className="text-purple-400 font-semibold">Returning Creator</span>
                </div>
                <p className="text-zinc-300 text-sm">
                  This creator has completed {creator.totalCollaborations - 1} previous collaboration{creator.totalCollaborations > 2 ? 's' : ''} with HoopGang.
                </p>
              </div>
            )}

            {/* Social Presence */}
            <div className="p-5 bg-zinc-800/30 border border-zinc-700/50 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📊</span>
                <h3 className="text-white font-semibold">Social Presence</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Instagram Card */}
                <a
                  href={`https://instagram.com/${creator.instagramHandle?.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-zinc-900/50 border border-zinc-700/50 rounded-xl hover:border-pink-500/30 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <InstagramIcon />
                    <span className="text-white font-medium">Instagram</span>
                  </div>
                  <div className="text-orange-400 group-hover:text-orange-300 transition-colors text-sm mb-1">
                    @{creator.instagramHandle?.replace('@', '')}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">{formatFollowers(creator.instagramFollowers || 0)}</span>
                    <span className="text-zinc-500 text-sm">followers</span>
                  </div>
                </a>

                {/* TikTok Card */}
                <a
                  href={`https://tiktok.com/@${creator.tiktokHandle?.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-zinc-900/50 border border-zinc-700/50 rounded-xl hover:border-cyan-500/30 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TikTokIcon />
                    <span className="text-white font-medium">TikTok</span>
                  </div>
                  <div className="text-orange-400 group-hover:text-orange-300 transition-colors text-sm mb-1">
                    @{creator.tiktokHandle?.replace('@', '')}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">{formatFollowers(creator.tiktokFollowers || 0)}</span>
                    <span className="text-zinc-500 text-sm">followers</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Best Content Sample */}
            {creator.bestContentUrl && (
              <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
                <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Best Content Sample</div>
                <a 
                  href={creator.bestContentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-orange-300 transition-colors text-sm break-all flex items-start gap-2 group"
                >
                  <span className="flex-1">{creator.bestContentUrl}</span>
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            {/* Shipping Address */}
            {formattedAddress && (
              <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-pink-400">📍</span>
                  <span className="text-white font-semibold">Shipping Address</span>
                </div>
                <p className="text-zinc-300">{formattedAddress}</p>
              </div>
            )}

            {/* Why They Want to Collab */}
            {creator.whyCollab && (
              <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-purple-400">💬</span>
                  <span className="text-white font-semibold">Why They Want to Collab</span>
                </div>
                <div className="p-3 bg-zinc-900/50 rounded-lg border-l-2 border-orange-500/50">
                  <p className="text-zinc-300 text-sm leading-relaxed italic">"{creator.whyCollab}"</p>
                </div>
              </div>
            )}

            {/* Additional Info Row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 uppercase tracking-wider text-xs">Previous Brand Experience:</span>
                <span className={creator.previousBrands ? 'text-green-400' : 'text-zinc-400'}>
                  {creator.previousBrands ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 px-6 py-4">
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-zinc-400 hover:text-white font-medium transition-colors text-center sm:text-left"
              >
                Cancel
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={() => onDeny(creator.id)}
                  disabled={loading}
                  className="px-5 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 font-medium rounded-xl transition-all disabled:opacity-50 text-center"
                >
                  Deny Application
                </button>

                <button
                  onClick={() => onApprove(creator.id)}
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Approving...
                    </>
                  ) : (
                    'Approve Application'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}