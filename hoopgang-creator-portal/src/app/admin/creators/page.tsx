// src/app/admin/creators/page.tsx

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreatorWithCollab, CollaborationStatus, DashboardStats } from '@/types';
import { getAllCreatorsWithCollabs, getDashboardStats, updateCollaboration } from '@/lib/firestore';
import { StatCard, useToast, Pagination } from '@/components/ui';
import { FilterBar, CreatorTable, ApplicationReviewModal } from '@/components/creators';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/auth-context';
import { getCurrentWeek } from '@/lib/week-utils';

export default function AdminCreatorsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [creators, setCreators] = useState<CreatorWithCollab[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minFollowers, setMinFollowers] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDocs, setLastDocs] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [reviewingCreator, setReviewingCreator] = useState<CreatorWithCollab | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const PAGE_SIZE = 10;

  // V3 Stats state
  const [v3Stats, setV3Stats] = useState<{
    totalSubmissions: number;
    weeklySubmissions: number;
    activeCreatorsThisWeek: number;
    pendingRedemptions: number;
    approvedRedemptions: number;
    totalRewardsValue: number;
  } | null>(null);
  const [v3Loading, setV3Loading] = useState(true);

  // Fetch stats on mount
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
        
        // Fetch submissions stats
        const submissionsResponse = await fetch('/api/admin/submissions?limit=1', {
          headers: { 'Authorization': `Bearer ${idToken}` },
        });
        
        // Fetch leaderboard for active creators count
        const leaderboardResponse = await fetch(
          `/api/leaderboard?period=${currentWeek}&type=volume`,
          { headers: { 'Authorization': `Bearer ${idToken}` } }
        );
        
        // Fetch redemptions
        const redemptionsResponse = await fetch('/api/admin/redemptions', {
          headers: { 'Authorization': `Bearer ${idToken}` },
        });
        
        let totalSubmissions = 0;
        let weeklySubmissions = 0;
        let activeCreatorsThisWeek = 0;
        let pendingRedemptions = 0;
        let approvedRedemptions = 0;
        let totalRewardsValue = 0;
        
        if (submissionsResponse.ok) {
          const data = await submissionsResponse.json();
          totalSubmissions = data.submissions?.length || 0;
        }
        
        // Get weekly count by fetching with week filter
        const weeklyResponse = await fetch(
          `/api/admin/submissions?weekOf=${currentWeek}&limit=1000`,
          { headers: { 'Authorization': `Bearer ${idToken}` } }
        );
        if (weeklyResponse.ok) {
          const weeklyData = await weeklyResponse.json();
          weeklySubmissions = weeklyData.submissions?.length || 0;
        }
        
        if (leaderboardResponse.ok) {
          const data = await leaderboardResponse.json();
          activeCreatorsThisWeek = data.entries?.length || 0;
        }
        
        if (redemptionsResponse.ok) {
          const data = await redemptionsResponse.json();
          const redemptions = data.redemptions || [];
          
          pendingRedemptions = redemptions.filter(
            (r: { status: string }) => r.status === 'pending'
          ).length;
          
          approvedRedemptions = redemptions.filter(
            (r: { status: string }) => r.status === 'approved'
          ).length;
          
          totalRewardsValue = redemptions
            .filter((r: { status: string }) => r.status === 'fulfilled')
            .reduce((sum: number, r: { cashAmount?: number }) => {
              return sum + (r.cashAmount || 0);
            }, 0);
        }
        
        setV3Stats({
          totalSubmissions,
          weeklySubmissions,
          activeCreatorsThisWeek,
          pendingRedemptions,
          approvedRedemptions,
          totalRewardsValue,
        });
      } catch (error) {
        console.error('Error fetching V3 stats:', error);
      } finally {
        setV3Loading(false);
      }
    };
    
    fetchV3Stats();
  }, [user]);

  // Fetch creators with pagination
  const fetchCreators = useCallback(async (pageLastDoc?: any, isNewFilter = false, pageNum?: number) => {
    setLoading(true);
    try {
      // V2: Use getAllCreatorsWithCollabs instead of getAllCreators
      const result = await getAllCreatorsWithCollabs({
        status: (statusFilter as CollaborationStatus) || undefined,
        limit: PAGE_SIZE,
        lastDoc: pageLastDoc,
      });

      // Additional client-side filtering for search and minFollowers
      let filteredCreators = result.creators;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredCreators = filteredCreators.filter(
          (creator) =>
            creator.fullName.toLowerCase().includes(query) ||
            creator.tiktokHandle.toLowerCase().includes(query) ||
            creator.instagramHandle.toLowerCase().includes(query) ||
            creator.email.toLowerCase().includes(query) ||
            creator.creatorId.toLowerCase().includes(query) ||
            creator.collaboration?.collabDisplayId?.toLowerCase().includes(query)
        );
      }

      if (minFollowers) {
        const min = parseInt(minFollowers, 10);
        if (!isNaN(min)) {
          filteredCreators = filteredCreators.filter(
            (creator) =>
              creator.instagramFollowers >= min ||
              creator.tiktokFollowers >= min
          );
        }
      }

      setCreators(filteredCreators);
      setHasMore(result.hasMore);

      if (isNewFilter) {
        setCurrentPage(1);
        if (result.lastDoc) {
          setLastDocs([result.lastDoc]);
        } else {
          setLastDocs([]);
        }
      } else {
        const pageIndex = (pageNum ?? currentPage) - 1;
        if (result.lastDoc && pageIndex >= 0) {
          setLastDocs((prev) => {
            const newDocs = [...prev];
            newDocs[pageIndex] = result.lastDoc;
            return newDocs;
          });
        }
      }
    } catch (err) {
      console.error('Error fetching creators:', err);
      showToast('Failed to load creators', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, minFollowers, searchQuery, currentPage, showToast]);

  useEffect(() => {
    fetchCreators(undefined, true);
  }, [statusFilter, minFollowers, searchQuery]);

  // V2: filteredCreators is now handled in fetchCreators, but keep for additional real-time filtering
  const filteredCreators = useMemo(() => {
    let filtered = [...creators];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (creator) =>
          creator.fullName.toLowerCase().includes(query) ||
          creator.tiktokHandle.toLowerCase().includes(query) ||
          creator.instagramHandle.toLowerCase().includes(query) ||
          creator.email.toLowerCase().includes(query) ||
          creator.creatorId.toLowerCase().includes(query) ||
          creator.collaboration?.collabDisplayId?.toLowerCase().includes(query)
      );
    }

    if (minFollowers) {
      const min = parseInt(minFollowers, 10);
      if (!isNaN(min)) {
        filtered = filtered.filter(
          (creator) =>
            creator.instagramFollowers >= min ||
            creator.tiktokFollowers >= min
        );
      }
    }

    return filtered;
  }, [creators, searchQuery, minFollowers]);

  const handleViewCreator = (id: string) => {
    router.push(`/admin/creators/${id}`);
  };

  const handleReview = (creator: CreatorWithCollab) => {
    setReviewingCreator(creator);
  };

  const handleCloseReview = () => {
    setReviewingCreator(null);
  };

  // V2: Update collaboration instead of creator
  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      const creator = creators.find(c => c.id === id);
      
      if (!creator?.collaboration) {
        showToast('No active collaboration to approve', 'error');
        setActionLoading(false);
        return;
      }

      // V2: Update the COLLABORATION, not the creator
      await updateCollaboration(creator.id, creator.collaboration.id, { 
        status: 'approved' as CollaborationStatus 
      });
      
      // Send approval email
      if (creator) {
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
      
      // Refresh stats
      const statsData = await getDashboardStats();
      setStats(statsData);
      
      const lastDoc = currentPage > 1 ? lastDocs[currentPage - 2] : undefined;
      await fetchCreators(lastDoc);
      showToast('Creator approved!', 'success');
      setReviewingCreator(null);
    } catch (error) {
      console.error('Error approving creator:', error);
      showToast('Failed to approve creator', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // V2: Update collaboration instead of creator
  const handleDeny = async (id: string) => {
    setActionLoading(true);
    try {
      const creator = creators.find(c => c.id === id);
      
      if (!creator?.collaboration) {
        showToast('No active collaboration to deny', 'error');
        setActionLoading(false);
        return;
      }

      // V2: Update the COLLABORATION, not the creator
      await updateCollaboration(creator.id, creator.collaboration.id, { 
        status: 'denied' as CollaborationStatus 
      });
      
      // Refresh stats
      const statsData = await getDashboardStats();
      setStats(statsData);
      
      const lastDoc = currentPage > 1 ? lastDocs[currentPage - 2] : undefined;
      await fetchCreators(lastDoc);
      showToast('Creator denied', 'success');
      setReviewingCreator(null);
    } catch (error) {
      console.error('Error denying creator:', error);
      showToast('Failed to deny creator', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNextPage = () => {
    const lastDoc = lastDocs[currentPage - 1];
    if (lastDoc && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchCreators(lastDoc, false, nextPage);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      const lastDoc = newPage > 1 ? lastDocs[newPage - 2] : undefined;
      fetchCreators(lastDoc, false, newPage);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        {/* Background Gradient Orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">👑</span>
                  Admin Dashboard
                </h1>
                <p className="text-white/60 mt-1">Manage all creator collaborations</p>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-white/40">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live data
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {stats ? (
              <>
                <StatCard
                  label="Total Applications"
                  value={stats.totalApplications}
                  icon={
                    <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                  trend="up"
                  trendLabel="this week"
                />
                <StatCard
                  label="Pending Review"
                  value={stats.pendingReview}
                  icon={
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  highlight={stats.pendingReview > 0}
                  trendLabel="needs attention"
                />
                <StatCard
                  label="Active Collabs"
                  value={stats.activeCollabs}
                  icon={
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                  trendLabel="in progress"
                />
                <StatCard
                  label="Completed"
                  value={stats.completed}
                  icon={
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  trend="up"
                  trendLabel={
                    stats.totalApplications > 0
                      ? `${((stats.completed / stats.totalApplications) * 100).toFixed(0)}% rate`
                      : '0% rate'
                  }
                />
                <StatCard
                  label="Ghost Rate"
                  value={`${stats.ghostRate.toFixed(0)}%`}
                  icon={
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2C6.477 2 2 6.477 2 12c0 2.5.9 4.8 2.4 6.5.3.4.3 1-.1 1.4l-1.1 1.1c-.4.4-.1 1 .4 1h8.8c.5 0 .8-.6.4-1l-1.1-1.1c-.4-.4-.4-1-.1-1.4 1.5-1.7 2.4-4 2.4-6.5 0-5.523-4.477-10-10-10z" />
                    </svg>
                  }
                  trend={stats.ghostRate < 20 ? 'down' : 'up'}
                  trendLabel={stats.ghostRate < 20 ? 'healthy' : 'needs work'}
                />
              </>
            ) : (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 animate-pulse"
                >
                  <div className="h-4 bg-white/10 rounded w-24 mb-3" />
                  <div className="h-8 bg-white/10 rounded w-16" />
                </div>
              ))
            )}
          </div>

          {/* V3 Creator Program Stats */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>🚀</span> Creator Program (V3)
              </h2>
              <div className="flex gap-2">
                <Link
                  href="/admin/submissions"
                  className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
                >
                  View Submissions →
                </Link>
                <span className="text-white/20">|</span>
                <Link
                  href="/admin/redemptions"
                  className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
                >
                  View Redemptions →
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {v3Loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 animate-pulse"
                  >
                    <div className="h-3 bg-white/10 rounded w-16 mb-2" />
                    <div className="h-6 bg-white/10 rounded w-12" />
                  </div>
                ))
              ) : v3Stats ? (
                <>
                  {/* Weekly Submissions */}
                  <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-sm border border-orange-500/20 rounded-2xl p-4 hover:border-orange-500/40 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">📤</span>
                      <span className="text-white/50 text-xs">This Week</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{v3Stats.weeklySubmissions}</div>
                    <div className="text-white/40 text-xs mt-1">submissions</div>
                  </div>
                  
                  {/* Total Submissions */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">📊</span>
                      <span className="text-white/50 text-xs">All Time</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{v3Stats.totalSubmissions}</div>
                    <div className="text-white/40 text-xs mt-1">submissions</div>
                  </div>
                  
                  {/* Active Creators */}
                  <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-4 hover:border-blue-500/40 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">👥</span>
                      <span className="text-white/50 text-xs">Active</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{v3Stats.activeCreatorsThisWeek}</div>
                    <div className="text-white/40 text-xs mt-1">creators this week</div>
                  </div>
                  
                  {/* Pending Redemptions */}
                  <div className={`backdrop-blur-sm border rounded-2xl p-4 transition-all ${
                    v3Stats.pendingRedemptions > 0
                      ? 'bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20 hover:border-yellow-500/40'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">⏳</span>
                      <span className="text-white/50 text-xs">Pending</span>
                    </div>
                    <div className={`text-2xl font-bold ${v3Stats.pendingRedemptions > 0 ? 'text-yellow-400' : 'text-white'}`}>
                      {v3Stats.pendingRedemptions}
                    </div>
                    <div className="text-white/40 text-xs mt-1">redemptions</div>
                  </div>
                  
                  {/* Approved (Ready to Fulfill) */}
                  <div className={`backdrop-blur-sm border rounded-2xl p-4 transition-all ${
                    v3Stats.approvedRedemptions > 0
                      ? 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20 hover:border-blue-500/40'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">✅</span>
                      <span className="text-white/50 text-xs">To Fulfill</span>
                    </div>
                    <div className={`text-2xl font-bold ${v3Stats.approvedRedemptions > 0 ? 'text-blue-400' : 'text-white'}`}>
                      {v3Stats.approvedRedemptions}
                    </div>
                    <div className="text-white/40 text-xs mt-1">approved</div>
                  </div>
                  
                  {/* Total Paid Out */}
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-500/20 rounded-2xl p-4 hover:border-green-500/40 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">💰</span>
                      <span className="text-white/50 text-xs">Paid Out</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">${v3Stats.totalRewardsValue}</div>
                    <div className="text-white/40 text-xs mt-1">total rewards</div>
                  </div>
                </>
              ) : (
                <div className="col-span-full text-center text-white/40 py-4">
                  Unable to load V3 stats
                </div>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <FilterBar
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            minFollowers={minFollowers}
            onStatusChange={setStatusFilter}
            onSearchChange={setSearchQuery}
            onMinFollowersChange={setMinFollowers}
          />

          {/* Creators Table - V2: Now receives CreatorWithCollab[] */}
          <CreatorTable
            creators={filteredCreators}
            onViewCreator={handleViewCreator}
            onApprove={handleApprove}
            onDeny={handleDeny}
            onReview={handleReview}
            loading={loading}
          />

          {/* Application Review Modal - V2: Now receives CreatorWithCollab */}
          <ApplicationReviewModal
            creator={reviewingCreator}
            isOpen={!!reviewingCreator}
            onClose={handleCloseReview}
            onApprove={handleApprove}
            onDeny={handleDeny}
            loading={actionLoading}
          />

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            hasMore={hasMore}
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
            loading={loading}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}