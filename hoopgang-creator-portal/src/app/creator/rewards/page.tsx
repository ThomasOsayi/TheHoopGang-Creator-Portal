// src/app/creator/rewards/page.tsx
// Mobile-Responsive Version

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Navbar, 
  AnimatedCounter, 
  BackgroundOrbs,
  FilterPill,
  ClaimModal,
  useToast,
  PageHeader,
} from '@/components/ui';
import { getCreatorByUserId } from '@/lib/firestore';
import { Creator, Redemption, RedemptionStatus } from '@/types';
import { auth } from '@/lib/firebase';
import { ProtectedRoute } from '@/components/auth';

type RewardFilter = 'all' | 'available' | 'leaderboard' | 'milestone' | 'volume' | 'bonus';
type TabType = 'shop' | 'history';

interface RewardItem {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  icon: string;
  category: string;
  categoryColor: 'gold' | 'purple' | 'blue' | 'green';
  available: boolean;
  filter: RewardFilter;
  milestoneTier?: string;
  leaderboardRank?: number;
}

// Category color mapping
const categoryColors = {
  gold: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: 'rgba(234, 179, 8, 0.4)' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'rgba(168, 85, 247, 0.4)' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'rgba(59, 130, 246, 0.4)' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', glow: 'rgba(34, 197, 94, 0.4)' },
};

// Helper to map API category to filter and color
function mapCategoryToFilterAndColor(category: string): { filter: RewardFilter; color: 'gold' | 'purple' | 'blue' | 'green'; displayName: string } {
  switch (category) {
    case 'milestone':
      return { filter: 'milestone', color: 'purple', displayName: 'Milestone' };
    case 'volume_leaderboard':
      return { filter: 'leaderboard', color: 'gold', displayName: 'Leaderboard' };
    case 'gmv_leaderboard':
      return { filter: 'leaderboard', color: 'gold', displayName: 'Leaderboard' };
    default:
      return { filter: 'bonus', color: 'green', displayName: 'Bonus' };
  }
}

// Helper to get icon based on reward type or milestone tier
function getRewardIcon(reward: any): string {
  // If reward has a custom icon, use it
  if (reward.icon && reward.icon.trim()) {
    return reward.icon;
  }
  
  // Milestone tier icons
  if (reward.milestoneTier) {
    switch (reward.milestoneTier) {
      case '100k': return '🔥';
      case '500k': return '⚡';
      case '1m': return '👑';
    }
  }
  
  // Leaderboard rank icons
  if (reward.leaderboardRank) {
    switch (reward.leaderboardRank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
    }
  }
  
  // Type-based icons
  if (reward.type) {
    switch (reward.type) {
      case 'cash': return '💵';
      case 'credit': return '🎁';
      case 'product': return '👕';
      case 'custom': return '✨';
    }
  }
  
  return '🎁';
}

// Helper to format reward value for display
function formatRewardValue(reward: any): string {
  // If value is already set (new schema), use it
  if (reward.value && reward.value.trim()) {
    return reward.value;
  }
  
  // Build value string from old schema fields
  const parts: string[] = [];
  if (reward.cashValue) {
    parts.push(`$${reward.cashValue}`);
  }
  if (reward.storeCreditValue) {
    parts.push(`$${reward.storeCreditValue} Credit`);
  }
  if (reward.productName) {
    parts.push(reward.productName);
  }
  
  return parts.length > 0 ? parts.join(' + ') : 'Reward';
}

// Helper to generate subtitle
function getRewardSubtitle(reward: any): string {
  if (reward.description && reward.description.trim()) {
    return reward.description;
  }
  
  // Generate based on milestone tier
  if (reward.milestoneTier) {
    switch (reward.milestoneTier) {
      case '100k': return 'Single video hits 100K views';
      case '500k': return 'Single video hits 500K views';
      case '1m': return 'Single video hits 1M+ views';
    }
  }
  
  // Generate based on leaderboard rank
  if (reward.leaderboardRank) {
    switch (reward.leaderboardRank) {
      case 1: return 'Weekly competition winner';
      case 2: return 'Weekly runner-up';
      case 3: return 'Weekly third place';
    }
  }
  
  return '';
}

