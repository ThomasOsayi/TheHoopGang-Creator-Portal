// src/app/admin/creators/page.tsx

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Creator, CreatorStatus, DashboardStats } from '@/types';
import { getAllCreators, getDashboardStats, updateCreator } from '@/lib/firestore';
import { StatCard, useToast, Pagination } from '@/components/ui';
import { FilterBar, CreatorTable, ApplicationReviewModal } from '@/components/creators';
import { ProtectedRoute } from '@/components/auth';

export default function AdminCreatorsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minFollowers, setMinFollowers] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDocs, setLastDocs] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [reviewingCreator, setReviewingCreator] = useState<Creator | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const PAGE_SIZE = 10;

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

  // Fetch creators with pagination
  const fetchCreators = useCallback(async (pageLastDoc?: any, isNewFilter = false, pageNum?: number) => {
    setLoading(true);
    try {
      const result = await getAllCreators({
        status: (statusFilter as CreatorStatus) || undefined,
        minFollowers: minFollowers ? parseInt(minFollowers, 10) : undefined,
        search: searchQuery || undefined,
        limit: PAGE_SIZE,
        lastDoc: pageLastDoc,
      });

      setCreators(result.creators);
      setHasMore(result.hasMore);

      if (isNewFilter) {
        setLastDocs([]);
        setCurrentPage(1);
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
          creator.creatorId.toLowerCase().includes(query)
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

  const handleReview = (creator: Creator) => {
    setReviewingCreator(creator);
  };

  const handleCloseReview = () => {
    setReviewingCreator(null);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await updateCreator(id, { status: 'approved' as CreatorStatus });
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

  const handleDeny = async (id: string) => {
    setActionLoading(true);
    try {
      await updateCreator(id, { status: 'denied' as CreatorStatus });
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
              
              {/* Quick action - could add refresh button here */}
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
                  icon="📊"
                  trend="up"
                  trendLabel="this week"
                />
                <StatCard
                  label="Pending Review"
                  value={stats.pendingReview}
                  icon="⏳"
                  highlight={stats.pendingReview > 0}
                  trendLabel="needs attention"
                />
                <StatCard
                  label="Active Collabs"
                  value={stats.activeCollabs}
                  icon="🚀"
                  trendLabel="in progress"
                />
                <StatCard
                  label="Completed"
                  value={stats.completed}
                  icon="✅"
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
                  icon="👻"
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

          {/* Filter Bar */}
          <FilterBar
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            minFollowers={minFollowers}
            onStatusChange={setStatusFilter}
            onSearchChange={setSearchQuery}
            onMinFollowersChange={setMinFollowers}
          />

          {/* Creators Table */}
          <CreatorTable
            creators={filteredCreators}
            onViewCreator={handleViewCreator}
            onApprove={handleApprove}
            onDeny={handleDeny}
            onReview={handleReview}
            loading={loading}
          />

          {/* Application Review Modal */}
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