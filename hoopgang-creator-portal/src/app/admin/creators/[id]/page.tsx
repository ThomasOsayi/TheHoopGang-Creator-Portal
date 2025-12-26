// src/app/admin/creators/[id]/page.tsx
// Mobile-Responsive Version + Fixed content submissions (3→1)

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
  CreatorSourceBadge,
} from '@/components/ui';
import { ProtectedRoute } from '@/components/auth';
import { auth } from '@/lib/firebase';

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
// Mini Stat Card Component - Mobile Optimized
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
    <div className="text-center p-2 sm:p-4 bg-zinc-800/30 border border-zinc-800 rounded-lg sm:rounded-xl hover:bg-zinc-800/50 transition-colors">
      <div className="text-base sm:text-xl mb-0.5 sm:mb-1">{icon}</div>
      <div className={`text-base sm:text-xl font-bold ${colors[color]}`}>
        {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
      </div>
      <div className="text-zinc-500 text-[10px] sm:text-xs">{label}</div>
      {subValue && <div className="text-zinc-400 text-[10px] sm:text-xs mt-0.5 hidden sm:block">{subValue}</div>}
    </div>
  );
}

// ============================================
// Section Card Component - Mobile Optimized
// ============================================

function SectionCard({ icon, title, children, action }: {
  icon: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-zinc-700 transition-all duration-300">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl">{icon}</span>
          <h2 className="text-base sm:text-lg font-semibold text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ============================================
// Quick Action Button Component - Mobile Optimized
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
      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 ${variants[variant]} disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]`}
    >
      {loading ? (
        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <span className="text-sm sm:text-base">{icon}</span>
      )}
      <span className="hidden xs:inline">{label}</span>
      <span className="xs:hidden">{label.split(' ')[0]}</span>
    </button>
  );
}

// ============================================
// Collaboration Pill Component - Mobile Optimized
// ============================================

function CollabPill({ collab, isActive, onClick }: {
  collab: Collaboration;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
        isActive 
          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' 
          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
      }`}
    >
      #{collab.collabNumber} - {collab.product}
      {collab.id === collab.id && isActive && (
        <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs opacity-75">(Active)</span>
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
    <div className="flex gap-3 sm:gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${statusColors[status]}`} />
        {!isLast && <div className="w-0.5 flex-1 bg-zinc-800 my-1 min-h-[16px] sm:min-h-[20px]" />}
      </div>
      <div className="pb-3 sm:pb-4">
        <div className="text-zinc-500 text-[10px] sm:text-xs">{date}</div>
        <div className="text-white font-medium text-sm sm:text-base">{title}</div>
        {description && <div className="text-zinc-400 text-xs sm:text-sm mt-0.5">{description}</div>}
      </div>
    </div>
  );
}

// ============================================
// Content Submission Card Component - Mobile Optimized
// ============================================

