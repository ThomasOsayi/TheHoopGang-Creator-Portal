'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Creator, CreatorStatus, DashboardStats } from '@/types';
import { getAllCreators, getDashboardStats, updateCreator } from '@/lib/firestore';
import { StatCard } from '@/components/ui';
import { FilterBar, CreatorTable } from '@/components/creators';

export default function AdminCreatorsPage() {
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minFollowers, setMinFollowers] = useState<string>('');

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, creatorsData] = await Promise.all([
        getDashboardStats(),
        getAllCreators(),
      ]);
      setStats(statsData);
      setCreators(creatorsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter creators based on filters
  const filteredCreators = useMemo(() => {
    let filtered = [...creators];

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((creator) => creator.status === statusFilter);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (creator) =>
          creator.fullName.toLowerCase().includes(query) ||
          creator.tiktokHandle.toLowerCase().includes(query) ||
          creator.instagramHandle.toLowerCase().includes(query) ||
          creator.email.toLowerCase().includes(query)
      );
    }

    // Apply min followers filter
    if (minFollowers) {
      const min = parseInt(minFollowers, 10);
      if (!isNaN(min)) {
        filtered = filtered.filter(
          (creator) => creator.tiktokFollowers >= min
        );
      }
    }

    return filtered;
  }, [creators, statusFilter, searchQuery, minFollowers]);

  const handleViewCreator = (id: string) => {
    router.push(`/admin/creators/${id}`);
  };

  const handleApprove = async (id: string) => {
    try {
      await updateCreator(id, { status: 'approved' as CreatorStatus });
      // Refetch data to update UI
      await fetchData();
    } catch (error) {
      console.error('Error approving creator:', error);
    }
  };

  return (
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
      </div>
    </div>
  );
}

