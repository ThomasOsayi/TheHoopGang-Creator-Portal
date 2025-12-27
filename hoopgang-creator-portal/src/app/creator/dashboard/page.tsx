// src/app/creator/dashboard/page.tsx
// Mobile-Responsive Version

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CreatorWithCollab, Collaboration } from '@/types';
import { 
  getCreatorWithActiveCollab, 
  getCreatorByUserId,
  getCollaborationsByCreatorId 
} from '@/lib/firestore';
import { 
  Button, 
  useToast, 
  GlowCard, 
  AnimatedCounter, 
  LiveCountdown, 
  BackgroundOrbs,
  Skeleton,
  PageHeader
} from '@/components/ui';
import PackageStatusCard from '@/components/ui/PackageStatusCard';
import { CONTENT_DEADLINE_DAYS } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/auth';
import { getCurrentWeek, getWeekEnd } from '@/lib/week-utils';
import { useRouter } from 'next/navigation';

/**
 * Formats a date to a readable string
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Extracts first name from full name
 */
function getFirstName(fullName: string): string {
  return fullName.split(' ')[0];
}

/**
 * Inline form for submitting collab content
 */
function CollabSubmissionForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiktokUrl.trim() || isSubmitting || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/submissions/collab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ tiktokUrl: tiktokUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit content');
      }

      setTiktokUrl('');
      onSuccess();
    } catch (err) {
      console.error('Submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <input
          type="url"
          value={tiktokUrl}
          onChange={(e) => setTiktokUrl(e.target.value)}
          placeholder="Paste your TikTok URL here..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-zinc-500"
          disabled={isSubmitting}
        />
      </div>
      
      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-zinc-500 text-xs">
          Also counts toward the leaderboard! 🏆
        </p>
        <button
          type="submit"
          disabled={!tiktokUrl.trim() || isSubmitting}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            !tiktokUrl.trim() || isSubmitting
              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600 text-white active:scale-[0.98]'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit Content'
          )}
        </button>
      </div>
    </form>
  );
}

