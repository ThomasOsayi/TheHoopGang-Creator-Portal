// src/app/creator/rewards/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Navbar, 
  AnimatedCounter, 
  BackgroundOrbs,
  FilterPill,
  ClaimModal,
  useToast,
} from '@/components/ui';
import { getCreatorByUserId } from '@/lib/firestore';
import { Creator, Redemption, RedemptionStatus } from '@/types';
import { auth } from '@/lib/firebase';

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
}

// Category color mapping
const categoryColors = {
  gold: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: 'rgba(234, 179, 8, 0.3)' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'rgba(168, 85, 247, 0.3)' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'rgba(59, 130, 246, 0.3)' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', glow: 'rgba(34, 197, 94, 0.3)' },
};

// Static rewards catalog
const REWARDS_CATALOG: RewardItem[] = [
  // Leaderboard Rewards
  { id: 'lb-1', title: '1st Place', subtitle: 'Weekly competition winner', value: '$50 Cash', icon: '🥇', category: 'Leaderboard', categoryColor: 'gold', available: false, filter: 'leaderboard' },
  { id: 'lb-2', title: '2nd Place', subtitle: 'Weekly runner-up', value: '$25 Cash', icon: '🥈', category: 'Leaderboard', categoryColor: 'gold', available: false, filter: 'leaderboard' },
  { id: 'lb-3', title: '3rd Place', subtitle: 'Weekly third place', value: '$10 Cash', icon: '🥉', category: 'Leaderboard', categoryColor: 'gold', available: false, filter: 'leaderboard' },
  // Milestone Rewards
  { id: 'ms-100k', title: 'Breakout', subtitle: 'Single video hits 100K views', value: '$10 Credit', icon: '🔥', category: 'Milestone', categoryColor: 'purple', available: false, filter: 'milestone' },
  { id: 'ms-500k', title: 'Semi-Viral', subtitle: 'Single video hits 500K views', value: '$25 + Product', icon: '⚡', category: 'Milestone', categoryColor: 'purple', available: false, filter: 'milestone' },
  { id: 'ms-1m', title: 'Viral King', subtitle: 'Single video hits 1M+ views', value: '$50 + Merch', icon: '👑', category: 'Milestone', categoryColor: 'purple', available: false, filter: 'milestone' },
  // Volume Rewards
  { id: 'vol-10', title: 'Starter', subtitle: 'Submit 10 TikToks', value: '$5 Credit', icon: '🎯', category: 'Volume', categoryColor: 'blue', available: false, filter: 'volume' },
  { id: 'vol-25', title: 'Consistent', subtitle: 'Submit 25 TikToks', value: '$15 Credit', icon: '🚀', category: 'Volume', categoryColor: 'blue', available: false, filter: 'volume' },
  { id: 'vol-50', title: 'Power Creator', subtitle: 'Submit 50 TikToks', value: '$30 + Merch', icon: '💎', category: 'Volume', categoryColor: 'blue', available: false, filter: 'volume' },
  // Bonus Rewards
  { id: 'bonus-first', title: 'First Post', subtitle: 'Submit your first TikTok', value: '$5 Credit', icon: '🌟', category: 'Bonus', categoryColor: 'green', available: false, filter: 'bonus' },
  { id: 'bonus-week', title: 'Perfect Week', subtitle: 'Post every day for a week', value: '$20 Bonus', icon: '📅', category: 'Bonus', categoryColor: 'green', available: false, filter: 'bonus' },
  { id: 'bonus-referral', title: 'Referral Pro', subtitle: 'Refer 3 accepted creators', value: '$25 Cash', icon: '🤝', category: 'Bonus', categoryColor: 'green', available: false, filter: 'bonus' },
];

