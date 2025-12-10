// src/components/ui/PackageStatusCard.tsx
'use client';

import React from 'react';

interface PackageStatusCardProps {
  collaborationStatus: 'approved' | 'shipped' | 'delivered' | 'completed' | 'ghosted';
  trackingNumber?: string;
  carrier?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
}

// SVG Icons
const PackageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

// Status configuration
const PACKAGE_STATUS_CONFIG = {
  approved: {
    label: 'Preparing to Ship',
    icon: PackageIcon,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20',
    dotColor: 'bg-yellow-400',
    description: "We're getting your gear ready!",
  },
  shipped: {
    label: 'Shipped',
    icon: TruckIcon,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/20',
    dotColor: 'bg-orange-400 animate-pulse',
    description: 'Your package is on its way!',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircleIcon,
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    dotColor: 'bg-green-400',
    description: 'Your gear has arrived!',
  },
  completed: {
    label: 'Delivered',
    icon: CheckCircleIcon,
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    dotColor: 'bg-green-400',
    description: 'Your gear has arrived!',
  },
  ghosted: {
    label: 'Delivered',
    icon: CheckCircleIcon,
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    dotColor: 'bg-green-400',
    description: 'Your gear has arrived!',
  },
};

export default function PackageStatusCard({
  collaborationStatus,
  trackingNumber,
  carrier,
  shippedAt,
  deliveredAt,
}: PackageStatusCardProps) {
  const config = PACKAGE_STATUS_CONFIG[collaborationStatus];
  const Icon = config.icon;

  // Build 17TRACK URL
  const trackingUrl = trackingNumber
    ? `https://t.17track.net/en#nums=${trackingNumber}`
    : null;

  // Format dates
  const formatDate = (date: Date | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
          <PackageIcon />
        </div>
        <h3 className="text-lg font-semibold text-white">Your Package</h3>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor}`}>
          <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-sm mb-6">{config.description}</p>

      {/* Tracking Details (only show if shipped) */}
      {trackingNumber && (
        <div className="space-y-3 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-gray-500 text-sm">Tracking:</span>
            <span className="text-white font-mono text-sm break-all">{trackingNumber}</span>
          </div>
          
          {carrier && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Carrier:</span>
              <span className="text-white text-sm">{carrier}</span>
            </div>
          )}

          {shippedAt && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Shipped:</span>
              <span className="text-gray-300 text-sm">{formatDate(shippedAt)}</span>
            </div>
          )}

          {deliveredAt && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Delivered:</span>
              <span className="text-green-400 text-sm">{formatDate(deliveredAt)}</span>
            </div>
          )}
        </div>
      )}

      {/* Track Package Button */}
      {trackingUrl && (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors"
        >
          Track Package on 17TRACK
          <ExternalLinkIcon />
        </a>
      )}

      {/* No tracking yet message */}
      {!trackingNumber && collaborationStatus === 'approved' && (
        <div className="text-center py-4 px-3 bg-white/5 rounded-xl">
          <p className="text-gray-400 text-sm">
            You'll receive an email with tracking info once your package ships!
          </p>
        </div>
      )}
    </div>
  );
}