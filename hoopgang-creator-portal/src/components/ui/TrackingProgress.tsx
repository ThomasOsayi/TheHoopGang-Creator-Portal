// src/components/ui/TrackingProgress.tsx

'use client';

import { ShippingStatus, Carrier } from '@/types';
import { getTrackingUrl } from '@/lib/tracking';
import { cn } from '@/lib/utils';

interface TrackingProgressProps {
  currentStatus: ShippingStatus;
  trackingNumber?: string;
  carrier?: Carrier;
  lastUpdate?: Date | string;
}

interface Stage {
  icon: string;
  label: string;
  index: number;
}

const STAGES: Stage[] = [
  { icon: '📦', label: 'Shipped', index: 0 },
  { icon: '✈️', label: 'In Transit', index: 1 },
  { icon: '📋', label: 'Customs', index: 2 },
  { icon: '🚚', label: 'Out for Delivery', index: 3 },
  { icon: '✅', label: 'Delivered', index: 4 },
];

/**
 * Maps ShippingStatus to stage index
 */
function getStageIndex(status: ShippingStatus): number {
  switch (status) {
    case 'pending':
      return 0; // Shipped
    case 'transit':
      return 1; // In Transit (could also be 2 for Customs, but default to 1)
    case 'pickup':
      return 3; // Out for Delivery
    case 'delivered':
      return 4; // Delivered
    case 'undelivered':
    case 'exception':
    case 'expired':
      // For exceptions, show at the current stage but with warning styling
      return -1; // Special case for exceptions
    default:
      return 0;
  }
}

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
 * TrackingProgress Component
 * Horizontal visual stepper for shipping progress
 */
export default function TrackingProgress({
  currentStatus,
  trackingNumber,
  carrier,
  lastUpdate,
}: TrackingProgressProps) {
  const currentStageIndex = getStageIndex(currentStatus);
  const isException = currentStatus === 'exception' || currentStatus === 'undelivered' || currentStatus === 'expired';
  
  // For exceptions, show warning state but don't progress
  const displayStageIndex = isException ? Math.max(0, currentStageIndex) : currentStageIndex;

  const trackingUrl = trackingNumber && carrier ? getTrackingUrl(carrier, trackingNumber) : null;

  return (
    <div className="w-full">
      {/* Stepper */}
      <div className="relative">
        {/* Mobile: Vertical Layout */}
        <div className="block md:hidden space-y-4">
          {STAGES.map((stage, index) => {
            const isCompleted = index < displayStageIndex;
            const isCurrent = index === displayStageIndex && !isException;
            const isExceptionStage = index === displayStageIndex && isException;
            const isFuture = index > displayStageIndex;

            return (
              <div key={stage.index} className="flex items-center gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 transition-all',
                    isCompleted && 'bg-green-500',
                    isCurrent && 'bg-orange-500 ring-4 ring-orange-500/50 animate-pulse',
                    isExceptionStage && 'bg-red-500 ring-4 ring-red-500/50',
                    isFuture && 'bg-white/20 text-gray-500'
                  )}
                >
                  {stage.icon}
                </div>
                
                {/* Label */}
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      (isCompleted || isCurrent) && 'text-white',
                      isExceptionStage && 'text-red-400',
                      isFuture && 'text-gray-500'
                    )}
                  >
                    {stage.label}
                  </p>
                  {isCurrent && !isException && (
                    <p className="text-xs text-orange-400 mt-0.5">In Progress</p>
                  )}
                  {isExceptionStage && (
                    <p className="text-xs text-red-400 mt-0.5">Exception</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Horizontal Layout */}
        <div className="hidden md:flex items-center justify-between relative">
          {STAGES.map((stage, index) => {
            const isCompleted = index < displayStageIndex;
            const isCurrent = index === displayStageIndex && !isException;
            const isExceptionStage = index === displayStageIndex && isException;
            const isFuture = index > displayStageIndex;
            const isLast = index === STAGES.length - 1;

            return (
              <div key={stage.index} className="flex-1 flex flex-col items-center relative">
                {/* Stage Icon and Label */}
                <div className="flex flex-col items-center z-10">
                  {/* Icon */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 transition-all',
                      isCompleted && 'bg-green-500',
                      isCurrent && 'bg-orange-500 ring-4 ring-orange-500/50 animate-pulse',
                      isExceptionStage && 'bg-red-500 ring-4 ring-red-500/50',
                      isFuture && 'bg-white/20 text-gray-500'
                    )}
                  >
                    {stage.icon}
                  </div>
                  
                  {/* Label */}
                  <p
                    className={cn(
                      'text-xs font-medium text-center',
                      (isCompleted || isCurrent) && 'text-white',
                      isExceptionStage && 'text-red-400',
                      isFuture && 'text-gray-500'
                    )}
                  >
                    {stage.label}
                  </p>
                  {isCurrent && !isException && (
                    <p className="text-xs text-orange-400 mt-1">In Progress</p>
                  )}
                  {isExceptionStage && (
                    <p className="text-xs text-red-400 mt-1">Exception</p>
                  )}
                </div>

                {/* Connector Line (between stages) */}
                {!isLast && (
                  <div
                    className={cn(
                      'absolute top-6 left-[60%] w-full h-1 -z-0',
                      isCompleted ? 'bg-green-500' : 'bg-white/20'
                    )}
                    style={{ width: 'calc(100% - 3rem)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
        {trackingNumber && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-white/60">Tracking Number:</span>
              <span className="text-white ml-2 font-mono">{trackingNumber}</span>
            </div>
            
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 transition-colors underline"
              >
                Track Package →
              </a>
            )}
          </div>
        )}

        {lastUpdate && (
          <div className="text-sm">
            <span className="text-white/60">Last Updated:</span>
            <span className="text-white/80 ml-2">{formatDate(lastUpdate)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