function ContentSubmissionCard({ index, submission, isCompleted }: {
  index: number;
  submission?: { url: string; submittedAt: Date; views?: number };
  isCompleted: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all ${
      isCompleted 
        ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/30' 
        : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600'
    }`}>
      {/* Number/Check Badge */}
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
        isCompleted 
          ? 'bg-green-500/20 text-green-400' 
          : 'bg-zinc-700 text-zinc-400'
      }`}>
        {isCompleted ? '✓' : index + 1}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium text-sm sm:text-base">TikTok Video {index + 1}</div>
        {isCompleted && submission ? (
          <a 
            href={submission.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm truncate block transition-colors"
          >
            {submission.url}
          </a>
        ) : (
          <span className="text-zinc-500 text-xs sm:text-sm italic">Awaiting submission...</span>
        )}
      </div>
      
      {/* Date/Views */}
      {isCompleted && submission && (
        <div className="text-right flex-shrink-0">
          <div className="text-zinc-400 text-xs sm:text-sm">{formatShortDate(submission.submittedAt)}</div>
          {submission.views && (
            <div className="text-green-400 text-[10px] sm:text-xs">{formatFollowers(submission.views)} views</div>
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

  // TikTok creator data
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [leaderboardStats, setLeaderboardStats] = useState<{ rank: number; submissions: number } | null>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loadingTikTokData, setLoadingTikTokData] = useState(false);
  
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

  // Fetch TikTok creator specific data (submissions, leaderboard, redemptions)
  useEffect(() => {
    const fetchTikTokCreatorData = async () => {
      if (!creator || creator.source !== 'tiktok') return;
      
      setLoadingTikTokData(true);
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();

        // Fetch submissions for this creator
        const [submissionsRes, redemptionsRes] = await Promise.all([
          fetch(`/api/admin/submissions?creatorId=${creator.id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch(`/api/admin/redemptions?creatorId=${creator.id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
        ]);

        if (submissionsRes.ok) {
          const data = await submissionsRes.json();
          setSubmissions(data.submissions || []);
        }

        if (redemptionsRes.ok) {
          const data = await redemptionsRes.json();
          setRedemptions(data.redemptions?.filter((r: any) => r.creatorId === creator.id) || []);
        }
        
      } catch (error) {
        console.error('Error fetching TikTok creator data:', error);
      } finally {
        setLoadingTikTokData(false);
      }
    };

    fetchTikTokCreatorData();
  }, [creator]);

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
    // FIXED: Changed from 3 to 1 submission requirement
    if (selectedCollab.contentDeadline && selectedCollab.status === 'delivered') {
      const remaining = Math.ceil((new Date(selectedCollab.contentDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const videosRemaining = 1 - selectedCollab.contentSubmissions.length;
      items.push({
        date: formatDate(selectedCollab.contentDeadline),
        title: 'Content Deadline',
        description: videosRemaining > 0 ? `${videosRemaining} video remaining` : 'All videos submitted',
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

      // FIXED: Auto-complete when saving a rating if all content is submitted (1 video, not 3)
      const isRatingBeingSaved = editedRating > 0 && editedRating !== (selectedCollab.rating || 0);
      const allContentSubmitted = selectedCollab.contentSubmissions.length >= 1; // Changed from 3 to 1
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
          <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-12 sm:py-16 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-zinc-400 text-sm sm:text-base">Loading creator details...</span>
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
          <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-12 sm:py-16 text-center">
              <div className="text-4xl sm:text-5xl mb-4">🔍</div>
              <p className="text-white text-base sm:text-lg mb-2">Creator not found</p>
              <p className="text-zinc-500 text-xs sm:text-sm mb-6">
                This creator may have been deleted or the ID is invalid.
              </p>
              <button
                onClick={handleBack}
                className="px-5 sm:px-6 py-2 bg-zinc-800 text-white rounded-lg sm:rounded-xl hover:bg-zinc-700 transition-colors text-sm sm:text-base active:scale-[0.98]"
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

        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="group flex items-center gap-2 text-zinc-400 hover:text-white mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>Back to Creators</span>
          </button>

          {/* Header Card - Mobile Optimized */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 hover:border-zinc-700 transition-all">
            <div className="flex flex-col gap-4 sm:gap-6">
              {/* Creator Info Row */}
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-xl sm:text-3xl font-bold text-white shadow-lg shadow-orange-500/20 flex-shrink-0">
                  {creator.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                    <h1 className="text-lg sm:text-2xl font-bold text-white truncate">{creator.fullName}</h1>
                    <CreatorSourceBadge source={creator.source || 'manual'} size="sm" />
                    {selectedCollab && <StatusBadge status={selectedCollab.status} />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 text-xs sm:text-sm">
                    <span className="text-orange-400 font-mono">{creator.creatorId}</span>
                    <span className="text-zinc-600 hidden sm:inline">•</span>
                    <a 
                      href={`https://tiktok.com/@${creator.tiktokHandle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-orange-400 transition-colors"
                    >
                      @{creator.tiktokHandle.replace('@', '')}
                    </a>
                    <span className="text-zinc-600 hidden sm:inline">•</span>
                    <span className="text-zinc-500 hidden sm:inline">Applied {formatDate(creator.createdAt)}</span>
                    {creator.isBlocked && (
                      <>
                        <span className="text-zinc-600">•</span>
                        <span className="text-red-400 font-medium">BLOCKED</span>
                      </>
                    )}
                  </div>
                  
                  {/* Quick Actions - Horizontal scroll on mobile */}
                  <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
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

              {/* Stats Grid - 3 cols on mobile, 6 on desktop */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
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
                  value={`${selectedCollab?.contentSubmissions.length || 0}/1`} 
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

          {/* Collaboration Selector - Horizontal scroll on mobile */}
          {allCollaborations.length > 1 && (
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <span className="text-zinc-400 text-xs sm:text-sm">Viewing Collaboration:</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
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

          {/* No Collaboration State - Different for TikTok vs Instagram creators */}
          {!selectedCollab && (
            creator?.source === 'tiktok' ? (
              /* TikTok Creator View - Show submissions & rewards instead of collab */
              <div className="space-y-4 sm:space-y-6">
                {/* TikTok Creator Info Banner */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xl sm:text-2xl">🎵</span>
                    <div>
                      <h3 className="text-white font-semibold text-sm sm:text-base">TikTok Shop Creator</h3>
                      <p className="text-zinc-400 text-xs sm:text-sm">
                        This creator joined through TikTok Shop and submits content for rewards.
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4">
                    <div className="text-center p-2 sm:p-3 bg-zinc-800/50 rounded-lg sm:rounded-xl">
                      <div className="text-xl sm:text-2xl font-bold text-orange-400">{submissions.length}</div>
                      <div className="text-zinc-500 text-[10px] sm:text-xs">Submissions</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-zinc-800/50 rounded-lg sm:rounded-xl">
                      <div className="text-xl sm:text-2xl font-bold text-green-400">
                        {submissions.filter(s => s.status === 'approved').length}
                      </div>
                      <div className="text-zinc-500 text-[10px] sm:text-xs">Approved</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-zinc-800/50 rounded-lg sm:rounded-xl">
                      <div className="text-xl sm:text-2xl font-bold text-purple-400">{redemptions.length}</div>
                      <div className="text-zinc-500 text-[10px] sm:text-xs">Rewards</div>
                    </div>
                  </div>
                </div>

                {/* Submission History */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl">📊</span>
                      <h3 className="text-white font-semibold text-sm sm:text-base">Content Submissions</h3>
                    </div>
                    <span className="text-zinc-500 text-xs sm:text-sm">{submissions.length} total</span>
                  </div>
                  
                  {loadingTikTokData ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : submissions.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3 max-h-60 sm:max-h-80 overflow-y-auto">
                      {submissions.slice(0, 10).map((sub: any) => (
                        <div 
                          key={sub.id} 
                          className="flex items-center justify-between p-2.5 sm:p-3 bg-zinc-800/30 rounded-lg sm:rounded-xl hover:bg-zinc-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm flex-shrink-0 ${
                              sub.type === 'milestone' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {sub.type === 'milestone' ? '⭐' : '📊'}
                            </div>
                            <div className="min-w-0">
                              <a 
                                href={sub.tiktokUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm truncate block"
                              >
                                {sub.tiktokUrl?.replace('https://www.tiktok.com/', '').slice(0, 30)}...
                              </a>
                              <div className="text-zinc-500 text-[10px] sm:text-xs">
                                {new Date(sub.submittedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className={`px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 ${
                            sub.status === 'approved' 
                              ? 'bg-green-500/20 text-green-400' 
                              : sub.status === 'rejected'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {sub.status}
                          </div>
                        </div>
                      ))}
                      {submissions.length > 10 && (
                        <p className="text-zinc-500 text-xs sm:text-sm text-center py-2">
                          + {submissions.length - 10} more submissions
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <div className="text-2xl sm:text-3xl mb-2">📭</div>
                      <p className="text-zinc-500 text-sm">No submissions yet</p>
                    </div>
                  )}
                </div>

                {/* Rewards Earned */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl">🎁</span>
                      <h3 className="text-white font-semibold text-sm sm:text-base">Rewards Earned</h3>
                    </div>
                    <span className="text-zinc-500 text-xs sm:text-sm">{redemptions.length} total</span>
                  </div>
                  
                  {loadingTikTokData ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : redemptions.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {redemptions.map((redemption: any) => (
                        <div 
                          key={redemption.id} 
                          className="flex items-center justify-between p-2.5 sm:p-3 bg-zinc-800/30 rounded-lg sm:rounded-xl"
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-lg sm:text-xl">💰</span>
                            <div>
                              <div className="text-white font-medium text-sm sm:text-base">{redemption.rewardName}</div>
                              <div className="text-zinc-500 text-[10px] sm:text-xs">
                                {new Date(redemption.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className={`px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                            redemption.status === 'fulfilled' 
                              ? 'bg-green-500/20 text-green-400' 
                              : redemption.status === 'ready_to_fulfill'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {redemption.status === 'awaiting_claim' ? 'Awaiting' : 
                             redemption.status === 'ready_to_fulfill' ? 'Ready' :
                             redemption.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <div className="text-2xl sm:text-3xl mb-2">🎁</div>
                      <p className="text-zinc-500 text-sm">No rewards earned yet</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Instagram/Manual Creator - Show original "No Collaboration" message */
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center">
                <div className="text-3xl sm:text-4xl mb-3">📋</div>
                <h3 className="text-yellow-400 font-semibold mb-2 text-sm sm:text-base">No Active Collaboration</h3>
                <p className="text-zinc-400 text-xs sm:text-sm">
                  This creator doesn't have any collaborations yet.
                </p>
              </div>
            )
          )}

          {/* Main Content Grid - Stack on mobile */}
          {selectedCollab && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Left Column - Full width on mobile, 2/3 on desktop */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Content Submissions - FIXED: Only show 1 slot, not 3 */}
                <SectionCard 
                  icon="🎥" 
                  title="Content Submissions"
                  action={
                    <div className="flex items-center gap-2 sm:gap-3">
                      <ProgressRing 
                        progress={(selectedCollab.contentSubmissions.length / 1) * 100} 
                        size={32} 
                        strokeWidth={3}
                      />
                      <span className="text-zinc-400 text-xs sm:text-sm">{selectedCollab.contentSubmissions.length}/1</span>
                    </div>
                  }
                >
                  {/* FIXED: Only render 1 submission slot instead of 3 */}
                  <div className="space-y-2 sm:space-y-3">
                    <ContentSubmissionCard
                      index={0}
                      submission={selectedCollab.contentSubmissions[0]}
                      isCompleted={selectedCollab.contentSubmissions.length >= 1}
                    />
                  </div>
                  
                  {/* Content Deadline Warning */}
                  {selectedCollab.status === 'delivered' && daysRemaining !== null && (
                    <div className={`mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border ${
                      daysRemaining <= 3 
                        ? 'bg-red-500/10 border-red-500/20' 
                        : 'bg-orange-500/10 border-orange-500/20'
                    }`}>
                      <div className={`flex items-center gap-2 mb-1 ${
                        daysRemaining <= 3 ? 'text-red-400' : 'text-orange-400'
                      }`}>
                        <span>⏰</span>
                        <span className="font-medium text-sm sm:text-base">Content Deadline</span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-400">
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
                      <div className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Email</div>
                      <div className="text-white text-sm sm:text-base break-all">{creator.email}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">TikTok</div>
                        <a 
                          href={`https://tiktok.com/@${creator.tiktokHandle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 transition-colors text-sm sm:text-base"
                        >
                          @{creator.tiktokHandle.replace('@', '')}
                          <span className="text-zinc-500 text-xs sm:text-sm ml-1">({formatFollowers(creator.tiktokFollowers)})</span>
                        </a>
                      </div>
                      <div>
                        <div className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Instagram</div>
                        <a 
                          href={`https://instagram.com/${creator.instagramHandle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 transition-colors text-sm sm:text-base"
                        >
                          @{creator.instagramHandle.replace('@', '')}
                          <span className="text-zinc-500 text-xs sm:text-sm ml-1">({formatFollowers(creator.instagramFollowers)})</span>
                        </a>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Best Content</div>
                        <a 
                          href={creator.bestContentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 transition-colors inline-flex items-center gap-1 text-sm sm:text-base"
                        >
                          View
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                      <div>
                        <div className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Previous Brands</div>
                        <span className={`text-sm sm:text-base ${creator.previousBrands ? 'text-green-400' : 'text-zinc-500'}`}>
                          {creator.previousBrands ? '✓ Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    {(creator.height || creator.weight) && (
                      <div>
                        <div className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Fit Info</div>
                        <span className="text-white text-sm sm:text-base">{creator.height || '—'} / {creator.weight || '—'}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Why Collab */}
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider mb-2">Why They Want to Collab</div>
                    <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">{creator.whyCollab}</p>
                  </div>
                </SectionCard>

                {/* Collaboration Details */}
                <SectionCard icon="📦" title={`Collaboration #${selectedCollab.collabNumber}`}>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-zinc-800/30 rounded-lg sm:rounded-xl">
                      <div className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Product</div>
                      <div className="text-white font-medium text-sm sm:text-base">{selectedCollab.product}</div>
                      <div className="text-zinc-400 text-xs sm:text-sm">Size {selectedCollab.size}</div>
                    </div>
                    <div className="p-3 sm:p-4 bg-zinc-800/30 rounded-lg sm:rounded-xl">
                      <div className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Collab ID</div>
                      <div className="text-orange-400 font-mono text-xs sm:text-sm break-all">{selectedCollab.collabDisplayId}</div>
                    </div>
                    <div className="p-3 sm:p-4 bg-zinc-800/30 rounded-lg sm:rounded-xl">
                      <div className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Started</div>
                      <div className="text-white text-sm sm:text-base">{formatDate(selectedCollab.createdAt)}</div>
                    </div>
                    <div className="p-3 sm:p-4 bg-zinc-800/30 rounded-lg sm:rounded-xl">
                      <div className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Status</div>
                      <StatusBadge status={selectedCollab.status} />
                    </div>
                  </div>
                  
                  {/* Shipping Address */}
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider mb-2">Shipping Address</div>
                    <p className="text-zinc-300 text-xs sm:text-sm">{formattedAddress}</p>
                  </div>
                </SectionCard>
              </div>

              {/* Right Column - Full width on mobile, 1/3 on desktop */}
              <div className="space-y-4 sm:space-y-6">
                {/* Status & Actions */}
                <SectionCard icon="⚙️" title="Status & Actions">
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider block mb-2">Status</label>
                      <select
                        value={editedStatus}
                        onChange={(e) => setEditedStatus(e.target.value as CollaborationStatus | '')}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-sm sm:text-base focus:outline-none focus:border-orange-500 transition-colors"
                      >
                        {CREATOR_STATUSES.map((status) => (
                          <option 
                            key={status.value} 
                            value={status.value} 
                            className="bg-zinc-900"
                            disabled={status.value === 'delivered'}
                          >
                            {status.label} {status.value === 'delivered' ? '(Use button)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="w-full py-2.5 sm:py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-semibold rounded-lg sm:rounded-xl transition-colors flex items-center justify-center gap-2 text-sm sm:text-base active:scale-[0.98]"
                    >
                      {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </SectionCard>

                {/* Shipment Tracking */}
                <SectionCard icon="📦" title="Shipment Tracking">
                  {selectedCollab.trackingNumber ? (
                    <div className="space-y-3 sm:space-y-4">
                      {/* Tracking Info Card */}
                      <div className="p-3 sm:p-4 bg-zinc-800/30 rounded-lg sm:rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-xs sm:text-sm">Tracking #</span>
                          <span className="text-orange-400 font-mono text-xs sm:text-sm">{selectedCollab.trackingNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-xs sm:text-sm">Carrier</span>
                          <span className="text-white text-sm">{selectedCollab.carrier || 'Unknown'}</span>
                        </div>
                      </div>
                      
                      {/* Shipping Timeline */}
                      <div className="space-y-1.5 sm:space-y-2">
                        {selectedCollab.shippedAt && (
                          <div className="flex items-center gap-2 text-green-400">
                            <span>✓</span>
                            <span className="text-xs sm:text-sm">Shipped {formatDate(selectedCollab.shippedAt)}</span>
                          </div>
                        )}
                        {selectedCollab.deliveredAt && (
                          <div className="flex items-center gap-2 text-green-400">
                            <span>✓</span>
                            <span className="text-xs sm:text-sm">Delivered {formatDate(selectedCollab.deliveredAt)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Mark Delivered Button */}
                      {selectedCollab.status === 'shipped' && (
                        <button
                          onClick={handleMarkDelivered}
                          disabled={isMarkingDelivered}
                          className="w-full py-2 sm:py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-medium rounded-lg sm:rounded-xl transition-colors flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
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
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider block mb-2 sm:mb-3">Creator Rating</label>
                      <StarRating
                        rating={editedRating}
                        editable={true}
                        onChange={setEditedRating}
                        size="lg"
                      />
                    </div>
                    
                    <div>
                      <label className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-wider block mb-2">Internal Notes</label>
                      <textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        placeholder="Leave notes about this creator..."
                        rows={3}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                      />
                    </div>
                    
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="w-full py-2 sm:py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-medium rounded-lg sm:rounded-xl transition-colors text-sm active:scale-[0.98]"
                    >
                      Save Review
                    </button>
                  </div>
                </SectionCard>

                {/* Activity Timeline */}
                <SectionCard icon="📋" title="Activity Timeline">
                  <div className="max-h-60 sm:max-h-80 overflow-y-auto pr-2">
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
                      <p className="text-zinc-500 text-xs sm:text-sm text-center py-4">No activity yet</p>
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