// Reward Card Component - Mobile Optimized
function RewardCard({ 
  reward, 
  onClick 
}: { 
  reward: RewardItem; 
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = categoryColors[reward.categoryColor];

  return (
    <div 
      className={`aspect-square bg-zinc-900/70 border border-zinc-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col transition-all duration-300 cursor-pointer relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] hover:-translate-y-1`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        boxShadow: isHovered ? `0 0 30px -5px ${colors.glow}, 0 0 60px -10px ${colors.glow}` : 'none',
        borderColor: isHovered ? colors.glow : undefined,
      }}
    >
      {/* Category Tag */}
      <div className={`absolute top-2 right-2 sm:top-4 sm:right-4 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${colors.bg} ${colors.text}`}>
        {reward.category}
      </div>

      {/* Icon - Large & Centered */}
      <div className="flex-1 flex items-center justify-center">
        <div 
          className={`text-4xl sm:text-6xl transition-all duration-300 ${isHovered ? 'scale-110' : ''}`}
          style={{ 
            filter: isHovered ? `drop-shadow(0 0 20px ${colors.glow})` : 'none',
          }}
        >
          {reward.icon}
        </div>
      </div>

      {/* Bottom Info */}
      <div className="text-center">
        <h3 className="text-white font-bold text-sm sm:text-lg mb-0.5 truncate">{reward.title}</h3>
        <p className="text-zinc-500 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">{reward.subtitle}</p>
        
        {/* Price Tag */}
        <div 
          className={`inline-block px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm ${colors.bg} ${colors.text} ${colors.border} border transition-all duration-300`}
          style={{
            boxShadow: isHovered ? `0 0 15px -3px ${colors.glow}` : 'none',
          }}
        >
          {reward.value}
        </div>
      </div>
    </div>
  );
}

