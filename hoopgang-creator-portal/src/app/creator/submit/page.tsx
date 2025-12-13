// src/app/creator/submit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui';
import { getCreatorByUserId } from '@/lib/firestore';
import { getCurrentWeek, formatTimeUntilReset } from '@/lib/week-utils';
import { Creator } from '@/types';

export default function SubmitContentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Volume submission state
  const [volumeUrl, setVolumeUrl] = useState('');
  const [volumeSubmitting, setVolumeSubmitting] = useState(false);
  const [volumeStats, setVolumeStats] = useState({
    weeklyCount: 0,
    allTimeCount: 0,
    currentRank: null as number | null,
    totalCreators: 0,
  });
  
  // Milestone submission state
  const [milestoneUrl, setMilestoneUrl] = useState('');
  const [milestoneTier, setMilestoneTier] = useState<'100k' | '500k' | '1m'>('100k');
  const [milestoneSubmitting, setMilestoneSubmitting] = useState(false);
  const [milestoneStats, setMilestoneStats] = useState({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalEarned: 0,
  });
  
  // Time until reset
  const [timeUntilReset, setTimeUntilReset] = useState(formatTimeUntilReset());

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
        // TODO: Load stats via API in HG-304/305
      } catch (error) {
        console.error('Error loading creator:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadCreator();
    }
  }, [user, authLoading, router]);

  // Update countdown timer every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilReset(formatTimeUntilReset());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleVolumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volumeUrl.trim() || volumeSubmitting) return;
    
    setVolumeSubmitting(true);
    try {
      // TODO: Call API in HG-304
      console.log('Submit volume:', volumeUrl);
      setVolumeUrl('');
      // Refresh stats
    } catch (error) {
      console.error('Volume submission error:', error);
    } finally {
      setVolumeSubmitting(false);
    }
  };

  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneUrl.trim() || milestoneSubmitting) return;
    
    setMilestoneSubmitting(true);
    try {
      // TODO: Call API in HG-305
      console.log('Submit milestone:', milestoneUrl, milestoneTier);
      setMilestoneUrl('');
      // Refresh stats
    } catch (error) {
      console.error('Milestone submission error:', error);
    } finally {
      setMilestoneSubmitting(false);
    }
  };

  const validateTikTokUrl = (url: string): boolean => {
    return url.includes('tiktok.com/') || url.includes('vm.tiktok.com/');
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

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Content Submission</h1>
          <p className="text-zinc-400">
            Submit your TikTok content to earn rewards and climb the leaderboard
          </p>
        </div>

        {/* Weekly Reset Timer */}
        <div className="mb-6 p-4 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">⏱️ Weekly reset in:</span>
              <span className="text-orange-400 font-mono font-bold">{timeUntilReset}</span>
            </div>
            <span className="text-zinc-500 text-sm">Week {getCurrentWeek()}</span>
          </div>
        </div>

        {/* Two-card layout */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          
          {/* Volume Submissions Card */}
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/50 p-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Volume Submissions</h2>
                <p className="text-zinc-400 text-sm">Post content to climb the weekly leaderboard</p>
              </div>
            </div>

            <form onSubmit={handleVolumeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">TikTok URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={volumeUrl}
                    onChange={(e) => setVolumeUrl(e.target.value)}
                    placeholder="https://tiktok.com/@username/video/..."
                    className="flex-1 bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!volumeUrl.trim() || volumeSubmitting || !validateTikTokUrl(volumeUrl)}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                  >
                    {volumeSubmitting ? '...' : 'Submit'}
                  </button>
                </div>
              </div>
            </form>

            {/* Volume Stats */}
            <div className="mt-6 pt-4 border-t border-zinc-700/50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">This week:</span>
                  <span className="text-white font-semibold ml-2">{volumeStats.weeklyCount} posts</span>
                </div>
                <div>
                  <span className="text-zinc-500">All-time:</span>
                  <span className="text-white font-semibold ml-2">{volumeStats.allTimeCount} posts</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-zinc-500 text-sm">Current rank:</span>
                <span className="text-orange-400 font-semibold ml-2">
                  {volumeStats.currentRank 
                    ? `#${volumeStats.currentRank} of ${volumeStats.totalCreators} creators`
                    : 'Not ranked yet'}
                </span>
              </div>
            </div>
          </div>

          {/* Milestone Submissions Card */}
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/50 p-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <span className="text-2xl">🏆</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Milestone Submissions</h2>
                <p className="text-zinc-400 text-sm">Got a viral video? Claim your reward</p>
              </div>
            </div>

            {/* Milestone Tiers Info */}
            <div className="mb-4 p-3 bg-zinc-900/50 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">🥉 100K views</span>
                <span className="text-green-400">$10 store credit</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">🥈 500K views</span>
                <span className="text-green-400">$25 + free product</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">🥇 1M+ views</span>
                <span className="text-green-400">$50 + exclusive merch</span>
              </div>
            </div>

            <form onSubmit={handleMilestoneSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">TikTok URL</label>
                <input
                  type="url"
                  value={milestoneUrl}
                  onChange={(e) => setMilestoneUrl(e.target.value)}
                  placeholder="https://tiktok.com/@username/video/..."
                  className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-zinc-400 mb-2">Tier</label>
                  <select
                    value={milestoneTier}
                    onChange={(e) => setMilestoneTier(e.target.value as '100k' | '500k' | '1m')}
                    className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="100k">100K Views</option>
                    <option value="500k">500K Views</option>
                    <option value="1m">1M+ Views</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={!milestoneUrl.trim() || milestoneSubmitting || !validateTikTokUrl(milestoneUrl)}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                  >
                    {milestoneSubmitting ? '...' : 'Claim'}
                  </button>
                </div>
              </div>
            </form>

            {/* Milestone Stats */}
            <div className="mt-6 pt-4 border-t border-zinc-700/50">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">Pending:</span>
                  <span className="text-yellow-400 font-semibold ml-2">{milestoneStats.pendingCount}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Approved:</span>
                  <span className="text-green-400 font-semibold ml-2">{milestoneStats.approvedCount}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Earned:</span>
                  <span className="text-green-400 font-semibold ml-2">${milestoneStats.totalEarned}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submission History Link */}
        <div className="mt-8 text-center">
          <button 
            onClick={() => router.push('/creator/submissions')}
            className="text-zinc-400 hover:text-orange-400 transition-colors text-sm"
          >
            View submission history →
          </button>
        </div>
      </main>
    </div>
  );
}