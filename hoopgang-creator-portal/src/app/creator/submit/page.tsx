// src/app/creator/submit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Navbar, 
  GlowCard, 
  AnimatedCounter, 
  LiveCountdown, 
  BackgroundOrbs,
  Confetti,
  SuccessToast,
  Skeleton,
} from '@/components/ui';
import { getCreatorByUserId } from '@/lib/firestore';
import { getCurrentWeek, getWeekEnd } from '@/lib/week-utils';
import { Creator } from '@/types';
import { auth } from '@/lib/firebase';

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
  const [statsLoading, setStatsLoading] = useState(true);
  
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
  
  // Competition state
  const [activeCompetition, setActiveCompetition] = useState<{
    id: string;
    name: string;
    status: string;
    endsAt: string;
  } | null>(null);
  const [competitionLoading, setCompetitionLoading] = useState(true);
  
  // Week reset date
  const [weekResetDate, setWeekResetDate] = useState<Date>(new Date());
  
  // Success states
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successSubMessage, setSuccessSubMessage] = useState('');

  // Helper function to get auth token
  const getAuthToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  // Function to load volume stats
  const loadVolumeStats = async () => {
    setStatsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/submissions/volume/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVolumeStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading volume stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Function to load milestone stats
  const loadMilestoneStats = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/submissions/volume/milestone/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMilestoneStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading milestone stats:', error);
    }
  };

  // Function to fetch competition status
  const fetchCompetition = async () => {
    setCompetitionLoading(true);
    try {
      const response = await fetch('/api/competitions/active?type=volume');
      const data = await response.json();
      if (data.competition) {
        setActiveCompetition(data.competition);
      } else {
        setActiveCompetition(null);
      }
    } catch (err) {
      console.error('Error fetching competition:', err);
      setActiveCompetition(null);
    } finally {
      setCompetitionLoading(false);
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
      loadVolumeStats();
      loadMilestoneStats();
      fetchCompetition();
      
      // Set week reset date
      const currentWeek = getCurrentWeek();
      setWeekResetDate(getWeekEnd(currentWeek));
    }
  }, [user, authLoading, router]);

  const handleVolumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volumeUrl.trim() || volumeSubmitting) return;
    
    setVolumeSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/submissions/volume', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tiktokUrl: volumeUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      // Clear input and refresh stats
      setVolumeUrl('');
      await loadVolumeStats();
      
      // Show celebration!
      setSuccessMessage('Content Submitted! 🎉');
      setSuccessSubMessage(`You now have ${volumeStats.weeklyCount + 1} submissions this week`);
      setShowConfetti(true);
      setShowSuccessToast(true);
      
      // Hide confetti after 3 seconds
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (error) {
      console.error('Volume submission error:', error);
      alert(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setVolumeSubmitting(false);
    }
  };

  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneUrl.trim() || milestoneSubmitting) return;
    
    setMilestoneSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/submissions/volume/milestone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tiktokUrl: milestoneUrl,
          claimedTier: milestoneTier,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      // Clear input and refresh stats
      setMilestoneUrl('');
      await loadMilestoneStats();
      
      // Show success toast (milestone requires review, so no confetti)
      setSuccessMessage('Milestone Submitted! 🏆');
      setSuccessSubMessage('Your video is now pending review');
      setShowSuccessToast(true);
    } catch (error) {
      console.error('Milestone submission error:', error);
      alert(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setMilestoneSubmitting(false);
    }
  };

  const validateTikTokUrl = (url: string): boolean => {
    return url.includes('tiktok.com/') || url.includes('vm.tiktok.com/');
  };

  // Get tier label for display
  const getTierLabel = (tier: string) => {
    switch (tier) {
      case '100k': return '100K Views';
      case '500k': return '500K Views';
      case '1m': return '1M+ Views';
      default: return tier;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/60">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      <Navbar />
      
      {/* Background Orbs */}
      <BackgroundOrbs colors={['orange', 'purple', 'orange']} />
      
      {/* Confetti on successful submission */}
      <Confetti show={showConfetti} />
      
      {/* Success Toast */}
      <SuccessToast 
        show={showSuccessToast}
        message={successMessage}
        subMessage={successSubMessage}
        onClose={() => setShowSuccessToast(false)}
      />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header - Centered */}
        <div className="mb-8 text-center animate-fade-in">
          <h1 className="text-3xl font-bold text-white mb-2">
            Submit Content
            <span className="inline-block ml-2">🎬</span>
          </h1>
          <p className="text-zinc-400">
            Post TikToks to climb the leaderboard and earn rewards
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="text-2xl font-bold text-white">
              {statsLoading ? (
                <Skeleton className="w-8 h-7 mx-auto" />
              ) : (
                <AnimatedCounter value={volumeStats.weeklyCount} />
              )}
            </div>
            <div className="text-zinc-500 text-sm">This Week</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <div className="text-2xl font-bold text-orange-400">
              {statsLoading ? (
                <Skeleton className="w-12 h-7 mx-auto" />
              ) : volumeStats.currentRank ? (
                <>
                  #<AnimatedCounter value={volumeStats.currentRank} />
                </>
              ) : (
                <span className="text-zinc-500">—</span>
              )}
            </div>
            <div className="text-zinc-500 text-sm">Your Rank</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="text-2xl font-bold text-white">
              {statsLoading ? (
                <Skeleton className="w-8 h-7 mx-auto" />
              ) : (
                <AnimatedCounter value={volumeStats.allTimeCount} />
              )}
            </div>
            <div className="text-zinc-500 text-sm">All-Time</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <div className="text-2xl font-bold text-green-400">
              $<AnimatedCounter value={milestoneStats.totalEarned} />
            </div>
            <div className="text-zinc-500 text-sm">Earned</div>
          </div>
        </div>

        {/* Competition Banner */}
        {!competitionLoading && activeCompetition?.status === 'active' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-green-500/10 border border-green-500/30 rounded-2xl animate-fade-in-up relative overflow-hidden group">
            {/* Animated shine */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="text-3xl">🏆</span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="text-green-400 font-bold">{activeCompetition.name} is LIVE!</h3>
                  <p className="text-zinc-400 text-sm">Your submissions count toward the leaderboard</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-zinc-500 text-xs">Ends in</div>
                  <LiveCountdown targetDate={new Date(activeCompetition.endsAt)} size="sm" />
                </div>
                <Link href="/creator/leaderboard">
                  <button className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-medium rounded-xl transition-all text-sm">
                    Leaderboard →
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {!competitionLoading && activeCompetition?.status === 'ended' && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl animate-fade-in-up">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <span className="text-yellow-400 font-medium">{activeCompetition.name} has ended</span>
                <p className="text-zinc-400 text-sm">Results are being verified. You can still submit content!</p>
              </div>
            </div>
          </div>
        )}

        {!competitionLoading && !activeCompetition && (
          <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <span className="text-zinc-300 font-medium">No active competition</span>
                  <p className="text-zinc-500 text-sm">Your submissions will still be tracked</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-zinc-500 text-xs">Week resets in</div>
                <LiveCountdown targetDate={weekResetDate} size="sm" />
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          
          {/* Volume Submissions Card */}
          <GlowCard glowColor="orange" delay="0.3s">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl flex items-center justify-center">
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
                <input
                  type="url"
                  value={volumeUrl}
                  onChange={(e) => setVolumeUrl(e.target.value)}
                  placeholder="https://tiktok.com/@username/video/..."
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                />
              </div>
              
              <button
                type="submit"
                disabled={!volumeUrl.trim() || volumeSubmitting || !validateTikTokUrl(volumeUrl)}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 disabled:shadow-none"
              >
                {volumeSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  'Submit Content →'
                )}
              </button>
            </form>

            {/* Quick Stats */}
            <div className="mt-6 pt-4 border-t border-zinc-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Weekly submissions</span>
                <span className="text-white font-semibold">
                  {statsLoading ? <Skeleton className="w-8 h-4" /> : volumeStats.weeklyCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-zinc-400">Current rank</span>
                <span className="text-orange-400 font-semibold">
                  {statsLoading ? (
                    <Skeleton className="w-16 h-4" />
                  ) : volumeStats.currentRank ? (
                    `#${volumeStats.currentRank} of ${volumeStats.totalCreators}`
                  ) : (
                    'Not ranked'
                  )}
                </span>
              </div>
            </div>
          </GlowCard>

          {/* Milestone Submissions Card */}
          <GlowCard glowColor="amber" delay="0.4s">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🏆</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Milestone Submissions</h2>
                <p className="text-zinc-400 text-sm">Got a viral video? Claim your reward</p>
              </div>
            </div>

            {/* Milestone Tiers */}
            <div className="mb-6 space-y-2">
              {[
                { tier: '100k', label: '100K views', reward: '$10 store credit', icon: '🥉' },
                { tier: '500k', label: '500K views', reward: '$25 + free product', icon: '🥈' },
                { tier: '1m', label: '1M+ views', reward: '$50 + exclusive merch', icon: '🥇' },
              ].map((item) => (
                <div 
                  key={item.tier}
                  onClick={() => setMilestoneTier(item.tier as '100k' | '500k' | '1m')}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    milestoneTier === item.tier 
                      ? 'bg-amber-500/20 border border-amber-500/50' 
                      : 'bg-zinc-800/30 border border-zinc-700/50 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span className={milestoneTier === item.tier ? 'text-amber-300' : 'text-zinc-400'}>
                      {item.label}
                    </span>
                  </div>
                  <span className="text-green-400 text-sm">{item.reward}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleMilestoneSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">TikTok URL</label>
                <input
                  type="url"
                  value={milestoneUrl}
                  onChange={(e) => setMilestoneUrl(e.target.value)}
                  placeholder="https://tiktok.com/@username/video/..."
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                />
              </div>
              
              <button
                type="submit"
                disabled={!milestoneUrl.trim() || milestoneSubmitting || !validateTikTokUrl(milestoneUrl)}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:shadow-none"
              >
                {milestoneSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  `Claim ${getTierLabel(milestoneTier)} Reward →`
                )}
              </button>
            </form>

            {/* Milestone Stats */}
            <div className="mt-6 pt-4 border-t border-zinc-700/50">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-yellow-400 font-semibold">{milestoneStats.pendingCount}</div>
                  <div className="text-zinc-500 text-xs">Pending</div>
                </div>
                <div>
                  <div className="text-green-400 font-semibold">{milestoneStats.approvedCount}</div>
                  <div className="text-zinc-500 text-xs">Approved</div>
                </div>
                <div>
                  <div className="text-green-400 font-semibold">${milestoneStats.totalEarned}</div>
                  <div className="text-zinc-500 text-xs">Earned</div>
                </div>
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <Link 
            href="/creator/submissions"
            className="text-zinc-400 hover:text-orange-400 transition-colors text-sm flex items-center gap-1"
          >
            View submission history →
          </Link>
          <span className="text-zinc-700 hidden sm:inline">•</span>
          <Link 
            href="/creator/leaderboard"
            className="text-zinc-400 hover:text-orange-400 transition-colors text-sm flex items-center gap-1"
          >
            View leaderboard →
          </Link>
          <span className="text-zinc-700 hidden sm:inline">•</span>
          <Link 
            href="/creator/dashboard"
            className="text-zinc-400 hover:text-orange-400 transition-colors text-sm flex items-center gap-1"
          >
            Back to dashboard →
          </Link>
        </div>
      </main>
    </div>
  );
}