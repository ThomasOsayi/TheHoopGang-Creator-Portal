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
  PageHeader,
} from '@/components/ui';
import { getCreatorByUserId } from '@/lib/firestore';
import { getCurrentWeek, getWeekEnd } from '@/lib/week-utils';
import { Creator } from '@/types';
import { auth } from '@/lib/firebase';
import { ProtectedRoute } from '@/components/auth';

// TikTok Icon SVG Component
function TikTokIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

// External Link Icon
function ExternalLinkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

export default function SubmitContentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Volume submission state
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [volumeStats, setVolumeStats] = useState({
    weeklyCount: 0,
    allTimeCount: 0,
    currentRank: null as number | null,
    totalCreators: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Recent submissions
  const [recentSubmissions, setRecentSubmissions] = useState<Array<{
    id: string;
    tiktokUrl: string;
    createdAt: Date;
  }>>([]);
  
  // Competition state
  const [activeCompetition, setActiveCompetition] = useState<{
    id: string;
    name: string;
    status: string;
    endsAt: string;
  } | null>(null);
  const [competitionLoading, setCompetitionLoading] = useState(true);
  
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
        
        // Set recent submissions if available
        if (data.recentSubmissions) {
          setRecentSubmissions(data.recentSubmissions.slice(0, 3));
        }
      }
    } catch (error) {
      console.error('Error loading volume stats:', error);
    } finally {
      setStatsLoading(false);
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
      fetchCompetition();
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiktokUrl.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/submissions/volume', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tiktokUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      // Clear input and refresh stats
      setTiktokUrl('');
      await loadVolumeStats();
      
      // Show celebration!
      setSuccessMessage('Content Submitted! 🎉');
      setSuccessSubMessage(`You now have ${volumeStats.weeklyCount + 1} submissions this week`);
      setShowConfetti(true);
      setShowSuccessToast(true);
      
      // Hide confetti after 3 seconds
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (error) {
      console.error('Submission error:', error);
      alert(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const validateTikTokUrl = (url: string): boolean => {
    return url.includes('tiktok.com/') || url.includes('vm.tiktok.com/');
  };

  // Format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Extract shortened URL for display
  const shortenUrl = (url: string): string => {
    try {
      const match = url.match(/@([^/]+)\/video\/(\d+)/);
      if (match) {
        return `@${match[1]}/video/${match[2].slice(0, 3)}...`;
      }
      return url.slice(0, 30) + '...';
    } catch {
      return url.slice(0, 30) + '...';
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
    <ProtectedRoute allowedRoles={['creator']}>
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

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <PageHeader 
          title="Submit Content"
          subtitle="Post TikToks and climb the leaderboard"
          icon="🚀"
          accentColor="green"
        />

        {/* Competition Banner */}
        {!competitionLoading && activeCompetition?.status === 'active' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-green-500/10 border border-green-500/30 rounded-2xl animate-fade-in-up">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse inline-block" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <span className="text-green-400 font-bold">{activeCompetition.name} is LIVE!</span>
                </div>
                <span className="text-zinc-400 hidden sm:inline">Your submissions count toward the leaderboard</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-zinc-500 text-xs mb-1">Ends in</div>
                  <LiveCountdown targetDate={new Date(activeCompetition.endsAt)} size="md" />
                </div>
              </div>
            </div>
          </div>
        )}

        {!competitionLoading && (!activeCompetition || activeCompetition.status !== 'active') && (
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
                <div className="text-zinc-500 text-xs mb-1">Week resets in</div>
                <LiveCountdown targetDate={getWeekEnd(getCurrentWeek())} size="md" />
              </div>
            </div>
          </div>
        )}

        {/* Stats Row - 3 Large Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <GlowCard glowColor="orange" delay="0.1s" className="text-center py-8">
            <div className="text-4xl font-bold text-white mb-2">
              {statsLoading ? (
                <Skeleton className="w-12 h-10 mx-auto" />
              ) : (
                <AnimatedCounter value={volumeStats.weeklyCount} />
              )}
            </div>
            <div className="text-zinc-400">This Week</div>
          </GlowCard>
          
          <GlowCard glowColor="orange" delay="0.15s" className="text-center py-8 border-orange-500/30">
            <div className="text-4xl font-bold text-orange-400 mb-2">
              {statsLoading ? (
                <Skeleton className="w-16 h-10 mx-auto" />
              ) : volumeStats.currentRank ? (
                <>
                  #<AnimatedCounter value={volumeStats.currentRank} />
                </>
              ) : (
                <span className="text-zinc-500">—</span>
              )}
            </div>
            <div className="text-zinc-400">Your Rank</div>
            {volumeStats.totalCreators > 0 && (
              <div className="text-zinc-500 text-sm">of {volumeStats.totalCreators} creators</div>
            )}
          </GlowCard>
          
          <GlowCard glowColor="orange" delay="0.2s" className="text-center py-8">
            <div className="text-4xl font-bold text-white mb-2">
              {statsLoading ? (
                <Skeleton className="w-12 h-10 mx-auto" />
              ) : (
                <AnimatedCounter value={volumeStats.allTimeCount} />
              )}
            </div>
            <div className="text-zinc-400">All-Time</div>
          </GlowCard>
        </div>

        {/* Drop Your TikTok Link Card */}
        <GlowCard glowColor="orange" delay="0.25s" className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">Drop Your TikTok Link</h2>
            <p className="text-zinc-400">Paste your TikTok URL and we&apos;ll add it to your stats</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <TikTokIcon className="w-5 h-5" />
              </div>
              <input
                type="url"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@username/video/..."
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={!tiktokUrl.trim() || submitting || !validateTikTokUrl(tiktokUrl)}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white disabled:text-zinc-500 font-semibold rounded-xl transition-all"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit to Leaderboard →'
              )}
            </button>
          </form>
        </GlowCard>

        {/* Recent Submissions */}
        <GlowCard glowColor="orange" delay="0.3s" className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📋</span>
            <h3 className="text-lg font-semibold text-white">Recent Submissions</h3>
          </div>

          {recentSubmissions.length > 0 ? (
            <div className="space-y-3">
              {recentSubmissions.map((submission) => (
                <div 
                  key={submission.id}
                  className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-white text-sm">{shortenUrl(submission.tiktokUrl)}</div>
                      <div className="text-zinc-500 text-xs">{formatRelativeTime(submission.createdAt)}</div>
                    </div>
                  </div>
                  <a 
                    href={submission.tiktokUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <ExternalLinkIcon />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              <p>No submissions yet this week</p>
              <p className="text-sm">Submit your first TikTok above!</p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-zinc-700/50 text-center">
            <Link 
              href="/creator/submissions"
              className="text-zinc-400 hover:text-white transition-colors text-sm"
            >
              View All History →
            </Link>
          </div>
        </GlowCard>

        {/* Milestone Bonuses */}
        <GlowCard glowColor="amber" delay="0.35s" className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏆</span>
            <h3 className="text-lg font-semibold text-white">Milestone Bonuses</h3>
          </div>
          <p className="text-zinc-400 text-sm mb-6">Got a viral video? Claim extra rewards!</p>

          <div className="space-y-3">
            <Link href="/creator/milestones" className="block">
              <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🥉</div>
                  <div>
                    <div className="text-white font-medium">100K Views</div>
                  </div>
                </div>
                <span className="text-green-400">$10 store credit</span>
              </div>
            </Link>

            <Link href="/creator/milestones" className="block">
              <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🥈</div>
                  <div>
                    <div className="text-white font-medium">500K Views</div>
                  </div>
                </div>
                <span className="text-green-400">$25 + free product</span>
              </div>
            </Link>

            <Link href="/creator/milestones" className="block">
              <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🥇</div>
                  <div>
                    <div className="text-white font-medium">1M+ Views</div>
                  </div>
                </div>
                <span className="text-green-400">$50 + merch pack</span>
              </div>
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-700/50 text-center">
            <Link 
              href="/creator/rewards"
              className="text-zinc-400 hover:text-white transition-colors text-sm"
            >
              View All Rewards →
            </Link>
          </div>
        </GlowCard>

        {/* Maximize Your Content - Pro Tips */}
        <GlowCard glowColor="purple" delay="0.4s" className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💡</span>
            <h3 className="text-lg font-semibold text-white">Maximize Your Content</h3>
          </div>

          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-zinc-400">
              <span className="text-orange-400 mt-0.5">•</span>
              <span>Tag <span className="text-orange-400">@thehoopgang</span> in every post for bonus visibility</span>
            </li>
            <li className="flex items-start gap-2 text-zinc-400">
              <span className="text-orange-400 mt-0.5">•</span>
              <span>Use trending sounds to boost your reach</span>
            </li>
            <li className="flex items-start gap-2 text-zinc-400">
              <span className="text-orange-400 mt-0.5">•</span>
              <span>Post during peak hours (6-9 PM) for maximum engagement</span>
            </li>
          </ul>
        </GlowCard>

        {/* Bottom Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <Link 
            href="/creator/leaderboard"
            className="text-zinc-400 hover:text-orange-400 transition-colors text-sm"
          >
            View leaderboard →
          </Link>
          <span className="text-zinc-700 hidden sm:inline">•</span>
          <Link 
            href="/creator/dashboard"
            className="text-zinc-400 hover:text-orange-400 transition-colors text-sm"
          >
            Back to dashboard →
          </Link>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}