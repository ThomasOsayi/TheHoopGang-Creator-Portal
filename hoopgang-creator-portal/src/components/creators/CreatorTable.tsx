// src/components/creators/CreatorTable.tsx

import { CreatorWithCollab } from '@/types';
import { StatusBadge, ProgressDots, StarRating, Button, EmptyStateNoCreators } from '@/components/ui';
import { getTrackingUrl } from '@/lib/tracking';

interface CreatorTableProps {
  creators: CreatorWithCollab[];
  onViewCreator: (id: string) => void;
  onApprove?: (id: string) => void;
  onDeny?: (id: string) => void;
  onReview?: (creator: CreatorWithCollab) => void;
  loading?: boolean;
}

function formatFollowers(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`.replace('.0', '');
  return `${(count / 1000000).toFixed(1)}M`.replace('.0', '');
}

export default function CreatorTable({
  creators,
  onViewCreator,
  onApprove,
  onDeny,
  onReview,
  loading = false,
}: CreatorTableProps) {
  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-16 text-center">
          <div className="inline-flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white/60">Loading creators...</span>
          </div>
        </div>
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        <EmptyStateNoCreators />
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-4">
        {creators.map((creator) => {
          // V2: Get collaboration data (may be undefined)
          const collab = creator.collaboration;
          const status = collab?.status;
          const product = collab?.product;
          const size = collab?.size;
          const trackingNumber = collab?.trackingNumber;
          const carrier = collab?.carrier;
          const contentSubmissions = collab?.contentSubmissions || [];
          const rating = collab?.rating;

          return (
            <div
              key={creator.id}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:bg-white/[0.08] hover:border-orange-500/30 transition-all duration-200"
            >
              {/* Header Row: Avatar, Name, Status */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-lg font-medium text-white/70">
                    {creator.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{creator.fullName}</div>
                    <a 
                      href={`https://tiktok.com/@${creator.tiktokHandle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/50 text-sm hover:text-orange-400 transition-colors"
                    >
                      @{creator.tiktokHandle.replace('@', '')}
                    </a>
                  </div>
                </div>
                {status ? (
                  <StatusBadge status={status} size="sm" />
                ) : (
                  <span className="text-white/30 text-xs bg-white/5 px-2 py-1 rounded">No Collab</span>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <div className="text-white font-semibold text-sm">
                    {formatFollowers(creator.tiktokFollowers)}
                  </div>
                  <div className="text-white/40 text-xs">Followers</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <ProgressDots completed={contentSubmissions.length} total={3} size="sm" />
                  </div>
                  <div className="text-white/40 text-xs mt-1">Content</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  {rating ? (
                    <StarRating rating={rating} size="sm" />
                  ) : (
                    <span className="text-white/30 text-sm">—</span>
                  )}
                  <div className="text-white/40 text-xs mt-1">Rating</div>
                </div>
              </div>

              {/* Product & Tracking Row */}
              <div className="flex items-center justify-between text-sm mb-4 pb-4 border-b border-white/10">
                <div>
                  <span className="text-white/40">Product: </span>
                  {product ? (
                    <span className="text-white/70">{product} ({size})</span>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </div>
                {trackingNumber && (
                  <a
                    href={getTrackingUrl(carrier || 'yanwen', trackingNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 transition-colors font-mono text-xs"
                  >
                    📦 Track
                  </a>
                )}
              </div>

              {/* Collab Info */}
              {collab && (
                <div className="text-xs text-white/40 mb-3">
                  Collab #{collab.collabNumber} • {collab.collabDisplayId}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {status === 'pending' ? (
                  <>
                    {onReview && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onReview(creator)}
                        className="flex-1"
                      >
                        Review
                      </Button>
                    )}
                    {onApprove && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onApprove(creator.id)}
                        className="flex-1"
                      >
                        Approve
                      </Button>
                    )}
                    {onDeny && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeny(creator.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        Deny
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onViewCreator(creator.id)}
                    className="w-full"
                  >
                    View Details
                  </Button>
                )}
              </div>

              {/* Creator ID */}
              <div className="mt-3 text-center">
                <span className="text-white/30 text-xs font-mono">{creator.creatorId}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-white/50 text-xs font-medium uppercase tracking-wider">
                  Creator
                </th>
                <th className="text-left px-6 py-4 text-white/50 text-xs font-medium uppercase tracking-wider">
                  TikTok
                </th>
                <th className="text-left px-6 py-4 text-white/50 text-xs font-medium uppercase tracking-wider">
                  Followers
                </th>
                <th className="text-left px-6 py-4 text-white/50 text-xs font-medium uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-white/50 text-xs font-medium uppercase tracking-wider">
                  Product
                </th>
                <th className="text-left px-6 py-4 text-white/50 text-xs font-medium uppercase tracking-wider">
                  Collab #
                </th>
                <th className="text-left px-6 py-4 text-white/50 text-xs font-medium uppercase tracking-wider">
                  Tracking
                </th>
                <th className="text-left px-6 py-4 text-white/50 text-xs font-medium uppercase tracking-wider">
                  Content
                </th>
                <th className="text-left px-6 py-4 text-white/50 text-xs font-medium uppercase tracking-wider">
                  Rating
                </th>
                <th className="text-left px-6 py-4 text-white/50 text-xs font-medium uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {creators.map((creator) => {
                // V2: Get collaboration data (may be undefined)
                const collab = creator.collaboration;
                const status = collab?.status;
                const product = collab?.product;
                const size = collab?.size;
                const trackingNumber = collab?.trackingNumber;
                const carrier = collab?.carrier;
                const contentSubmissions = collab?.contentSubmissions || [];
                const rating = collab?.rating;

                return (
                  <tr
                    key={creator.id}
                    className="group hover:bg-white/[0.03] transition-colors duration-200"
                  >
                    {/* Creator Name with Avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-sm font-medium text-white/70 group-hover:border-orange-500/30 transition-colors">
                          {creator.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white group-hover:text-orange-100 transition-colors">
                            {creator.fullName}
                          </div>
                          <div className="text-white/40 text-xs mt-0.5 font-mono">
                            {creator.creatorId}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* TikTok Handle */}
                    <td className="px-6 py-4">
                      <a 
                        href={`https://tiktok.com/@${creator.tiktokHandle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/70 hover:text-orange-400 transition-colors text-sm"
                      >
                        @{creator.tiktokHandle.replace('@', '')}
                      </a>
                    </td>

                    {/* Followers */}
                    <td className="px-6 py-4">
                      <span className="text-white/70 text-sm font-medium">
                        {formatFollowers(creator.tiktokFollowers)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {status ? (
                        <StatusBadge status={status} size="sm" />
                      ) : (
                        <span className="text-white/30 text-xs bg-white/5 px-2 py-1 rounded">No Collab</span>
                      )}
                    </td>

                    {/* Product */}
                    <td className="px-6 py-4">
                      {product ? (
                        <>
                          <div className="text-white/70 text-sm">{product}</div>
                          <div className="text-white/40 text-xs">Size {size}</div>
                        </>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>

                    {/* Collab # - NEW COLUMN */}
                    <td className="px-6 py-4">
                      {collab ? (
                        <div className="text-white/70 text-sm font-mono">
                          #{collab.collabNumber}
                        </div>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>

                    {/* Tracking */}
                    <td className="px-6 py-4 text-sm">
                      {trackingNumber ? (
                        <a
                          href={getTrackingUrl(carrier || 'yanwen', trackingNumber)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 transition-colors text-sm font-mono"
                        >
                          {trackingNumber.length > 14
                            ? `${trackingNumber.slice(0, 12)}...`
                            : trackingNumber}
                        </a>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>

                    {/* Content Progress */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ProgressDots
                          completed={contentSubmissions.length}
                          total={3}
                          size="sm"
                        />
                        <span className="text-white/40 text-xs">
                          {contentSubmissions.length}/3
                        </span>
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="px-6 py-4">
                      {rating ? (
                        <StarRating rating={rating} size="sm" />
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {status === 'pending' ? (
                          <>
                            {onReview && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => onReview(creator)}
                              >
                                Review
                              </Button>
                            )}
                            {onApprove && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onApprove(creator.id)}
                              >
                                Approve
                              </Button>
                            )}
                            {onDeny && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeny(creator.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                Deny
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onViewCreator(creator.id)}
                            className="opacity-70 group-hover:opacity-100 transition-opacity"
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}