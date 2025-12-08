'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Creator, CreatorStatus, DashboardStats } from '@/types';
import { getAllCreators, getDashboardStats, updateCreator } from '@/lib/firestore';
import { StatCard, useToast, Pagination } from '@/components/ui';
import { FilterBar, CreatorTable } from '@/components/creators';
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
  const [lastDocs, setLastDocs] = useState<any[]>([]); // Stack of last docs for each page
  const [hasMore, setHasMore] = useState(false);
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

      // If new filter, reset pagination
      if (isNewFilter) {
        setLastDocs([]);
        setCurrentPage(1);
      } else {
        // Store last doc for the page we just fetched
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

  // Fetch creators on mount and when filters change
  useEffect(() => {
    fetchCreators(undefined, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, minFollowers, searchQuery]);

  // Filter creators based on filters (client-side for search and minFollowers)
  const filteredCreators = useMemo(() => {
    let filtered = [...creators];

    // Apply search query (client-side since Firestore doesn't support full-text search)
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

    // Apply min followers filter (client-side)
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

  const handleApprove = async (id: string) => {
    try {
      await updateCreator(id, { status: 'approved' as CreatorStatus });
      // Refetch creators to update UI
      const lastDoc = currentPage > 1 ? lastDocs[currentPage - 2] : undefined;
      await fetchCreators(lastDoc);
      showToast('Creator approved!', 'success');
    } catch (error) {
      console.error('Error approving creator:', error);
      showToast('Failed to approve creator', 'error');
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

      // Get the lastDoc for the page before the one we're going to
      const lastDoc = newPage > 1 ? lastDocs[newPage - 2] : undefined;
      fetchCreators(lastDoc, false, newPage);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-white/60">Manage all creator collaborations</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {stats ? (
              <>
                <StatCard
                  label="Total Applications"
                  value={stats.totalApplications}
                  icon="📊"
                  change="↑ this week"
                />
                <StatCard
                  label="Pending Review"
                  value={stats.pendingReview}
                  icon="⏳"
                  change="Needs attention"
                />
                <StatCard
                  label="Active Collabs"
                  value={stats.activeCollabs}
                  icon="🚀"
                  change="In progress"
                />
                <StatCard
                  label="Completed"
                  value={stats.completed}
                  icon="✅"
                  change={
                    stats.totalApplications > 0
                      ? `${((stats.completed / stats.totalApplications) * 100).toFixed(0)}%`
                      : '0%'
                  }
                />
                <StatCard
                  label="Ghost Rate"
                  value={`${stats.ghostRate.toFixed(0)}%`}
                  icon="👻"
                  change="↓ improving"
                />
              </>
            ) : (
              // Loading state for stats
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                >
                  <div className="text-white/60 text-sm mb-1">Loading...</div>
                  <div className="text-3xl font-bold text-white/30">—</div>
                </div>
              ))
            )}
          </div>

          {/* Filter Bar */}
          <div className="mb-6">
            <FilterBar
              statusFilter={statusFilter}
              searchQuery={searchQuery}
              minFollowers={minFollowers}
              onStatusChange={setStatusFilter}
              onSearchChange={setSearchQuery}
              onMinFollowersChange={setMinFollowers}
            />
          </div>

          {/* Creators Table */}
          <CreatorTable
            creators={filteredCreators}
            onViewCreator={handleViewCreator}
            onApprove={handleApprove}
            loading={loading}
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

