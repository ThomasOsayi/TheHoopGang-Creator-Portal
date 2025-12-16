// src/app/admin/submissions/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Navbar, 
  AnimatedCounter, 
  GlowCard, 
  FilterPill,
  ConfirmModal,
  SuccessAnimation 
} from '@/components/ui';
import { ProtectedRoute } from '@/components/auth';
import { auth } from '@/lib/firebase';
import { V3ContentSubmission, V3SubmissionType, V3SubmissionStatus } from '@/types';
import { getCurrentWeek, getPreviousWeeks } from '@/lib/week-utils';

// ============================================
// Types
// ============================================
interface EnrichedSubmission extends V3ContentSubmission {
  creatorName: string;
  creatorHandle: string;
  creatorEmail: string;
}

// ============================================
// Utility Functions
// ============================================
function truncateTikTokUrl(url: string): string {
  try {
    const match = url.match(/@([^/]+)\/video\/(\d+)/);
    if (match) {
      const username = match[1];
      const videoId = match[2].slice(0, 6);
      return `@${username}/video/${videoId}...`;
    }
    return url.length > 30 ? url.slice(0, 30) + '...' : url;
  } catch {
    return url.slice(0, 30) + '...';
  }
}

function formatRelativeDate(date: Date | string): { date: string; time: string } {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const inputDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const time = d.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  if (inputDate.getTime() === today.getTime()) {
    return { date: 'Today', time };
  } else if (inputDate.getTime() === yesterday.getTime()) {
    return { date: 'Yesterday', time };
  } else {
    return { 
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time 
    };
  }
}

// ============================================
// Type Badge Component
// ============================================
function TypeBadge({ type }: { type: V3SubmissionType }) {
  const config = {
    volume: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Volume' },
    milestone: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', label: 'Milestone' },
  };
  const style = config[type] || config.volume;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

// ============================================
// Status Badge Component
// ============================================
function SubmissionStatusBadge({ status }: { status: V3SubmissionStatus }) {
  const config = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Pending' },
    approved: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Approved' },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'Rejected' },
  };
  const style = config[status] || config.pending;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

// ============================================
// Tier Badge Component
// ============================================
function TierBadge({ tier }: { tier: string | null | undefined }) {
  if (!tier) return <span className="text-zinc-600">—</span>;

  const config: Record<string, { bg: string; text: string; border: string; label: string }> = {
    '100k': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: '100K' },
    '500k': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', label: '500K' },
    '1m': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: '1M+' },
  };
  const style = config[tier.toLowerCase()] || config['100k'];

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

// ============================================
// Submission Row Component
// ============================================
interface SubmissionRowProps {
  submission: EnrichedSubmission;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onReview: (submission: EnrichedSubmission) => void;
}

