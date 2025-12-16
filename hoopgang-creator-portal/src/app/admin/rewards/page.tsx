// src/app/admin/rewards/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { auth } from '@/lib/firebase';

// Types
type RewardType = 'cash' | 'credit' | 'product' | 'custom';

interface Reward {
  id: string;
  name: string;
  description: string;
  type: RewardType;
  value: string;
  icon: string;
  isActive: boolean;
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
}

// Type Badge Component
function TypeBadge({ type }: { type: RewardType }) {
  const config: Record<RewardType, { bg: string; text: string; border: string; icon: string; label: string }> = {
    cash: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', icon: '💵', label: 'Cash' },
    credit: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', icon: '🎁', label: 'Store Credit' },
    product: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', icon: '👕', label: 'Product' },
    custom: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', icon: '✨', label: 'Custom' },
  };
  const style = config[type] || config.custom;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text} border ${style.border} inline-flex items-center gap-1.5`}>
      <span>{style.icon}</span>
      {style.label}
    </span>
  );
}

// Stat Card Component
function StatCard({ 
  value, 
  label, 
  color = 'white',
  onClick,
  isActive = false
}: { 
  value: number; 
  label: string; 
  color?: 'white' | 'green' | 'blue' | 'purple' | 'orange';
  onClick?: () => void;
  isActive?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    white: 'text-white',
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-zinc-900/50 border rounded-2xl p-5 transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:border-zinc-600' : ''
      } ${isActive ? 'border-orange-500/50' : 'border-zinc-800'}`}
    >
      <div className={`text-3xl font-bold mb-1 ${colorClasses[color]}`}>
        <AnimatedCounter value={value} />
      </div>
      <div className="text-zinc-500 text-sm">{label}</div>
    </div>
  );
}

