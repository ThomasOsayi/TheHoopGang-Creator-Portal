// src/app/admin/redemptions/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Navbar, 
  AnimatedCounter,
  FilterPill,
  SuccessAnimation,
  PageHeader
} from '@/components/ui';
import { ProtectedRoute } from '@/components/auth';
import { auth } from '@/lib/firebase';
import { Redemption, RedemptionStatus, RedemptionSource } from '@/types';

// ============================================
// Types
// ============================================
interface EnrichedRedemption extends Redemption {
  creatorName?: string;
  creatorHandle?: string;
  creatorEmail?: string;
  rewardIcon?: string;
  rewardValue?: string;
  // Note: cashMethod and cashHandle are already inherited from Redemption interface
}

type StatusFilterType = 'all' | RedemptionStatus;
type SourceFilterType = 'all' | RedemptionSource;

// ============================================
// Status Badge Component
// ============================================
function StatusBadge({ status }: { status: RedemptionStatus }) {
  const config: Record<RedemptionStatus, { bg: string; text: string; border: string; label: string; icon: string }> = {
    awaiting_claim: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Awaiting Claim', icon: '⏳' },
    ready_to_fulfill: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Ready to Fulfill', icon: '✓' },
    fulfilled: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Fulfilled', icon: '📦' },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'Rejected', icon: '✕' },
  };

  const style = config[status] || config.awaiting_claim;

  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${style.bg} ${style.text} border ${style.border} inline-flex items-center gap-1.5`}>
      <span>{style.icon}</span>
      {style.label}
    </span>
  );
}

// ============================================
// Source Badge Component
// ============================================
function SourceBadge({ source }: { source: RedemptionSource }) {
  const config: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    volume_win: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Volume Win', icon: '🏆' },
    gmv_win: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'GMV Win', icon: '💰' },
    milestone_submission: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Milestone', icon: '⭐' },
    competition_win: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'Competition', icon: '🎯' },
    manual: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', label: 'Manual', icon: '✏️' },
  };

  // Handle source mapping
  const sourceKey = source === 'milestone_submission' ? 'milestone_submission' : source;
  const style = config[sourceKey] || config.manual;

  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${style.bg} ${style.text} inline-flex items-center gap-1`}>
      <span>{style.icon}</span>
      {style.label}
    </span>
  );
}

// ============================================
// Stat Card Component
// ============================================
interface StatCardProps {
  label: string;
  value: number;
  color: 'white' | 'yellow' | 'blue' | 'green' | 'red';
  isHighlighted?: boolean;
  onClick?: () => void;
  isActive?: boolean;
}

function StatCard({ label, value, color, isHighlighted, onClick, isActive }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    white: 'text-white',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
  };

  return (
    <button
      onClick={onClick}
      className={`relative bg-zinc-900/50 rounded-2xl p-5 transition-all duration-300 cursor-pointer text-left w-full
        ${isHighlighted && value > 0 
          ? 'bg-yellow-500/10 border-2 border-yellow-500/30 hover:border-yellow-500/50' 
          : `border border-zinc-800 hover:border-zinc-700 ${isActive ? 'border-orange-500' : ''}`
        }`}
      style={isHighlighted && value > 0 ? { boxShadow: '0 0 25px -5px rgba(234, 179, 8, 0.3)' } : {}}
    >
      <div className={`text-3xl font-bold mb-1 ${colorClasses[color]}`}>
        <AnimatedCounter value={value} />
      </div>
      <div className={`text-sm ${isHighlighted && value > 0 ? 'text-yellow-400/70' : 'text-zinc-500'}`}>
        {label}
      </div>
    </button>
  );
}

// ============================================
// Redemption Row Component
// ============================================
interface RedemptionRowProps {
  redemption: EnrichedRedemption;
  onApprove: () => void;
  onReject: () => void;
  onFulfill: () => void;
  onView: () => void;
}

