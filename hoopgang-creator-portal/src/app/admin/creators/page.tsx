// src/app/admin/creators/page.tsx

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreatorWithCollab, CollaborationStatus, DashboardStats } from '@/types';
import { getAllCreatorsWithCollabs, getDashboardStats, updateCollaboration } from '@/lib/firestore';
import { 
  useToast, 
  Pagination, 
  StatusBadge,
  AnimatedCounter,
  GlowCard,
  FilterPill,
  ConfirmModal,
  SuccessAnimation,
  CreatorSourceBadge,
  PageHeader,
} from '@/components/ui';
import { ApplicationReviewModal } from '@/components/creators';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/auth-context';
import { getCurrentWeek } from '@/lib/week-utils';

// ============================================
// Quick Action Card Component
// ============================================
interface QuickActionCardProps {
  icon: string;
  label: string;
  count: number;
  color: 'yellow' | 'purple' | 'orange' | 'green';
  urgent?: boolean;
  active?: boolean;
  onClick: () => void;
}

function QuickActionCard({ icon, label, count, color, urgent, active, onClick }: QuickActionCardProps) {
  const colorMap = {
    yellow: { text: 'text-yellow-400', iconBg: 'bg-yellow-500/20', glowColor: 'yellow' as const },
    purple: { text: 'text-purple-400', iconBg: 'bg-purple-500/20', glowColor: 'purple' as const },
    orange: { text: 'text-orange-400', iconBg: 'bg-orange-500/20', glowColor: 'orange' as const },
    green: { text: 'text-green-400', iconBg: 'bg-green-500/20', glowColor: 'green' as const },
  };
  
  const styles = colorMap[color];

  return (
    <div onClick={onClick} className="cursor-pointer">
      <GlowCard glowColor={styles.glowColor} urgent={urgent} active={active}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${styles.iconBg} flex items-center justify-center text-2xl`}>
            {icon}
          </div>
          <div>
            <div className="text-zinc-400 text-sm">{label}</div>
            <div className={`text-3xl font-bold ${styles.text}`}>
              <AnimatedCounter value={count} />
            </div>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}

// ============================================
// Content Progress Component
// ============================================
function ContentProgress({ submitted, total }: { submitted: number; total: number }) {
  const percentage = total > 0 ? (submitted / total) * 100 : 0;
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            percentage === 100 ? 'bg-green-500' : 'bg-orange-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm text-zinc-400">{submitted}/{total}</span>
    </div>
  );
}

// ============================================
// Tracking Badge Component
// ============================================
function TrackingBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-zinc-600">—</span>;
  
  const config: Record<string, { icon: string; text: string; label: string }> = {
    pending: { icon: '📦', text: 'text-yellow-400', label: 'In Transit' },
    shipped: { icon: '🚚', text: 'text-purple-400', label: 'Shipped' },
    delivered: { icon: '✓', text: 'text-green-400', label: 'Delivered' },
    in_transit: { icon: '🚚', text: 'text-purple-400', label: 'Shipped' },
  };
  
  const style = config[status] || config.pending;
  
  return (
    <div className={`flex items-center gap-1.5 ${style.text}`}>
      <span>{style.icon}</span>
      <span className="text-sm">{style.label}</span>
    </div>
  );
}

// ============================================
// Creator Row Component
// ============================================
interface CreatorRowProps {
  creator: CreatorWithCollab;
  onView: (id: string) => void;
  onReview: (creator: CreatorWithCollab) => void;
  onNudge: (creator: CreatorWithCollab) => void;
}

function CreatorRow({ creator, onView, onReview, onNudge }: CreatorRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // TikTok creators don't have collaborations - they're always "active" for content submission
  const isTikTokCreator = creator.source === 'tiktok';
  const status = isTikTokCreator ? 'active' : (creator.collaboration?.status || 'pending');
  // TikTok creators don't need the traditional approval flow
  const needsAttention = !isTikTokCreator && (status === 'pending' || status === 'delivered');
  
  // Get display values
  const followers = Math.max(creator.tiktokFollowers, creator.instagramFollowers);
  const formattedFollowers = followers >= 1000000 
    ? `${(followers / 1000000).toFixed(1)}M`
    : followers >= 1000 
      ? `${Math.round(followers / 1000)}K`
      : followers.toString();
  
  const product = creator.collaboration?.product;
  const size = creator.collaboration?.size;
  const trackingStatus = creator.collaboration?.trackingNumber ? 
    (creator.collaboration?.status === 'delivered' ? 'delivered' : 'shipped') : null;
  const contentSubmitted = creator.collaboration?.contentSubmissions?.length || 0;

  // Determine action button
  const getActionButton = () => {
    // TikTok Shop creators don't need traditional review - they're here to submit content
    const isTikTokCreator = creator.source === 'tiktok';
    
    if (isTikTokCreator) {
      // TikTok creators just need a View button since they handle collabs through TikTok Shop
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onView(creator.id); }}
          className="px-4 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          View
        </button>
      );
    }

    // Instagram/Manual creators follow the traditional flow
    switch (status) {
      case 'pending':
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onReview(creator); }}
            className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Review
          </button>
        );
      case 'delivered':
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onNudge(creator); }}
            className="px-4 py-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-sm font-medium hover:bg-orange-500/30 transition-colors"
          >
            Nudge
          </button>
        );
      case 'completed':
        return (
          <span className="px-4 py-1.5 text-green-400 text-sm font-medium">
            ✓ Done
          </span>
        );
      default:
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onView(creator.id); }}
            className="px-4 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            View
          </button>
        );
    }
  };

  return (
    <tr 
      className={`border-b border-zinc-800/50 transition-all duration-200 cursor-pointer ${
        isHovered ? 'bg-zinc-800/30' : ''
      } ${needsAttention ? 'bg-yellow-500/5' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onView(creator.id)}
    >
      {/* Creator */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
            needsAttention 
              ? 'bg-gradient-to-br from-yellow-500 to-orange-500' 
              : 'bg-gradient-to-br from-orange-500 to-amber-600'
          }`}>
            {creator.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white font-medium">{creator.fullName}</div>
            <div className="text-zinc-500 text-sm">@{creator.tiktokHandle || creator.instagramHandle}</div>
          </div>
        </div>
      </td>
      
      {/* Source */}
      <td className="py-4 px-4">
        <CreatorSourceBadge source={creator.source || 'manual'} size="sm" />
      </td>
      
      {/* Followers */}
      <td className="py-4 px-4">
        <span className="text-zinc-300">{formattedFollowers}</span>
      </td>
      
      {/* Status */}
      <td className="py-4 px-4">
        {isTikTokCreator ? (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            Active
          </span>
        ) : (
          <StatusBadge status={status as any} />
        )}
      </td>
      
      {/* Product */}
      <td className="py-4 px-4">
        {product ? (
          <div>
            <div className="text-zinc-300">{product}</div>
            {size && <div className="text-zinc-500 text-xs">{size}</div>}
          </div>
        ) : (
          <span className="text-zinc-600">—</span>
        )}
      </td>
      
      {/* Tracking */}
      <td className="py-4 px-4">
        <TrackingBadge status={trackingStatus} />
      </td>
      
      {/* Content */}
      <td className="py-4 px-4">
        {['approved', 'shipped', 'delivered', 'completed'].includes(status) ? (
          <ContentProgress submitted={contentSubmitted} total={1} />
        ) : (
          <span className="text-zinc-600">—</span>
        )}
      </td>
      
      {/* Action */}
      <td className="py-4 px-4">
        {getActionButton()}
      </td>
    </tr>
  );
}

// ============================================
// Main Admin Dashboard
// ============================================
export default function AdminCreatorsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  
  // Data state
  const [creators, setCreators] = useState<CreatorWithCollab[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'needs-action' | 'pending' | 'active' | 'completed' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDocs, setLastDocs] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 10;
  
  // Modal state
  const [reviewingCreator, setReviewingCreator] = useState<CreatorWithCollab | null>(null);
  const [nudgingCreator, setNudgingCreator] = useState<CreatorWithCollab | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<{ icon: string; message: string } | null>(null);

  // V3 Stats state
  const [v3Stats, setV3Stats] = useState<{
    weeklySubmissions: number;
    totalSubmissions: number;
    activeCreators: number;
    pendingRedemptions: number;
    totalPaidOut: number;
  } | null>(null);
  const [v3Loading, setV3Loading] = useState(true);

  // ============================================
  // Data Fetching
  // ============================================
  
  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsData = await getDashboardStats();
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, []);

  // Fetch V3 stats
  useEffect(() => {
    const fetchV3Stats = async () => {
      if (!user) return;
      
      setV3Loading(true);
      try {
        const idToken = await user.getIdToken();
        const currentWeek = getCurrentWeek();
        
        // Parallel fetch for better performance
        const [submissionsRes, weeklyRes, leaderboardRes, redemptionsRes] = await Promise.all([
          fetch('/api/admin/submissions?limit=1000', { headers: { 'Authorization': `Bearer ${idToken}` } }),
          fetch(`/api/admin/submissions?weekOf=${currentWeek}&limit=1000`, { headers: { 'Authorization': `Bearer ${idToken}` } }),
          fetch(`/api/leaderboard?period=${currentWeek}&type=volume`, { headers: { 'Authorization': `Bearer ${idToken}` } }),
          fetch('/api/admin/redemptions', { headers: { 'Authorization': `Bearer ${idToken}` } }),
        ]);

        let totalSubmissions = 0;
        let weeklySubmissions = 0;
        let activeCreators = 0;
        let pendingRedemptions = 0;
        let totalPaidOut = 0;

        if (submissionsRes.ok) {
          const data = await submissionsRes.json();
          totalSubmissions = data.submissions?.length || 0;
        }

        if (weeklyRes.ok) {
          const data = await weeklyRes.json();
          weeklySubmissions = data.submissions?.length || 0;
        }

        if (leaderboardRes.ok) {
          const data = await leaderboardRes.json();
          activeCreators = data.entries?.length || 0;
        }

        if (redemptionsRes.ok) {
          const data = await redemptionsRes.json();
          const redemptions = data.redemptions || [];
          pendingRedemptions = redemptions.filter((r: any) => r.status === 'awaiting_claim').length;
          totalPaidOut = redemptions
            .filter((r: any) => r.status === 'fulfilled')
            .reduce((sum: number, r: any) => sum + (r.cashAmount || 0), 0);
        }

        setV3Stats({ weeklySubmissions, totalSubmissions, activeCreators, pendingRedemptions, totalPaidOut });
      } catch (error) {
        console.error('Error fetching V3 stats:', error);
      } finally {
        setV3Loading(false);
      }
    };
    
    fetchV3Stats();
  }, [user]);

  // Fetch creators
  const fetchCreators = useCallback(async (pageLastDoc?: any, isNewFilter = false) => {
    setLoading(true);
    try {
      const result = await getAllCreatorsWithCollabs({
        limit: PAGE_SIZE,
        lastDoc: pageLastDoc,
      });

      setCreators(result.creators);
      setHasMore(result.hasMore);

      if (isNewFilter) {
        setCurrentPage(1);
        setLastDocs(result.lastDoc ? [result.lastDoc] : []);
      } else if (result.lastDoc) {
        setLastDocs((prev) => {
          const newDocs = [...prev];
          newDocs[currentPage - 1] = result.lastDoc;
          return newDocs;
        });
      }
    } catch (err) {
      console.error('Error fetching creators:', err);
      showToast('Failed to load creators', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, showToast]);

  useEffect(() => {
    fetchCreators(undefined, true);
  }, []);

  // ============================================
  // Filtering Logic
  // ============================================
  
  const filteredCreators = useMemo(() => {
    let filtered = [...creators];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (creator) =>
          creator.fullName.toLowerCase().includes(query) ||
          creator.tiktokHandle?.toLowerCase().includes(query) ||
          creator.instagramHandle?.toLowerCase().includes(query)
      );
    }

    // Status filter
    switch (activeFilter) {
      case 'pending':
        filtered = filtered.filter((c) => c.collaboration?.status === 'pending');
        break;
      case 'active':
        filtered = filtered.filter((c) => 
          ['approved', 'shipped', 'delivered'].includes(c.collaboration?.status || '')
        );
        break;
      case 'needs-action':
        filtered = filtered.filter((c) => 
          c.collaboration?.status === 'pending' || c.collaboration?.status === 'delivered'
        );
        break;
      case 'completed':
        filtered = filtered.filter((c) => c.collaboration?.status === 'completed');
        break;
      case 'delivered':
        filtered = filtered.filter((c) => c.collaboration?.status === 'delivered');
        break;
    }

    return filtered;
  }, [creators, searchQuery, activeFilter]);

  // Filter counts
  const filterCounts = useMemo(() => {
    return {
      all: creators.length,
      needsAction: creators.filter((c) => 
        c.collaboration?.status === 'pending' || c.collaboration?.status === 'delivered'
      ).length,
      pending: creators.filter((c) => c.collaboration?.status === 'pending').length,
      active: creators.filter((c) => 
        ['approved', 'shipped', 'delivered'].includes(c.collaboration?.status || '')
      ).length,
    };
  }, [creators]);

  // ============================================
  // Actions
  // ============================================
  
  const handleViewCreator = (id: string) => {
    router.push(`/admin/creators/${id}`);
  };

  const handleReview = (creator: CreatorWithCollab) => {
    setReviewingCreator(creator);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      const creator = creators.find((c) => c.id === id);
      if (!creator?.collaboration) {
        showToast('No active collaboration to approve', 'error');
        return;
      }

      await updateCollaboration(creator.id, creator.collaboration.id, { 
        status: 'approved' as CollaborationStatus 
      });

      // Send approval email
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

      // Show success animation
      setSuccessAnimation({ icon: '✅', message: 'Creator Approved!' });
      
      // Refresh data
      const statsData = await getDashboardStats();
      setStats(statsData);
      await fetchCreators();
      setReviewingCreator(null);
    } catch (error) {
      console.error('Error approving creator:', error);
      showToast('Failed to approve creator', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async (id: string) => {
    setActionLoading(true);
    try {
      const creator = creators.find((c) => c.id === id);
      if (!creator?.collaboration) {
        showToast('No active collaboration to deny', 'error');
        return;
      }

      await updateCollaboration(creator.id, creator.collaboration.id, { 
        status: 'denied' as CollaborationStatus 
      });

      // Show success animation
      setSuccessAnimation({ icon: '🚫', message: 'Application Denied' });

      // Refresh data
      const statsData = await getDashboardStats();
      setStats(statsData);
      await fetchCreators();
      setReviewingCreator(null);
    } catch (error) {
      console.error('Error denying creator:', error);
      showToast('Failed to deny creator', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNudge = async (creator: CreatorWithCollab) => {
    setNudgingCreator(creator);
  };

  const confirmNudge = async () => {
    if (!nudgingCreator) return;
    
    setActionLoading(true);
    try {
      // Send nudge email
      const firstName = nudgingCreator.fullName.split(' ')[0];
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'nudge',
          to: nudgingCreator.email,
          creatorName: firstName,
        }),
      });

      setSuccessAnimation({ icon: '📧', message: 'Reminder Sent!' });
      setNudgingCreator(null);
    } catch (error) {
      console.error('Error sending nudge:', error);
      showToast('Failed to send reminder', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNextPage = () => {
    const lastDoc = lastDocs[currentPage - 1];
    if (lastDoc && hasMore) {
      setCurrentPage((prev) => prev + 1);
      fetchCreators(lastDoc);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      const lastDoc = newPage > 1 ? lastDocs[newPage - 2] : undefined;
      fetchCreators(lastDoc);
    }
  };

  // ============================================
  // Render
  // ============================================
  
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        {/* Background Gradient Orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-float-drift" />
          <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <PageHeader 
            title="Admin Dashboard"
            subtitle="Manage creator applications and collaborations"
            icon="👑"
            accentColor="gold"
            align="left"
          />

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <QuickActionCard
              icon="⏳"
              label="Pending Review"
              count={stats?.pendingReview || 0}
              color="yellow"
              urgent={(stats?.pendingReview || 0) > 0}
              active={activeFilter === 'pending'}
              onClick={() => setActiveFilter(activeFilter === 'pending' ? 'all' : 'pending')}
            />
            <QuickActionCard
              icon="📦"
              label="Active Collabs"
              count={stats?.activeCollabs || 0}
              color="purple"
              active={activeFilter === 'active'}
              onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')}
            />
            <QuickActionCard
              icon="🎬"
              label="Awaiting Content"
              count={creators.filter((c) => c.collaboration?.status === 'delivered').length}
              color="orange"
              urgent={creators.filter((c) => c.collaboration?.status === 'delivered').length > 0}
              active={activeFilter === 'delivered'}
              onClick={() => setActiveFilter(activeFilter === 'delivered' ? 'all' : 'delivered')}
            />
            <QuickActionCard
              icon="✅"
              label="Completed"
              count={stats?.completed || 0}
              color="green"
              active={activeFilter === 'completed'}
              onClick={() => setActiveFilter(activeFilter === 'completed' ? 'all' : 'completed')}
            />
          </div>

          {/* V3 Creator Program Stats */}
          <div 
            className="mb-8 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl transition-all duration-300 hover:border-zinc-700 group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🚀</span> Creator Program (V3)
              </h2>
              <div className="flex gap-2">
                <Link 
                  href="/admin/submissions" 
                  className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
                >
                  View Submissions →
                </Link>
                <span className="text-zinc-600">|</span>
                <Link 
                  href="/admin/redemptions" 
                  className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
                >
                  View Redemptions →
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {v3Loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="text-center p-4 bg-zinc-800/30 rounded-xl animate-pulse">
                    <div className="h-8 bg-zinc-700 rounded w-12 mx-auto mb-2" />
                    <div className="h-4 bg-zinc-700 rounded w-16 mx-auto" />
                  </div>
                ))
              ) : v3Stats ? (
                <>
                  <div className="text-center p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors">
                    <div className="text-2xl font-bold text-blue-400">
                      <AnimatedCounter value={v3Stats.weeklySubmissions} />
                    </div>
                    <div className="text-zinc-500 text-sm">This Week</div>
                  </div>
                  <div className="text-center p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors">
                    <div className="text-2xl font-bold text-zinc-300">
                      <AnimatedCounter value={v3Stats.totalSubmissions} />
                    </div>
                    <div className="text-zinc-500 text-sm">All Time</div>
                  </div>
                  <div className="text-center p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors">
                    <div className="text-2xl font-bold text-green-400">
                      <AnimatedCounter value={v3Stats.activeCreators} />
                    </div>
                    <div className="text-zinc-500 text-sm">Active Creators</div>
                  </div>
                  <div className="text-center p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors">
                    <div className={`text-2xl font-bold ${v3Stats.pendingRedemptions > 0 ? 'text-yellow-400' : 'text-zinc-300'}`}>
                      <AnimatedCounter value={v3Stats.pendingRedemptions} />
                    </div>
                    <div className="text-zinc-500 text-sm">Pending Payouts</div>
                  </div>
                  <div className="text-center p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors">
                    <div className="text-2xl font-bold text-green-400">
                      $<AnimatedCounter value={v3Stats.totalPaidOut} />
                    </div>
                    <div className="text-zinc-500 text-sm">Total Paid Out</div>
                  </div>
                </>
              ) : (
                <div className="col-span-5 text-center text-zinc-500 py-4">
                  Unable to load stats
                </div>
              )}
            </div>
          </div>

          {/* Creators Table Section */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="p-6 border-b border-zinc-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-white">All Creators</h2>
                
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
                    placeholder="Search by name or handle..."
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                </div>
              </div>
              
              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2 mt-4">
                <FilterPill 
                  label="All Creators" 
                  active={activeFilter === 'all'} 
                  onClick={() => setActiveFilter('all')}
                  count={filterCounts.all}
                />
                <FilterPill 
                  label="⚠️ Needs Action" 
                  active={activeFilter === 'needs-action'} 
                  onClick={() => setActiveFilter('needs-action')}
                  count={filterCounts.needsAction}
                />
                <FilterPill 
                  label="⏳ Pending Review" 
                  active={activeFilter === 'pending'} 
                  onClick={() => setActiveFilter('pending')}
                  count={filterCounts.pending}
                />
                <FilterPill 
                  label="📦 Active Collabs" 
                  active={activeFilter === 'active'} 
                  onClick={() => setActiveFilter('active')}
                  count={filterCounts.active}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Creator</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Source</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Followers</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Product</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Tracking</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Content</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b border-zinc-800/50">
                        <td colSpan={8} className="py-4 px-4">
                          <div className="h-10 bg-zinc-800/50 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : filteredCreators.length > 0 ? (
                    filteredCreators.map((creator) => (
                      <CreatorRow
                        key={creator.id}
                        creator={creator}
                        onView={handleViewCreator}
                        onReview={handleReview}
                        onNudge={handleNudge}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="text-4xl mb-3">🔍</div>
                        <div className="text-zinc-400">No creators found</div>
                        <div className="text-zinc-500 text-sm mt-1">Try adjusting your filters</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
              <span className="text-zinc-500 text-sm">
                Showing {filteredCreators.length} of {creators.length} creators
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-zinc-400 text-sm">Page {currentPage}</span>
                <button 
                  onClick={handleNextPage}
                  disabled={!hasMore || loading}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Application Review Modal */}
        <ApplicationReviewModal
          creator={reviewingCreator}
          isOpen={!!reviewingCreator}
          onClose={() => setReviewingCreator(null)}
          onApprove={handleApprove}
          onDeny={handleDeny}
          loading={actionLoading}
        />

        {/* Nudge Confirmation Modal */}
        <ConfirmModal
          isOpen={!!nudgingCreator}
          onClose={() => setNudgingCreator(null)}
          onConfirm={confirmNudge}
          title="Send Reminder?"
          message={`Send a nudge email to ${nudgingCreator?.fullName} to remind them to submit their content?`}
          confirmLabel="Send Reminder"
          confirmColor="orange"
          isProcessing={actionLoading}
          icon="📧"
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