// Reward Card Component
function RewardCard({ 
  reward, 
  onEdit, 
  onToggleActive 
}: { 
  reward: Reward; 
  onEdit: (reward: Reward) => void;
  onToggleActive: (reward: Reward) => void;
}) {
  return (
    <div 
      className={`bg-zinc-900/50 border rounded-2xl p-5 transition-all duration-300 ${
        reward.isActive 
          ? 'border-zinc-800 hover:border-zinc-700' 
          : 'border-zinc-800/50 opacity-60'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div 
          onClick={() => onEdit(reward)}
          className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl cursor-pointer transition-all hover:scale-105 ${
            reward.isActive ? 'bg-zinc-800' : 'bg-zinc-800/50'
          }`}
        >
          {reward.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div 
              onClick={() => onEdit(reward)}
              className="cursor-pointer flex-1"
            >
              <h3 className={`text-lg font-bold ${reward.isActive ? 'text-white' : 'text-zinc-500'}`}>
                {reward.name}
              </h3>
              <p className="text-zinc-500 text-sm mt-0.5">{reward.description}</p>
            </div>

            {/* Active Toggle */}
            <button
              onClick={() => onToggleActive(reward)}
              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                reward.isActive ? 'bg-green-500' : 'bg-zinc-700'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                reward.isActive ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Type & Value */}
          <div className="flex items-center gap-4 mt-3">
            <TypeBadge type={reward.type} />
            <span className={`text-lg font-bold ${reward.isActive ? 'text-green-400' : 'text-zinc-500'}`}>
              {reward.value}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-zinc-500 mt-3">
            <div>
              <span className="text-zinc-400">{reward.timesAwarded}</span> awarded
            </div>
            <div>
              <span className="text-zinc-400">{reward.timesRedeemed}</span> redeemed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Creator Preview Component - Matches creator shop catalog style
function CreatorPreview({ rewards }: { rewards: Reward[] }) {
  const activeRewards = rewards.filter(r => r.isActive);

  // Get category badge config
  const getCategoryBadge = (type: RewardType) => {
    switch (type) {
      case 'cash':
        return { label: 'Leaderboard', bg: 'bg-orange-500/80', text: 'text-white' };
      case 'credit':
        return { label: 'Milestone', bg: 'bg-purple-500/80', text: 'text-white' };
      case 'product':
        return { label: 'Milestone', bg: 'bg-purple-500/80', text: 'text-white' };
      case 'custom':
        return { label: 'Volume', bg: 'bg-blue-500/80', text: 'text-white' };
      default:
        return { label: 'Reward', bg: 'bg-zinc-500/80', text: 'text-white' };
    }
  };

  // Get value badge color based on type
  const getValueBadgeStyle = (type: RewardType) => {
    switch (type) {
      case 'cash':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'credit':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'product':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'custom':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Preview Header */}
      <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">👁️</span>
          <h3 className="text-white font-bold">Creator View Preview</h3>
          <span className="text-zinc-400 text-sm ml-2">How creators see available rewards</span>
        </div>
      </div>

      {/* Preview Content */}
      <div className="p-6">
        {activeRewards.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRewards.map((reward) => {
                const categoryBadge = getCategoryBadge(reward.type);
                const valueBadgeStyle = getValueBadgeStyle(reward.type);

                return (
                  <div 
                    key={reward.id} 
                    className="relative bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700 hover:border-zinc-600 transition-all group"
                  >
                    {/* Category Badge */}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryBadge.bg} ${categoryBadge.text}`}>
                        {categoryBadge.label}
                      </span>
                    </div>

                    {/* Icon - Large & Centered */}
                    <div className="flex justify-center mb-4 pt-4">
                      <span className="text-6xl group-hover:scale-110 transition-transform duration-300">
                        {reward.icon}
                      </span>
                    </div>

                    {/* Name & Description - Centered */}
                    <div className="text-center mb-4">
                      <h4 className="text-white font-bold text-lg mb-1">{reward.name}</h4>
                      <p className="text-zinc-500 text-sm">{reward.description}</p>
                    </div>

                    {/* Value Badge - Centered */}
                    <div className="flex justify-center">
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${valueBadgeStyle}`}>
                        {reward.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {activeRewards.length > 6 && (
              <p className="text-center text-zinc-500 text-sm mt-6">
                +{activeRewards.length - 6} more rewards...
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-zinc-500">
            <span className="text-4xl block mb-3">🎁</span>
            No active rewards to preview
          </div>
        )}
      </div>
    </div>
  );
}

// Icon options
const ICON_OPTIONS = ['💵', '🎁', '👕', '🏆', '⭐', '💰', '🎉', '🔓', '✨', '🎯', '💎', '🏠'];

const emptyForm: RewardFormData = {
  name: '',
  description: '',
  type: 'cash',
  value: '',
  icon: '💵',
  isActive: true,
};

export default function AdminRewardsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data state
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'preview'>('grid');
  const [filterType, setFilterType] = useState<RewardType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState<RewardFormData>(emptyForm);
  const [isProcessing, setIsProcessing] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingReward, setDeletingReward] = useState<Reward | null>(null);

  // Success animation state
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successIcon, setSuccessIcon] = useState('✅');

  // Auth check
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

  // Load rewards
  const loadRewards = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/rewards', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch rewards');

      const data = await response.json();
      
      // Transform data to match our interface
      const transformedRewards: Reward[] = (data.rewards || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        type: r.type || determineType(r),
        value: r.value || formatValue(r),
        icon: r.icon || getDefaultIcon(r),
        isActive: r.isActive ?? true,
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

  // Helper to determine type from legacy data
  const determineType = (r: any): RewardType => {
    if (r.cashValue) return 'cash';
    if (r.storeCreditValue) return 'credit';
    if (r.productName) return 'product';
    return 'custom';
  };

  // Helper to format value from legacy data
  const formatValue = (r: any): string => {
    if (r.cashValue) return `$${r.cashValue.toFixed(2)}`;
    if (r.storeCreditValue) return `$${r.storeCreditValue.toFixed(2)}`;
    if (r.productName) return r.productName;
    return 'Custom';
  };

  // Helper to get default icon
  const getDefaultIcon = (r: any): string => {
    if (r.cashValue) return '💵';
    if (r.storeCreditValue) return '🎁';
    if (r.productName) return '👕';
    return '✨';
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadRewards();
    }
  }, [user, isAdmin]);

  // Filtered rewards
  const filteredRewards = useMemo(() => {
    return rewards.filter(r => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterStatus === 'active' && !r.isActive) return false;
      if (filterStatus === 'inactive' && r.isActive) return false;
      return true;
    });
  }, [rewards, filterType, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: rewards.length,
    active: rewards.filter(r => r.isActive).length,
    inactive: rewards.filter(r => !r.isActive).length,
    totalAwarded: rewards.reduce((sum, r) => sum + r.timesAwarded, 0),
    totalRedeemed: rewards.reduce((sum, r) => sum + r.timesRedeemed, 0),
  }), [rewards]);

  // Modal handlers
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
      type: reward.type,
      value: reward.value,
      icon: reward.icon,
      isActive: reward.isActive,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingReward(null);
    setFormData(emptyForm);
  };

  // Save handler
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.value.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const url = editingReward
        ? `/api/admin/rewards/${editingReward.id}`
        : '/api/admin/rewards';

      const method = editingReward ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          type: formData.type,
          value: formData.value.trim(),
          icon: formData.icon,
          isActive: formData.isActive,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save reward');

      closeModal();
      await loadRewards();

      setSuccessIcon(editingReward ? '✅' : '🎁');
      setSuccessMessage(editingReward ? 'Reward Updated!' : 'Reward Created!');
      setShowSuccess(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save reward');
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle active handler
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

  // Delete handlers
  const openDeleteModal = (reward: Reward) => {
    setDeletingReward(reward);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingReward) return;

    setIsProcessing(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/admin/rewards/${deletingReward.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete reward');

      setShowDeleteModal(false);
      setDeletingReward(null);
      await loadRewards();

      setSuccessIcon('🗑️');
      setSuccessMessage('Reward Deleted');
      setShowSuccess(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete reward');
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"
          style={{ animation: 'float 8s ease-in-out infinite' }}
        />
        <div 
          className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"
          style={{ animation: 'float 12s ease-in-out infinite reverse' }}
        />
      </div>

      <Navbar />

      {/* Success Animation */}
      {showSuccess && (
        <SuccessAnimation
          message={successMessage}
          icon={successIcon}
          onComplete={() => setShowSuccess(false)}
        />
      )}

      <main className="relative max-w-7xl mx-auto px-6 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span>🎁</span> Rewards Catalog
            </h1>
            <p className="text-zinc-400 mt-1">Manage rewards that can be awarded to creators</p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              👁️ Creator Preview
            </button>
          </div>
        </div>

        {/* Stats Cards - 2 columns with 3 rows */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard 
            value={stats.total} 
            label="Total Rewards" 
            color="white"
            onClick={() => setFilterStatus('all')}
            isActive={filterStatus === 'all'}
          />
          <StatCard 
            value={stats.active} 
            label="Active" 
            color="green"
            onClick={() => setFilterStatus('active')}
            isActive={filterStatus === 'active'}
          />
          <StatCard 
            value={stats.inactive} 
            label="Inactive" 
            color="white"
            onClick={() => setFilterStatus('inactive')}
            isActive={filterStatus === 'inactive'}
          />
          <StatCard 
            value={stats.totalAwarded} 
            label="Times Awarded" 
            color="blue"
          />
          <StatCard 
            value={stats.totalRedeemed} 
            label="Times Redeemed" 
            color="green"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm">Type:</span>
            <div className="flex gap-2">
              {(['all', 'cash', 'credit', 'product', 'custom'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterType === type
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm">Status:</span>
            <div className="flex gap-2">
              {([
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === opt.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadRewards}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : rewards.length === 0 ? (
          /* Empty State */
          <div 
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center"
            style={{ boxShadow: '0 0 30px -5px rgba(249, 115, 22, 0.1)' }}
          >
            <div className="relative inline-block mb-6">
              <div className="text-7xl animate-bounce">🎁</div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-zinc-800 rounded-full blur-md"></div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Rewards Yet</h2>
            <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
              Create rewards that can be awarded to creators for winning competitions, hitting milestones, or as manual bonuses.
            </p>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create First Reward
            </button>

            {/* Reward type suggestions */}
            <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto mt-10">
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <div className="text-2xl mb-2">💵</div>
                <div className="text-zinc-400 text-sm">Cash Prizes</div>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <div className="text-2xl mb-2">🎁</div>
                <div className="text-zinc-400 text-sm">Store Credit</div>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <div className="text-2xl mb-2">👕</div>
                <div className="text-zinc-400 text-sm">Free Products</div>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <div className="text-2xl mb-2">✨</div>
                <div className="text-zinc-400 text-sm">Custom Perks</div>
              </div>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <>
            {/* Add Reward Button */}
            <div className="mb-6">
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Reward
              </button>
            </div>

            {/* Rewards List */}
            <div className="space-y-4">
              {filteredRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  onEdit={openEditModal}
                  onToggleActive={handleToggleActive}
                />
              ))}
              {filteredRewards.length === 0 && (
                <div className="text-center py-12">
                  <span className="text-4xl mb-3 block">🔍</span>
                  <p className="text-zinc-400">No rewards match your filters</p>
                  <button
                    onClick={() => { setFilterType('all'); setFilterStatus('all'); }}
                    className="mt-3 text-orange-400 hover:text-orange-300 text-sm"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <CreatorPreview rewards={rewards} />
        )}
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{editingReward ? '✏️' : '🎁'}</span>
              <h3 className="text-xl font-bold text-white">
                {editingReward ? 'Edit Reward' : 'Create New Reward'}
              </h3>
            </div>

            <div className="space-y-5 mb-6">
              {/* Name */}
              <div>
                <label className="text-zinc-400 text-sm block mb-2">
                  Reward Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., $50 Cash Prize"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-zinc-400 text-sm block mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the reward..."
                  rows={2}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              {/* Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 text-sm block mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as RewardType })}
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

              {/* Icon Selection */}
              <div>
                <label className="text-zinc-400 text-sm block mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        formData.icon === icon
                          ? 'bg-orange-500 scale-110'
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                <div>
                  <div className="text-white font-medium">Active</div>
                  <div className="text-zinc-500 text-sm">Reward is available for awarding</div>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.isActive ? 'bg-green-500' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    formData.isActive ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Stats (Edit mode only) */}
              {editingReward && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-800/50 rounded-xl">
                    <div className="text-2xl font-bold text-blue-400">{editingReward.timesAwarded}</div>
                    <div className="text-zinc-500 text-sm">Times Awarded</div>
                  </div>
                  <div className="p-4 bg-zinc-800/50 rounded-xl">
                    <div className="text-2xl font-bold text-purple-400">{editingReward.timesRedeemed}</div>
                    <div className="text-zinc-500 text-sm">Times Redeemed</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={isProcessing}
                className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isProcessing || !formData.name.trim() || !formData.value.trim()}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>

            {/* Delete button (Edit mode only) */}
            {editingReward && (
              <button
                onClick={() => {
                  closeModal();
                  openDeleteModal(editingReward);
                }}
                className="w-full mt-3 py-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
              >
                Delete Reward
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingReward && (
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingReward(null);
          }}
          onConfirm={handleDelete}
          title="Delete Reward?"
          message="This will permanently remove this reward from the catalog."
          icon="🗑️"
          confirmLabel="Delete Reward"
          confirmColor="red"
          isProcessing={isProcessing}
        >
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{deletingReward.icon}</span>
              <div>
                <div className="text-white font-medium">{deletingReward.name}</div>
                <div className="text-zinc-500 text-sm">{deletingReward.value}</div>
              </div>
            </div>
            {(deletingReward.timesAwarded > 0 || deletingReward.timesRedeemed > 0) && (
              <div className="mt-3 pt-3 border-t border-zinc-700 text-sm">
                <span className="text-zinc-400">
                  This reward has been awarded {deletingReward.timesAwarded} times
                </span>
              </div>
            )}
          </div>
        </ConfirmModal>
      )}

      {/* Global Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
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
  );
}