function RedemptionRow({ redemption, onApprove, onReject, onFulfill, onView }: RedemptionRowProps) {
  const needsAction = redemption.status === 'awaiting_claim' || redemption.status === 'ready_to_fulfill';

  const formatDate = (date: Date): { date: string; time: string } => {
    const d = new Date(date);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  };

  const dateInfo = formatDate(redemption.createdAt);

  // Get reward icon based on reward name or type
  const getRewardIcon = () => {
    const name = redemption.rewardName?.toLowerCase() || '';
    if (name.includes('cash') || name.includes('$')) return '💵';
    if (name.includes('credit') || name.includes('store')) return '🎁';
    if (name.includes('product') || name.includes('free')) return '👕';
    if (name.includes('milestone') || name.includes('bonus')) return '⭐';
    if (name.includes('gmv') || name.includes('winner')) return '🏆';
    return '💰';
  };

  return (
    <tr className={`border-b border-zinc-800/50 transition-all duration-200 hover:bg-zinc-800/30 ${needsAction ? 'bg-yellow-500/5' : ''}`}>
      {/* Creator */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold">
            {(redemption.creatorName || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white font-medium">{redemption.creatorName || 'Unknown'}</div>
            <div className="text-zinc-500 text-sm">@{redemption.creatorHandle || 'unknown'}</div>
          </div>
        </div>
      </td>

      {/* Reward */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getRewardIcon()}</span>
          <div>
            <div className="text-white">{redemption.rewardName}</div>
            <div className="text-zinc-500 text-sm">
              {redemption.cashValue ? `$${redemption.cashValue}` : 
               redemption.cashAmount ? `$${redemption.cashAmount.toFixed(2)}` : 
               redemption.rewardValue || ''}
            </div>
            {/* Payment info - show when creator has claimed */}
            {redemption.cashMethod && redemption.cashHandle && (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-md capitalize">
                  {redemption.cashMethod}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {redemption.cashHandle}
                </span>
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Source */}
      <td className="py-4 px-4">
        <SourceBadge source={redemption.source} />
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <StatusBadge status={redemption.status} />
      </td>

      {/* Date */}
      <td className="py-4 px-4">
        <div className="text-zinc-300">{dateInfo.date}</div>
        <div className="text-zinc-500 text-xs">{dateInfo.time}</div>
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          {redemption.status === 'awaiting_claim' && (
            <span className="text-zinc-500 text-sm italic">Waiting for creator...</span>
          )}
          {redemption.status === 'ready_to_fulfill' && (
            <button
              onClick={onFulfill}
              className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
            >
              {redemption.cashMethod ? 'Fulfill Payment' : 'Mark Fulfilled'}
            </button>
          )}
          {(redemption.status === 'fulfilled' || redemption.status === 'rejected') && (
            <button
              onClick={onView}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              View Details
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ============================================
// Main Page Component
// ============================================
export default function AdminRedemptionsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data state
  const [redemptions, setRedemptions] = useState<EnrichedRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRedemption, setSelectedRedemption] = useState<EnrichedRedemption | null>(null);

  // Form state
  const [fulfillmentNotes, setFulfillmentNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Success animation
  const [successAnimation, setSuccessAnimation] = useState<{ icon: string; message: string } | null>(null);

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
  // Data Fetching
  // ============================================
  const getAuthToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  const loadRedemptions = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/redemptions', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch redemptions');

      const data = await response.json();
      
      // Enrich with handle from email or creator name
      const enriched = (data.redemptions || []).map((r: EnrichedRedemption) => ({
        ...r,
        creatorHandle: r.creatorHandle || r.creatorEmail?.split('@')[0] || 'unknown',
      }));
      
      setRedemptions(enriched);
    } catch (err) {
      console.error('Error loading redemptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadRedemptions();
    }
  }, [user, isAdmin]);

  // ============================================
  // Computed Values
  // ============================================
  const stats = useMemo(() => ({
    total: redemptions.length,
    pending: redemptions.filter(r => r.status === 'awaiting_claim').length,
    approved: redemptions.filter(r => r.status === 'ready_to_fulfill').length,
    fulfilled: redemptions.filter(r => r.status === 'fulfilled').length,
    rejected: redemptions.filter(r => r.status === 'rejected').length,
  }), [redemptions]);

  const filteredRedemptions = useMemo(() => {
    return redemptions.filter(r => {
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      
      // Source filter
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = r.creatorName?.toLowerCase().includes(query);
        const matchesHandle = r.creatorHandle?.toLowerCase().includes(query);
        const matchesReward = r.rewardName?.toLowerCase().includes(query);
        if (!matchesName && !matchesHandle && !matchesReward) return false;
      }
      
      return true;
    });
  }, [redemptions, statusFilter, sourceFilter, searchQuery]);

  // ============================================
  // Handlers
  // ============================================
  const handleApprove = (redemption: EnrichedRedemption) => {
    setSelectedRedemption(redemption);
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedRedemption) return;
    
    setIsProcessing(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/admin/redemptions/${selectedRedemption.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ready_to_fulfill' }),
      });

      if (!response.ok) throw new Error('Failed to approve');

      setShowApproveModal(false);
      setSelectedRedemption(null);
      setSuccessAnimation({ icon: '✅', message: 'Redemption Approved!' });
      await loadRedemptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFulfill = (redemption: EnrichedRedemption) => {
    setSelectedRedemption(redemption);
    setFulfillmentNotes('');
    setShowFulfillModal(true);
  };

  const confirmFulfill = async () => {
    if (!selectedRedemption) return;
    
    setIsProcessing(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/admin/redemptions/${selectedRedemption.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'fulfilled',
          notes: fulfillmentNotes.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to fulfill');

      setShowFulfillModal(false);
      setSelectedRedemption(null);
      setFulfillmentNotes('');
      setSuccessAnimation({ icon: '📦', message: 'Marked as Fulfilled!' });
      await loadRedemptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to fulfill');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = (redemption: EnrichedRedemption) => {
    setSelectedRedemption(redemption);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedRedemption || !rejectionReason.trim()) return;
    
    setIsProcessing(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/admin/redemptions/${selectedRedemption.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'rejected',
          notes: rejectionReason.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to reject');

      setShowRejectModal(false);
      setSelectedRedemption(null);
      setRejectionReason('');
      setSuccessAnimation({ icon: '🚫', message: 'Redemption Rejected' });
      await loadRedemptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleView = (redemption: EnrichedRedemption) => {
    setSelectedRedemption(redemption);
    setShowDetailsModal(true);
  };

  const handleStatCardClick = (status: StatusFilterType) => {
    setStatusFilter(prev => prev === status ? 'all' : status);
  };

  // Get reward icon for modals
  const getRewardIcon = (redemption: EnrichedRedemption | null) => {
    if (!redemption) return '💰';
    const name = redemption.rewardName?.toLowerCase() || '';
    if (name.includes('cash') || name.includes('$')) return '💵';
    if (name.includes('credit') || name.includes('store')) return '🎁';
    if (name.includes('product') || name.includes('free')) return '👕';
    if (name.includes('milestone') || name.includes('bonus')) return '⭐';
    if (name.includes('gmv') || name.includes('winner')) return '🏆';
    return '💰';
  };

  // ============================================
  // Render Loading
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

  // ============================================
  // Main Render
  // ============================================
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        {/* Background Gradient Orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
        </div>

        <Navbar />

        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 pt-24">
          {/* Header */}
          <PageHeader 
            title="Redemptions"
            subtitle="Track and fulfill creator redemptions"
            icon="🎟️"
            accentColor="green"
            align="left"
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard
              label="Total"
              value={stats.total}
              color="white"
              onClick={() => handleStatCardClick('all')}
              isActive={statusFilter === 'all'}
            />
            <StatCard
              label="Awaiting Claim"
              value={stats.pending}
              color="yellow"
              isHighlighted={true}
              onClick={() => handleStatCardClick('awaiting_claim')}
              isActive={statusFilter === 'awaiting_claim'}
            />
            <StatCard
              label="Ready to Fulfill"
              value={stats.approved}
              color="blue"
              onClick={() => handleStatCardClick('ready_to_fulfill')}
              isActive={statusFilter === 'ready_to_fulfill'}
            />
            <StatCard
              label="Fulfilled"
              value={stats.fulfilled}
              color="green"
              onClick={() => handleStatCardClick('fulfilled')}
              isActive={statusFilter === 'fulfilled'}
            />
            <StatCard
              label="Rejected"
              value={stats.rejected}
              color="red"
              onClick={() => handleStatCardClick('rejected')}
              isActive={statusFilter === 'rejected'}
            />
          </div>

          {/* Table Section */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Filters Header */}
            <div className="p-6 border-b border-zinc-800">
              {/* Search */}
              <div className="relative max-w-md mb-4">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, handle, or reward..."
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap gap-2 mb-3">
                <FilterPill
                  label="All"
                  active={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                  count={stats.total}
                  color="orange"
                />
                <FilterPill
                  label="⏳ Awaiting Claim"
                  active={statusFilter === 'awaiting_claim'}
                  onClick={() => setStatusFilter('awaiting_claim')}
                  count={stats.pending}
                  color="yellow"
                />
                <FilterPill
                  label="✓ Ready to Fulfill"
                  active={statusFilter === 'ready_to_fulfill'}
                  onClick={() => setStatusFilter('ready_to_fulfill')}
                  count={stats.approved}
                  color="blue"
                />
                <FilterPill
                  label="📦 Fulfilled"
                  active={statusFilter === 'fulfilled'}
                  onClick={() => setStatusFilter('fulfilled')}
                  count={stats.fulfilled}
                  color="green"
                />
                <FilterPill
                  label="✕ Rejected"
                  active={statusFilter === 'rejected'}
                  onClick={() => setStatusFilter('rejected')}
                  count={stats.rejected}
                  color="red"
                />
              </div>

              {/* Source Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-800">
                <span className="text-zinc-500 text-sm mr-2">Source:</span>
                <FilterPill
                  label="All Sources"
                  active={sourceFilter === 'all'}
                  onClick={() => setSourceFilter('all')}
                  color="orange"
                />
                <FilterPill
                  label="🏆 Volume Win"
                  active={sourceFilter === 'volume_win'}
                  onClick={() => setSourceFilter('volume_win')}
                />
                <FilterPill
                  label="💰 GMV Win"
                  active={sourceFilter === 'gmv_win'}
                  onClick={() => setSourceFilter('gmv_win')}
                />
                <FilterPill
                  label="⭐ Milestone"
                  active={sourceFilter === 'milestone_submission'}
                  onClick={() => setSourceFilter('milestone_submission')}
                />
                <FilterPill
                  label="✏️ Manual"
                  active={sourceFilter === 'manual' as SourceFilterType}
                  onClick={() => setSourceFilter('manual' as SourceFilterType)}
                />
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={loadRedemptions}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : redemptions.length === 0 ? (
              /* Empty State */
              <div className="py-16 text-center">
                <div className="relative inline-block mb-6">
                  <div className="text-7xl animate-bounce">🎁</div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-zinc-800 rounded-full blur-md" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">No Redemptions Yet</h2>
                <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
                  Redemptions are created automatically when creators win competitions or hit milestone thresholds. They'll appear here for you to approve and fulfill.
                </p>
                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                  <div className="p-4 bg-zinc-800/50 rounded-xl">
                    <div className="text-2xl mb-2">🏆</div>
                    <div className="text-zinc-400 text-sm">Volume Competition Wins</div>
                  </div>
                  <div className="p-4 bg-zinc-800/50 rounded-xl">
                    <div className="text-2xl mb-2">💰</div>
                    <div className="text-zinc-400 text-sm">GMV Leaderboard Wins</div>
                  </div>
                  <div className="p-4 bg-zinc-800/50 rounded-xl">
                    <div className="text-2xl mb-2">⭐</div>
                    <div className="text-zinc-400 text-sm">Milestone Achievements</div>
                  </div>
                </div>
              </div>
            ) : filteredRedemptions.length === 0 ? (
              /* No Results State */
              <div className="py-16 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-zinc-400">No redemptions match your filters</p>
                <button
                  onClick={() => { setStatusFilter('all'); setSourceFilter('all'); setSearchQuery(''); }}
                  className="mt-3 text-orange-400 hover:text-orange-300 text-sm"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/50">
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Creator</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Reward</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Source</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRedemptions.map((redemption) => (
                      <RedemptionRow
                        key={redemption.id}
                        redemption={redemption}
                        onApprove={() => handleApprove(redemption)}
                        onReject={() => handleReject(redemption)}
                        onFulfill={() => handleFulfill(redemption)}
                        onView={() => handleView(redemption)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Footer */}
            {filteredRedemptions.length > 0 && (
              <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30">
                <span className="text-zinc-500 text-sm">
                  Showing {filteredRedemptions.length} of {redemptions.length} redemptions
                </span>
              </div>
            )}
          </div>
        </main>

        {/* APPROVE MODAL */}
        {showApproveModal && selectedRedemption && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full animate-scale-in">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-white mb-2">Approve Redemption?</h3>
                <p className="text-zinc-400">This will approve the reward for fulfillment.</p>
              </div>

              {/* Redemption preview */}
              <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{getRewardIcon(selectedRedemption)}</span>
                  <div>
                    <div className="text-white font-medium">{selectedRedemption.rewardName}</div>
                    <div className="text-zinc-500 text-sm">
                      {selectedRedemption.cashAmount ? `$${selectedRedemption.cashAmount.toFixed(2)}` : ''}
                    </div>
                  </div>
                </div>
                <div className="text-zinc-400 text-sm">
                  For: <span className="text-white">{selectedRedemption.creatorName}</span> (@{selectedRedemption.creatorHandle})
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowApproveModal(false)}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApprove}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Approving...
                    </>
                  ) : (
                    'Approve'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FULFILL MODAL */}
        {showFulfillModal && selectedRedemption && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full animate-scale-in">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{selectedRedemption.cashMethod ? '💸' : '📦'}</span>
                <h3 className="text-xl font-bold text-white">
                  {selectedRedemption.cashMethod ? 'Fulfill Payment' : 'Mark as Fulfilled'}
                </h3>
              </div>

              {/* Redemption preview */}
              <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getRewardIcon(selectedRedemption)}</span>
                  <div>
                    <div className="text-white font-medium">{selectedRedemption.rewardName}</div>
                    <div className="text-zinc-500 text-sm">For: {selectedRedemption.creatorName}</div>
                  </div>
                </div>
              </div>

              {/* Payment Details - Show if creator provided payment info */}
              {selectedRedemption.cashMethod && selectedRedemption.cashHandle && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                  <div className="text-blue-400 text-sm font-medium mb-3">💳 Payment Details</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Amount</span>
                      <span className="text-white font-bold text-lg">
                        ${selectedRedemption.cashValue || selectedRedemption.cashAmount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Method</span>
                      <span className="text-white capitalize font-medium">{selectedRedemption.cashMethod}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Send To</span>
                      <span className="text-white font-mono bg-zinc-800 px-2 py-1 rounded text-sm">
                        {selectedRedemption.cashHandle}
                      </span>
                    </div>
                  </div>
                  
                  {/* Copy button for handle */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedRedemption.cashHandle || '');
                      // Optional: show a quick toast or change button text
                    }}
                    className="mt-3 w-full py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy {selectedRedemption.cashMethod} Handle
                  </button>
                </div>
              )}

              <div className="mb-6">
                <label className="text-zinc-400 text-sm block mb-2">Fulfillment Notes (optional)</label>
                <textarea
                  value={fulfillmentNotes}
                  onChange={(e) => setFulfillmentNotes(e.target.value)}
                  placeholder={selectedRedemption.cashMethod 
                    ? `e.g., ${selectedRedemption.cashMethod} transfer sent, confirmation #...` 
                    : "e.g., Tracking number, confirmation details..."}
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowFulfillModal(false)}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmFulfill}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    selectedRedemption.cashMethod ? 'Confirm Payment Sent' : 'Mark Fulfilled'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT MODAL */}
        {showRejectModal && selectedRedemption && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full animate-scale-in">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🚫</span>
                <h3 className="text-xl font-bold text-white">Reject Redemption</h3>
              </div>

              {/* Redemption preview */}
              <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getRewardIcon(selectedRedemption)}</span>
                  <div>
                    <div className="text-white font-medium">{selectedRedemption.rewardName}</div>
                    <div className="text-zinc-500 text-sm">For: {selectedRedemption.creatorName}</div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-zinc-400 text-sm block mb-2">
                  Rejection Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Why is this redemption being rejected?"
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              {/* Quick reasons */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setRejectionReason('Duplicate entry')}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-xs hover:bg-zinc-700 transition-colors"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => setRejectionReason('Creator ineligible')}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-xs hover:bg-zinc-700 transition-colors"
                >
                  Ineligible
                </button>
                <button
                  onClick={() => setRejectionReason('Fraudulent activity detected')}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-xs hover:bg-zinc-700 transition-colors"
                >
                  Fraud
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Rejecting...
                    </>
                  ) : (
                    'Reject'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DETAILS MODAL */}
        {showDetailsModal && selectedRedemption && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full animate-scale-in">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Redemption Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Reward */}
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getRewardIcon(selectedRedemption)}</span>
                    <div>
                      <div className="text-white font-medium text-lg">{selectedRedemption.rewardName}</div>
                      <div className="text-zinc-400">
                        {selectedRedemption.cashAmount ? `$${selectedRedemption.cashAmount.toFixed(2)}` : selectedRedemption.rewardValue || ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Creator</span>
                    <span className="text-white">{selectedRedemption.creatorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Source</span>
                    <SourceBadge source={selectedRedemption.source} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Status</span>
                    <StatusBadge status={selectedRedemption.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Requested</span>
                    <span className="text-white">
                      {new Date(selectedRedemption.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })} at {new Date(selectedRedemption.createdAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {selectedRedemption.fulfilledAt && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Fulfilled</span>
                      <span className="text-green-400">
                        {new Date(selectedRedemption.fulfilledAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedRedemption.notes && selectedRedemption.status === 'rejected' && (
                    <div className="pt-3 border-t border-zinc-800">
                      <span className="text-zinc-500 text-sm">Rejection Reason:</span>
                      <p className="text-red-400 mt-1">{selectedRedemption.notes}</p>
                    </div>
                  )}
                  {selectedRedemption.notes && selectedRedemption.status === 'fulfilled' && (
                    <div className="pt-3 border-t border-zinc-800">
                      <span className="text-zinc-500 text-sm">Fulfillment Notes:</span>
                      <p className="text-zinc-300 mt-1">{selectedRedemption.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full mt-6 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Success Animation */}
        {successAnimation !== null && (
          <SuccessAnimation
            icon={successAnimation.icon}
            message={successAnimation.message}
            onComplete={() => setSuccessAnimation(null)}
          />
        )}

        {/* Global Styles */}
        <style jsx global>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scale-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fade-in 0.2s ease-out;
          }
          .animate-scale-in {
            animation: scale-in 0.2s ease-out;
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}