// src/app/admin/creators/[id]/page.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CreatorWithCollab, CollaborationStatus, Collaboration } from '@/types';
import { 
  getCreatorWithActiveCollab, 
  updateCollaboration,
  getCollaborationsByCreatorId,
} from '@/lib/firestore';
import { CREATOR_STATUSES } from '@/lib/constants';
import {
  StatusBadge,
  StarRating,
  useToast,
  TrackingStatus,
  AddTrackingForm,
  AnimatedCounter,
  SuccessAnimation,
  ConfirmModal,
} from '@/components/ui';
import { ProtectedRoute } from '@/components/auth';

// ============================================
// Helper Functions
// ============================================

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatFollowers(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${Math.round(count / 1000)}K`;
  return `${(count / 1000000).toFixed(1)}M`.replace('.0', '');
}

// ============================================
// Progress Ring Component
// ============================================

function ProgressRing({ progress, size = 48, strokeWidth = 4 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-zinc-800"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={progress >= 100 ? 'stroke-green-500' : 'stroke-orange-500'}
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
    </svg>
  );
}

// ============================================
// Mini Stat Card Component
// ============================================

function MiniStatCard({ icon, label, value, subValue, color = 'white' }: {
  icon: string;
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'white' | 'orange' | 'green' | 'purple' | 'blue';
}) {
  const colors = {
    white: 'text-white',
    orange: 'text-orange-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
  };
  
  return (
    <div className="text-center p-4 bg-zinc-800/30 border border-zinc-800 rounded-xl hover:bg-zinc-800/50 transition-colors">
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-xl font-bold ${colors[color]}`}>
        {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
      </div>
      <div className="text-zinc-500 text-xs">{label}</div>
      {subValue && <div className="text-zinc-400 text-xs mt-0.5">{subValue}</div>}
    </div>
  );
}

// ============================================
// Section Card Component
// ============================================

