// src/app/creator/dashboard/page.tsx

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

export default function CreatorDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [creator, setCreator] = useState<CreatorWithCollab | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats modal state
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [updatingStats, setUpdatingStats] = useState(false);
  const [newInstagramFollowers, setNewInstagramFollowers] = useState<number>(0);
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
  
  // Weekly reset target date
  const [weekResetDate, setWeekResetDate] = useState<Date>(new Date());

  // Fetch creator data
  useEffect(() => {
    if (user) {
      fetchCreator();
      fetchV3Stats();
      fetchRedemptionStats();
      
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
          (r: { status: string }) => r.status === 'pending' || r.status === 'approved'
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
          instagramFollowers: newInstagramFollowers,
          tiktokFollowers: newTiktokFollowers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update stats');
      }

      await fetchCreator();
      setShowStatsModal(false);
      showToast('Stats updated successfully!', 'success');
    } catch (err) {
      console.error('Error updating stats:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update stats';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setUpdatingStats(false);
    }
  };

  const openStatsModal = () => {
    if (creator) {
      setNewInstagramFollowers(creator.instagramFollowers);
      setNewTiktokFollowers(creator.tiktokFollowers);
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
          message: 'Show off your HoopGang gear!',
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
              You haven&apos;t applied to join the HoopGang Creator Squad yet.
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

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 animate-fade-in">
              {error}
            </div>
          )}

          {/* Welcome Header */}
          <PageHeader 
            title={`Welcome back, ${firstName}!`}
            subtitle="Here's what's happening with your HoopGang collaboration"
            icon="👋"
            accentColor="orange"
          />

          {/* Status Banners */}
          {creator.collaboration?.status === 'pending' && (
            <GlowCard glowColor="yellow" className="mb-6 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/20">
              <div className="flex items-center gap-4">
                <div className="text-4xl animate-pulse">⏳</div>
                <div>
                  <h2 className="text-lg font-bold text-yellow-400">Application Under Review</h2>
                  <p className="text-white/60 text-sm">
                    We&apos;ll notify you once your application has been approved. Usually takes 1-3 business days.
                  </p>
                </div>
              </div>
            </GlowCard>
          )}

          {creator.collaboration?.status === 'denied' && (
            <GlowCard glowColor="red" className="mb-6 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/20">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">😔</div>
                  <div>
                    <h2 className="text-lg font-bold text-red-400">Application Not Approved</h2>
                    <p className="text-white/60 text-sm">
                      Unfortunately, your application wasn&apos;t approved this time. Feel free to apply again!
                    </p>
                  </div>
                </div>
                <Link href="/apply">
                  <Button variant="primary">Apply Again</Button>
                </Link>
              </div>
            </GlowCard>
          )}

          {creator.isBlocked && (
            <GlowCard glowColor="red" className="mb-6 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/20">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🚫</div>
                <div>
                  <h2 className="text-lg font-bold text-red-400">Account Blocked</h2>
                  <p className="text-white/60 text-sm">
                    Your account has been blocked from future collaborations due to unfulfilled content requirements.
                  </p>
                </div>
              </div>
            </GlowCard>
          )}

          {/* Primary Action Card - FULL WIDTH - Only for active collaborations */}
          {isActiveCollab && nextStep.title && (
            <div className="mb-8 p-6 bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-orange-500/20 border border-orange-500/30 rounded-2xl relative overflow-hidden group transition-all duration-300 animate-fade-in-up hover:shadow-glow-orange hover:border-orange-500/60 hover:scale-[1.005]">
              {/* Animated gradient shine */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎯</span>
                    <h2 className="text-xl font-bold text-white">Your Next Step</h2>
                  </div>
                  <p className="text-zinc-300">{nextStep.title}</p>
                  <p className="text-zinc-500 text-sm">{nextStep.message}</p>
                </div>
                {nextStep.showCta && (
                  <Link href="/creator/submit">
                    <Button variant="primary" className="whitespace-nowrap">
                      Submit Content →
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Main Two-Column Grid - Only for active collaborations */}
          {isActiveCollab && (
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Left Column - Collaboration Details (2/3 on desktop) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Your Collaboration Card */}
                <GlowCard glowColor="orange" delay="0.1s" className="hover:border-orange-500/30 hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.2)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span>📦</span> Your Collaboration
                    </h3>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                      creator.collaboration?.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      ✓ {getStatusLabel(creator.collaboration?.status || '')}
                    </span>
                  </div>

                  {/* Product Info - with 3D cube icon */}
                  <div className="flex items-center gap-4 mb-6 p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors">
                    <div className="w-16 h-16 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
                      <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-white font-semibold text-lg">{creator.collaboration?.product}</div>
                      <div className="text-zinc-400">Size {creator.collaboration?.size}</div>
                    </div>
                  </div>

                  {/* Horizontal Timeline - Matching Mockup Exactly */}
                  <div className="relative">
                    <div className="flex justify-between items-start">
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

                {/* Content Progress Card */}
                <GlowCard glowColor="amber" delay="0.2s">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span>🎥</span> Collab Content
                    </h3>
                    <span className="text-zinc-400 text-sm">{videosSubmitted}/1 video</span>
                  </div>

                  {/* Progress bar with shimmer */}
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-4 relative">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-1000 relative"
                      style={{ width: `${Math.max((videosSubmitted / 1) * 100, 2)}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-zinc-400 text-sm">
                      {videosSubmitted === 0 
                        ? "Post your first TikTok featuring your HoopGang gear!"
                        : videosSubmitted >= 1
                          ? "You've completed your content requirement! 🎉"
                          : `${1 - videosSubmitted} more to complete your collaboration`
                      }
                    </p>
                    <Link 
                      href="/creator/submit"
                      className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
                    >
                      View Requirements →
                    </Link>
                  </div>
                </GlowCard>
              </div>

              {/* Right Column - Stats (1/3 on desktop) */}
              <div className="space-y-6">
                {/* This Week Stats - With Orange Gradient Background */}
                <div 
                  className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-2xl p-6 transition-all duration-300 ease-out hover:shadow-glow-orange hover:border-orange-500/40 hover:scale-[1.01] hover:-translate-y-1 hover:border-orange-500/20 hover:shadow-[0_0_20px_-5px_rgba(249,115,22,0.15)] animate-fade-in-up"
                  style={{ animationDelay: '0.3s' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span>🚀</span> This Week
                    </h3>
                    <div className="bg-orange-500/20 px-2 py-1 rounded-full">
                      <LiveCountdown targetDate={weekResetDate} size="sm" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Submissions</span>
                      <span className="text-white font-bold text-xl">
                        {v3StatsLoading ? (
                          <Skeleton className="w-8 h-6" />
                        ) : (
                          <AnimatedCounter value={v3Stats?.weeklySubmissions || 0} />
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Your Rank</span>
                      <div className="flex items-center gap-2">
                        {v3StatsLoading ? (
                          <Skeleton className="w-16 h-6" />
                        ) : v3Stats?.currentRank ? (
                          <>
                            <span className="text-orange-400 font-bold text-xl">
                              #<AnimatedCounter value={v3Stats.currentRank} />
                            </span>
                            <span className="text-zinc-500 text-sm">/ {v3Stats.totalCreators}</span>
                          </>
                        ) : (
                          <span className="text-zinc-500">Not ranked</span>
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
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <span>💰</span> Rewards
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Pending</span>
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
                      <span className="text-zinc-400">Total Earned</span>
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
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <span className="animate-pulse">💡</span> Pro Tips
                  </h3>
                  <ul className="space-y-3 text-sm">
                    {[
                      'Tag @thehoopgang in every post',
                      'Use trending basketball sounds',
                      'Show the product in action',
                    ].map((tip, i) => (
                      <li key={i} className="flex gap-2 text-zinc-400">
                        <span className="text-orange-400">•</span>
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
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
                <span>📋</span> Your Journey
              </h3>
              <div className="relative">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-zinc-800" />
                {timelineSteps.map((step, index) => (
                  <div key={index} className="relative mb-6 last:mb-0 pl-10">
                    <div className={`absolute left-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
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
                    <div className={`font-medium ${
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🎯</div>
                  <div>
                    <h2 className="text-lg font-bold text-purple-400">Ready for Another Collab?</h2>
                    <p className="text-white/60 text-sm">
                      You&apos;ve completed {creator.totalCollaborations} collaboration{creator.totalCollaborations > 1 ? 's' : ''}. Request your next product!
                    </p>
                  </div>
                </div>
                <Link href="/creator/request-product">
                  <Button variant="primary">Request New Product</Button>
                </Link>
              </div>
            </GlowCard>
          )}

          {/* TikTok Creator - No Collaboration Needed */}
          {!creator.collaboration && creator.source === 'tiktok' && !creator.isBlocked && (
            <div className="space-y-6">
              {/* Welcome Card for TikTok Creators */}
              <GlowCard glowColor="purple" className="bg-gradient-to-r from-[#25F4EE]/10 to-[#FE2C55]/10 border-[#FE2C55]/20">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🎬</div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Ready to Create Content!</h2>
                    <p className="text-white/60 text-sm">
                      Your TikTok Shop order is on its way. Start submitting content once you receive it!
                    </p>
                  </div>
                </div>
              </GlowCard>

              {/* V3 Stats Grid for TikTok Creators */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* This Week Stats */}
                <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span>🚀</span> This Week
                    </h3>
                    <div className="bg-orange-500/20 px-2 py-1 rounded-full">
                      <LiveCountdown targetDate={weekResetDate} size="sm" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Submissions</span>
                      <span className="text-white font-bold text-xl">
                        {v3StatsLoading ? <Skeleton className="w-8 h-6" /> : <AnimatedCounter value={v3Stats?.weeklySubmissions || 0} />}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Your Rank</span>
                      {v3StatsLoading ? (
                        <Skeleton className="w-16 h-6" />
                      ) : v3Stats?.currentRank ? (
                        <span className="text-orange-400 font-bold text-xl">#{v3Stats.currentRank}</span>
                      ) : (
                        <span className="text-zinc-500">Not ranked</span>
                      )}
                    </div>
                  </div>
                  <Link href="/creator/leaderboard">
                    <button className="w-full mt-4 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium rounded-xl transition-all text-sm">
                      View Leaderboard →
                    </button>
                  </Link>
                </div>

                {/* Rewards Card */}
                <GlowCard glowColor="green">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <span>💰</span> Rewards
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Pending</span>
                      <span className={`font-semibold ${redemptionStats.pending > 0 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                        {redemptionsLoading ? <Skeleton className="w-6 h-5" /> : redemptionStats.pending}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Total Earned</span>
                      <span className="text-green-400 font-semibold">
                        {redemptionsLoading ? <Skeleton className="w-12 h-5" /> : <>$<AnimatedCounter value={redemptionStats.totalEarned} /></>}
                      </span>
                    </div>
                  </div>
                  <Link href="/creator/rewards">
                    <button className="w-full mt-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-all text-sm">
                      Browse Rewards →
                    </button>
                  </Link>
                </GlowCard>

                {/* Quick Submit Card */}
                <GlowCard glowColor="purple">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <span>📤</span> Submit Content
                  </h3>
                  <p className="text-zinc-400 text-sm mb-4">
                    Post TikToks featuring your HoopGang gear and submit them to earn rewards!
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
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <span>📜</span> Past Collaborations
              </h3>
              <div className="space-y-3">
                {pastCollaborations.map((collab) => (
                  <div 
                    key={collab.id}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      collab.status === 'completed' 
                        ? 'bg-green-500/5 border-green-500/20' 
                        : collab.status === 'denied'
                          ? 'bg-yellow-500/5 border-yellow-500/20'
                          : 'bg-red-500/5 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                        collab.status === 'completed' 
                          ? 'bg-green-500/20' 
                          : collab.status === 'denied'
                            ? 'bg-yellow-500/20'
                            : 'bg-red-500/20'
                      }`}>
                        {collab.status === 'completed' ? '✓' : collab.status === 'denied' ? '—' : '✗'}
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {collab.product} <span className="text-zinc-500 text-sm">({collab.size})</span>
                        </div>
                        <div className="text-zinc-500 text-xs">
                          Collab #{collab.collabNumber} • {formatDate(collab.createdAt)}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
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

          {/* Update Stats Modal */}
          {showStatsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowStatsModal(false)}
              />
              
              <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md animate-fade-in-up">
                <h3 className="text-xl font-bold text-white mb-2">Update Your Stats</h3>
                <p className="text-zinc-500 text-sm mb-6">
                  Keep your follower counts up to date to unlock better opportunities.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-zinc-500 text-xs uppercase tracking-wider mb-2">
                      Instagram Followers
                    </label>
                    <input
                      type="number"
                      value={newInstagramFollowers}
                      onChange={(e) => setNewInstagramFollowers(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-500 text-xs uppercase tracking-wider mb-2">
                      TikTok Followers
                    </label>
                    <input
                      type="number"
                      value={newTiktokFollowers}
                      onChange={(e) => setNewTiktokFollowers(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowStatsModal(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
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