// Reward Card Component
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
      className={`aspect-square bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 flex flex-col transition-all duration-300 hover:border-zinc-600 cursor-pointer relative overflow-hidden group ${reward.available ? 'hover:scale-[1.03] hover:-translate-y-2' : ''}`}
      onClick={onClick}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (reward.available) {
          e.currentTarget.style.boxShadow = `0 0 40px -5px ${colors.glow}`;
        }
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Category Tag */}
      <div className={`absolute top-4 right-4 text-xs font-medium px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}>
        {reward.category}
      </div>

      {/* Icon - Large & Centered */}
      <div className="flex-1 flex items-center justify-center">
        <div 
          className={`text-6xl transition-transform duration-300 ${isHovered && reward.available ? 'scale-110' : ''}`}
          style={{ filter: isHovered && reward.available ? 'drop-shadow(0 0 20px rgba(255,255,255,0.2))' : 'none' }}
        >
          {reward.icon}
        </div>
      </div>

      {/* Bottom Info */}
      <div className="text-center">
        <h3 className="text-white font-bold text-lg mb-0.5">{reward.title}</h3>
        <p className="text-zinc-500 text-sm mb-3">{reward.subtitle}</p>
        
        {/* Price Tag */}
        <div className={`inline-block px-4 py-2 rounded-xl font-bold text-sm ${colors.bg} ${colors.text} ${colors.border} border`}>
          {reward.value}
        </div>
      </div>
    </div>
  );
}

export default function CreatorRewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Tab and filter state
  const [activeTab, setActiveTab] = useState<TabType>('shop');
  const [activeFilter, setActiveFilter] = useState<RewardFilter>('all');
  
  // Rewards state (with earned status from API)
  const [rewards, setRewards] = useState<RewardItem[]>(REWARDS_CATALOG);
  
  // Stats
  const [stats, setStats] = useState({
    totalEarned: 0,
    pending: 0,
    readyToClaim: 0,
  });
  
  // Redemptions state
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(true);
  
  // Claim modal state
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const { showToast } = useToast();

  const getAuthToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
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
          pending: data.pending || 0,
          readyToClaim: data.readyToClaim || 0,
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
      loadCreatorStats();
      loadRedemptions();
    }
  }, [user, authLoading, router]);

  // Handle card click
  const handleCardClick = (reward: RewardItem) => {
    setSelectedReward(reward);
    setIsClaimModalOpen(true);
  };

  // Handle claim submission
  const handleClaimSubmit = async (tiktokUrl: string) => {
    if (!selectedReward) return;
    
    try {
      const token = await getAuthToken();
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      // TODO: Implement actual claim API call
      // For now, just show a success message
      showToast(`Claim submitted for ${selectedReward.title}!`, 'success');
      
      // Refresh stats after claim
      await loadCreatorStats();
    } catch (error) {
      console.error('Error claiming reward:', error);
      showToast('Failed to submit claim', 'error');
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
      case 'pending':
        return { label: 'Pending', class: 'bg-yellow-500/20 text-yellow-400' };
      case 'approved':
        return { label: 'Approved', class: 'bg-blue-500/20 text-blue-400' };
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
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      <Navbar />
      
      {/* Background Orbs */}
      <BackgroundOrbs colors={['purple', 'orange', 'amber']} />

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-white mb-2">
            Rewards Shop 🎁
          </h1>
          <p className="text-zinc-400 text-lg">
            Earn rewards for your content and claim your prizes
          </p>
        </div>

        {/* Stats Bar */}
        <div className="mb-8 p-5 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-orange-500/10 border border-orange-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 animate-fade-in-up">
          <div className="flex items-center gap-6 sm:gap-8">
            {/* Total Earned */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">
                  $<AnimatedCounter value={stats.totalEarned} />
                </div>
                <div className="text-zinc-500 text-sm">Total Earned</div>
              </div>
            </div>
            
            <div className="w-px h-12 bg-zinc-700 hidden sm:block" />
            
            {/* Pending */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">
                  <AnimatedCounter value={stats.pending} />
                </div>
                <div className="text-zinc-500 text-sm">Pending</div>
              </div>
            </div>
            
            <div className="w-px h-12 bg-zinc-700 hidden sm:block" />
            
            {/* Ready to Claim */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400">
                  <AnimatedCounter value={stats.readyToClaim} />
                </div>
                <div className="text-zinc-500 text-sm">Ready to Claim</div>
              </div>
            </div>
          </div>

          {/* Claim All Button */}
          {stats.readyToClaim > 0 && (
            <button className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/25">
              Claim All →
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800 w-fit">
          <button
            onClick={() => setActiveTab('shop')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'shop'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span>🛒</span> Rewards Shop
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
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
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              <FilterPill 
                label="All Rewards" 
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
              <FilterPill 
                label="Volume" 
                active={activeFilter === 'volume'} 
                onClick={() => setActiveFilter('volume')}
                count={filterCounts.volume}
              />
              <FilterPill 
                label="Bonus" 
                active={activeFilter === 'bonus'} 
                onClick={() => setActiveFilter('bonus')}
                count={filterCounts.bonus}
              />
            </div>

            {/* Rewards Grid - 4 columns on large screens */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredRewards.map((reward) => (
                <RewardCard 
                  key={reward.id} 
                  reward={reward}
                  onClick={() => handleCardClick(reward)}
                />
              ))}
            </div>

            {/* Empty State */}
            {filteredRewards.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🔍</div>
                <div className="text-zinc-400 text-lg">No rewards match this filter</div>
                <button 
                  onClick={() => setActiveFilter('all')}
                  className="mt-4 text-orange-400 hover:text-orange-300 font-medium"
                >
                  View all rewards →
                </button>
              </div>
            )}

            {/* How to Earn Section */}
            <div className="mt-12 p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl">
              <h3 className="text-white font-bold text-xl mb-6 text-center">How to Earn Rewards</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">🏆</div>
                  <div className="text-white font-medium mb-1">Win Competitions</div>
                  <div className="text-zinc-500 text-sm">Place top 3 in weekly leaderboard</div>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">⚡</div>
                  <div className="text-white font-medium mb-1">Hit Milestones</div>
                  <div className="text-zinc-500 text-sm">Get 100K+ views on a video</div>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">📊</div>
                  <div className="text-white font-medium mb-1">Post Consistently</div>
                  <div className="text-zinc-500 text-sm">Submit 10, 25, or 50 TikToks</div>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">🎁</div>
                  <div className="text-white font-medium mb-1">Unlock Bonuses</div>
                  <div className="text-zinc-500 text-sm">Complete special challenges</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* History Tab */
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="text-zinc-500 text-sm font-medium">REWARD</div>
              <div className="flex items-center gap-16">
                <span className="text-zinc-500 text-sm font-medium">AMOUNT</span>
                <span className="text-zinc-500 text-sm font-medium w-20 text-center">STATUS</span>
              </div>
            </div>

            {redemptionsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : redemptions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">🎁</div>
                <div className="text-zinc-400">No redemptions yet</div>
                <div className="text-zinc-500 text-sm mt-1">Claim your first reward to see it here!</div>
              </div>
            ) : (
              <>
                <div className="divide-y divide-zinc-800/50">
                  {redemptions.map((redemption) => {
                    const statusBadge = getStatusBadge(redemption.status);
                    return (
                      <div 
                        key={redemption.id}
                        className="flex items-center justify-between px-6 py-4 hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-xl">
                            🎁
                          </div>
                          <div>
                            <div className="text-white font-medium">{redemption.rewardName}</div>
                            <div className="text-zinc-500 text-sm">{formatDate(redemption.createdAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {redemption.cashAmount && (
                            <div className="text-green-400 font-semibold">${redemption.cashAmount}</div>
                          )}
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadge.class}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
                  <span className="text-zinc-500 text-sm">
                    Showing {redemptions.length} redemptions
                  </span>
                  <span className="text-green-400 font-semibold">
                    Total: ${redemptions.reduce((sum, r) => sum + (r.cashAmount || 0), 0)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Claim Modal */}
      <ClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => {
          setIsClaimModalOpen(false);
          setSelectedReward(null);
        }}
        reward={selectedReward}
        onSubmit={handleClaimSubmit}
      />
    </div>
  );
}