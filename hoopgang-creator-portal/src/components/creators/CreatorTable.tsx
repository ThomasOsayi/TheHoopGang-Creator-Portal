// src/components/creators/CreatorTable.tsx

import { Creator } from '@/types';
import { StatusBadge, ProgressDots, StarRating, Button } from '@/components/ui';
import { getTrackingUrl } from '@/lib/tracking';

interface CreatorTableProps {
  creators: Creator[];
  onViewCreator: (id: string) => void;
  onApprove?: (id: string) => void;
  onDeny?: (id: string) => void;
  onReview?: (creator: Creator) => void;
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
        <div className="px-6 py-16 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-white/60">No creators found</p>
          <p className="text-white/40 text-sm mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
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
            {creators.map((creator) => (
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

                {/* TikTok Handle - Clickable */}
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
                  <StatusBadge status={creator.status} size="sm" />
                </td>

                {/* Product */}
                <td className="px-6 py-4">
                  <div className="text-white/70 text-sm">{creator.product}</div>
                  <div className="text-white/40 text-xs">Size {creator.size}</div>
                </td>

                {/* Tracking */}
                <td className="px-6 py-4">
                  {creator.trackingNumber ? (
                    <a
                      href={getTrackingUrl(creator.carrier || 'yanwen', creator.trackingNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300 transition-colors text-sm font-mono"
                    >
                      {creator.trackingNumber.length > 14 
                        ? `${creator.trackingNumber.slice(0, 12)}...` 
                        : creator.trackingNumber}
                    </a>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>

                {/* Content Progress */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <ProgressDots
                      completed={creator.contentSubmissions.length}
                      total={3}
                      size="sm"
                    />
                    <span className="text-white/40 text-xs">
                      {creator.contentSubmissions.length}/3
                    </span>
                  </div>
                </td>

                {/* Rating */}
                <td className="px-6 py-4">
                  {creator.rating ? (
                    <StarRating rating={creator.rating} size="sm" />
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {creator.status === 'pending' ? (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}