function SectionCard({ icon, title, children, action }: {
  icon: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ============================================
// Quick Action Button Component
// ============================================

function QuickActionButton({ icon, label, onClick, variant = 'default', disabled, loading }: {
  icon: string;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const variants = {
    default: 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700',
    primary: 'bg-orange-500 text-white hover:bg-orange-600',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${variants[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <span>{icon}</span>
      )}
      {label}
    </button>
  );
}

// ============================================
// Collaboration Pill Component
// ============================================

function CollabPill({ collab, isActive, onClick }: {
  collab: Collaboration;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
        isActive 
          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' 
          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
      }`}
    >
      #{collab.collabNumber} - {collab.product}
      {collab.id === collab.id && isActive && (
        <span className="ml-2 text-xs opacity-75">(Active)</span>
      )}
    </button>
  );
}

// ============================================
// Timeline Item Component
// ============================================

function TimelineItem({ date, title, description, status, isLast }: {
  date: string;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming';
  isLast?: boolean;
}) {
  const statusColors = {
    completed: 'bg-green-500',
    current: 'bg-orange-500 animate-pulse',
    upcoming: 'bg-zinc-700',
  };
  
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
        {!isLast && <div className="w-0.5 flex-1 bg-zinc-800 my-1 min-h-[20px]" />}
      </div>
      <div className="pb-4">
        <div className="text-zinc-500 text-xs">{date}</div>
        <div className="text-white font-medium">{title}</div>
        {description && <div className="text-zinc-400 text-sm mt-0.5">{description}</div>}
      </div>
    </div>
  );
}

// ============================================
// Content Submission Card Component
// ============================================

function ContentSubmissionCard({ index, submission, isCompleted }: {
  index: number;
  submission?: { url: string; submittedAt: Date; views?: number };
  isCompleted: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
      isCompleted 
        ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/30' 
        : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600'
    }`}>
      {/* Number/Check Badge */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
        isCompleted 
          ? 'bg-green-500/20 text-green-400' 
          : 'bg-zinc-700 text-zinc-400'
      }`}>
        {isCompleted ? '✓' : index + 1}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium">TikTok Video {index + 1}</div>
        {isCompleted && submission ? (
          <a 
            href={submission.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 text-sm truncate block transition-colors"
          >
            {submission.url}
          </a>
        ) : (
          <span className="text-zinc-500 text-sm italic">Awaiting submission...</span>
        )}
      </div>
      
      {/* Date/Views */}
      {isCompleted && submission && (
        <div className="text-right">
          <div className="text-zinc-400 text-sm">{formatShortDate(submission.submittedAt)}</div>
          {submission.views && (
            <div className="text-green-400 text-xs">{formatFollowers(submission.views)} views</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function CreatorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { showToast } = useToast();

  // Data state
  const [creator, setCreator] = useState<CreatorWithCollab | null>(null);
  const [allCollaborations, setAllCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMarkingDelivered, setIsMarkingDelivered] = useState(false);
  
  // Edit state
  const [editedStatus, setEditedStatus] = useState<CollaborationStatus | ''>('');
  const [editedRating, setEditedRating] = useState<number>(0);
  const [editedNotes, setEditedNotes] = useState<string>('');
  
  // Selected collaboration
  const [selectedCollabId, setSelectedCollabId] = useState<string | null>(null);

  // Modal state
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  
  // Success animation
  const [successAnimation, setSuccessAnimation] = useState<{ icon: string; message: string } | null>(null);

  // ============================================
  // Data Fetching
  // ============================================

  useEffect(() => {
    if (id) fetchCreator();
  }, [id]);

  const fetchCreator = async () => {
    setLoading(true);
    try {
      const creatorData = await getCreatorWithActiveCollab(id);
      
      if (creatorData) {
        setCreator(creatorData);
        
        // Load all collaborations for history
        const collabs = await getCollaborationsByCreatorId(id);
        setAllCollaborations(collabs);
        
        // Set initial selected collaboration (active or most recent)
        const activeCollab = creatorData.collaboration;
        if (activeCollab) {
          setSelectedCollabId(activeCollab.id);
          setEditedStatus(activeCollab.status);
          setEditedRating(activeCollab.rating || 0);
          setEditedNotes(activeCollab.internalNotes || '');
        } else if (collabs.length > 0) {
          setSelectedCollabId(collabs[0].id);
          setEditedStatus(collabs[0].status);
          setEditedRating(collabs[0].rating || 0);
          setEditedNotes(collabs[0].internalNotes || '');
        }
      }
    } catch (error) {
      console.error('Error fetching creator:', error);
      showToast('Failed to load creator', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get selected collaboration
  const selectedCollab = selectedCollabId 
    ? allCollaborations.find(c => c.id === selectedCollabId) || creator?.collaboration
    : creator?.collaboration;

  // Handle collaboration switch
  const handleCollabChange = (collabId: string) => {
    const collab = allCollaborations.find(c => c.id === collabId);
    if (collab) {
      setSelectedCollabId(collabId);
      setEditedStatus(collab.status);
      setEditedRating(collab.rating || 0);
      setEditedNotes(collab.internalNotes || '');
    }
  };

  // ============================================
  // Build Activity Timeline
  // ============================================

  const timeline = useMemo(() => {
    if (!selectedCollab || !creator) return [];
    
    const items: { date: string; title: string; description?: string; status: 'completed' | 'current' | 'upcoming'; sortDate: Date }[] = [];
    
    // Application/Collab start
    items.push({
      date: formatDate(selectedCollab.createdAt),
      title: 'Collaboration Started',
      description: `Collab #${selectedCollab.collabNumber}`,
      status: 'completed',
      sortDate: selectedCollab.createdAt,
    });
    
    // Approved
    if (['approved', 'shipped', 'delivered', 'completed'].includes(selectedCollab.status)) {
      items.push({
        date: formatDate(selectedCollab.createdAt),
        title: 'Application Approved',
        description: `${selectedCollab.product} (${selectedCollab.size})`,
        status: 'completed',
        sortDate: new Date(selectedCollab.createdAt.getTime() + 1000),
      });
    }
    
    // Shipped
    if (selectedCollab.shippedAt) {
      items.push({
        date: formatDate(selectedCollab.shippedAt),
        title: 'Product Shipped',
        description: selectedCollab.trackingNumber ? `Tracking: ${selectedCollab.trackingNumber}` : undefined,
        status: 'completed',
        sortDate: selectedCollab.shippedAt,
      });
    }
    
    // Delivered
    if (selectedCollab.deliveredAt) {
      items.push({
        date: formatDate(selectedCollab.deliveredAt),
        title: 'Package Delivered',
        description: 'Confirmed via tracking',
        status: 'completed',
        sortDate: selectedCollab.deliveredAt,
      });
    }
    
    // Content submissions
    selectedCollab.contentSubmissions.forEach((sub, idx) => {
      items.push({
        date: formatDate(sub.submittedAt),
        title: `Video ${idx + 1} Submitted`,
        description: sub.views ? `${formatFollowers(sub.views)} views` : undefined,
        status: 'completed',
        sortDate: sub.submittedAt,
      });
    });
    
    // Content deadline (if delivered and not completed)
    if (selectedCollab.contentDeadline && selectedCollab.status === 'delivered') {
      const remaining = Math.ceil((new Date(selectedCollab.contentDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      items.push({
        date: formatDate(selectedCollab.contentDeadline),
        title: 'Content Deadline',
        description: `${3 - selectedCollab.contentSubmissions.length} video${3 - selectedCollab.contentSubmissions.length !== 1 ? 's' : ''} remaining`,
        status: remaining > 0 ? 'current' : 'upcoming',
        sortDate: selectedCollab.contentDeadline,
      });
    }
    
    // Completed
    if (selectedCollab.status === 'completed' && selectedCollab.completedAt) {
      items.push({
        date: formatDate(selectedCollab.completedAt),
        title: 'Collaboration Completed',
        description: '✓ All content submitted',
        status: 'completed',
        sortDate: selectedCollab.completedAt,
      });
    }
    
    // Sort by date
    return items.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
  }, [selectedCollab, creator]);

  // ============================================
  // Actions
  // ============================================

  const handleBack = () => {
    router.push('/admin/creators');
  };

  const handleSaveChanges = async () => {
    if (!creator || !selectedCollab) return;

    setSaving(true);
    try {
      const updateData: Partial<Collaboration> = {};
      const statusChanged = editedStatus && editedStatus !== selectedCollab.status;
      const newStatus = statusChanged ? editedStatus as CollaborationStatus : null;

      if (statusChanged) {
        updateData.status = newStatus!;
      }
      if (editedRating !== (selectedCollab.rating || 0)) {
        updateData.rating = editedRating || undefined;
      }
      if (editedNotes !== (selectedCollab.internalNotes || '')) {
        updateData.internalNotes = editedNotes || undefined;
      }

      // Auto-complete when saving a rating if all content is submitted
      const isRatingBeingSaved = editedRating > 0 && editedRating !== (selectedCollab.rating || 0);
      const allContentSubmitted = selectedCollab.contentSubmissions.length >= 3;
      const isDelivered = selectedCollab.status === 'delivered';
      
      if (isRatingBeingSaved && allContentSubmitted && isDelivered && !statusChanged) {
        updateData.status = 'completed';
        updateData.completedAt = new Date();
      }

      if (Object.keys(updateData).length > 0) {
        await updateCollaboration(creator.id, selectedCollab.id, updateData);
        
        // Send emails for status changes
        if (statusChanged && newStatus === 'approved') {
          try {
            const firstName = creator.fullName.split(' ')[0];
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
          } catch (emailError) {
            console.error('Error sending approval email:', emailError);
          }
        }
        
        await fetchCreator();
        setSuccessAnimation({ icon: '✅', message: 'Changes Saved!' });
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!creator || !selectedCollab || selectedCollab.status !== 'shipped') return;

    setIsMarkingDelivered(true);
    try {
      const now = new Date();
      const contentDeadline = new Date(now);
      contentDeadline.setDate(contentDeadline.getDate() + 14);

      await updateCollaboration(creator.id, selectedCollab.id, {
        status: 'delivered',
        deliveredAt: now,
        contentDeadline: contentDeadline,
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
      }

      await fetchCreator();
      setEditedStatus('delivered');
      setSuccessAnimation({ icon: '📦', message: 'Marked as Delivered!' });
    } catch (error) {
      console.error('Error marking as delivered:', error);
      showToast('Failed to mark as delivered', 'error');
    } finally {
      setIsMarkingDelivered(false);
    }
  };

  const handleSendNudge = async () => {
    if (!creator) return;
    
    setIsNudging(true);
    try {
      const firstName = creator.fullName.split(' ')[0];
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'nudge',
          to: creator.email,
          creatorName: firstName,
        }),
      });
      
      setShowNudgeModal(false);
      setSuccessAnimation({ icon: '📧', message: 'Reminder Sent!' });
    } catch (error) {
      console.error('Error sending nudge:', error);
      showToast('Failed to send reminder', 'error');
    } finally {
      setIsNudging(false);
    }
  };

  const handleSendEmail = () => {
    if (creator) {
      window.location.href = `mailto:${creator.email}`;
    }
  };

  // ============================================
  // Loading State
  // ============================================

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          </div>
          <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-16 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-zinc-400">Loading creator details...</span>
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  // ============================================
  // Not Found State
  // ============================================

  if (!creator) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          </div>
          <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-16 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-white text-lg mb-2">Creator not found</p>
              <p className="text-zinc-500 text-sm mb-6">
                This creator may have been deleted or the ID is invalid.
              </p>
              <button
                onClick={handleBack}
                className="px-6 py-2 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors"
              >
                ← Back to Creators
              </button>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  // Format shipping address
  const formattedAddress = [
    creator.shippingAddress.street,
    creator.shippingAddress.unit,
    creator.shippingAddress.city,
    `${creator.shippingAddress.state} ${creator.shippingAddress.zipCode}`,
  ].filter(Boolean).join(', ');

  // Calculate days remaining for content deadline
  const daysRemaining = selectedCollab?.contentDeadline 
    ? Math.ceil((new Date(selectedCollab.contentDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // ============================================
  // Render
  // ============================================

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        {/* Background Gradient Orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="group flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>Back to Creators</span>
          </button>

          {/* Header Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-6 hover:border-zinc-700 transition-all">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              {/* Creator Info */}
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-orange-500/20">
                  {creator.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-white">{creator.fullName}</h1>
                    {selectedCollab && <StatusBadge status={selectedCollab.status} />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="text-orange-400 font-mono">{creator.creatorId}</span>
                    <span className="text-zinc-600">•</span>
                    <a 
                      href={`https://tiktok.com/@${creator.tiktokHandle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-orange-400 transition-colors"
                    >
                      @{creator.tiktokHandle.replace('@', '')}
                    </a>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-500">Applied {formatDate(creator.createdAt)}</span>
                    {creator.isBlocked && (
                      <>
                        <span className="text-zinc-600">•</span>
                        <span className="text-red-400 font-medium">BLOCKED</span>
                      </>
                    )}
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <QuickActionButton 
                      icon="📧" 
                      label="Send Email" 
                      onClick={handleSendEmail}
                    />
                    <QuickActionButton 
                      icon="🔔" 
                      label="Send Nudge" 
                      variant="primary"
                      onClick={() => setShowNudgeModal(true)}
                    />
                    <QuickActionButton 
                      icon="🚫" 
                      label="Block Creator" 
                      variant="danger"
                      onClick={() => setShowBlockModal(true)}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-2 w-full lg:w-auto">
                <MiniStatCard 
                  icon="📱" 
                  label="TikTok" 
                  value={formatFollowers(creator.tiktokFollowers)} 
                  color="white" 
                />
                <MiniStatCard 
                  icon="📸" 
                  label="Instagram" 
                  value={formatFollowers(creator.instagramFollowers)} 
                  color="white" 
                />
                <MiniStatCard 
                  icon="🎬" 
                  label="Content" 
                  value={`${selectedCollab?.contentSubmissions.length || 0}/3`} 
                  color="orange" 
                />
                <MiniStatCard 
                  icon="⭐" 
                  label="Rating" 
                  value={selectedCollab?.rating ? `${selectedCollab.rating}/5` : '—'} 
                  color="green" 
                />
                <MiniStatCard 
                  icon="🤝" 
                  label="Collabs" 
                  value={creator.totalCollaborations} 
                  color="purple" 
                />
                <MiniStatCard 
                  icon="📏" 
                  label="Fit" 
                  value={creator.height || '—'} 
                  subValue={creator.weight || undefined}
                  color="blue" 
                />
              </div>
            </div>
          </div>

          {/* Collaboration Selector */}
          {allCollaborations.length > 1 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-zinc-400 text-sm">Viewing Collaboration:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allCollaborations.map((collab) => (
                  <CollabPill
                    key={collab.id}
                    collab={collab}
                    isActive={selectedCollabId === collab.id}
                    onClick={() => handleCollabChange(collab.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No Collaboration State */}
          {!selectedCollab && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-yellow-400 font-semibold mb-2">No Active Collaboration</h3>
              <p className="text-zinc-400 text-sm">
                This creator doesn't have any collaborations yet.
              </p>
            </div>
          )}

          {/* Main Content Grid */}
          {selectedCollab && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - 2/3 */}
              <div className="lg:col-span-2 space-y-6">
                {/* Content Submissions */}
                <SectionCard 
                  icon="🎥" 
                  title="Content Submissions"
                  action={
                    <div className="flex items-center gap-3">
                      <ProgressRing progress={(selectedCollab.contentSubmissions.length / 3) * 100} size={40} />
                      <span className="text-zinc-400 text-sm">{selectedCollab.contentSubmissions.length}/3</span>
                    </div>
                  }
                >
                  <div className="space-y-3">
                    {[0, 1, 2].map((index) => (
                      <ContentSubmissionCard
                        key={index}
                        index={index}
                        submission={selectedCollab.contentSubmissions[index]}
                        isCompleted={index < selectedCollab.contentSubmissions.length}
                      />
                    ))}
                  </div>
                  
                  {/* Content Deadline Warning */}
                  {selectedCollab.status === 'delivered' && daysRemaining !== null && (
                    <div className={`mt-4 p-4 rounded-xl border ${
                      daysRemaining <= 3 
                        ? 'bg-red-500/10 border-red-500/20' 
                        : 'bg-orange-500/10 border-orange-500/20'
                    }`}>
                      <div className={`flex items-center gap-2 mb-1 ${
                        daysRemaining <= 3 ? 'text-red-400' : 'text-orange-400'
                      }`}>
                        <span>⏰</span>
                        <span className="font-medium">Content Deadline</span>
                      </div>
                      <p className="text-sm text-zinc-400">
                        {daysRemaining > 0 
                          ? `${daysRemaining} days remaining` 
                          : 'Deadline passed!'
                        } • Due {selectedCollab.contentDeadline && formatDate(selectedCollab.contentDeadline)}
                      </p>
                    </div>
                  )}
                </SectionCard>

                {/* Creator Profile */}
                <SectionCard icon="👤" title="Creator Profile">
                  <div className="space-y-3">
                    <div>
                      <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Email</div>
                      <div className="text-white">{creator.email}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">TikTok</div>
                      <a 
                        href={`https://tiktok.com/@${creator.tiktokHandle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300 transition-colors inline-flex items-center gap-2"
                      >
                        @{creator.tiktokHandle.replace('@', '')}
                        <span className="text-zinc-500 text-sm">({formatFollowers(creator.tiktokFollowers)})</span>
                      </a>
                    </div>
                    <div>
                      <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Instagram</div>
                      <a 
                        href={`https://instagram.com/${creator.instagramHandle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300 transition-colors inline-flex items-center gap-2"
                      >
                        @{creator.instagramHandle.replace('@', '')}
                        <span className="text-zinc-500 text-sm">({formatFollowers(creator.instagramFollowers)})</span>
                      </a>
                    </div>
                    <div>
                      <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Best Content</div>
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
                    </div>
                    <div>
                      <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Previous Brands</div>
                      <span className={creator.previousBrands ? 'text-green-400' : 'text-zinc-500'}>
                        {creator.previousBrands ? '✓ Yes' : 'No'}
                      </span>
                    </div>
                    {(creator.height || creator.weight) && (
                      <div>
                        <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Fit Info</div>
                        <span className="text-white">{creator.height || '—'} / {creator.weight || '—'}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Why Collab */}
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Why They Want to Collab</div>
                    <p className="text-zinc-300 text-sm leading-relaxed">{creator.whyCollab}</p>
                  </div>
                </SectionCard>

                {/* Collaboration Details */}
                <SectionCard icon="📦" title={`Collaboration #${selectedCollab.collabNumber}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-800/30 rounded-xl">
                      <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Product</div>
                      <div className="text-white font-medium">{selectedCollab.product}</div>
                      <div className="text-zinc-400 text-sm">Size {selectedCollab.size}</div>
                    </div>
                    <div className="p-4 bg-zinc-800/30 rounded-xl">
                      <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Collab ID</div>
                      <div className="text-orange-400 font-mono text-sm">{selectedCollab.collabDisplayId}</div>
                    </div>
                    <div className="p-4 bg-zinc-800/30 rounded-xl">
                      <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Started</div>
                      <div className="text-white">{formatDate(selectedCollab.createdAt)}</div>
                    </div>
                    <div className="p-4 bg-zinc-800/30 rounded-xl">
                      <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Status</div>
                      <StatusBadge status={selectedCollab.status} />
                    </div>
                  </div>
                  
                  {/* Shipping Address */}
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Shipping Address</div>
                    <p className="text-zinc-300">{formattedAddress}</p>
                  </div>
                </SectionCard>
              </div>

              {/* Right Column - 1/3 */}
              <div className="space-y-6">
                {/* Status & Actions */}
                <SectionCard icon="⚙️" title="Status & Actions">
                  <div className="space-y-4">
                    <div>
                      <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">Status</label>
                      <select
                        value={editedStatus}
                        onChange={(e) => setEditedStatus(e.target.value as CollaborationStatus | '')}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                      >
                        {CREATOR_STATUSES.map((status) => (
                          <option 
                            key={status.value} 
                            value={status.value} 
                            className="bg-zinc-900"
                            disabled={status.value === 'delivered'}
                          >
                            {status.label} {status.value === 'delivered' ? '(Use button below)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </SectionCard>

                {/* Shipment Tracking */}
                <SectionCard icon="📦" title="Shipment Tracking">
                  {selectedCollab.trackingNumber ? (
                    <div className="space-y-4">
                      {/* Tracking Info Card */}
                      <div className="p-4 bg-zinc-800/30 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-sm">Tracking #</span>
                          <span className="text-orange-400 font-mono text-sm">{selectedCollab.trackingNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-sm">Carrier</span>
                          <span className="text-white">{selectedCollab.carrier || 'Unknown'}</span>
                        </div>
                      </div>
                      
                      {/* Shipping Timeline */}
                      <div className="space-y-2">
                        {selectedCollab.shippedAt && (
                          <div className="flex items-center gap-2 text-green-400">
                            <span>✓</span>
                            <span className="text-sm">Shipped on {formatDate(selectedCollab.shippedAt)}</span>
                          </div>
                        )}
                        {selectedCollab.deliveredAt && (
                          <div className="flex items-center gap-2 text-green-400">
                            <span>✓</span>
                            <span className="text-sm">Delivered on {formatDate(selectedCollab.deliveredAt)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Mark Delivered Button */}
                      {selectedCollab.status === 'shipped' && (
                        <button
                          onClick={handleMarkDelivered}
                          disabled={isMarkingDelivered}
                          className="w-full py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          {isMarkingDelivered ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Marking...
                            </>
                          ) : (
                            <>
                              <span>✓</span>
                              Mark as Delivered
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <AddTrackingForm 
                      creatorId={creator.id} 
                      collaborationId={selectedCollab.id}
                      onSuccess={fetchCreator} 
                    />
                  )}
                </SectionCard>

                {/* Review */}
                <SectionCard icon="⭐" title="Review">
                  <div className="space-y-4">
                    <div>
                      <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-3">Creator Rating</label>
                      <StarRating
                        rating={editedRating}
                        editable={true}
                        onChange={setEditedRating}
                        size="lg"
                      />
                    </div>
                    
                    <div>
                      <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">Internal Notes</label>
                      <textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        placeholder="Leave notes about this creator..."
                        rows={4}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                      />
                    </div>
                    
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-medium rounded-xl transition-colors"
                    >
                      Save Review
                    </button>
                  </div>
                </SectionCard>

                {/* Activity Timeline */}
                <SectionCard icon="📋" title="Activity Timeline">
                  <div className="max-h-80 overflow-y-auto pr-2">
                    {timeline.length > 0 ? (
                      timeline.map((item, index) => (
                        <TimelineItem
                          key={index}
                          date={item.date}
                          title={item.title}
                          description={item.description}
                          status={item.status}
                          isLast={index === timeline.length - 1}
                        />
                      ))
                    ) : (
                      <p className="text-zinc-500 text-sm text-center py-4">No activity yet</p>
                    )}
                  </div>
                </SectionCard>
              </div>
            </div>
          )}
        </main>

        {/* Nudge Confirmation Modal */}
        <ConfirmModal
          isOpen={showNudgeModal}
          onClose={() => setShowNudgeModal(false)}
          onConfirm={handleSendNudge}
          title="Send Reminder?"
          message={`Send a nudge email to ${creator.fullName} to remind them to submit their content?`}
          confirmLabel="Send Reminder"
          confirmColor="orange"
          isProcessing={isNudging}
          icon="📧"
        />

        {/* Block Confirmation Modal */}
        <ConfirmModal
          isOpen={showBlockModal}
          onClose={() => setShowBlockModal(false)}
          onConfirm={() => {
            // TODO: Implement block functionality
            setShowBlockModal(false);
            showToast('Block functionality coming soon', 'info');
          }}
          title="Block Creator?"
          message={`Are you sure you want to block ${creator.fullName}? They will no longer be able to submit content or apply for new collaborations.`}
          confirmLabel="Block Creator"
          confirmColor="red"
          icon="🚫"
        />

        {/* Success Animation */}
        {successAnimation && (
          <SuccessAnimation
            icon={successAnimation.icon}
            message={successAnimation.message}
            onComplete={() => setSuccessAnimation(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}