// Leaderboard Redirect Modal Component - Mobile Optimized
function LeaderboardRedirectModal({
  isOpen,
  onClose,
  reward,
  onGoToLeaderboard,
}: {
  isOpen: boolean;
  onClose: () => void;
  reward: RewardItem | null;
  onGoToLeaderboard: () => void;
}) {
  if (!isOpen || !reward) return null;

  const colors = categoryColors[reward.categoryColor];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-3xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in-up safe-bottom">
        {/* Drag indicator for mobile */}
        <div className="sm:hidden w-12 h-1 bg-zinc-700 rounded-full mx-auto mt-3" />
        
        {/* Glow Effect */}
        <div 
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: colors.glow }}
        />

        {/* Content */}
        <div className="relative p-5 sm:p-6 text-center">
          {/* Icon */}
          <div 
            className="text-5xl sm:text-7xl mb-3 sm:mb-4 inline-block"
            style={{ filter: `drop-shadow(0 0 20px ${colors.glow})` }}
          >
            {reward.icon}
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{reward.title}</h2>
          
          {/* Value Badge */}
          <div 
            className={`inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold text-sm mb-3 sm:mb-4 ${colors.bg} ${colors.text} ${colors.border} border`}
          >
            {reward.value}
          </div>

          {/* Description */}
          <p className="text-zinc-400 text-sm mb-4 sm:mb-6">
            This reward is awarded to top performers on our weekly leaderboard. 
            Check the leaderboard to see your current ranking!
          </p>

          {/* Trophy Icon */}
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-yellow-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mx-auto mb-4 sm:mb-6">
            🏆
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <button
              onClick={onGoToLeaderboard}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-orange-500/25 active:scale-[0.98]"
            >
              View Leaderboard →
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 text-zinc-400 hover:text-white font-medium transition-colors active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreatorRewardsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  
  // Tab and filter state
  const [activeTab, setActiveTab] = useState<TabType>('shop');
  const [activeFilter, setActiveFilter] = useState<RewardFilter>('all');
  
  // Rewards state - now fetched from API
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalEarned: 0,
    pending: 0,
    readyToClaim: 0,
  });
  
  // Redemptions state
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(true);
  
  // Modal states
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const { showToast } = useToast();

  const getAuthToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  // Load rewards from API
  const loadRewards = async () => {
    setRewardsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/creator/rewards', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Handle both grouped response and flat array
        let allRewards: any[] = [];
        
        if (data.rewards) {
          // Flat array response (new format)
          allRewards = data.rewards;
        } else if (data.milestone || data.volume_leaderboard || data.gmv_leaderboard) {
          // Grouped response (old format)
          allRewards = [
            ...(data.milestone || []),
            ...(data.volume_leaderboard || []),
            ...(data.gmv_leaderboard || []),
          ];
        }
        
        // Transform API rewards to RewardItem format
        const transformedRewards: RewardItem[] = allRewards.map((reward: any) => {
          const { filter, color, displayName } = mapCategoryToFilterAndColor(reward.category);
          
          return {
            id: reward.id,
            title: reward.name || 'Reward',
            subtitle: getRewardSubtitle(reward),
            value: formatRewardValue(reward),
            icon: getRewardIcon(reward),
            category: displayName,
            categoryColor: color,
            available: false, // Will be updated by stats API
            filter: filter,
            milestoneTier: reward.milestoneTier,
            leaderboardRank: reward.leaderboardRank,
          };
        });
        
        setRewards(transformedRewards);
      }
    } catch (error) {
      console.error('Error loading rewards:', error);
      showToast('Failed to load rewards', 'error');
    } finally {
      setRewardsLoading(false);
    }
  };

  // Load creator stats and earned rewards
  const loadCreatorStats = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/creator/rewards/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalEarned: data.totalEarned || 0,
          pending: data.processing || data.pending || 0,  // Processing count
          readyToClaim: data.readyToClaim || 0,           // Ready to claim count
        });
        
        // Update earned status on rewards
        if (data.earnedRewardIds) {
          setRewards(prev => prev.map(r => ({
            ...r,
            available: data.earnedRewardIds.includes(r.id),
          })));
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Load redemption history
  const loadRedemptions = async () => {
    setRedemptionsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/creator/redemptions', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRedemptions(data.redemptions || []);
      }
    } catch (error) {
      console.error('Error loading redemptions:', error);
    } finally {
      setRedemptionsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadCreator() {
      if (!user) return;
      
      try {
        const creatorData = await getCreatorByUserId(user.uid);
        if (!creatorData) {
          router.push('/apply');
          return;
        }
        setCreator(creatorData);
      } catch (error) {
        console.error('Error loading creator:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadCreator();
      loadRewards();
      loadCreatorStats();
      loadRedemptions();
    }
  }, [user, authLoading, router]);

  // Auto-open reward modal if ?reward= parameter is present
  useEffect(() => {
    const rewardId = searchParams.get('reward');
    if (rewardId && rewards.length > 0 && !rewardsLoading) {
      const reward = rewards.find(r => r.id === rewardId);
      if (reward) {
        setSelectedReward(reward);
        if (reward.filter === 'milestone') {
          setIsClaimModalOpen(true);
        } else if (reward.filter === 'leaderboard') {
          setIsLeaderboardModalOpen(true);
        } else {
          setIsClaimModalOpen(true);
        }
      }
    }
  }, [rewards, rewardsLoading, searchParams]);

  // Handle card click - different behavior for milestone vs leaderboard
  const handleCardClick = (reward: RewardItem) => {
    setSelectedReward(reward);
    
    if (reward.filter === 'milestone') {
      // Milestone rewards - open claim modal
      setIsClaimModalOpen(true);
    } else if (reward.filter === 'leaderboard') {
      // Leaderboard rewards - show redirect modal
      setIsLeaderboardModalOpen(true);
    } else {
      // Bonus/other rewards - could open claim modal or info modal
      setIsClaimModalOpen(true);
    }
  };

  // Handle leaderboard navigation
  const handleGoToLeaderboard = () => {
    setIsLeaderboardModalOpen(false);
    setSelectedReward(null);
    router.push('/creator/leaderboard');
  };

  // Handle claim submission - calls milestone API
  const handleClaimSubmit = async (tiktokUrl: string) => {
    if (!selectedReward) return;
    
    try {
      const token = await getAuthToken();
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      // Only milestone rewards can be claimed via URL submission
      if (selectedReward.filter !== 'milestone' || !selectedReward.milestoneTier) {
        showToast('This reward cannot be claimed this way', 'error');
        return;
      }

      // Call the milestone submission API
      const response = await fetch('/api/submissions/volume/milestone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tiktokUrl,
          claimedTier: selectedReward.milestoneTier,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit milestone');
      }

      showToast('Milestone submitted for review!', 'success');
      
      // Refresh stats and redemptions after claim
      await loadCreatorStats();
      await loadRedemptions();
      
      // Close modal
      setIsClaimModalOpen(false);
      setSelectedReward(null);
    } catch (error) {
      console.error('Error claiming reward:', error);
      showToast(error instanceof Error ? error.message : 'Failed to submit claim', 'error');
      throw error;
    }
  };

  // Filter rewards
  const filteredRewards = rewards.filter(reward => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'available') return reward.available;
    return reward.filter === activeFilter;
  });

  // Count rewards by category
  const filterCounts = {
    all: rewards.length,
    available: rewards.filter(r => r.available).length,
    leaderboard: rewards.filter(r => r.filter === 'leaderboard').length,
    milestone: rewards.filter(r => r.filter === 'milestone').length,
    volume: rewards.filter(r => r.filter === 'volume').length,
    bonus: rewards.filter(r => r.filter === 'bonus').length,
  };

  const getStatusBadge = (status: RedemptionStatus) => {
    switch (status) {
      case 'awaiting_claim':
        return { label: 'Awaiting Claim', class: 'bg-yellow-500/20 text-yellow-400' };
      case 'ready_to_fulfill':
        return { label: 'Ready', class: 'bg-blue-500/20 text-blue-400' };
      case 'fulfilled':
        return { label: 'Fulfilled', class: 'bg-green-500/20 text-green-400' };
      case 'rejected':
        return { label: 'Rejected', class: 'bg-red-500/20 text-red-400' };
      default:
        return { label: status, class: 'bg-zinc-500/20 text-zinc-400' };
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['creator']}>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        <Navbar />
        
        {/* Background Orbs */}
        <BackgroundOrbs colors={['purple', 'orange', 'amber']} />

        <main className="relative z-10 max-w-6xl mx-auto px-4 py-6 sm:py-8">
          {/* Header */}
          <PageHeader 
            title="Rewards Shop"
            subtitle="Earn rewards for your content and claim your prizes"
            icon="🎁"
            accentColor="purple"
          />

          {/* Stats Bar - Mobile Optimized */}
          <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-orange-500/10 border border-orange-500/20 rounded-2xl animate-fade-in-up">
            {/* Mobile: Stacked layout */}
            <div className="flex flex-col gap-4">
              {/* Stats Row - Scrollable on mobile */}
              <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                {/* Total Earned */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">💰</span>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-green-400">
                      $<AnimatedCounter value={stats.totalEarned} />
                    </div>
                    <div className="text-zinc-500 text-xs sm:text-sm whitespace-nowrap">Total Earned</div>
                  </div>
                </div>
                
                <div className="w-px h-10 sm:h-12 bg-zinc-700 flex-shrink-0" />
                
                {/* Processing */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">⏳</span>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-400">
                      <AnimatedCounter value={stats.pending} />
                    </div>
                    <div className="text-zinc-500 text-xs sm:text-sm whitespace-nowrap">Processing</div>
                  </div>
                </div>
                
                <div className="w-px h-10 sm:h-12 bg-zinc-700 flex-shrink-0" />
                
                {/* Ready to Claim */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">🎉</span>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-orange-400">
                      <AnimatedCounter value={stats.readyToClaim} />
                    </div>
                    <div className="text-zinc-500 text-xs sm:text-sm whitespace-nowrap">Ready to Claim</div>
                  </div>
                </div>
              </div>

              {/* Claim Rewards Button - Full width on mobile */}
              {stats.readyToClaim > 0 && (
                <button 
                  onClick={() => router.push('/creator/redemptions')}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-[0.98] shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
                >
                  <span>🎁</span> Claim Rewards →
                </button>
              )}
            </div>
          </div>

          {/* Tabs - Full width on mobile */}
          <div className="flex gap-1 sm:gap-2 mb-6 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800 w-full sm:w-fit">
            <button
              onClick={() => setActiveTab('shop')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base ${
                activeTab === 'shop'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <span>🛒</span> <span className="hidden xs:inline">Rewards</span> Shop
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base ${
                activeTab === 'history'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <span>📜</span> History
            </button>
          </div>

          {activeTab === 'shop' ? (
            <>
              {/* Filter Pills - Horizontal scroll on mobile */}
              <div className="flex gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                <FilterPill 
                  label="All" 
                  active={activeFilter === 'all'} 
                  onClick={() => setActiveFilter('all')}
                  count={filterCounts.all}
                />
                <FilterPill 
                  label="Available" 
                  active={activeFilter === 'available'} 
                  onClick={() => setActiveFilter('available')}
                  count={filterCounts.available}
                />
                <FilterPill 
                  label="Leaderboard" 
                  active={activeFilter === 'leaderboard'} 
                  onClick={() => setActiveFilter('leaderboard')}
                  count={filterCounts.leaderboard}
                />
                <FilterPill 
                  label="Milestone" 
                  active={activeFilter === 'milestone'} 
                  onClick={() => setActiveFilter('milestone')}
                  count={filterCounts.milestone}
                />
                {filterCounts.volume > 0 && (
                  <FilterPill 
                    label="Volume" 
                    active={activeFilter === 'volume'} 
                    onClick={() => setActiveFilter('volume')}
                    count={filterCounts.volume}
                  />
                )}
                {filterCounts.bonus > 0 && (
                  <FilterPill 
                    label="Bonus" 
                    active={activeFilter === 'bonus'} 
                    onClick={() => setActiveFilter('bonus')}
                    count={filterCounts.bonus}
                  />
                )}
              </div>

              {/* Rewards Grid - 2 columns on mobile, 3 on tablet, 4 on desktop */}
              {rewardsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="aspect-square bg-zinc-900/70 border border-zinc-800 rounded-xl sm:rounded-2xl animate-pulse">
                      <div className="p-3 sm:p-5 h-full flex flex-col">
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-800 rounded-full" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 sm:h-5 bg-zinc-800 rounded w-3/4 mx-auto" />
                          <div className="h-3 sm:h-4 bg-zinc-800 rounded w-1/2 mx-auto" />
                          <div className="h-6 sm:h-8 bg-zinc-800 rounded w-2/3 mx-auto" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRewards.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🔍</div>
                  <div className="text-zinc-400 text-base sm:text-lg">
                    {rewards.length === 0 
                      ? 'No rewards available yet' 
                      : 'No rewards match this filter'}
                  </div>
                  {rewards.length === 0 ? (
                    <p className="text-zinc-500 mt-2 text-sm">Check back soon for new rewards!</p>
                  ) : (
                    <button 
                      onClick={() => setActiveFilter('all')}
                      className="mt-4 text-orange-400 hover:text-orange-300 font-medium text-sm"
                    >
                      View all rewards →
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                  {filteredRewards.map((reward) => (
                    <RewardCard 
                      key={reward.id} 
                      reward={reward}
                      onClick={() => handleCardClick(reward)}
                    />
                  ))}
                </div>
              )}

              {/* How to Earn Section - Mobile Optimized */}
              <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl">
                <h3 className="text-white font-bold text-lg sm:text-xl mb-4 sm:mb-6 text-center">How to Earn Rewards</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 bg-yellow-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl mx-auto mb-2 sm:mb-3">🏆</div>
                    <div className="text-white font-medium text-sm sm:text-base mb-0.5 sm:mb-1">Win Competitions</div>
                    <div className="text-zinc-500 text-xs sm:text-sm">Place top 3 weekly</div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 bg-purple-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl mx-auto mb-2 sm:mb-3">⚡</div>
                    <div className="text-white font-medium text-sm sm:text-base mb-0.5 sm:mb-1">Hit Milestones</div>
                    <div className="text-zinc-500 text-xs sm:text-sm">Get 100K+ views</div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 bg-blue-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl mx-auto mb-2 sm:mb-3">📊</div>
                    <div className="text-white font-medium text-sm sm:text-base mb-0.5 sm:mb-1">Post Consistently</div>
                    <div className="text-zinc-500 text-xs sm:text-sm">Submit regularly</div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 bg-green-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl mx-auto mb-2 sm:mb-3">🎁</div>
                    <div className="text-white font-medium text-sm sm:text-base mb-0.5 sm:mb-1">Unlock Bonuses</div>
                    <div className="text-zinc-500 text-xs sm:text-sm">Special challenges</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* History Tab - Mobile Optimized */
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
              {/* Table Header - Hidden on mobile */}
              <div className="hidden sm:flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                <div className="text-zinc-500 text-sm font-medium">REWARD</div>
                <div className="flex items-center gap-16">
                  <span className="text-zinc-500 text-sm font-medium">AMOUNT</span>
                  <span className="text-zinc-500 text-sm font-medium w-20 text-center">STATUS</span>
                </div>
              </div>

              {/* Mobile Header */}
              <div className="sm:hidden px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Redemption History</span>
              </div>

              {redemptionsLoading ? (
                <div className="flex items-center justify-center py-12 sm:py-16">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : redemptions.length === 0 ? (
                <div className="p-8 sm:p-12 text-center">
                  <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🎁</div>
                  <div className="text-zinc-400 text-sm sm:text-base">No redemptions yet</div>
                  <div className="text-zinc-500 text-xs sm:text-sm mt-1">Claim your first reward to see it here!</div>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-zinc-800/50">
                    {redemptions.map((redemption) => {
                      const statusBadge = getStatusBadge(redemption.status);
                      return (
                        <div 
                          key={redemption.id}
                          className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-zinc-800/30 transition-colors gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-zinc-800 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0">
                              🎁
                            </div>
                            <div className="min-w-0">
                              <div className="text-white font-medium text-sm sm:text-base truncate">{redemption.rewardName}</div>
                              <div className="text-zinc-500 text-xs sm:text-sm">{formatDate(redemption.createdAt)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                            {redemption.cashAmount && (
                              <div className="text-green-400 font-semibold text-sm sm:text-base">${redemption.cashAmount}</div>
                            )}
                            <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap ${statusBadge.class}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
                    <span className="text-zinc-500 text-xs sm:text-sm">
                      {redemptions.length} redemptions
                    </span>
                    <span className="text-green-400 font-semibold text-sm sm:text-base">
                      Total: ${redemptions.reduce((sum, r) => sum + (r.cashAmount || 0), 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </main>

        {/* Claim Modal - Only for Milestone rewards */}
        <ClaimModal
          isOpen={isClaimModalOpen}
          onClose={() => {
            setIsClaimModalOpen(false);
            setSelectedReward(null);
          }}
          reward={selectedReward}
          onSubmit={handleClaimSubmit}
        />

        {/* Leaderboard Redirect Modal */}
        <LeaderboardRedirectModal
          isOpen={isLeaderboardModalOpen}
          onClose={() => {
            setIsLeaderboardModalOpen(false);
            setSelectedReward(null);
          }}
          reward={selectedReward}
          onGoToLeaderboard={handleGoToLeaderboard}
        />
      </div>
    </ProtectedRoute>
  );
}

export default function CreatorRewardsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <CreatorRewardsPageContent />
    </Suspense>
  );
}