'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navbar, PageHeader } from '@/components/ui';
import { auth } from '@/lib/firebase';

// ===== TYPES =====
type RewardType = 'cash' | 'credit' | 'product' | 'custom';
type RewardCategory = 'milestone' | 'volume_leaderboard' | 'gmv_leaderboard';
type MilestoneTier = '100k' | '500k' | '1m';

interface Reward {
  id: string;
  name: string;
  description: string;
  type: RewardType;
  value: string;
  icon: string;
  isActive: boolean;
  category: RewardCategory;
  milestoneTier?: MilestoneTier;
  leaderboardRank?: number;
  timesAwarded: number;
  timesRedeemed: number;
  createdAt?: string;
  updatedAt?: string;
}

interface RewardFormData {
  name: string;
  description: string;
  type: RewardType;
  value: string;
  icon: string;
  isActive: boolean;
  category: RewardCategory;
  milestoneTier?: MilestoneTier;
  leaderboardRank?: number;
}

// ===== HELPERS =====
const getDefaultIcon = (type: RewardType): string => {
  switch (type) {
    case 'cash': return '💵';
    case 'credit': return '🎁';
    case 'product': return '👕';
    case 'custom': return '✨';
    default: return '🎁';
  }
};

const determineType = (reward: any): RewardType => {
  if (reward.cashValue) return 'cash';
  if (reward.storeCreditValue) return 'credit';
  if (reward.productName) return 'product';
  return 'custom';
};

const formatValue = (reward: any): string => {
  if (reward.cashValue) return `$${reward.cashValue.toFixed(2)}`;
  if (reward.storeCreditValue) return `$${reward.storeCreditValue.toFixed(2)}`;
  if (reward.productName) return reward.productName;
  return '';
};

const getCategoryLabel = (category: RewardCategory): string => {
  switch (category) {
    case 'milestone': return 'Milestone';
    case 'volume_leaderboard': return 'Volume';
    case 'gmv_leaderboard': return 'GMV';
    default: return category;
  }
};

const getCategoryFullLabel = (category: RewardCategory): string => {
  switch (category) {
    case 'milestone': return 'Milestone';
    case 'volume_leaderboard': return 'Volume Leaderboard';
    case 'gmv_leaderboard': return 'GMV Leaderboard';
    default: return category;
  }
};

const getCategoryColor = (category: RewardCategory): string => {
  switch (category) {
    case 'milestone': return 'bg-purple-500/20 text-purple-400';
    case 'volume_leaderboard': return 'bg-blue-500/20 text-blue-400';
    case 'gmv_leaderboard': return 'bg-green-500/20 text-green-400';
    default: return 'bg-zinc-500/20 text-zinc-400';
  }
};

const getMilestoneTierLabel = (tier?: MilestoneTier): string => {
  switch (tier) {
    case '100k': return '100K Views';
    case '500k': return '500K Views';
    case '1m': return '1M Views';
    default: return 'Not Set';
  }
};

const getLeaderboardRankLabel = (rank?: number): string => {
  switch (rank) {
    case 1: return '1st Place';
    case 2: return '2nd Place';
    case 3: return '3rd Place';
    default: return 'Not Set';
  }
};

