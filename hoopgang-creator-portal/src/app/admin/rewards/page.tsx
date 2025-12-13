// src/app/admin/rewards/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { Reward, RewardCategory, MilestoneTier } from '@/types';

type RewardFormData = {
  name: string;
  description: string;
  category: RewardCategory;
  milestoneTier?: MilestoneTier;
  leaderboardRank?: number;
  cashValue?: number;
  storeCreditValue?: number;
  productName?: string;
  imageUrl?: string;
  isActive: boolean;
};

const emptyForm: RewardFormData = {
  name: '',
  description: '',
  category: 'milestone',
  isActive: true,
};

export default function AdminRewardsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState<RewardFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<RewardCategory | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');

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

  const getAuthToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  const loadRewards = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/admin/rewards?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch rewards');

      const data = await response.json();
      setRewards(data.rewards);
    } catch (err) {
      console.error('Error loading rewards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rewards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadRewards();
    }
  }, [user, isAdmin, categoryFilter, statusFilter]);

  const openAddModal = () => {
    setEditingReward(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description,
      category: reward.category,
      milestoneTier: reward.milestoneTier,
      leaderboardRank: reward.leaderboardRank,
      cashValue: reward.cashValue,
      storeCreditValue: reward.storeCreditValue,
      productName: reward.productName,
      imageUrl: reward.imageUrl,
      isActive: reward.isActive,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingReward(null);
    setFormData(emptyForm);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      alert('Name and description are required');
      return;
    }

    setSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const url = editingReward
        ? `/api/admin/rewards/${editingReward.id}`
        : '/api/admin/rewards';

      const method = editingReward ? 'PUT' : 'POST';

      // Clean up form data - remove empty optional fields
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        isActive: formData.isActive,
      };

      if (formData.category === 'milestone' && formData.milestoneTier) {
        payload.milestoneTier = formData.milestoneTier;
      }
      if (formData.category !== 'milestone' && formData.leaderboardRank) {
        payload.leaderboardRank = formData.leaderboardRank;
      }
      if (formData.cashValue) payload.cashValue = formData.cashValue;
      if (formData.storeCreditValue) payload.storeCreditValue = formData.storeCreditValue;
      if (formData.productName?.trim()) payload.productName = formData.productName.trim();
      if (formData.imageUrl?.trim()) payload.imageUrl = formData.imageUrl.trim();

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save reward');

      closeModal();
      await loadRewards();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save reward');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (reward: Reward) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/admin/rewards/${reward.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !reward.isActive }),
      });

      if (!response.ok) throw new Error('Failed to update reward');

      await loadRewards();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  const getCategoryBadgeClass = (category: RewardCategory) => {
    switch (category) {
      case 'milestone':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'volume_leaderboard':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'gmv_leaderboard':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  const getCategoryLabel = (category: RewardCategory) => {
    switch (category) {
      case 'milestone':
        return 'Milestone';
      case 'volume_leaderboard':
        return 'Volume LB';
      case 'gmv_leaderboard':
        return 'GMV LB';
      default:
        return category;
    }
  };

  const formatValue = (reward: Reward): string => {
    const parts: string[] = [];
    if (reward.cashValue) parts.push(`$${reward.cashValue} cash`);
    if (reward.storeCreditValue) parts.push(`$${reward.storeCreditValue} credit`);
    if (reward.productName) parts.push(reward.productName);
    return parts.length > 0 ? parts.join(' + ') : '—';
  };

  const getTierOrRank = (reward: Reward): string => {
    if (reward.milestoneTier) return reward.milestoneTier.toUpperCase();
    if (reward.leaderboardRank) return `#${reward.leaderboardRank}`;
    return '—';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <Navbar />

      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">🎁 Rewards Catalog</h1>
            <p className="text-zinc-400">Manage rewards for milestones and leaderboards</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all"
          >
            + Add Reward
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 p-4 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as RewardCategory | '')}
              className="bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="">All Categories</option>
              <option value="milestone">Milestone</option>
              <option value="volume_leaderboard">Volume Leaderboard</option>
              <option value="gmv_leaderboard">GMV Leaderboard</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | '')}
              className="bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <div className="flex items-center justify-end">
              <span className="text-zinc-400 text-sm">{rewards.length} rewards</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-white">{rewards.length}</div>
            <div className="text-zinc-400 text-sm">Total Rewards</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-green-400">
              {rewards.filter((r) => r.isActive).length}
            </div>
            <div className="text-zinc-400 text-sm">Active</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-purple-400">
              {rewards.filter((r) => r.category === 'milestone').length}
            </div>
            <div className="text-zinc-400 text-sm">Milestones</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-blue-400">
              {rewards.filter((r) => r.category.includes('leaderboard')).length}
            </div>
            <div className="text-zinc-400 text-sm">Leaderboard</div>
          </div>
        </div>

        {/* Rewards Table */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadRewards}
                className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎁</div>
              <p className="text-zinc-400 mb-4">No rewards found</p>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Add First Reward
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700/50">
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Reward</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Category</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Tier/Rank</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Value</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Status</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((reward) => (
                    <tr
                      key={reward.id}
                      className="border-b border-zinc-700/30 hover:bg-zinc-700/20 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {reward.imageUrl ? (
                            <img
                              src={reward.imageUrl}
                              alt={reward.name}
                              className="w-10 h-10 rounded-lg object-cover bg-zinc-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center text-lg">
                              🎁
                            </div>
                          )}
                          <div>
                            <div className="text-white font-medium">{reward.name}</div>
                            <div className="text-zinc-500 text-sm truncate max-w-[200px]">
                              {reward.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryBadgeClass(
                            reward.category
                          )}`}
                        >
                          {getCategoryLabel(reward.category)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white font-mono">{getTierOrRank(reward)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-zinc-300 text-sm">{formatValue(reward)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleActive(reward)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            reward.isActive
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              reward.isActive ? 'bg-green-400' : 'bg-zinc-500'
                            }`}
                          ></span>
                          {reward.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => openEditModal(reward)}
                          className="px-3 py-1.5 bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">
              {editingReward ? 'Edit Reward' : 'Add New Reward'}
            </h3>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 100K Views Reward"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., $10 store credit for hitting 100K views"
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as RewardCategory,
                      milestoneTier: undefined,
                      leaderboardRank: undefined,
                    })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="milestone">Milestone</option>
                  <option value="volume_leaderboard">Volume Leaderboard</option>
                  <option value="gmv_leaderboard">GMV Leaderboard</option>
                </select>
              </div>

              {/* Conditional: Milestone Tier or Leaderboard Rank */}
              {formData.category === 'milestone' ? (
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Milestone Tier</label>
                  <select
                    value={formData.milestoneTier || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        milestoneTier: e.target.value as MilestoneTier | undefined,
                      })
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Select tier...</option>
                    <option value="100k">100K Views</option>
                    <option value="500k">500K Views</option>
                    <option value="1m">1M Views</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Leaderboard Rank</label>
                  <select
                    value={formData.leaderboardRank || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        leaderboardRank: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Select rank...</option>
                    <option value="1">1st Place</option>
                    <option value="2">2nd Place</option>
                    <option value="3">3rd Place</option>
                  </select>
                </div>
              )}

              {/* Reward Values Section */}
              <div className="pt-2 border-t border-zinc-700/50">
                <p className="text-zinc-400 text-sm mb-3">Reward Values (at least one required)</p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Cash Value */}
                  <div>
                    <label className="block text-zinc-500 text-xs mb-1">Cash Value ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cashValue || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cashValue: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="0"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Store Credit */}
                  <div>
                    <label className="block text-zinc-500 text-xs mb-1">Store Credit ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.storeCreditValue || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          storeCreditValue: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="0"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Product Name */}
                <div className="mt-4">
                  <label className="block text-zinc-500 text-xs mb-1">Product (optional)</label>
                  <input
                    type="text"
                    value={formData.productName || ''}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="e.g., Free Product of Choice"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Image URL (optional)</label>
                <input
                  type="url"
                  value={formData.imageUrl || ''}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
                {formData.imageUrl && (
                  <div className="mt-2">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-16 h-16 rounded-lg object-cover bg-zinc-700"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-zinc-400">Active</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.isActive ? 'bg-orange-500' : 'bg-zinc-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.isActive ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim() || !formData.description.trim()}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : editingReward ? 'Save Changes' : 'Create Reward'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}