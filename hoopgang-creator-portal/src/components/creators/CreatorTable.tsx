// src/components/creators/CreatorTable.tsx

import { Creator } from '@/types';
import { StatusBadge, ProgressDots, StarRating, Button } from '@/components/ui';

interface CreatorTableProps {
  creators: Creator[];
  onViewCreator: (id: string) => void;
  onApprove?: (id: string) => void;
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
 * Generates tracking URL based on carrier
 */
function getTrackingUrl(trackingNumber: string, carrier?: string): string {
  if (!carrier) {
    // Default to USPS if no carrier specified
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  }

  switch (carrier) {
    case 'USPS':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    case 'UPS':
      return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    case 'FedEx':
      return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    case 'DHL':
      return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
    default:
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  }
}

export default function CreatorTable({
  creators,
  onViewCreator,
  onApprove,
  loading = false,
}: CreatorTableProps) {
  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        <div className="w-full">
          <div className="px-6 py-12 text-center">
            <p className="text-white/60">Loading creators...</p>
          </div>
        </div>
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        <div className="w-full">
          <div className="px-6 py-12 text-center">
            <p className="text-white/60">No creators found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-6 py-4 text-white/60 text-xs font-semibold uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-6 py-4 text-white/60 text-xs font-semibold uppercase tracking-wider">
                TikTok
              </th>
              <th className="text-left px-6 py-4 text-white/60 text-xs font-semibold uppercase tracking-wider">
                Followers
              </th>
              <th className="text-left px-6 py-4 text-white/60 text-xs font-semibold uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-4 text-white/60 text-xs font-semibold uppercase tracking-wider">
                Product
              </th>
              <th className="text-left px-6 py-4 text-white/60 text-xs font-semibold uppercase tracking-wider">
                Tracking
              </th>
              <th className="text-left px-6 py-4 text-white/60 text-xs font-semibold uppercase tracking-wider">
                Content
              </th>
              <th className="text-left px-6 py-4 text-white/60 text-xs font-semibold uppercase tracking-wider">
                Rating
              </th>
              <th className="text-left px-6 py-4 text-white/60 text-xs font-semibold uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {creators.map((creator) => (
              <tr
                key={creator.id}
                className="border-t border-white/10 hover:bg-white/5 transition-colors"
              >
                <td className="px-6 py-4 text-sm">
                  <div className="font-medium text-white">{creator.fullName}</div>
                  <div className="text-white/50 text-xs mt-0.5">{creator.creatorId}</div>
                </td>
                <td className="px-6 py-4 text-sm text-white/70">
                  @{creator.tiktokHandle.replace('@', '')}
                </td>
                <td className="px-6 py-4 text-sm text-white/70">
                  {formatFollowers(creator.tiktokFollowers)}
                </td>
                <td className="px-6 py-4 text-sm">
                  <StatusBadge status={creator.status} size="sm" />
                </td>
                <td className="px-6 py-4 text-sm text-white/70">
                  {creator.product} ({creator.size})
                </td>
                <td className="px-6 py-4 text-sm">
                  {creator.trackingNumber ? (
                    <a
                      href={getTrackingUrl(creator.trackingNumber, creator.carrier)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      {creator.trackingNumber}
                    </a>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <ProgressDots
                    completed={creator.contentSubmissions.length}
                    total={3}
                    size="sm"
                  />
                </td>
                <td className="px-6 py-4 text-sm">
                  {creator.rating ? (
                    <StarRating rating={creator.rating} size="sm" />
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  {creator.status === 'pending' && onApprove ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onApprove(creator.id)}
                    >
                      Approve
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onViewCreator(creator.id)}
                    >
                      View
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