export default function CreatorDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [creator, setCreator] = useState<CreatorWithCollab | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats modal state
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [updatingStats, setUpdatingStats] = useState(false);
  const [newInstagramHandle, setNewInstagramHandle] = useState<string>('');
  const [newInstagramFollowers, setNewInstagramFollowers] = useState<number>(0);
  const [newTiktokHandle, setNewTiktokHandle] = useState<string>('');
  const [newTiktokFollowers, setNewTiktokFollowers] = useState<number>(0);
  
  // Past collaborations state
  const [pastCollaborations, setPastCollaborations] = useState<Collaboration[]>([]);

  // V3 Stats state
  const [v3Stats, setV3Stats] = useState<{
    weeklySubmissions: number;
    allTimeSubmissions: number;
    currentRank: number | null;
    previousRank: number | null;
    totalCreators: number;
  } | null>(null);
  const [v3StatsLoading, setV3StatsLoading] = useState(true);
  
  // V3 Rewards/Redemptions state
  const [redemptionStats, setRedemptionStats] = useState<{
    pending: number;
    totalEarned: number;
  }>({ pending: 0, totalEarned: 0 });
  const [redemptionsLoading, setRedemptionsLoading] = useState(true);
  
  // Reward stats for notification
  const [rewardStats, setRewardStats] = useState<{ readyToClaim: number; processing: number } | null>(null);
  
  // Weekly reset target date
  const [weekResetDate, setWeekResetDate] = useState<Date>(new Date());

  // Load reward stats
  const loadRewardStats = async () => {
    try {
      if (!user) return;
      const idToken = await user.getIdToken();
      if (!idToken) return;

      const response = await fetch('/api/creator/rewards/stats', {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRewardStats({
          readyToClaim: data.readyToClaim || 0,
          processing: data.processing || data.pending || 0,
        });
      }
    } catch (error) {
      console.error('Error loading reward stats:', error);
    }
  };

  // Fetch creator data
  useEffect(() => {
    if (user) {
      fetchCreator();
      fetchV3Stats();
      fetchRedemptionStats();
      loadRewardStats();
      
      // Set week reset date
      const currentWeek = getCurrentWeek();
      setWeekResetDate(getWeekEnd(currentWeek));
    }
  }, [user]);

  const fetchCreator = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const creatorDoc = await getCreatorByUserId(user.uid);
      
      if (!creatorDoc) {
        setError('Creator profile not found');
        setLoading(false);
        return;
      }
      
      const creatorData = await getCreatorWithActiveCollab(creatorDoc.id);
      
      if (creatorData) {
        setCreator(creatorData);
        
        const allCollabs = await getCollaborationsByCreatorId(creatorDoc.id);
        const past = allCollabs.filter(c => 
          c.id !== creatorData.activeCollaborationId && 
          ['completed', 'ghosted', 'denied'].includes(c.status)
        );
        setPastCollaborations(past);
      } else {
        setError('Failed to load creator data');
      }
    } catch (err) {
      console.error('Error fetching creator:', err);
      setError('Failed to load your dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchV3Stats = async () => {
    if (!user) return;
    
    setV3StatsLoading(true);
    try {
      const idToken = await user.getIdToken();
      
      const statsResponse = await fetch('/api/submissions/volume/stats', {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        
        const currentWeek = getCurrentWeek();
        const leaderboardResponse = await fetch(
          `/api/leaderboard?period=${currentWeek}&type=volume`,
          { headers: { 'Authorization': `Bearer ${idToken}` } }
        );
        
        let currentRank: number | null = null;
        let totalCreators = 0;
        
        if (leaderboardResponse.ok) {
          const leaderboardData = await leaderboardResponse.json();
          totalCreators = leaderboardData.entries?.length || 0;
          
          const creatorDoc = await getCreatorByUserId(user.uid);
          if (creatorDoc && leaderboardData.entries) {
            const entry = leaderboardData.entries.find(
              (e: { creatorId: string; rank: number }) => e.creatorId === creatorDoc.id
            );
            if (entry) {
              currentRank = entry.rank;
            }
          }
        }
        
        setV3Stats({
          weeklySubmissions: statsData.stats?.weeklyCount || 0,
          allTimeSubmissions: statsData.stats?.allTimeCount || 0,
          currentRank,
          previousRank: null,
          totalCreators,
        });
      }
    } catch (err) {
      console.error('Error fetching V3 stats:', err);
    } finally {
      setV3StatsLoading(false);
    }
  };

  const fetchRedemptionStats = async () => {
    if (!user) return;
    
    setRedemptionsLoading(true);
    try {
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/creator/redemptions', {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const redemptions = data.redemptions || [];
        
        const pending = redemptions.filter(
          (r: { status: string }) => r.status === 'awaiting_claim' || r.status === 'ready_to_fulfill'
        ).length;
        
        const totalEarned = redemptions
          .filter((r: { status: string }) => r.status === 'fulfilled')
          .reduce((sum: number, r: { cashAmount?: number; storeCreditValue?: number }) => {
            return sum + (r.cashAmount || 0) + (r.storeCreditValue || 0);
          }, 0);
        
        setRedemptionStats({ pending, totalEarned });
      }
    } catch (err) {
      console.error('Error fetching redemption stats:', err);
    } finally {
      setRedemptionsLoading(false);
    }
  };

  const handleUpdateStats = async () => {
    if (!creator || !user) return;

    setUpdatingStats(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();

      const response = await fetch('/api/creator/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          instagramHandle: newInstagramHandle,
          instagramFollowers: newInstagramFollowers,
          tiktokHandle: newTiktokHandle,
          tiktokFollowers: newTiktokFollowers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      await fetchCreator();
      setShowStatsModal(false);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setUpdatingStats(false);
    }
  };

  const openStatsModal = () => {
    if (creator) {
      setNewInstagramHandle(creator.instagramHandle || '');
      setNewInstagramFollowers(creator.instagramFollowers || 0);
      setNewTiktokHandle(creator.tiktokHandle || '');
      setNewTiktokFollowers(creator.tiktokFollowers || 0);
      setShowStatsModal(true);
    }
  };

  // Get days remaining for content deadline
  const getDaysRemaining = useCallback((): { days: number | null; deadline: Date | null } => {
    if (!creator?.collaboration) return { days: null, deadline: null };

    let deadline: Date | null = null;

    if (creator.collaboration.contentDeadline) {
      deadline = creator.collaboration.contentDeadline;
    } else if (creator.collaboration.deliveredAt) {
      deadline = new Date(creator.collaboration.deliveredAt);
      deadline.setDate(deadline.getDate() + CONTENT_DEADLINE_DAYS);
    }

    if (!deadline) return { days: null, deadline: null };

    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { days: diffDays, deadline };
  }, [creator]);

  // Timeline steps - returns step index based on status
  const getTimelineData = useCallback(() => {
    if (!creator?.collaboration) return { steps: [], activeIndex: -1 };

    const status = creator.collaboration.status;
    
    // Map status to step index (0-indexed)
    const statusToIndex: Record<string, number> = {
      pending: 0,
      approved: 1,
      shipped: 2,
      delivered: 3,
      completed: 4,
      denied: -1,
      ghosted: 4,
    };

    const activeIndex = statusToIndex[status] ?? -1;

    const steps = [
      { label: 'Applied', key: 'pending' },
      { label: 'Approved', key: 'approved' },
      { label: 'Shipped', key: 'shipped' },
      { label: 'Delivered', key: 'delivered' },
      { label: 'Completed', key: 'completed' },
    ];

    // Add dates from statusHistory
    const stepsWithDates = steps.map((step, index) => {
      let date: string | undefined;
      if (creator.collaboration?.statusHistory) {
        const historyEntry = creator.collaboration.statusHistory.find(
          (h: { status: string }) => h.status === step.key
        );
        if (historyEntry) {
          date = formatDate(historyEntry.timestamp);
        }
      }
      
      let stepStatus: 'completed' | 'active' | 'pending' | 'failed' = 'pending';
      if (status === 'denied' && index === 1) {
        stepStatus = 'failed';
      } else if (status === 'ghosted' && index === 4) {
        stepStatus = 'failed';
      } else if (index < activeIndex || (index === activeIndex && status === 'completed')) {
        stepStatus = 'completed';
      } else if (index === activeIndex) {
        stepStatus = 'active';
      }

      return { ...step, date, status: stepStatus };
    });

    // Mark first step as completed if we're past pending
    if (activeIndex > 0) {
      stepsWithDates[0].status = 'completed';
    }

    return { steps: stepsWithDates, activeIndex };
  }, [creator]);

  // Status label mapping
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Under Review',
      denied: 'Not Approved',
      approved: 'Approved',
      shipped: 'In Transit',
      delivered: 'Delivered',
      completed: 'Completed',
      ghosted: 'Ghosted',
    };
    return labels[status] || status;
  };

  // Get next step message
  const getNextStepMessage = (): { title: string; message: string; showCta: boolean } => {
    if (!creator?.collaboration) return { title: '', message: '', showCta: false };
    
    const status = creator.collaboration.status;
    const videosSubmitted = creator.collaboration.contentSubmissions.length || 0;
    
    switch (status) {
      case 'approved':
        return {
          title: 'Your package is being prepared',
          message: "We'll notify you when it ships!",
          showCta: true,
        };
      case 'shipped':
        return {
          title: 'Your package is on the way',
          message: 'Track your shipment below.',
          showCta: true,
        };
      case 'delivered':
        return {
          title: `Post ${1 - videosSubmitted} more video${1 - videosSubmitted !== 1 ? 's' : ''} to complete`,
          message: 'Show off your TheHoopGang gear!',
          showCta: true,
        };
      case 'completed':
        return {
          title: 'Collaboration Complete!',
          message: 'Amazing work! You crushed it.',
          showCta: false,
        };
      default:
        return { title: '', message: '', showCta: false };
    }
  };

  // Loading state
  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['creator']}>
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/60">Loading your dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // No creator found
  if (!creator) {
    return (
      <ProtectedRoute allowedRoles={['creator']}>
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="mb-6 text-6xl">🏀</div>
            <h1 className="text-2xl font-bold text-white mb-4">No Application Found</h1>
            <p className="text-white/60 mb-8">
              You haven&apos;t applied to join the TheHoopGang Creator Squad yet.
            </p>
            <Link href="/apply">
              <Button variant="primary" size="lg">Apply Now</Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const firstName = getFirstName(creator.fullName);
  const { steps: timelineSteps, activeIndex } = getTimelineData();
  const videosSubmitted = creator.collaboration?.contentSubmissions.length || 0;
  const nextStep = getNextStepMessage();
  const isActiveCollab = creator.collaboration && !['pending', 'denied'].includes(creator.collaboration.status);

  return (
    <ProtectedRoute allowedRoles={['creator']}>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        {/* Background Orbs */}
        <BackgroundOrbs colors={['orange', 'purple', 'orange']} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 animate-fade-in text-sm sm:text-base">
              {error}
            </div>
          )}

          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in-up">
            <PageHeader 
              title={`Welcome back, ${firstName}!`}
              subtitle="Here's what's happening with your TheHoopGang collaboration"
              icon="👋"
              accentColor="orange"
            />
            <button
              onClick={openStatsModal}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-xl transition-all text-sm font-medium active:scale-[0.98] self-start"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          </div>

          {/* Rewards Notification Card - Mobile Optimized */}
          {rewardStats && rewardStats.readyToClaim > 0 && (
            <div 
              onClick={() => router.push('/creator/redemptions')}
              className="mb-6 p-3 sm:p-4 bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-orange-500/20 border border-orange-500/30 rounded-2xl cursor-pointer hover:border-orange-500/50 transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/20 rounded-xl flex items-center justify-center text-xl sm:text-2xl animate-bounce flex-shrink-0">
                    🎁
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-bold text-sm sm:text-lg truncate">
                      {rewardStats.readyToClaim} reward{rewardStats.readyToClaim !== 1 ? 's' : ''} to claim!
                    </div>
                    <div className="text-orange-400/70 text-xs sm:text-sm">
                      Tap to claim your rewards
                    </div>
                  </div>
                </div>
                <div className="text-orange-400 group-hover:translate-x-1 transition-transform flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Status Banners */}
          {creator.collaboration?.status === 'pending' && (
            <GlowCard glowColor="yellow" className="mb-6 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/20">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                <div className="text-3xl sm:text-4xl animate-pulse flex-shrink-0">⏳</div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-yellow-400">Application Under Review</h2>
                  <p className="text-white/60 text-xs sm:text-sm">
                    We&apos;ll notify you once your application has been approved. Usually takes 1-3 business days.
                  </p>
                </div>
              </div>
            </GlowCard>
          )}

          {creator.collaboration?.status === 'denied' && (
            <GlowCard glowColor="red" className="mb-6 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="text-3xl sm:text-4xl flex-shrink-0">😔</div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-red-400">Application Not Approved</h2>
                    <p className="text-white/60 text-xs sm:text-sm">
                      Unfortunately, your application wasn&apos;t approved this time. Feel free to apply again!
                    </p>
                  </div>
                </div>
                <Link href="/apply" className="w-full sm:w-auto">
                  <Button variant="primary" className="w-full sm:w-auto">Apply Again</Button>
                </Link>
              </div>
            </GlowCard>
          )}

          {creator.isBlocked && (
            <GlowCard glowColor="red" className="mb-6 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/20">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                <div className="text-3xl sm:text-4xl flex-shrink-0">🚫</div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-red-400">Account Blocked</h2>
                  <p className="text-white/60 text-xs sm:text-sm">
                    Your account has been blocked from future collaborations due to unfulfilled content requirements.
                  </p>
                </div>
              </div>
            </GlowCard>
          )}

          {/* Primary Action Card - FULL WIDTH - Only for active collaborations */}
          {isActiveCollab && nextStep.title && (
            <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-orange-500/20 border border-orange-500/30 rounded-2xl relative overflow-hidden group transition-all duration-300 animate-fade-in-up hover:shadow-glow-orange hover:border-orange-500/60 hover:scale-[1.005] active:scale-[0.98]">
              {/* Animated gradient shine */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl sm:text-2xl">🎯</span>
                    <h2 className="text-lg sm:text-xl font-bold text-white">Your Next Step</h2>
                  </div>
                  <p className="text-zinc-300 text-sm sm:text-base">{nextStep.title}</p>
                  <p className="text-zinc-500 text-xs sm:text-sm">{nextStep.message}</p>
                </div>
                {nextStep.showCta && (
                  <Link href="/creator/submit" className="w-full sm:w-auto">
                    <Button variant="primary" className="w-full sm:w-auto whitespace-nowrap">
                      Submit Content →
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Main Two-Column Grid - Only for active collaborations */}
          {isActiveCollab && (
            <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Left Column - Collaboration Details (2/3 on desktop) */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Your Collaboration Card */}
                <GlowCard glowColor="orange" delay="0.1s" className="hover:border-orange-500/30 hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.2)]">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                      <span>📦</span> Your Collaboration
                    </h3>
                    <span className={`text-xs font-medium px-2 sm:px-3 py-1 rounded-full ${
                      creator.collaboration?.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      ✓ {getStatusLabel(creator.collaboration?.status || '')}
                    </span>
                  </div>

                  {/* Product Info - Responsive */}
                  <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 flex-shrink-0">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-semibold text-base sm:text-lg truncate">{creator.collaboration?.product}</div>
                      <div className="text-zinc-400 text-sm">Size {creator.collaboration?.size}</div>
                    </div>
                  </div>

                  {/* Responsive Timeline - Vertical on mobile, Horizontal on tablet+ */}
                  <div className="relative">
                    {/* Mobile: Vertical Timeline */}
                    <div className="md:hidden">
                      <div className="relative pl-8">
                        <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-zinc-700" />
                        {timelineSteps.map((step, index) => (
                          <div key={index} className="relative mb-5 last:mb-0">
                            {/* Connector override for completed steps */}
                            {step.status === 'completed' && index < timelineSteps.length - 1 && (
                              <div className="absolute left-[9px] top-5 h-full w-0.5 bg-green-500" style={{ height: 'calc(100% + 20px)' }} />
                            )}
                            
                            {/* Step circle */}
                            <div className={`absolute left-0 w-5 h-5 rounded-full flex items-center justify-center text-xs z-10 ${
                              step.status === 'completed'
                                ? 'bg-green-500 text-white'
                                : step.status === 'active'
                                  ? 'bg-orange-500 text-white ring-4 ring-orange-500/30'
                                  : step.status === 'failed'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-zinc-700 text-zinc-400 border border-zinc-600'
                            }`}>
                              {step.status === 'completed' ? (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : step.status === 'failed' ? (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              ) : ''}
                            </div>
                            
                            {/* Content */}
                            <div className="ml-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${
                                  step.status === 'completed' ? 'text-green-400' :
                                  step.status === 'active' ? 'text-orange-400' :
                                  step.status === 'failed' ? 'text-red-400' :
                                  'text-zinc-500'
                                }`}>
                                  {step.label}
                                </span>
                                {step.date && (
                                  <span className="text-zinc-600 text-xs">• {step.date}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tablet+: Horizontal Timeline */}
                    <div className="hidden md:flex justify-between items-start">
                      {timelineSteps.map((step, index) => (
                        <div key={index} className="flex-1 relative">
                          {/* Connector line */}
                          {index < timelineSteps.length - 1 && (
                            <div className="absolute top-4 left-1/2 w-full h-0.5">
                              <div className={`h-full ${
                                step.status === 'completed' ? 'bg-green-500' : 'bg-zinc-700'
                              }`} />
                            </div>
                          )}
                          
                          {/* Step circle */}
                          <div className="relative flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 text-sm font-medium ${
                              step.status === 'completed'
                                ? 'bg-green-500 text-white'
                                : step.status === 'active'
                                  ? 'bg-orange-500 text-white ring-4 ring-orange-500/30'
                                  : step.status === 'failed'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-zinc-700 text-zinc-400 border border-zinc-600'
                            }`}>
                              {step.status === 'completed' ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : step.status === 'failed' ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                index + 1
                              )}
                            </div>
                            
                            {/* Label */}
                            <span className={`mt-2 text-xs font-medium ${
                              step.status === 'completed' ? 'text-green-400' :
                              step.status === 'active' ? 'text-orange-400' :
                              step.status === 'failed' ? 'text-red-400' :
                              'text-zinc-500'
                            }`}>
                              {step.label}
                            </span>
                            
                            {/* Date */}
                            {step.date && (
                              <span className="text-zinc-600 text-xs">{step.date}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlowCard>

                {/* Package Status - Only for shipped/delivered */}
                {creator.collaboration && ['shipped', 'delivered', 'completed', 'ghosted'].includes(creator.collaboration.status) && (
                  <PackageStatusCard
                    collaborationStatus={creator.collaboration.status as 'shipped' | 'delivered' | 'completed' | 'ghosted'}
                    trackingNumber={creator.collaboration.trackingNumber}
                    carrier={creator.collaboration.carrier}
                    shippedAt={creator.collaboration.shippedAt}
                    deliveredAt={creator.collaboration.deliveredAt}
                  />
                )}

                {/* Content Progress Card - With Inline Submission */}
                <GlowCard glowColor="amber" delay="0.2s">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                      <span>🎥</span> Collab Content
                    </h3>
                    <span className="text-zinc-400 text-xs sm:text-sm">{videosSubmitted}/1 video</span>
                  </div>

                  {/* Progress bar with shimmer */}
                  <div className="h-2 sm:h-3 bg-zinc-800 rounded-full overflow-hidden mb-4 relative">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-1000 relative"
                      style={{ width: `${Math.max((videosSubmitted / 1) * 100, 2)}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                  </div>

                  {/* Show submission form if not complete */}
                  {videosSubmitted < 1 ? (
                    <CollabSubmissionForm 
                      onSuccess={() => {
                        fetchCreator();
                        fetchV3Stats();
                        showToast('Content submitted! 🎉', 'success');
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>You&apos;ve completed your content requirement! 🎉</span>
                    </div>
                  )}

                  {/* Show submitted content */}
                  {videosSubmitted > 0 && creator.collaboration?.contentSubmissions && (
                    <div className="mt-4 pt-4 border-t border-zinc-700/50">
                      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Submitted</div>
                      {creator.collaboration.contentSubmissions.map((submission, index) => (
                        <a 
                          key={index}
                          href={submission.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                          TikTok Video {index + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </GlowCard>
              </div>

              {/* Right Column - Stats (1/3 on desktop) */}
              <div className="space-y-4 sm:space-y-6">
                {/* This Week Stats - With Orange Gradient Background */}
                <div 
                  className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-2xl p-4 sm:p-6 transition-all duration-300 ease-out hover:shadow-glow-orange hover:border-orange-500/40 hover:scale-[1.01] hover:-translate-y-1 active:scale-[0.98] animate-fade-in-up"
                  style={{ animationDelay: '0.3s' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                      <span>🚀</span> This Week
                    </h3>
                    <div className="bg-orange-500/20 px-2 py-1 rounded-full">
                      <LiveCountdown targetDate={weekResetDate} size="sm" />
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Submissions</span>
                      <span className="text-white font-bold text-lg sm:text-xl">
                        {v3StatsLoading ? (
                          <Skeleton className="w-8 h-6" />
                        ) : (
                          <AnimatedCounter value={v3Stats?.weeklySubmissions || 0} />
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Your Rank</span>
                      <div className="flex items-center gap-1 sm:gap-2">
                        {v3StatsLoading ? (
                          <Skeleton className="w-16 h-6" />
                        ) : v3Stats?.currentRank ? (
                          <>
                            <span className="text-orange-400 font-bold text-lg sm:text-xl">
                              #<AnimatedCounter value={v3Stats.currentRank} />
                            </span>
                            <span className="text-zinc-500 text-xs sm:text-sm">/ {v3Stats.totalCreators}</span>
                          </>
                        ) : (
                          <span className="text-zinc-500 text-sm">Not ranked</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-700/50">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-400">All-time</span>
                        <span className="text-zinc-300">
                          {v3StatsLoading ? (
                            <Skeleton className="w-12 h-4" />
                          ) : (
                            <><AnimatedCounter value={v3Stats?.allTimeSubmissions || 0} /> posts</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link href="/creator/leaderboard">
                    <button className="w-full mt-4 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium rounded-xl transition-all text-sm hover:scale-[1.02] active:scale-[0.98]">
                      View Leaderboard →
                    </button>
                  </Link>
                </div>

                {/* Rewards Summary */}
                <GlowCard glowColor="green" delay="0.4s" className="hover:border-green-500/20 hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.15)]">
                  <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <span>💰</span> Rewards
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Pending</span>
                      <span className={`font-semibold ${
                        redemptionStats.pending > 0 ? 'text-yellow-400' : 'text-zinc-500'
                      }`}>
                        {redemptionsLoading ? (
                          <Skeleton className="w-6 h-5" />
                        ) : (
                          redemptionStats.pending
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Total Earned</span>
                      <span className="text-green-400 font-semibold">
                        {redemptionsLoading ? (
                          <Skeleton className="w-12 h-5" />
                        ) : (
                          <>$<AnimatedCounter value={redemptionStats.totalEarned} /></>
                        )}
                      </span>
                    </div>
                  </div>

                  <Link href="/creator/rewards">
                    <button className="w-full mt-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-all text-sm hover:scale-[1.02] active:scale-[0.98]">
                      Browse Rewards →
                    </button>
                  </Link>
                </GlowCard>

                {/* Pro Tips */}
                <GlowCard glowColor="purple" delay="0.5s" className="hover:border-purple-500/20 hover:shadow-[0_0_20px_-5px_rgba(168,85,247,0.15)]">
                  <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <span className="animate-pulse">💡</span> Pro Tips
                  </h3>
                  <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    {[
                      'Tag @thehoopgang in every post',
                      'Use trending basketball sounds',
                      'Show the product in action',
                    ].map((tip, i) => (
                      <li key={i} className="flex gap-2 text-zinc-400">
                        <span className="text-orange-400 flex-shrink-0">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </GlowCard>
              </div>
            </div>
          )}

          {/* Timeline for Pending/Denied - Simplified view */}
          {creator.collaboration && ['pending', 'denied'].includes(creator.collaboration.status) && (
            <GlowCard glowColor="orange" className="mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2 mb-6">
                <span>📋</span> Your Journey
              </h3>
              <div className="relative">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-zinc-800" />
                {timelineSteps.map((step, index) => (
                  <div key={index} className="relative mb-5 sm:mb-6 last:mb-0 pl-8 sm:pl-10">
                    <div className={`absolute left-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-xs ${
                      step.status === 'completed'
                        ? 'bg-green-500 text-white'
                        : step.status === 'active'
                          ? 'bg-orange-500 text-white ring-4 ring-orange-500/30'
                          : step.status === 'failed'
                            ? 'bg-red-500 text-white'
                            : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : ''}
                    </div>
                    <div className={`font-medium text-sm sm:text-base ${
                      step.status === 'completed' ? 'text-white' :
                      step.status === 'active' ? 'text-orange-400' :
                      step.status === 'failed' ? 'text-red-400' :
                      'text-zinc-500'
                    }`}>
                      {step.label}
                    </div>
                    {step.date && <div className="text-xs text-zinc-500">{step.date}</div>}
                  </div>
                ))}
              </div>
            </GlowCard>
          )}

          {/* No Active Collaboration - Can Request New */}
          {!creator.collaboration && !creator.isBlocked && creator.totalCollaborations > 0 && creator.source !== 'tiktok' && (
            <GlowCard glowColor="purple" className="mb-6 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="text-3xl sm:text-4xl flex-shrink-0">🎯</div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-purple-400">Ready for Another Collab?</h2>
                    <p className="text-white/60 text-xs sm:text-sm">
                      You&apos;ve completed {creator.totalCollaborations} collaboration{creator.totalCollaborations > 1 ? 's' : ''}. Request your next product!
                    </p>
                  </div>
                </div>
                <Link href="/creator/request-product" className="w-full sm:w-auto">
                  <Button variant="primary" className="w-full sm:w-auto">Request New Product</Button>
                </Link>
              </div>
            </GlowCard>
          )}

          {/* TikTok Creator - No Collaboration Needed */}
          {!creator.collaboration && creator.source === 'tiktok' && !creator.isBlocked && (
            <div className="space-y-4 sm:space-y-6">
              {/* Welcome Card for TikTok Creators */}
              <GlowCard glowColor="purple" className="bg-gradient-to-r from-[#25F4EE]/10 to-[#FE2C55]/10 border-[#FE2C55]/20">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="text-3xl sm:text-4xl flex-shrink-0">🎬</div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">Ready to Create Content!</h2>
                    <p className="text-white/60 text-xs sm:text-sm">
                      Your TikTok Shop order is on its way. Start submitting content once you receive it!
                    </p>
                  </div>
                </div>
              </GlowCard>

              {/* V3 Stats Grid for TikTok Creators - Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* This Week Stats */}
                <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                      <span>🚀</span> This Week
                    </h3>
                    <div className="bg-orange-500/20 px-2 py-1 rounded-full">
                      <LiveCountdown targetDate={weekResetDate} size="sm" />
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Submissions</span>
                      <span className="text-white font-bold text-lg sm:text-xl">
                        {v3StatsLoading ? <Skeleton className="w-8 h-6" /> : <AnimatedCounter value={v3Stats?.weeklySubmissions || 0} />}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Your Rank</span>
                      {v3StatsLoading ? (
                        <Skeleton className="w-16 h-6" />
                      ) : v3Stats?.currentRank ? (
                        <span className="text-orange-400 font-bold text-lg sm:text-xl">#{v3Stats.currentRank}</span>
                      ) : (
                        <span className="text-zinc-500 text-sm">Not ranked</span>
                      )}
                    </div>
                  </div>
                  <Link href="/creator/leaderboard">
                    <button className="w-full mt-4 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium rounded-xl transition-all text-sm active:scale-[0.98]">
                      View Leaderboard →
                    </button>
                  </Link>
                </div>

                {/* Rewards Card */}
                <GlowCard glowColor="green">
                  <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <span>💰</span> Rewards
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Pending</span>
                      <span className={`font-semibold ${redemptionStats.pending > 0 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                        {redemptionsLoading ? <Skeleton className="w-6 h-5" /> : redemptionStats.pending}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Total Earned</span>
                      <span className="text-green-400 font-semibold">
                        {redemptionsLoading ? <Skeleton className="w-12 h-5" /> : <>$<AnimatedCounter value={redemptionStats.totalEarned} /></>}
                      </span>
                    </div>
                  </div>
                  <Link href="/creator/rewards">
                    <button className="w-full mt-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-all text-sm active:scale-[0.98]">
                      Browse Rewards →
                    </button>
                  </Link>
                </GlowCard>

                {/* Quick Submit Card */}
                <GlowCard glowColor="purple" className="sm:col-span-2 lg:col-span-1">
                  <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <span>📤</span> Submit Content
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm mb-4">
                    Post TikToks featuring your TheHoopGang gear and submit them to earn rewards!
                  </p>
                  <Link href="/creator/submit">
                    <Button variant="primary" className="w-full">
                      Submit TikTok →
                    </Button>
                  </Link>
                </GlowCard>
              </div>
            </div>
          )}

          {/* Past Collaborations */}
          {pastCollaborations.length > 0 && (
            <GlowCard glowColor="orange" delay="0.6s" className="mt-6">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <span>📜</span> Past Collaborations
              </h3>
              <div className="space-y-3">
                {pastCollaborations.map((collab) => (
                  <div 
                    key={collab.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border gap-3 ${
                      collab.status === 'completed' 
                        ? 'bg-green-500/5 border-green-500/20' 
                        : collab.status === 'denied'
                          ? 'bg-yellow-500/5 border-yellow-500/20'
                          : 'bg-red-500/5 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-base sm:text-lg flex-shrink-0 ${
                        collab.status === 'completed' 
                          ? 'bg-green-500/20' 
                          : collab.status === 'denied'
                            ? 'bg-yellow-500/20'
                            : 'bg-red-500/20'
                      }`}>
                        {collab.status === 'completed' ? '✓' : collab.status === 'denied' ? '—' : '✗'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-medium text-sm sm:text-base truncate">
                          {collab.product} <span className="text-zinc-500 text-xs sm:text-sm">({collab.size})</span>
                        </div>
                        <div className="text-zinc-500 text-xs">
                          Collab #{collab.collabNumber} • {formatDate(collab.createdAt)}
                        </div>
                      </div>
                    </div>
                    <span className={`self-start sm:self-auto text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ${
                      collab.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400' 
                        : collab.status === 'denied'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}>
                      {collab.status === 'completed' ? 'Completed' : collab.status === 'denied' ? 'Not Approved' : 'Ghosted'}
                    </span>
                  </div>
                ))}
              </div>
            </GlowCard>
          )}

          {/* Update Profile Modal - Bottom Sheet on Mobile */}
          {showStatsModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
              <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowStatsModal(false)}
              />
              
              <div className="relative bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md animate-fade-in-up safe-bottom max-h-[90vh] overflow-y-auto">
                {/* Drag indicator for mobile */}
                <div className="sm:hidden w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Edit Profile</h3>
                <p className="text-zinc-500 text-xs sm:text-sm mb-6">
                  Update your social handles and follower counts.
                </p>

                <div className="space-y-4">
                  {/* Instagram Section */}
                  <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{
                        background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                      }}>
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                        </svg>
                      </div>
                      <span className="text-white font-medium text-sm">Instagram</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-zinc-500 text-xs uppercase tracking-wider mb-1.5">
                          Handle
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
                          <input
                            type="text"
                            value={newInstagramHandle}
                            onChange={(e) => setNewInstagramHandle(e.target.value.replace('@', ''))}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="handle"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-zinc-500 text-xs uppercase tracking-wider mb-1.5">
                          Followers
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={newInstagramFollowers > 0 ? newInstagramFollowers.toLocaleString() : ''}
                          onChange={(e) => {
                            const numericValue = e.target.value.replace(/[^0-9]/g, '');
                            setNewInstagramFollowers(parseInt(numericValue) || 0);
                          }}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="10,000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* TikTok Section */}
                  <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                        </svg>
                      </div>
                      <span className="text-white font-medium text-sm">TikTok</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-zinc-500 text-xs uppercase tracking-wider mb-1.5">
                          Handle
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
                          <input
                            type="text"
                            value={newTiktokHandle}
                            onChange={(e) => setNewTiktokHandle(e.target.value.replace('@', ''))}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="handle"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-zinc-500 text-xs uppercase tracking-wider mb-1.5">
                          Followers
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={newTiktokFollowers > 0 ? newTiktokFollowers.toLocaleString() : ''}
                          onChange={(e) => {
                            const numericValue = e.target.value.replace(/[^0-9]/g, '');
                            setNewTiktokFollowers(parseInt(numericValue) || 0);
                          }}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="50,000"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rate limit notice */}
                <p className="text-zinc-600 text-xs mt-4 text-center">
                  You can update your profile once every 24 hours
                </p>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowStatsModal(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <Button
                    variant="primary"
                    onClick={handleUpdateStats}
                    loading={updatingStats}
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}