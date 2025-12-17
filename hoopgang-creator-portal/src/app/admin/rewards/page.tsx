'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/ui';
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Rewards Management</h1>
            <p className="text-zinc-400 mt-1">Manage rewards for milestones and leaderboards</p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Add Reward
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-400">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as RewardType | 'all')}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Types</option>
            <option value="cash">💵 Cash</option>
            <option value="credit">🎁 Store Credit</option>
            <option value="product">👕 Product</option>
            <option value="custom">✨ Custom</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as RewardCategory | 'all')}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Categories</option>
            <option value="milestone">Milestone</option>
            <option value="volume_leaderboard">Volume Leaderboard</option>
            <option value="gmv_leaderboard">GMV Leaderboard</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Rewards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-2xl p-6 animate-pulse">
                <div className="h-12 w-12 bg-zinc-700 rounded-xl mb-4"></div>
                <div className="h-6 bg-zinc-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-zinc-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredRewards.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Rewards Found</h3>
            <p className="text-zinc-400">Create your first reward to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRewards.map((reward) => (
              <div
                key={reward.id}
                className={`bg-zinc-800/50 border rounded-2xl p-6 hover:bg-zinc-800/70 transition-all ${
                  reward.isActive ? 'border-zinc-700' : 'border-zinc-700/50 opacity-60'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{reward.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{reward.name}</h3>
                      <p className="text-orange-400 font-medium">{reward.value}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRewardStatus(reward)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
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
                  <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{reward.description}</p>
                )}

                {/* Category Badge */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getCategoryColor(reward.category)}`}>
                    {getCategoryLabel(reward.category)}
                  </span>
                  
                  {/* Show tier or rank based on category */}
                  {reward.category === 'milestone' && reward.milestoneTier && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-300">
                      {getMilestoneTierLabel(reward.milestoneTier)}
                    </span>
                  )}
                  {(reward.category === 'volume_leaderboard' || reward.category === 'gmv_leaderboard') && reward.leaderboardRank && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-300">
                      {getLeaderboardRankLabel(reward.leaderboardRank)}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-sm text-zinc-500 mb-4">
                  <span>Awarded: {reward.timesAwarded}</span>
                  <span>Redeemed: {reward.timesRedeemed}</span>
                </div>

                {/* Actions */}
                <button
                  onClick={() => openEditModal(reward)}
                  className="w-full py-2 bg-zinc-700/50 hover:bg-zinc-700 text-white rounded-xl transition-colors text-sm font-medium"
                >
                  Edit Reward
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ===== ADD/EDIT MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-zinc-700">
              <h2 className="text-xl font-bold text-white">
                {editingReward ? 'Edit Reward' : 'Add New Reward'}
              </h2>
              <button
                onClick={closeModal}
                className="text-zinc-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="text-zinc-400 text-sm block mb-2">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 100K Milestone Bonus"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-zinc-400 text-sm block mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this reward..."
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              {/* Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 text-sm block mb-2">Type</label>
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
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="credit">🎁 Store Credit</option>
                    <option value="product">👕 Product</option>
                    <option value="custom">✨ Custom</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-sm block mb-2">
                    Value <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="e.g., $50.00"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-zinc-400 text-sm block mb-2">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const newCategory = e.target.value as RewardCategory;
                    setFormData({ 
                      ...formData, 
                      category: newCategory,
                      // Clear the other field when switching categories
                      milestoneTier: newCategory === 'milestone' ? formData.milestoneTier : undefined,
                      leaderboardRank: newCategory !== 'milestone' ? formData.leaderboardRank : undefined,
                    });
                  }}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="milestone">Milestone</option>
                  <option value="volume_leaderboard">Volume Leaderboard</option>
                  <option value="gmv_leaderboard">GMV Leaderboard</option>
                </select>
              </div>

              {/* Conditional: Milestone Tier */}
              {formData.category === 'milestone' && (
                <div>
                  <label className="text-zinc-400 text-sm block mb-2">
                    Milestone Tier
                    <span className="text-zinc-500 ml-2 text-xs">(optional)</span>
                  </label>
                  <select
                    value={formData.milestoneTier || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      milestoneTier: e.target.value ? e.target.value as MilestoneTier : undefined 
                    })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Select tier...</option>
                    <option value="100k">🔥 100K Views</option>
                    <option value="500k">⚡ 500K Views</option>
                    <option value="1m">🚀 1M Views</option>
                  </select>
                  <p className="text-zinc-500 text-xs mt-1">
                    Links this reward to a specific view milestone
                  </p>
                </div>
              )}

              {/* Conditional: Leaderboard Rank */}
              {(formData.category === 'volume_leaderboard' || formData.category === 'gmv_leaderboard') && (
                <div>
                  <label className="text-zinc-400 text-sm block mb-2">
                    Leaderboard Rank
                    <span className="text-zinc-500 ml-2 text-xs">(optional)</span>
                  </label>
                  <select
                    value={formData.leaderboardRank || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      leaderboardRank: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Select rank...</option>
                    <option value="1">🥇 1st Place</option>
                    <option value="2">🥈 2nd Place</option>
                    <option value="3">🥉 3rd Place</option>
                  </select>
                  <p className="text-zinc-500 text-xs mt-1">
                    Links this reward to a specific leaderboard position
                  </p>
                </div>
              )}

              {/* Icon & Active Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 text-sm block mb-2">Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="💵"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center text-2xl focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-sm block mb-2">Status</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`w-full px-4 py-3 rounded-xl font-medium transition-colors ${
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
            <div className="flex gap-3 p-6 border-t border-zinc-700">
              <button
                onClick={closeModal}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>{editingReward ? 'Update Reward' : 'Create Reward'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}