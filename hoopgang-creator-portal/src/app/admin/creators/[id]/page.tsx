// src/app/admin/creators/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Creator, CreatorStatus } from '@/types';
import { getCreatorById, updateCreator } from '@/lib/firestore';
import { CREATOR_STATUSES } from '@/lib/constants';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  SectionCard,
  StatusBadge,
  DetailRow,
  StarRating,
  Button,
  useToast,
  TrackingStatus,
  AddTrackingForm,
} from '@/components/ui';
import { ProtectedRoute } from '@/components/auth';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFollowers(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`.replace('.0', '');
  return `${(count / 1000000).toFixed(1)}M`.replace('.0', '');
}

export default function CreatorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { showToast } = useToast();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMarkingDelivered, setIsMarkingDelivered] = useState(false);
  const [editedStatus, setEditedStatus] = useState<CreatorStatus | ''>('');
  const [editedRating, setEditedRating] = useState<number>(0);
  const [editedNotes, setEditedNotes] = useState<string>('');

  useEffect(() => {
    if (id) fetchCreator();
  }, [id]);

  const fetchCreator = async () => {
    setLoading(true);
    try {
      const creatorData = await getCreatorById(id);
      if (creatorData) {
        setCreator(creatorData);
        setEditedStatus(creatorData.status);
        setEditedRating(creatorData.rating || 0);
        setEditedNotes(creatorData.internalNotes || '');
      }
    } catch (error) {
      console.error('Error fetching creator:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!creator) return;

    setSaving(true);
    try {
      const updateData: Partial<Creator> = {};
      const statusChanged = editedStatus && editedStatus !== creator.status;
      const newStatus = statusChanged ? editedStatus as CreatorStatus : null;

      if (statusChanged) {
        updateData.status = newStatus!;
      }
      if (editedRating !== (creator.rating || 0)) {
        updateData.rating = editedRating || undefined;
      }
      if (editedNotes !== (creator.internalNotes || '')) {
        updateData.internalNotes = editedNotes || undefined;
      }

      if (Object.keys(updateData).length > 0) {
        await updateCreator(creator.id, updateData);
        
        // Send emails for status changes
        if (statusChanged && newStatus) {
          try {
            const firstName = creator.fullName.split(' ')[0];
            
            if (newStatus === 'approved') {
              await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'approved',
                  to: creator.email,
                  creatorName: firstName || creator.instagramHandle,
                  instagramHandle: creator.instagramHandle.replace('@', ''),
                }),
              });
            }
            // Note: Shipped emails are now sent automatically by the tracking API
          } catch (emailError) {
            console.error('Error sending status change email:', emailError);
            // Don't fail the whole operation if email fails
          }
        }
        
        await fetchCreator();
        showToast('Changes saved!', 'success');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push('/admin/creators');
  };

  const handleMarkDelivered = async () => {
    if (!creator || creator.status !== 'shipped') return;

    const confirmed = window.confirm(
      'Mark this package as delivered? This will start the 14-day content deadline countdown.'
    );

    if (!confirmed) return;

    setIsMarkingDelivered(true);

    try {
      const now = new Date();
      const contentDeadline = new Date(now);
      contentDeadline.setDate(contentDeadline.getDate() + 14);

      await updateDoc(doc(db, 'creators', creator.id), {
        status: 'delivered',
        deliveredAt: now,
        contentDeadline: contentDeadline,
        updatedAt: now,
      });

      // Send delivery email
      try {
        const firstName = creator.fullName.split(' ')[0];
        await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'delivered',
            to: creator.email,
            creatorName: firstName || creator.instagramHandle,
            contentDeadline: contentDeadline,
          }),
        });
      } catch (emailError) {
        console.error('Error sending delivery email:', emailError);
        // Don't fail the whole operation if email fails
      }

      // Refresh creator data
      setCreator({
        ...creator,
        status: 'delivered',
        deliveredAt: now,
        contentDeadline: contentDeadline,
      });

      setEditedStatus('delivered');
      showToast('Package marked as delivered!', 'success');
    } catch (error) {
      console.error('Error marking as delivered:', error);
      showToast('Failed to mark as delivered. Please try again.', 'error');
    } finally {
      setIsMarkingDelivered(false);
    }
  };

  const inputClasses =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent hover:bg-white/[0.08] transition-all cursor-pointer appearance-none';
  const textareaClasses =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent hover:bg-white/[0.08] transition-all resize-none';

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-8 px-4 relative overflow-hidden">
        {/* Background Orbs */}
        <div className="fixed top-20 right-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-40 left-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-16 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-white/60">Loading creator details...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!creator) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-8 px-4 relative overflow-hidden">
        {/* Background Orbs */}
        <div className="fixed top-20 right-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-40 left-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-16 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-white/60 text-lg mb-2">Creator not found</p>
            <p className="text-white/40 text-sm mb-6">
              This creator may have been deleted or the ID is invalid.
            </p>
            <Button variant="secondary" onClick={handleBack}>
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Format shipping address
  const formattedAddress = [
    creator.shippingAddress.street,
    creator.shippingAddress.unit,
    creator.shippingAddress.city,
    `${creator.shippingAddress.state} ${creator.shippingAddress.zipCode}`,
  ]
    .filter(Boolean)
    .join(', ');

  // Calculate days since application
  const daysSinceApply = Math.floor(
    (Date.now() - creator.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-8 px-4 relative overflow-hidden">
        {/* Background Gradient Orbs */}
        <div className="fixed top-20 right-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-40 left-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed top-1/2 right-1/3 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="group flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>Back to Dashboard</span>
          </button>

          {/* Header Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              {/* Creator Info */}
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-2xl font-bold text-white/70">
                  {creator.fullName.charAt(0).toUpperCase()}
                </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{creator.fullName}</h1>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="text-white/40 text-sm font-mono">{creator.creatorId}</span>
                    <span className="text-white/20">•</span>
                    <span className="text-white/50 text-sm">
                      Applied {formatDate(creator.createdAt)}
                    </span>
                    <span className="text-white/20">•</span>
                    <span className="text-white/40 text-sm">{daysSinceApply} days ago</span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <StatusBadge status={creator.status} />
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className={`grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10 ${
              creator.height || creator.weight ? 'sm:grid-cols-5' : 'sm:grid-cols-4'
            }`}>
              <div className="text-center">
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">TikTok</div>
                <div className="text-white font-semibold">
                  {formatFollowers(creator.tiktokFollowers)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Instagram</div>
                <div className="text-white font-semibold">
                  {formatFollowers(creator.instagramFollowers)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Content</div>
                <div className="text-white font-semibold">
                  {creator.contentSubmissions.length}/3
                </div>
              </div>
              <div className="text-center">
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Rating</div>
                <div className="text-white font-semibold">
                  {creator.rating ? `${creator.rating}/5` : '—'}
                </div>
              </div>
              {/* Fit Info */}
              {(creator.height || creator.weight) && (
                <div className="text-center">
                  <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Fit</div>
                  <div className="text-white font-semibold text-sm">
                    {creator.height || '—'} / {creator.weight || '—'}
                  </div>
                </div>
              )}
            </div>
          </div>

        {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
            {/* Left Column - 3/5 */}
            <div className="lg:col-span-3 space-y-6">
            {/* Creator Profile */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-xl">👤</span>
                  <h2 className="text-lg font-semibold text-white">Creator Profile</h2>
                </div>
                <div className="space-y-1">
              <DetailRow label="Email" value={creator.email} />
                  <DetailRow
                    label="TikTok"
                    value={
                      <a
                        href={`https://tiktok.com/@${creator.tiktokHandle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300 transition-colors inline-flex items-center gap-2"
                      >
                        @{creator.tiktokHandle.replace('@', '')}
                        <span className="text-white/40 text-sm">
                          ({formatFollowers(creator.tiktokFollowers)} followers)
                        </span>
                      </a>
                    }
                  />
              <DetailRow
                label="Instagram"
                value={
                  <a
                    href={`https://instagram.com/${creator.instagramHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300 transition-colors inline-flex items-center gap-2"
                      >
                        @{creator.instagramHandle.replace('@', '')}
                        <span className="text-white/40 text-sm">
                          ({formatFollowers(creator.instagramFollowers)} followers)
                        </span>
                  </a>
                }
              />
              <DetailRow
                label="Best Content"
                value={
                  <a
                    href={creator.bestContentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300 transition-colors inline-flex items-center gap-1"
                  >
                    View Content
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                  </a>
                }
              />
                </div>
                
                {/* Fit Info (if provided) */}
                {(creator.height || creator.weight) && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <h3 className="text-white/50 text-xs uppercase tracking-wider mb-3">Fit Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-white/40 text-xs">Height</span>
                        <p className="text-white font-medium">{creator.height || '—'}</p>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Weight</span>
                        <p className="text-white font-medium">{creator.weight || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            {/* Application Details */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-xl">📦</span>
                  <h2 className="text-lg font-semibold text-white">Application Details</h2>
                </div>
                <div className="space-y-1">
                  <DetailRow
                    label="Product"
                    value={
                      <span className="inline-flex items-center gap-2">
                        {creator.product}
                        <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/60">
                          Size {creator.size}
                        </span>
                      </span>
                    }
                  />
                  <DetailRow label="Shipping Address" value={formattedAddress} />
                  <DetailRow
                    label="Why Collab?"
                    value={
                      <span className="text-white/70 leading-relaxed">{creator.whyCollab}</span>
                    }
                  />
                  <DetailRow
                    label="Previous Brands"
                    value={
                      creator.previousBrands ? (
                        <span className="text-green-400">Yes</span>
                      ) : (
                        <span className="text-white/40">No</span>
                      )
                    }
                  />
                </div>
              </div>

              {/* Content Submissions */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎥</span>
                    <h2 className="text-lg font-semibold text-white">Content Submissions</h2>
                  </div>
                  <span className="text-white/40 text-sm">
                    {creator.contentSubmissions.length}/3 submitted
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${(creator.contentSubmissions.length / 3) * 100}%` }}
                  />
                </div>

                <div className="space-y-3">
                  {[0, 1, 2].map((index) => {
                    const submission = creator.contentSubmissions[index];
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                          submission
                            ? 'bg-green-500/5 border-green-500/20'
                            : 'bg-white/[0.02] border-white/5'
                        }`}
                      >
                        {/* Number Badge */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            submission
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-white/10 text-white/30'
                          }`}
                        >
                          {submission ? '✓' : index + 1}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white/80">
                            TikTok Video {index + 1}
                          </div>
                          {submission ? (
                            <a
                              href={submission.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-400 hover:text-orange-300 text-sm truncate block transition-colors"
                            >
                              {submission.url}
                            </a>
                          ) : (
                            <span className="text-white/30 text-sm italic">
                              Not yet submitted
                            </span>
                          )}
                        </div>

                        {/* Submitted Date */}
                        {submission && (
                          <div className="text-white/40 text-xs">
                            {formatDate(submission.submittedAt)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - 2/5 */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status & Actions */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-xl">⚙️</span>
                  <h2 className="text-lg font-semibold text-white">Status & Actions</h2>
          </div>

              <div className="space-y-4">
                  {/* Status Dropdown */}
                <div>
                    <label className="block text-white/50 text-xs uppercase tracking-wider mb-2">
                      Status
                    </label>
                    <div className="relative">
                  <select
                    value={editedStatus}
                    onChange={(e) => setEditedStatus(e.target.value as CreatorStatus | '')}
                    className={inputClasses}
                  >
                    {CREATOR_STATUSES.map((status) => (
                          <option 
                            key={status.value} 
                            value={status.value} 
                            className="bg-zinc-900"
                            disabled={status.value === 'delivered'} // Use Mark Delivered button instead
                          >
                            {status.label} {status.value === 'delivered' ? '(Use Mark Delivered button)' : ''}
                      </option>
                    ))}
                  </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                </div>
                </div>
                </div>

                <Button
                  variant="primary"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  loading={saving}
                  className="w-full"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                </div>
              </div>

              {/* Shipment Tracking */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-xl">📦</span>
                  <h2 className="text-lg font-semibold text-white">Shipment Tracking</h2>
                </div>

                {creator.trackingNumber ? (
                  <TrackingStatus
                    shipment={creator.shipment}
                    trackingNumber={creator.trackingNumber}
                    carrier={creator.carrier}
                    creatorId={creator.id}
                    onRefresh={fetchCreator}
                  />
                ) : (
                  <AddTrackingForm creatorId={creator.id} onSuccess={fetchCreator} />
                )}

                {/* Mark Delivered Button - only show when status is 'shipped' */}
                {creator.status === 'shipped' && (
                  <button
                    onClick={handleMarkDelivered}
                    disabled={isMarkingDelivered}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors mt-4"
                  >
                    {isMarkingDelivered ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Marking...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Mark as Delivered
                      </>
                    )}
                  </button>
                )}

                {/* Delivery Info - show when delivered */}
                {['delivered', 'completed', 'ghosted'].includes(creator.status) && creator.deliveredAt && (
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Package Delivered</span>
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>
                        Delivered on:{' '}
                        <span className="text-white">
                          {new Date(creator.deliveredAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </p>
                      {creator.contentDeadline && creator.status === 'delivered' && (
                        <p>
                          Content deadline:{' '}
                          <span className={`font-medium ${
                            new Date(creator.contentDeadline) < new Date() 
                              ? 'text-red-400' 
                              : 'text-orange-400'
                          }`}>
                            {new Date(creator.contentDeadline).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                            {' '}
                            ({Math.ceil((new Date(creator.contentDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining)
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

            {/* Review */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-xl">⭐</span>
                  <h2 className="text-lg font-semibold text-white">Review</h2>
                </div>

              <div className="space-y-4">
                  {/* Rating */}
                <div>
                    <label className="block text-white/50 text-xs uppercase tracking-wider mb-3">
                      Creator Rating
                    </label>
                  <StarRating
                    rating={editedRating}
                    editable={true}
                    onChange={setEditedRating}
                    size="lg"
                  />
                </div>

                  {/* Notes */}
                <div>
                    <label className="block text-white/50 text-xs uppercase tracking-wider mb-2">
                      Internal Notes
                    </label>
                  <textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Leave notes about this creator's performance..."
                    rows={4}
                    className={textareaClasses}
                  />
                </div>

                <Button
                  variant="primary"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  loading={saving}
                  className="w-full"
                >
                    {saving ? 'Saving...' : 'Save Review'}
                </Button>
                </div>
              </div>
            </div>
        </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}