function SubmissionRow({ submission, isSelected, onSelect, onReview }: SubmissionRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const needsReview = submission.status === 'pending' && submission.type === 'milestone';
  const { date, time } = formatRelativeDate(submission.submittedAt);

  return (
    <tr
      className={`border-b border-zinc-800/50 transition-all duration-200 ${
        isHovered ? 'bg-zinc-800/30' : ''
      } ${needsReview ? 'bg-yellow-500/5' : ''} ${isSelected ? 'bg-orange-500/10' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <td className="py-4 px-4 w-12">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(submission.id, e.target.checked)}
          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
        />
      </td>

      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
            {submission.creatorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white font-medium">{submission.creatorName}</div>
            <div className="text-zinc-500 text-sm">@{submission.creatorHandle}</div>
          </div>
        </div>
      </td>

      <td className="py-4 px-4">
        <a
          href={submission.tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 group"
        >
          <span>{truncateTikTokUrl(submission.tiktokUrl)}</span>
          <svg 
            className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </td>

      <td className="py-4 px-4">
        <TypeBadge type={submission.type} />
      </td>

      <td className="py-4 px-4">
        <TierBadge tier={submission.claimedTier} />
      </td>

      <td className="py-4 px-4">
        <SubmissionStatusBadge status={submission.status} />
      </td>

      <td className="py-4 px-4">
        <div>
          <div className="text-zinc-300">{date}</div>
          <div className="text-zinc-500 text-xs">{time}</div>
        </div>
      </td>

      <td className="py-4 px-4">
        {needsReview ? (
          <button
            onClick={() => onReview(submission)}
            className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors"
          >
            Review
          </button>
        ) : (
          <a
            href={submission.tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-sm font-medium hover:bg-zinc-700 hover:text-zinc-300 transition-colors inline-block"
          >
            View
          </a>
        )}
      </td>
    </tr>
  );
}

// ============================================
// Bulk Action Bar Component
// ============================================
interface BulkActionBarProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
}

function BulkActionBar({ selectedCount, onApprove, onReject, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 z-50 animate-fade-in-up">
      <span className="text-white font-medium">{selectedCount} selected</span>
      <div className="w-px h-6 bg-zinc-700" />
      <button
        onClick={onApprove}
        className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm font-medium hover:bg-green-500/30 transition-colors flex items-center gap-2"
      >
        <span>✓</span> Approve All
      </button>
      <button
        onClick={onReject}
        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-2"
      >
        <span>✕</span> Reject All
      </button>
      <button
        onClick={onClear}
        className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
      >
        Clear
      </button>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================
export default function AdminSubmissionsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data state - ALL submissions loaded once
  const [allSubmissions, setAllSubmissions] = useState<EnrichedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state - ALL filtering is client-side
  const [typeFilter, setTypeFilter] = useState<V3SubmissionType | ''>('');
  const [statusFilter, setStatusFilter] = useState<V3SubmissionStatus | ''>('');
  const [weekFilter, setWeekFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<{ icon: string; message: string } | null>(null);

  const weekOptions = getPreviousWeeks(8);

  // ============================================
  // Auth Check
  // ============================================
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && !isAdmin) {
      router.push('/');
      return;
    }
  }, [user, isAdmin, authLoading, router]);

  // ============================================
  // Data Fetching - Load ALL submissions once
  // ============================================
  const getAuthToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  const loadSubmissions = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) return;

      // Only pass weekFilter to API - everything else is client-side
      const params = new URLSearchParams();
      if (weekFilter) params.set('weekOf', weekFilter);

      const response = await fetch(`/api/admin/submissions?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch submissions');

      const data = await response.json();
      setAllSubmissions(data.submissions || []);
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  // Only refetch when week changes (or on initial load)
  useEffect(() => {
    if (user && isAdmin) {
      loadSubmissions();
    }
  }, [user, isAdmin, weekFilter]);

  // ============================================
  // Client-Side Filtering
  // ============================================
  const filteredSubmissions = useMemo(() => {
    let filtered = [...allSubmissions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.creatorName.toLowerCase().includes(query) ||
          sub.creatorHandle.toLowerCase().includes(query) ||
          sub.tiktokUrl.toLowerCase().includes(query)
      );
    }

    // Type filter (client-side)
    if (typeFilter) {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }

    // Status filter (client-side)
    if (statusFilter) {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    return filtered;
  }, [allSubmissions, searchQuery, typeFilter, statusFilter]);

  // Stats - calculated from ALL submissions (not filtered)
  const stats = useMemo(() => ({
    total: allSubmissions.length,
    pending: allSubmissions.filter((s) => s.status === 'pending').length,
    volume: allSubmissions.filter((s) => s.type === 'volume').length,
    milestones: allSubmissions.filter((s) => s.type === 'milestone').length,
  }), [allSubmissions]);

  // ============================================
  // Selection Handlers
  // ============================================
  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredSubmissions.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const allSelected = filteredSubmissions.length > 0 && filteredSubmissions.every((s) => selectedIds.has(s.id));

  // ============================================
  // Bulk Actions
  // ============================================
  const handleBulkApprove = async () => {
    setIsProcessing(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/submissions/bulk', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: 'approve',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve submissions');
      }

      const result = await response.json();
      setSuccessAnimation({ 
        icon: '✅', 
        message: `${result.summary?.succeeded || selectedIds.size} Submissions Approved!` 
      });
      setSelectedIds(new Set());
      setBulkAction(null);
      await loadSubmissions();
    } catch (error) {
      console.error('Error bulk approving:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    setIsProcessing(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/submissions/bulk', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: 'reject',
          reason: 'Bulk rejected by admin',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject submissions');
      }

      const result = await response.json();
      setSuccessAnimation({ 
        icon: '🚫', 
        message: `${result.summary?.succeeded || selectedIds.size} Submissions Rejected` 
      });
      setSelectedIds(new Set());
      setBulkAction(null);
      await loadSubmissions();
    } catch (error) {
      console.error('Error bulk rejecting:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewClick = (submission: EnrichedSubmission) => {
    router.push(`/admin/submissions/${submission.id}`);
  };

  // ============================================
  // Render
  // ============================================
  if (authLoading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="min-h-screen bg-zinc-950">
          <Navbar />
          <div className="flex items-center justify-center h-[80vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        {/* Background Gradient Orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <Navbar />

        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 pt-24">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span>📋</span> Content Submissions
            </h1>
            <p className="text-zinc-400 mt-1">Review and manage creator content submissions</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <GlowCard glowColor="blue">
              <div className="text-3xl font-bold text-white mb-1">
                <AnimatedCounter value={stats.total} />
              </div>
              <div className="text-zinc-500 text-sm">Total Submissions</div>
            </GlowCard>

            <GlowCard glowColor="yellow" urgent={stats.pending > 0}>
              <div className="text-3xl font-bold text-yellow-400 mb-1">
                <AnimatedCounter value={stats.pending} />
              </div>
              <div className="text-yellow-400/70 text-sm">Pending Review</div>
            </GlowCard>

            <GlowCard glowColor="blue">
              <div className="text-3xl font-bold text-blue-400 mb-1">
                <AnimatedCounter value={stats.volume} />
              </div>
              <div className="text-zinc-500 text-sm">Volume</div>
            </GlowCard>

            <GlowCard glowColor="purple">
              <div className="text-3xl font-bold text-purple-400 mb-1">
                <AnimatedCounter value={stats.milestones} />
              </div>
              <div className="text-zinc-500 text-sm">Milestones</div>
            </GlowCard>
          </div>

          {/* Table Section */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="p-6 border-b border-zinc-800">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, handle, or URL..."
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                </div>

                {/* Dropdowns */}
                <div className="flex gap-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as V3SubmissionType | '')}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-300 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">All Types</option>
                    <option value="volume">Volume</option>
                    <option value="milestone">Milestone</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as V3SubmissionStatus | '')}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-300 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select
                    value={weekFilter}
                    onChange={(e) => setWeekFilter(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-300 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">All Weeks</option>
                    {weekOptions.map((week) => (
                      <option key={week} value={week}>
                        {week} {week === getCurrentWeek() ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filter Pills - Quick shortcuts that set dropdown values */}
              <div className="flex flex-wrap gap-2 mt-4">
                <FilterPill
                  label="All"
                  active={!typeFilter && !statusFilter}
                  onClick={() => {
                    setTypeFilter('');
                    setStatusFilter('');
                  }}
                  count={stats.total}
                />
                <FilterPill
                  label="⏳ Pending"
                  active={statusFilter === 'pending'}
                  onClick={() => {
                    setStatusFilter(statusFilter === 'pending' ? '' : 'pending');
                    // Don't clear typeFilter - allow combining filters
                  }}
                  count={stats.pending}
                />
                <FilterPill
                  label="📊 Volume"
                  active={typeFilter === 'volume'}
                  onClick={() => {
                    setTypeFilter(typeFilter === 'volume' ? '' : 'volume');
                    // Don't clear statusFilter - allow combining filters
                  }}
                  count={stats.volume}
                />
                <FilterPill
                  label="⭐ Milestone"
                  active={typeFilter === 'milestone'}
                  onClick={() => {
                    setTypeFilter(typeFilter === 'milestone' ? '' : 'milestone');
                    // Don't clear statusFilter - allow combining filters
                  }}
                  count={stats.milestones}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-400">{error}</p>
                  <button
                    onClick={loadSubmissions}
                    className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📭</div>
                  <div className="text-zinc-400">No submissions found</div>
                  <div className="text-zinc-500 text-sm mt-1">Try adjusting your filters</div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/50">
                      <th className="py-3 px-4 w-12">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Creator</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">URL</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Tier</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((submission) => (
                      <SubmissionRow
                        key={submission.id}
                        submission={submission}
                        isSelected={selectedIds.has(submission.id)}
                        onSelect={handleSelect}
                        onReview={handleReviewClick}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Table Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
              <span className="text-zinc-500 text-sm">
                Showing {filteredSubmissions.length} of {allSubmissions.length} submissions
              </span>
              <span className="text-zinc-400 text-sm">Page 1 of 1</span>
            </div>
          </div>
        </main>

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedIds.size}
          onApprove={() => setBulkAction('approve')}
          onReject={() => setBulkAction('reject')}
          onClear={() => setSelectedIds(new Set())}
        />

        {/* Bulk Approve Confirmation Modal */}
        <ConfirmModal
          isOpen={bulkAction === 'approve'}
          onClose={() => setBulkAction(null)}
          onConfirm={handleBulkApprove}
          title="Approve Selected Submissions?"
          message={`This will approve ${selectedIds.size} selected submission(s).`}
          confirmLabel="Approve All"
          confirmColor="green"
          isProcessing={isProcessing}
          icon="✅"
        />

        {/* Bulk Reject Confirmation Modal */}
        <ConfirmModal
          isOpen={bulkAction === 'reject'}
          onClose={() => setBulkAction(null)}
          onConfirm={handleBulkReject}
          title="Reject Selected Submissions?"
          message={`This will reject ${selectedIds.size} selected submission(s).`}
          confirmLabel="Reject All"
          confirmColor="red"
          isProcessing={isProcessing}
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