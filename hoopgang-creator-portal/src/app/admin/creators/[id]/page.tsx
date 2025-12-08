'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Creator, CreatorStatus, Carrier } from '@/types';
import { getCreatorById, updateCreator } from '@/lib/firestore';
import { CREATOR_STATUSES, CARRIERS } from '@/lib/constants';
import { SectionCard, StatusBadge, DetailRow, StarRating, Button, useToast, TrackingStatus, AddTrackingForm } from '@/components/ui';
import { ProtectedRoute } from '@/components/auth';

/**
 * Formats a date to a readable string
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats a date with time
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CreatorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { showToast } = useToast();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedStatus, setEditedStatus] = useState<CreatorStatus | ''>('');
  const [editedTrackingNumber, setEditedTrackingNumber] = useState<string>('');
  const [editedCarrier, setEditedCarrier] = useState<Carrier | ''>('');
  const [editedRating, setEditedRating] = useState<number>(0);
  const [editedNotes, setEditedNotes] = useState<string>('');

  // Fetch creator data
  useEffect(() => {
    if (id) {
      fetchCreator();
    }
  }, [id]);

  const fetchCreator = async () => {
    setLoading(true);
    try {
      const creatorData = await getCreatorById(id);
      if (creatorData) {
        setCreator(creatorData);
        // Populate edited fields with current values
        setEditedStatus(creatorData.status);
        setEditedTrackingNumber(creatorData.trackingNumber || '');
        setEditedCarrier(creatorData.carrier || '');
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

      // Only include changed fields
      if (editedStatus && editedStatus !== creator.status) {
        updateData.status = editedStatus as CreatorStatus;
      }
      if (editedTrackingNumber !== (creator.trackingNumber || '')) {
        updateData.trackingNumber = editedTrackingNumber || undefined;
      }
      if (editedCarrier !== (creator.carrier || '')) {
        updateData.carrier = editedCarrier || undefined;
      }
      if (editedRating !== (creator.rating || 0)) {
        updateData.rating = editedRating || undefined;
      }
      if (editedNotes !== (creator.internalNotes || '')) {
        updateData.internalNotes = editedNotes || undefined;
      }

      if (Object.keys(updateData).length > 0) {
        await updateCreator(creator.id, updateData);
        // Refetch creator data
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

  const inputClasses = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer";
  const textareaClasses = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-colors resize-none";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">
            <p className="text-white/60">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">
            <p className="text-white/60 mb-4">Creator not found</p>
            <Button variant="ghost" onClick={handleBack}>
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

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-8 px-4">
        <div className="max-w-5xl mx-auto">
     
          {/* Back Button */}
          <Button variant="ghost" onClick={handleBack} className="mb-6">
            ← Back to Dashboard
          </Button>

        {/* Header Section */}
        <SectionCard>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-white">{creator.fullName}</h1>
              <p className="text-white/60 text-sm mt-1">
                Applied: {formatDate(creator.createdAt)} • ID: {creator.creatorId}
              </p>
            </div>
            <StatusBadge status={creator.status} />
          </div>
        </SectionCard>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Creator Profile */}
            <SectionCard title="Creator Profile" icon="👤">
              <DetailRow label="Email" value={creator.email} />
              <DetailRow label="Phone" value={creator.phone} />
              <DetailRow
                label="Instagram"
                value={
                  <a
                    href={`https://instagram.com/${creator.instagramHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    @{creator.instagramHandle.replace('@', '')} ({creator.instagramFollowers.toLocaleString()} followers)
                  </a>
                }
              />
              <DetailRow
                label="TikTok"
                value={
                  <a
                    href={`https://tiktok.com/@${creator.tiktokHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    @{creator.tiktokHandle.replace('@', '')} ({creator.tiktokFollowers.toLocaleString()} followers)
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
                    className="text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    View Content
                  </a>
                }
              />
            </SectionCard>

            {/* Application Details */}
            <SectionCard title="Application Details" icon="📦">
              <DetailRow label="Product" value={creator.product} />
              <DetailRow label="Size" value={creator.size} />
              <DetailRow label="Address" value={formattedAddress} />
              <DetailRow label="Why Collab?" value={creator.whyCollab} />
              <DetailRow label="Previous Brands" value={creator.previousBrands ? 'Yes' : 'No'} />
            </SectionCard>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Status & Tracking */}
            <SectionCard title="Status & Tracking" icon="📍">
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-2">Status</label>
                  <select
                    value={editedStatus}
                    onChange={(e) => setEditedStatus(e.target.value as CreatorStatus | '')}
                    className={inputClasses}
                  >
                    {CREATOR_STATUSES.map((status) => (
                      <option key={status.value} value={status.value} className="bg-zinc-900">
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-2">Tracking Number</label>
                  <input
                    type="text"
                    value={editedTrackingNumber}
                    onChange={(e) => setEditedTrackingNumber(e.target.value)}
                    className={inputClasses.replace('appearance-none cursor-pointer', '')}
                    placeholder="Enter tracking number"
                  />
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-2">Carrier</label>
                  <select
                    value={editedCarrier}
                    onChange={(e) => setEditedCarrier(e.target.value as Carrier | '')}
                    className={inputClasses}
                  >
                    <option value="" className="bg-zinc-900">Select carrier</option>
                    {CARRIERS.map((carrier) => (
                      <option key={carrier.value} value={carrier.value} className="bg-zinc-900">
                        {carrier.label}
                      </option>
                    ))}
                  </select>
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

                {/* Shipment Tracking Section */}
                <div className="border-t border-white/10 pt-4 mt-4">
                  <h3 className="text-white font-semibold mb-4">📦 Shipment Tracking</h3>
                  
                  {creator.trackingNumber ? (
                    <TrackingStatus
                      shipment={creator.shipment}
                      trackingNumber={creator.trackingNumber}
                      carrier={creator.carrier}
                      creatorId={creator.id}
                      onRefresh={fetchCreator}
                    />
                  ) : (
                    <AddTrackingForm
                      creatorId={creator.id}
                      onSuccess={fetchCreator}
                    />
                  )}
                </div>

                {/* Delivery Information */}
                {creator.deliveredAt && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mt-4">
                    <p className="text-green-400 text-sm font-medium mb-2">✅ Package Delivered</p>
                    <p className="text-green-300/80 text-sm">
                      Delivery Date: {formatDateTime(creator.deliveredAt)}
                    </p>
                    {creator.contentDeadline && (
                      <p className="text-green-300/80 text-sm mt-1">
                        Content Deadline: {formatDateTime(creator.contentDeadline)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Content Submissions */}
            <SectionCard title="Content Submissions" icon="🎥">
              {[0, 1, 2].map((index) => (
                <DetailRow
                  key={index}
                  label={`TikTok ${index + 1}`}
                  value={
                    creator.contentSubmissions[index] ? (
                      <a
                        href={creator.contentSubmissions[index].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        View Submission
                      </a>
                    ) : (
                      <span className="text-white/30 italic">Not yet submitted</span>
                    )
                  }
                />
              ))}
            </SectionCard>

            {/* Review */}
            <SectionCard title="Review" icon="⭐">
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-2">Rating</label>
                  <StarRating
                    rating={editedRating}
                    editable={true}
                    onChange={setEditedRating}
                    size="lg"
                  />
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-2">Internal Notes</label>
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
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </SectionCard>
          </div>
        </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

