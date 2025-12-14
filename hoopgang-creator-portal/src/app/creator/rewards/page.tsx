// src/app/creator/rewards/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui';
import { getCreatorByUserId } from '@/lib/firestore';
import { Creator, Reward, Redemption, RewardCategory, RedemptionStatus } from '@/types';
import { auth } from '@/lib/firebase';

export default function CreatorRewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Rewards state
  const [milestoneRewards, setMilestoneRewards] = useState<Reward[]>([]);
  const [volumeRewards, setVolumeRewards] = useState<Reward[]>([]);
  const [gmvRewards, setGmvRewards] = useState<Reward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  
  // Redemptions state
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(true);

  const getAuthToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  // Load rewards catalog
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
        setMilestoneRewards(data.milestone || []);
        setVolumeRewards(data.volume_leaderboard || []);
        setGmvRewards(data.gmv_leaderboard || []);
      }
    } catch (error) {
      console.error('Error loading rewards:', error);
    } finally {
      setRewardsLoading(false);
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
      loadRedemptions();
    }
  }, [user, authLoading, router]);

  const getMilestoneTierDisplay = (tier: string) => {
    switch (tier) {
      case '100k': return { label: '100K', emoji: '🥉', views: '100,000+' };
      case '500k': return { label: '500K', emoji: '🥈', views: '500,000+' };
      case '1m': return { label: '1M+', emoji: '🥇', views: '1,000,000+' };
      default: return { label: tier, emoji: '🏆', views: tier };
    }
  };

  const getRewardValue = (reward: Reward): string => {
    const parts: string[] = [];
    if (reward.cashValue) parts.push(`$${reward.cashValue}`);
    if (reward.storeCreditValue) parts.push(`$${reward.storeCreditValue} credit`);
    if (reward.productName) parts.push(reward.productName);
    return parts.join(' + ') || 'Reward';
  };

  const getStatusBadge = (status: RedemptionStatus) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
      case 'approved':
        return { label: 'Approved', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'fulfilled':
        return { label: 'Fulfilled', class: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'rejected':
        return { label: 'Rejected', class: 'bg-red-500/20 text-red-400 border-red-500/30' };
      default:
        return { label: status, class: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' };
    }
  };

  const getSourceLabel = (source: string): string => {
    switch (source) {
      case 'milestone_submission': return 'Viral Video';
      case 'volume_win': return 'Volume LB';
      case 'gmv_win': return 'GMV LB';
      case 'competition_win': return 'Competition';
      default: return source;
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getRankEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (authLoading || loading) {
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

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🎁 Rewards</h1>
          <p className="text-zinc-400">
            Earn rewards for viral content and leaderboard wins
          </p>
        </div>

        {/* SECTION 1: Milestone Rewards */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>🏆</span> Milestone Rewards
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            Hit view milestones on your TikToks to unlock rewards
          </p>
          
          {rewardsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : milestoneRewards.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">No milestone rewards available</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {milestoneRewards
                .sort((a, b) => {
                  const order = { '100k': 1, '500k': 2, '1m': 3 };
                  return (order[a.milestoneTier as keyof typeof order] || 0) - 
                         (order[b.milestoneTier as keyof typeof order] || 0);
                })
                .map((reward) => {
                  const tier = getMilestoneTierDisplay(reward.milestoneTier || '');
                  return (
                    <div
                      key={reward.id}
                      className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/50 p-6 hover:border-orange-500/30 transition-all duration-300 flex flex-col"
                    >
                      <div className="text-center mb-4">
                        {reward.imageUrl ? (
                          <img
                            src={reward.imageUrl}
                            alt={reward.name}
                            className="w-20 h-20 mx-auto rounded-xl object-cover mb-3 border border-zinc-700"
                          />
                        ) : (
                          <div className="text-4xl mb-2">{tier.emoji}</div>
                        )}
                        <div className="text-2xl font-bold text-white">{tier.label}</div>
                        <div className="text-zinc-400 text-sm">VIEWS</div>
                      </div>
                      
                      <div className="flex-1 text-center mb-4">
                        {reward.cashValue && (
                          <div className="text-green-400 font-semibold">${reward.cashValue} cash</div>
                        )}
                        {reward.storeCreditValue && (
                          <div className="text-green-400 font-semibold">${reward.storeCreditValue} credit</div>
                        )}
                        {reward.productName && (
                          <div className="text-orange-400 text-sm mt-1">+ {reward.productName}</div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => router.push('/creator/submit')}
                        className="w-full py-2.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium rounded-lg transition-colors text-sm"
                      >
                        Claim →
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* SECTION 2: Leaderboard Rewards */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>📊</span> Leaderboard Rewards
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weekly Volume */}
            <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-1">Weekly Volume</h3>
              <p className="text-zinc-400 text-sm mb-4">Post the most content each week</p>
              
              {rewardsLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 bg-zinc-700 rounded"></div>
                  <div className="h-8 bg-zinc-700 rounded"></div>
                  <div className="h-8 bg-zinc-700 rounded"></div>
                </div>
              ) : volumeRewards.length === 0 ? (
                <div className="text-zinc-500 text-sm">No volume rewards configured</div>
              ) : (
                <div className="space-y-2">
                  {volumeRewards
                    .sort((a, b) => (a.leaderboardRank || 0) - (b.leaderboardRank || 0))
                    .map((reward) => (
                      <div
                        key={reward.id}
                        className="flex items-center justify-between py-2 px-3 bg-zinc-900/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getRankEmoji(reward.leaderboardRank || 0)}</span>
                          <span className="text-zinc-300">
                            {reward.leaderboardRank === 1 ? '1st' : 
                             reward.leaderboardRank === 2 ? '2nd' : '3rd'} Place
                          </span>
                        </div>
                        <span className="text-green-400 font-semibold">
                          ${reward.cashValue || 0}
                        </span>
                      </div>
                    ))}
                </div>
              )}
              
              <button
                onClick={() => router.push('/creator/leaderboard')}
                className="w-full mt-4 py-2 text-zinc-400 hover:text-orange-400 text-sm transition-colors"
              >
                View Leaderboard →
              </button>
            </div>

            {/* Monthly GMV */}
            <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-1">Monthly GMV</h3>
              <p className="text-zinc-400 text-sm mb-4">Drive the most sales each month</p>
              
              {rewardsLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 bg-zinc-700 rounded"></div>
                  <div className="h-8 bg-zinc-700 rounded"></div>
                  <div className="h-8 bg-zinc-700 rounded"></div>
                </div>
              ) : gmvRewards.length === 0 ? (
                <div className="text-zinc-500 text-sm">No GMV rewards configured</div>
              ) : (
                <div className="space-y-2">
                  {gmvRewards
                    .sort((a, b) => (a.leaderboardRank || 0) - (b.leaderboardRank || 0))
                    .map((reward) => (
                      <div
                        key={reward.id}
                        className="flex items-center justify-between py-2 px-3 bg-zinc-900/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getRankEmoji(reward.leaderboardRank || 0)}</span>
                          <span className="text-zinc-300">
                            {reward.leaderboardRank === 1 ? '1st' : 
                             reward.leaderboardRank === 2 ? '2nd' : '3rd'} Place
                          </span>
                        </div>
                        <span className="text-green-400 font-semibold">
                          ${reward.cashValue || 0}
                        </span>
                      </div>
                    ))}
                </div>
              )}
              
              <button
                onClick={() => router.push('/creator/leaderboard')}
                className="w-full mt-4 py-2 text-zinc-400 hover:text-orange-400 text-sm transition-colors"
              >
                View Leaderboard →
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 3: Redemption History */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>📜</span> Your Redemption History
          </h2>
          
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/50 overflow-hidden">
            {redemptionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : redemptions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🎯</div>
                <p className="text-zinc-400 mb-2">No redemptions yet</p>
                <p className="text-zinc-500 text-sm">
                  Submit viral content or win leaderboard spots to earn rewards!
                </p>
                <button
                  onClick={() => router.push('/creator/submit')}
                  className="mt-4 px-6 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium rounded-lg transition-colors text-sm"
                >
                  Submit Content
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700/50">
                      <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Date</th>
                      <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Reward</th>
                      <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Source</th>
                      <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Status</th>
                      <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.map((redemption) => {
                      const statusBadge = getStatusBadge(redemption.status);
                      return (
                        <tr
                          key={redemption.id}
                          className="border-b border-zinc-700/30 hover:bg-zinc-700/20 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <span className="text-zinc-300">{formatDate(redemption.createdAt)}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-white font-medium">{redemption.rewardName}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-zinc-400 text-sm">{getSourceLabel(redemption.source)}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.class}`}>
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {redemption.status === 'fulfilled' ? (
                              <div className="text-sm">
                                {redemption.cashAmount && (
                                  <span className="text-green-400">
                                    ${redemption.cashAmount} via {redemption.cashMethod || 'cash'}
                                  </span>
                                )}
                                {redemption.storeCreditCode && (
                                  <span className="text-blue-400">
                                    Code: {redemption.storeCreditCode}
                                  </span>
                                )}
                                {redemption.productShipped && (
                                  <span className="text-orange-400">
                                    Shipped {redemption.trackingNumber ? `(${redemption.trackingNumber})` : ''}
                                  </span>
                                )}
                              </div>
                            ) : redemption.status === 'rejected' ? (
                              <span className="text-zinc-500 text-sm">—</span>
                            ) : (
                              <span className="text-zinc-500 text-sm">Processing...</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}