// ===== COMPONENT =====
export default function AdminRewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<RewardType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<RewardCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  // Form data with default values
  const emptyForm: RewardFormData = {
    name: '',
    description: '',
    type: 'cash',
    value: '',
    icon: '💵',
    isActive: true,
    category: 'milestone',
    milestoneTier: undefined,
    leaderboardRank: undefined,
  };
  const [formData, setFormData] = useState<RewardFormData>(emptyForm);

  // Helper to get the current user's ID token
  const getIdToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  // ===== AUTH CHECK =====
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // ===== LOAD REWARDS =====
  const loadRewards = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/admin/rewards?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch rewards');
      }

      const data = await res.json();
      
      // Transform API response to local Reward type
      const transformedRewards: Reward[] = (data.rewards || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        type: r.type || determineType(r),
        value: r.value || formatValue(r),
        icon: r.icon || getDefaultIcon(r.type || determineType(r)),
        isActive: r.isActive ?? true,
        category: r.category || 'milestone',
        milestoneTier: r.milestoneTier,
        leaderboardRank: r.leaderboardRank,
        timesAwarded: r.timesAwarded || 0,
        timesRedeemed: r.timesRedeemed || 0,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));

      setRewards(transformedRewards);
    } catch (err) {
      console.error('Error loading rewards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rewards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadRewards();
    }
  }, [user, typeFilter, statusFilter]);

  // ===== MODAL HANDLERS =====
  const openCreateModal = () => {
    setEditingReward(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description,
      type: reward.type,
      value: reward.value,
      icon: reward.icon,
      isActive: reward.isActive,
      category: reward.category || 'milestone',
      milestoneTier: reward.milestoneTier,
      leaderboardRank: reward.leaderboardRank,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingReward(null);
    setFormData(emptyForm);
  };

  // ===== SAVE REWARD =====
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = await getIdToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Validation
      if (!formData.name.trim()) {
        setError('Name is required');
        return;
      }
      if (!formData.value.trim()) {
        setError('Value is required');
        return;
      }

      // Build payload
      const payload: Record<string, any> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        value: formData.value.trim(),
        icon: formData.icon,
        isActive: formData.isActive,
        category: formData.category,
      };

      // Add conditional fields based on category
      if (formData.category === 'milestone' && formData.milestoneTier) {
        payload.milestoneTier = formData.milestoneTier;
      }
      if (
        (formData.category === 'volume_leaderboard' || formData.category === 'gmv_leaderboard') &&
        formData.leaderboardRank
      ) {
        payload.leaderboardRank = formData.leaderboardRank;
      }

      const url = editingReward
        ? `/api/admin/rewards/${editingReward.id}`
        : '/api/admin/rewards';
      const method = editingReward ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save reward');
      }

      setSuccess(editingReward ? 'Reward updated successfully!' : 'Reward created successfully!');
      closeModal();
      loadRewards();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving reward:', err);
      setError(err instanceof Error ? err.message : 'Failed to save reward');
    } finally {
      setSaving(false);
    }
  };

  // ===== TOGGLE ACTIVE STATUS =====
  const toggleRewardStatus = async (reward: Reward) => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`/api/admin/rewards/${reward.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !reward.isActive }),
      });

      if (!res.ok) throw new Error('Failed to update reward');

      loadRewards();
      setSuccess(`Reward ${reward.isActive ? 'deactivated' : 'activated'} successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error toggling reward status:', err);
      setError('Failed to update reward status');
    }
  };

  // ===== FILTER REWARDS =====
  const filteredRewards = rewards.filter((r) => {
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    return true;
  });

  // ===== LOADING STATE =====
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pt-20 sm:pt-24">
        {/* Header - Stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
          <PageHeader 
            title="Rewards Management"
            subtitle="Create and manage creator rewards"
            icon="🎁"
            accentColor="purple"
            align="left"
          />
          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span className="text-lg sm:text-xl">+</span>
            Add Reward
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-400 text-sm sm:text-base">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm sm:text-base">
            {error}
          </div>
        )}

        {/* Filters - Horizontal scroll on mobile */}
        <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as RewardType | 'all')}
            className="flex-shrink-0 px-3 sm:px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Types</option>
            <option value="cash">💵 Cash</option>
            <option value="credit">🎁 Credit</option>
            <option value="product">👕 Product</option>
            <option value="custom">✨ Custom</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as RewardCategory | 'all')}
            className="flex-shrink-0 px-3 sm:px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Categories</option>
            <option value="milestone">Milestone</option>
            <option value="volume_leaderboard">Volume</option>
            <option value="gmv_leaderboard">GMV</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="flex-shrink-0 px-3 sm:px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Rewards Grid - 1 col mobile, 2 cols tablet, 3 cols desktop */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 animate-pulse">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-zinc-700 rounded-xl mb-3 sm:mb-4"></div>
                <div className="h-5 sm:h-6 bg-zinc-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-zinc-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredRewards.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎁</div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No Rewards Found</h3>
            <p className="text-zinc-400 text-sm sm:text-base">Create your first reward to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredRewards.map((reward) => (
              <div
                key={reward.id}
                className={`bg-zinc-800/50 border rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:bg-zinc-800/70 transition-all ${
                  reward.isActive ? 'border-zinc-700' : 'border-zinc-700/50 opacity-60'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="text-3xl sm:text-4xl flex-shrink-0">{reward.icon}</div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-white truncate">{reward.name}</h3>
                      <p className="text-orange-400 font-medium text-sm sm:text-base">{reward.value}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRewardStatus(reward)}
                    className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full transition-colors flex-shrink-0 active:scale-[0.98] ${
                      reward.isActive
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-zinc-600/20 text-zinc-400 hover:bg-zinc-600/30'
                    }`}
                  >
                    {reward.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {/* Description */}
                {reward.description && (
                  <p className="text-zinc-400 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{reward.description}</p>
                )}

                {/* Category Badges - Horizontal scroll */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${getCategoryColor(reward.category)}`}>
                    {getCategoryLabel(reward.category)}
                  </span>
                  
                  {/* Show tier or rank based on category */}
                  {reward.category === 'milestone' && reward.milestoneTier && (
                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full bg-purple-500/10 text-purple-300">
                      {getMilestoneTierLabel(reward.milestoneTier)}
                    </span>
                  )}
                  {(reward.category === 'volume_leaderboard' || reward.category === 'gmv_leaderboard') && reward.leaderboardRank && (
                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full bg-amber-500/10 text-amber-300">
                      {getLeaderboardRankLabel(reward.leaderboardRank)}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm text-zinc-500 mb-3 sm:mb-4">
                  <span>Awarded: {reward.timesAwarded}</span>
                  <span>Redeemed: {reward.timesRedeemed}</span>
                </div>

                {/* Actions */}
                <button
                  onClick={() => openEditModal(reward)}
                  className="w-full py-2 bg-zinc-700/50 hover:bg-zinc-700 text-white rounded-lg sm:rounded-xl transition-colors text-xs sm:text-sm font-medium active:scale-[0.98]"
                >
                  Edit Reward
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ===== ADD/EDIT MODAL - Mobile Optimized ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-zinc-900 border-t sm:border border-zinc-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg sm:mx-4 max-h-[90vh] overflow-y-auto safe-bottom">
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-12 h-1 bg-zinc-600 rounded-full mx-auto mt-2" />
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-700 sticky top-0 bg-zinc-900 z-10">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {editingReward ? 'Edit Reward' : 'Add New Reward'}
              </h2>
              <button
                onClick={closeModal}
                className="text-zinc-400 hover:text-white text-2xl p-1"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Name */}
              <div>
                <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 100K Milestone Bonus"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this reward..."
                  rows={2}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              {/* Type & Value */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value as RewardType;
                      setFormData({ 
                        ...formData, 
                        type: newType,
                        icon: getDefaultIcon(newType)
                      });
                    }}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="credit">🎁 Credit</option>
                    <option value="product">👕 Product</option>
                    <option value="custom">✨ Custom</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">
                    Value <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="e.g., $50.00"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const newCategory = e.target.value as RewardCategory;
                    setFormData({ 
                      ...formData, 
                      category: newCategory,
                      milestoneTier: newCategory === 'milestone' ? formData.milestoneTier : undefined,
                      leaderboardRank: newCategory !== 'milestone' ? formData.leaderboardRank : undefined,
                    });
                  }}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value="milestone">Milestone</option>
                  <option value="volume_leaderboard">Volume Leaderboard</option>
                  <option value="gmv_leaderboard">GMV Leaderboard</option>
                </select>
              </div>

              {/* Conditional: Milestone Tier */}
              {formData.category === 'milestone' && (
                <div>
                  <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">
                    Milestone Tier
                    <span className="text-zinc-500 ml-1 sm:ml-2 text-[10px] sm:text-xs">(optional)</span>
                  </label>
                  <select
                    value={formData.milestoneTier || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      milestoneTier: e.target.value ? e.target.value as MilestoneTier : undefined 
                    })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Select tier...</option>
                    <option value="100k">🔥 100K Views</option>
                    <option value="500k">⚡ 500K Views</option>
                    <option value="1m">🚀 1M Views</option>
                  </select>
                </div>
              )}

              {/* Conditional: Leaderboard Rank */}
              {(formData.category === 'volume_leaderboard' || formData.category === 'gmv_leaderboard') && (
                <div>
                  <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">
                    Leaderboard Rank
                    <span className="text-zinc-500 ml-1 sm:ml-2 text-[10px] sm:text-xs">(optional)</span>
                  </label>
                  <select
                    value={formData.leaderboardRank || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      leaderboardRank: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Select rank...</option>
                    <option value="1">🥇 1st Place</option>
                    <option value="2">🥈 2nd Place</option>
                    <option value="3">🥉 3rd Place</option>
                  </select>
                </div>
              )}

              {/* Icon & Active Status */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="💵"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-center text-xl sm:text-2xl focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">Status</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-colors text-sm active:scale-[0.98] ${
                      formData.isActive
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {formData.isActive ? '✓ Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 sm:p-6 border-t border-zinc-700 bg-zinc-900 sticky bottom-0">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 sm:py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg sm:rounded-xl transition-colors font-medium text-sm active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 sm:py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white rounded-lg sm:rounded-xl transition-colors font-medium flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    <span className="hidden xs:inline">Saving...</span>
                  </>
                ) : (
                  <>{editingReward ? 'Update' : 'Create'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}