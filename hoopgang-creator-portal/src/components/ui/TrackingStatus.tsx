// src/components/ui/TrackingStatus.tsx

'use client';

import { useState, ReactNode } from 'react';
import { ShipmentTracking, ShippingStatus, Carrier, TrackingEvent } from '@/types';
import { getTrackingUrl } from '@/lib/tracking';
import { Button } from './Button';
import { useToast } from './Toast';
import { cn } from '@/lib/utils';

interface TrackingStatusProps {
  shipment?: ShipmentTracking;
  trackingNumber?: string;
  carrier?: Carrier;
  creatorId: string;
  onRefresh?: () => void;
}

interface AddTrackingFormProps {
  creatorId: string;
  onSuccess?: () => void;
}

// Icon components for each status
const StatusIcons = {
  pending: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  transit: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  pickup: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  delivered: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  undelivered: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  exception: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  expired: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// Status configuration mapping
const STATUS_CONFIG: Record<
  ShippingStatus,
  { color: string; bgColor: string; icon: ReactNode; label: string }
> = {
  pending: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    icon: StatusIcons.pending,
    label: 'Pending',
  },
  transit: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: StatusIcons.transit,
    label: 'In Transit',
  },
  pickup: {
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    icon: StatusIcons.pickup,
    label: 'Available for Pickup',
  },
  delivered: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    icon: StatusIcons.delivered,
    label: 'Delivered',
  },
  undelivered: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    icon: StatusIcons.undelivered,
    label: 'Undelivered',
  },
  exception: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    icon: StatusIcons.exception,
    label: 'Exception',
  },
  expired: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    icon: StatusIcons.expired,
    label: 'Expired',
  },
};

const CARRIER_LABELS: Record<Carrier, string> = {
  yanwen: 'Yanwen',
};

/**
 * Formats a date to a readable string
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * TrackingStatus Component
 * Displays tracking information with status, events, and refresh functionality
 */
export default function TrackingStatus({
  shipment,
  trackingNumber,
  carrier,
  creatorId,
  onRefresh,
}: TrackingStatusProps) {
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine current status
  const currentStatus = shipment?.shippingStatus || 'pending';
  const statusConfig = STATUS_CONFIG[currentStatus];
  const displayTrackingNumber = shipment?.trackingNumber || trackingNumber;
  const displayCarrier = shipment?.carrier || carrier;
  const events = shipment?.events || [];
  const lastUpdate = shipment?.lastUpdate || new Date();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/tracking?creatorId=${creatorId}`);
      const data = await response.json();

      if (data.success) {
        showToast('Tracking information updated', 'success');
        if (onRefresh) {
          onRefresh();
        }
      } else {
        showToast(data.error || 'Failed to refresh tracking', 'error');
      }
    } catch (error) {
      console.error('Error refreshing tracking:', error);
      showToast('Failed to refresh tracking', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove tracking information? This cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tracking?creatorId=${creatorId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        showToast('Tracking information removed', 'success');
        if (onRefresh) {
          onRefresh();
        }
      } else {
        showToast(data.error || 'Failed to remove tracking', 'error');
      }
    } catch (error) {
      console.error('Error deleting tracking:', error);
      showToast('Failed to remove tracking', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const trackingUrl = displayTrackingNumber && displayCarrier
    ? getTrackingUrl(displayCarrier, displayTrackingNumber)
    : null;

  // If no tracking info at all, show empty state
  if (!shipment && !trackingNumber) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <p className="text-white/60 text-sm">No tracking information available</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Status Info */}
        <div className="flex items-start gap-3">
          <span className={cn("flex-shrink-0 flex items-center justify-center", statusConfig.color)}>
            {statusConfig.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-sm font-medium px-2.5 py-1 rounded-full', statusConfig.bgColor, statusConfig.color)}>
                {statusConfig.label}
              </span>
            </div>
            {displayTrackingNumber && (
              <p className="text-white/60 text-xs mt-1 break-all">
                Tracking: {displayTrackingNumber}
              </p>
            )}
            {displayCarrier && (
              <p className="text-white/60 text-xs">
                Carrier: {CARRIER_LABELS[displayCarrier]}
              </p>
            )}
            <p className="text-white/40 text-xs mt-1">
              Last updated: {formatDate(lastUpdate)}
            </p>
          </div>
        </div>

        {/* Action Buttons - Wrap on mobile */}
        <div className="flex flex-wrap gap-2">
          {trackingUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(trackingUrl, '_blank')}
              className="flex-1 sm:flex-none min-w-[100px]"
            >
              View on Carrier
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            className="flex-1 sm:flex-none"
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDelete}
            loading={isDeleting}
            className="text-red-400 hover:text-red-300 flex-1 sm:flex-none"
          >
            Remove
          </Button>
        </div>
      </div>

      {/* Estimated Delivery */}
      {shipment?.estimatedDelivery && (
        <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2">
          <p className="text-white/60 text-xs">Estimated Delivery</p>
          <p className="text-white text-sm font-medium">{shipment.estimatedDelivery}</p>
        </div>
      )}

      {/* Events Accordion */}
      {events.length > 0 && (
        <div className="border-t border-white/10 pt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-white/80 hover:text-white transition-colors"
          >
            <span className="text-sm font-medium">
              Tracking Events ({events.length})
            </span>
            <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
          </button>

          {isExpanded && (
            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {events.map((event, index) => (
                <TrackingEventItem key={index} event={event} />
              ))}
            </div>
          )}
        </div>
      )}

      {events.length === 0 && (
        <p className="text-white/40 text-xs italic">No tracking events available</p>
      )}
    </div>
  );
}

/**
 * Individual tracking event item
 */
function TrackingEventItem({ event }: { event: TrackingEvent }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-white text-sm font-medium mb-1">
            {event.description || 'Status update'}
          </p>
          {event.location && (
            <p className="text-white/60 text-xs mb-1">📍 {event.location}</p>
          )}
          {event.date && (
            <p className="text-white/40 text-xs">{formatDate(event.date)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * AddTrackingForm Component
 * Form to add tracking information to a creator
 */
export function AddTrackingForm({ creatorId, onSuccess }: AddTrackingFormProps) {
  const { showToast } = useToast();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState<Carrier>('yanwen');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputClasses = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 transition-colors";
  const selectClasses = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer";
  const labelClasses = "block text-white/60 text-sm mb-2";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trackingNumber.trim()) {
      showToast('Please enter a tracking number', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId,
          trackingNumber: trackingNumber.trim(),
          carrier,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('Tracking information added successfully', 'success');
        setTrackingNumber('');
        setCarrier('yanwen');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        showToast(data.error || 'Failed to add tracking information', 'error');
      }
    } catch (error) {
      console.error('Error adding tracking:', error);
      showToast('Failed to add tracking information', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Add Tracking Information</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="trackingNumber" className={labelClasses}>
            Tracking Number
          </label>
          <input
            id="trackingNumber"
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking number"
            className={inputClasses}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="carrier" className={labelClasses}>
            Carrier
          </label>
          <select
            id="carrier"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value as Carrier)}
            className={selectClasses}
            disabled={isSubmitting}
          >
            <option value="yanwen" className="bg-zinc-900">Yanwen</option>
          </select>
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          loading={isSubmitting}
          className="w-full"
        >
          Add Tracking
        </Button>
      </form>
    </div>
  );
}

