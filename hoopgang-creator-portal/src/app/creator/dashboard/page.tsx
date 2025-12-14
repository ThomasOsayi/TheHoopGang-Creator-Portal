// src/app/creator/dashboard/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CreatorWithCollab, Collaboration } from '@/types';
import { 
  getCreatorWithActiveCollab, 
  getCreatorByUserId,
  addContentSubmission,
  getCollaborationsByCreatorId 
} from '@/lib/firestore';
import { SectionCard, Button, useToast, EmptyStateNoTracking } from '@/components/ui';
import PackageStatusCard from '@/components/ui/PackageStatusCard';
import { CONTENT_DEADLINE_DAYS } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/auth';
import { getCurrentWeek, formatTimeUntilReset } from '@/lib/week-utils';

/**
 * Formats a date to a readable string
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
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
  const [submitting, setSubmitting] = useState(false);
  const [newContentUrl, setNewContentUrl] = useState<string>('');
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
    totalCreators: number;
  } | null>(null);
  const [v3StatsLoading, setV3StatsLoading] = useState(true);
  
  // V3 Rewards/Redemptions state
  const [redemptionStats, setRedemptionStats] = useState<{
    pending: number;
    totalEarned: number;
  }>({ pending: 0, totalEarned: 0 });
  const [redemptionsLoading, setRedemptionsLoading] = useState(true);
  
  // Weekly reset countdown
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  // Fetch creator data
  useEffect(() => {
    if (user) {
      fetchCreator();
      fetchV3Stats();
      fetchRedemptionStats();
    }
  }, [user]);

  const fetchCreator = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      // First get creator by user ID
      const creatorDoc = await getCreatorByUserId(user.uid);
      
      if (!creatorDoc) {
        setError('Creator profile not found');
        setLoading(false);
        return;
      }
      
      // Get creator with active collaboration (V2 model)
      const creatorData = await getCreatorWithActiveCollab(creatorDoc.id);
      
      if (creatorData) {
        setCreator(creatorData);
        
        // Load all collaborations for history
        const allCollabs = await getCollaborationsByCreatorId(creatorDoc.id);
        // Filter out the active one to get past collabs
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

  // Fetch V3 content stats
  const fetchV3Stats = async () => {
    if (!user) return;
    
    setV3StatsLoading(true);
    try {
      const idToken = await user.getIdToken();
      
      // Fetch submission stats
      const statsResponse = await fetch('/api/submissions/volume/stats', {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        
        // Fetch leaderboard to get current rank
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
          
          // Find creator's rank
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
          totalCreators,
        });
      }
    } catch (err) {
      console.error('Error fetching V3 stats:', err);
    } finally {
      setV3StatsLoading(false);
    }
  };

  // Fetch redemption stats
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

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      setTimeUntilReset(formatTimeUntilReset());
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  const handleSubmitContent = async () => {
    if (!creator) return;

    if (!newContentUrl.trim()) {
      showToast('Please enter a valid URL', 'error');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addContentSubmission(creator.id, newContentUrl.trim());
      setNewContentUrl('');
      await fetchCreator();
      showToast('Content submitted!', 'success');
    } catch (err) {
      console.error('Error submitting content:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit content. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStats = async () => {
    if (!creator || !user) return;

    setUpdatingStats(true);
    setError(null);

    try {
      // Get the user's ID token
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

      // Refresh creator data
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

  // Calculate days remaining for content deadline
  const getDaysRemaining = (): { days: number | null; label: string } => {
    if (!creator || !creator.collaboration) return { days: null, label: 'Starts after delivery' };

    let deadline: Date | null = null;

    if (creator.collaboration.contentDeadline) {
      deadline = creator.collaboration.contentDeadline;
    } else if (creator.collaboration.deliveredAt) {
      deadline = new Date(creator.collaboration.deliveredAt);
      deadline.setDate(deadline.getDate() + CONTENT_DEADLINE_DAYS);
    }

    if (!deadline) {
      return { days: null, label: 'Starts after delivery' };
    }

    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { days: diffDays, label: diffDays > 0 ? 'DAYS REMAINING' : 'DEADLINE PASSED' };
  };

  // Determine timeline step states
  const getTimelineSteps = (): Array<{ label: string; status: 'completed' | 'active' | 'pending' | 'failed'; date?: string }> => {
    if (!creator || !creator.collaboration) return [];

    const status = creator.collaboration.status;
    const steps: Array<{ label: string; status: 'completed' | 'active' | 'pending' | 'failed'; date?: string }> = [
      { label: 'Application Received', status: 'completed' },
      { label: 'Application Approved', status: 'pending' },
      { label: 'Package Shipped', status: 'pending' },
      { label: 'Package Delivered', status: 'pending' },
      { label: 'Content Completed', status: 'pending' },
    ];

    if (status === 'pending') {
      steps[0].status = 'completed';
      steps[1].status = 'active';
    } else if (status === 'denied') {
      steps[0].status = 'completed';
      steps[1].status = 'failed';
    } else if (status === 'approved') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'active';
    } else if (status === 'shipped') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'completed';
      steps[3].status = 'active';
    } else if (status === 'delivered') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'completed';
      steps[3].status = 'completed';
      steps[4].status = 'active';
    } else if (status === 'completed') {
      steps.forEach((step) => (step.status = 'completed'));
    } else if (status === 'ghosted') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'completed';
      steps[3].status = 'completed';
      steps[4].status = 'failed';
    }

    // Add dates from statusHistory if available
    steps.forEach((step, index) => {
      const statusMap: Record<number, string> = {
        0: 'pending',
        1: 'approved',
        2: 'shipped',
        3: 'delivered',
        4: 'completed',
      };
      const targetStatus = statusMap[index];
      if (targetStatus && creator.collaboration?.statusHistory) {
        const historyEntry = creator.collaboration.statusHistory.find((h: { status: string }) => h.status === targetStatus);
        if (historyEntry) {
          step.date = formatDate(historyEntry.timestamp);
        }
      }
    });

    return steps;
  };

  // Get status label for stats
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

  /**
   * Calculates follower growth since signup
   */
  function getFollowerGrowth(creator: CreatorWithCollab): {
    instagram: { current: number; original: number; change: number; percent: string };
    tiktok: { current: number; original: number; change: number; percent: string };
    lastUpdated: Date | null;
  } {
    const history = creator.followerHistory || [];
    const applicationEntry = history.find(h => h.source === 'application') || history[0];
    const latestEntry = history[history.length - 1];

    const originalIG = applicationEntry?.instagramFollowers || creator.instagramFollowers;
    const originalTT = applicationEntry?.tiktokFollowers || creator.tiktokFollowers;

    const igChange = creator.instagramFollowers - originalIG;
    const ttChange = creator.tiktokFollowers - originalTT;

    const igPercent = originalIG > 0 ? ((igChange / originalIG) * 100).toFixed(1) : '0';
    const ttPercent = originalTT > 0 ? ((ttChange / originalTT) * 100).toFixed(1) : '0';

    return {
      instagram: {
        current: creator.instagramFollowers,
        original: originalIG,
        change: igChange,
        percent: igPercent,
      },
      tiktok: {
        current: creator.tiktokFollowers,
        original: originalTT,
        change: ttChange,
        percent: ttPercent,
      },
      lastUpdated: latestEntry?.date || null,
    };
  }

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

  if (!creator) {
    return (
      <ProtectedRoute allowedRoles={['creator']}>
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <svg className="w-16 h-16 mx-auto text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">No Application Found</h1>
            <p className="text-white/60 mb-8">
              You haven't applied to join the HoopGang Creator Squad yet.
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
  const timelineSteps = getTimelineSteps();
  const daysRemaining = getDaysRemaining();
  const videosSubmitted = creator.collaboration?.contentSubmissions.length || 0;

  return (
    <ProtectedRoute allowedRoles={['creator']} requireApplication>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        {/* Background Gradient Orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Welcome Banner */}
          <div className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 text-center mb-6 overflow-hidden hover:bg-white/[0.08] hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 cursor-default">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all duration-300" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/15 transition-all duration-300" />
            <div className="absolute top-4 left-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-16 h-16 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M12 2C12 2 12 22 12 22" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 12C2 12 22 12 22 12" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4.93 4.93C4.93 4.93 19.07 19.07 19.07 19.07" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M19.07 4.93C19.07 4.93 4.93 19.07 4.93 19.07" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="absolute bottom-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-16 h-16 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M12 2C12 2 12 22 12 22" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 12C2 12 22 12 22 12" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4.93 4.93C4.93 4.93 19.07 19.07 19.07 19.07" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M19.07 4.93C19.07 4.93 4.93 19.07 4.93 19.07" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            
            <div className="relative">
              {!creator.collaboration ? (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-orange-100 transition-colors">
                    Welcome, {firstName}! 🏀
                  </h1>
                  <p className="text-white/70 group-hover:text-white/90 transition-colors">
                    No active collaboration
                  </p>
                </>
              ) : creator.collaboration.status === 'pending' ? (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-orange-100 transition-colors">
                    Welcome, {firstName}! 🏀
                  </h1>
                  <p className="text-white/70 group-hover:text-white/90 transition-colors">
                    Thanks for applying to join HoopGang
                  </p>
                </>
              ) : creator.collaboration.status === 'denied' ? (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-orange-100 transition-colors">
                    Hey, {firstName} 🏀
                  </h1>
                  <p className="text-white/70 group-hover:text-white/90 transition-colors">
                    Thanks for your interest in HoopGang
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-orange-100 transition-colors">
                    Congrats, {firstName}! 🎉
                  </h1>
                  <p className="text-white/70 group-hover:text-white/90 transition-colors">
                    You're officially part of the HoopGang Creator Squad
                  </p>
                </>
              )}
            </div>
        </div>

          {/* Quick Stats Bar */}
          {creator.collaboration && !['pending', 'denied'].includes(creator.collaboration.status) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center hover:bg-white/[0.08] hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
                <div className="flex justify-center mb-1">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-white font-semibold text-sm">{getStatusLabel(creator.collaboration.status)}</div>
                <div className="text-white/50 text-xs">Current Status</div>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center hover:bg-white/[0.08] hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
                <div className="flex justify-center mb-1">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-white font-semibold text-sm">{videosSubmitted}/3</div>
                <div className="text-white/50 text-xs">Videos Posted</div>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center hover:bg-white/[0.08] hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
                <div className="flex justify-center mb-1">
                  <svg className={`w-6 h-6 ${daysRemaining.days !== null && daysRemaining.days <= 3 ? 'text-red-400' : 'text-orange-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className={`font-semibold text-sm ${
                  daysRemaining.days !== null && daysRemaining.days <= 3 ? 'text-red-400' : 'text-white'
                }`}>
                  {daysRemaining.days !== null ? `${Math.max(0, daysRemaining.days)} days` : '—'}
                </div>
                <div className="text-white/50 text-xs">Time Left</div>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center hover:bg-white/[0.08] hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
                <div className="flex justify-center mb-1">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="text-white font-semibold text-sm truncate">{creator.collaboration.product}</div>
                <div className="text-white/50 text-xs">Size {creator.collaboration.size}</div>
              </div>
            </div>
          )}

          {/* V3 Creator Program Section */}
          {creator.collaboration && !['pending', 'denied'].includes(creator.collaboration.status) && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🚀</span> Creator Program
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Content Stats Card */}
                <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-md border border-orange-500/20 rounded-2xl p-5 hover:border-orange-500/40 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <span>📊</span> Content Stats
                    </h3>
                    <div className="text-xs text-orange-400 bg-orange-500/20 px-2 py-1 rounded-full">
                      {timeUntilReset || 'Loading...'}
                    </div>
                  </div>
                  
                  {v3StatsLoading ? (
                    <div className="space-y-3">
                      <div className="h-8 bg-white/10 rounded animate-pulse" />
                      <div className="h-8 bg-white/10 rounded animate-pulse" />
                    </div>
                  ) : v3Stats ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm">This Week</span>
                        <span className="text-white font-bold text-lg">{v3Stats.weeklySubmissions}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm">All Time</span>
                        <span className="text-white font-medium">{v3Stats.allTimeSubmissions}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <span className="text-white/60 text-sm">Current Rank</span>
                        {v3Stats.currentRank ? (
                          <span className="text-orange-400 font-bold">
                            #{v3Stats.currentRank}
                            <span className="text-white/40 text-xs font-normal ml-1">
                              / {v3Stats.totalCreators}
                            </span>
                          </span>
                        ) : (
                          <span className="text-white/40 text-sm">Not ranked</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-white/40 text-sm">Unable to load stats</div>
                  )}
                </div>

                {/* Rewards Card */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-md border border-green-500/20 rounded-2xl p-5 hover:border-green-500/40 transition-all duration-300">
                  <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                    <span>💰</span> Rewards
                  </h3>
                  
                  {redemptionsLoading ? (
                    <div className="space-y-3">
                      <div className="h-8 bg-white/10 rounded animate-pulse" />
                      <div className="h-8 bg-white/10 rounded animate-pulse" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm">Pending</span>
                        <span className={`font-bold text-lg ${redemptionStats.pending > 0 ? 'text-yellow-400' : 'text-white'}`}>
                          {redemptionStats.pending}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <span className="text-white/60 text-sm">Total Earned</span>
                        <span className="text-green-400 font-bold text-lg">
                          ${redemptionStats.totalEarned}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {redemptionStats.pending > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <span className="text-yellow-400 text-xs">
                        🎉 {redemptionStats.pending} reward{redemptionStats.pending > 1 ? 's' : ''} being processed!
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Actions Card */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all duration-300">
                  <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                    <span>⚡</span> Quick Actions
                  </h3>
                  
                  <div className="space-y-2">
                    <Link 
                      href="/creator/submit"
                      className="flex items-center justify-between p-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-xl transition-all group"
                    >
                      <span className="text-white text-sm font-medium">Submit Content</span>
                      <span className="text-orange-400 group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                    
                    <Link 
                      href="/creator/leaderboard"
                      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
                    >
                      <span className="text-white text-sm font-medium">View Leaderboard</span>
                      <span className="text-white/60 group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                    
                    <Link 
                      href="/creator/rewards"
                      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
                    >
                      <span className="text-white text-sm font-medium">Browse Rewards</span>
                      <span className="text-white/60 group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Completion Banner */}
          {creator.collaboration && creator.collaboration.contentSubmissions.length >= 3 && creator.collaboration.status !== 'completed' && (
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🎉</div>
                <div>
                  <h2 className="text-lg font-bold text-green-400">All Content Submitted!</h2>
                  <p className="text-white/60 text-sm">
                    Amazing work! Your submissions are being reviewed. You'll be marked as completed soon!
                  </p>
                </div>
              </div>
          </div>
          )}

          {/* Already Completed Banner */}
          {creator.collaboration?.status === 'completed' && (
            <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🏆</div>
                  <div>
                    <h2 className="text-lg font-bold text-cyan-400">Collaboration Complete!</h2>
                    <p className="text-white/60 text-sm">You crushed it! Thanks for being part of HoopGang.</p>
                  </div>
                </div>
                <Link href="/creator/request-product">
                  <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white">
                    Request New Product
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* No Active Collaboration - Can Request New Product */}
          {!creator.collaboration && !creator.isBlocked && creator.totalCollaborations > 0 && (
            <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-2xl p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🎯</div>
                  <div>
                    <h2 className="text-lg font-bold text-purple-400">Ready for Another Collab?</h2>
                    <p className="text-white/60 text-sm">
                      You've completed {creator.totalCollaborations} collaboration{creator.totalCollaborations > 1 ? 's' : ''}. Request your next product!
                    </p>
                  </div>
                </div>
                <Link href="/creator/request-product">
                  <Button variant="primary">
                    Request New Product
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Blocked Creator Banner */}
          {creator.isBlocked && (
            <div className="bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🚫</div>
                <div>
                  <h2 className="text-lg font-bold text-red-400">Account Blocked</h2>
                  <p className="text-white/60 text-sm">
                    Your account has been blocked from future collaborations due to unfulfilled content requirements.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pending Status Banner */}
          {creator.collaboration?.status === 'pending' && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl animate-pulse">⏳</div>
            <div>
                  <h2 className="text-lg font-bold text-yellow-400">Application Under Review</h2>
                  <p className="text-white/60 text-sm">
                    We'll notify you once your application has been approved. Usually takes 1-3 business days.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Denied Status Banner */}
          {creator.collaboration?.status === 'denied' && (
            <div className="bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30 rounded-2xl p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">😔</div>
            <div>
                    <h2 className="text-lg font-bold text-red-400">Application Not Approved</h2>
                    <p className="text-white/60 text-sm">
                      Unfortunately, your application wasn't approved this time. Feel free to apply again!
                    </p>
                  </div>
            </div>
                <Link href="/apply">
                  <Button variant="primary">Apply Again</Button>
                </Link>
              </div>
            </div>
          )}

          {/* Main Two-Column Grid - Only show for active/shipped/delivered/completed/ghosted */}
          {creator.collaboration && !['pending', 'denied'].includes(creator.collaboration.status) && (
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left Column - Timeline (2/5 width on desktop) */}
              <div className="lg:col-span-2">
              <SectionCard title="Your Journey" icon="📋" className="h-full hover:border-white/20 transition-all duration-300">
                <div className="relative">
                  {/* Vertical progress line */}
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-white/10" />

                  {timelineSteps.map((step, index) => (
                    <div key={index} className="relative mb-6 last:mb-0 pl-10">
                      {/* Progress line fill */}
                      {step.status === 'completed' && index < timelineSteps.length - 1 && (
                        <div 
                          className="absolute left-2 top-4 w-0.5 h-full bg-gradient-to-b from-green-500 to-green-500/50"
                          style={{ height: 'calc(100% + 1.5rem)' }}
                        />
                      )}
                      
                      {/* Dot */}
                      <div
                        className={`absolute left-0 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${
                          step.status === 'completed'
                            ? 'bg-green-500 shadow-lg shadow-green-500/30'
                            : step.status === 'active'
                              ? 'bg-orange-500 ring-4 ring-orange-500/30 animate-pulse'
                              : step.status === 'failed'
                                ? 'bg-red-500 shadow-lg shadow-red-500/30'
                                : 'bg-white/20'
                        }`}
                      >
                        {step.status === 'completed' && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
          </div>

                      {/* Content */}
                      <div>
                        <div className={`font-medium ${
                          step.status === 'completed' ? 'text-white' :
                          step.status === 'active' ? 'text-orange-400' :
                          step.status === 'failed' ? 'text-red-400' :
                          'text-white/40'
                        }`}>
                          {step.label}
                        </div>
                        {step.date && (
                          <div className="text-sm text-white/50 mt-0.5">{step.date}</div>
                        )}
                        {step.status === 'active' && (
                          <div className="text-xs text-orange-400 mt-1">In Progress</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* Right Column - Package & Content (3/5 width on desktop) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Package Status Card */}
              {creator.collaboration && ['approved', 'shipped', 'delivered', 'completed', 'ghosted'].includes(creator.collaboration.status) && (
                creator.collaboration.trackingNumber || creator.collaboration.status !== 'approved' ? (
                  <PackageStatusCard
                    collaborationStatus={creator.collaboration.status as 'approved' | 'shipped' | 'delivered' | 'completed' | 'ghosted'}
                    trackingNumber={creator.collaboration.trackingNumber}
                    carrier={creator.collaboration.carrier}
                    shippedAt={creator.collaboration.shippedAt}
                    deliveredAt={creator.collaboration.deliveredAt}
                  />
                ) : (
                  <SectionCard title="Your Package" icon="📦" className="hover:border-white/20 transition-all duration-300">
                    <EmptyStateNoTracking />
                  </SectionCard>
                )
              )}

              {/* Content Submission Card */}
              {creator.collaboration && !['pending', 'denied'].includes(creator.collaboration.status) && (
                <SectionCard title="Submit Your Content" icon="🎥" className="hover:border-white/20 transition-all duration-300">
                  {/* Progress indicator */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/60">Progress</span>
                      <span className="text-white font-medium">{videosSubmitted}/3 videos</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${(videosSubmitted / 3) * 100}%` }}
                      />
                    </div>
                    {videosSubmitted > 0 && videosSubmitted < 3 && (
                      <p className="text-orange-400 text-xs mt-2">
                        🔥 {videosSubmitted} down, {3 - videosSubmitted} to go!
                      </p>
                    )}
                  </div>

          {[0, 1, 2].map((index) => {
            const submission = creator.collaboration?.contentSubmissions[index];
            const isNextToSubmit = index === (creator.collaboration?.contentSubmissions.length || 0);
            const isPending = index > (creator.collaboration?.contentSubmissions.length || 0);

            return (
              <div
                key={index}
                        className={`flex items-center gap-4 py-4 ${
                  index < 2 ? 'border-b border-white/10' : ''
                }`}
              >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                          submission ? 'bg-green-500/20 text-green-400' :
                          isNextToSubmit ? 'bg-orange-500/20 text-orange-400' :
                          'bg-white/10 text-white/30'
                        }`}>
                          {submission ? '✓' : index + 1}
                        </div>

                {submission ? (
                  <>
                            <div className="flex-1 min-w-0">
                              <a 
                                href={submission.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/70 text-sm truncate block hover:text-orange-400 transition-colors"
                              >
                                {submission.url}
                              </a>
                              <div className="text-white/40 text-xs mt-0.5">
                                Submitted {formatDate(submission.submittedAt)}
                              </div>
                            </div>
                            <span className="text-green-400 text-xs font-medium px-2 py-1 bg-green-500/10 rounded-lg">
                              ✓ Done
                            </span>
                  </>
                ) : isNextToSubmit ? (
                  <>
                    <input
                      type="url"
                      value={newContentUrl}
                      onChange={(e) => setNewContentUrl(e.target.value)}
                              placeholder="Paste your TikTok URL..."
                              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      disabled={submitting}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSubmitContent}
                      disabled={submitting || !newContentUrl.trim()}
                      loading={submitting}
                    >
                      Submit
                    </Button>
                  </>
                ) : (
                  <>
                            <div className="flex-1 text-white/30 text-sm">Waiting...</div>
                            <span className="text-white/30 text-xs font-medium px-2 py-1 bg-white/5 rounded-lg">
                      Pending
                            </span>
                  </>
                )}
              </div>
            );
          })}
        </SectionCard>
              )}
            </div>
            </div>
          )}

          {/* Bottom Section - Agreement, Stats & Perks (Full Width) */}
          {creator.collaboration && !['pending', 'denied'].includes(creator.collaboration.status) && (
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              {/* Agreement Card */}
              <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/15 transition-all duration-300">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>📋</span> Your Agreement
                </h2>
                
                <div className="space-y-3">
                  {[
                    { icon: '🎥', text: 'Post 3 TikToks featuring HoopGang' },
                    { icon: '🏷️', text: 'Tag @thehoopgang in every post' },
                    { icon: '🎵', text: 'Use trending basketball sounds' },
                    { icon: '🏀', text: 'Show the product in action' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-white/70">{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Deadline info */}
                {creator.collaboration?.deliveredAt && creator.collaboration.contentDeadline && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Started: {formatDate(creator.collaboration.deliveredAt)}</span>
                      <span className="text-white/40">Due: {formatDate(creator.collaboration.contentDeadline)}</span>
                    </div>
                  </div>
                )}
          </div>

        {/* Stats Card */}
              <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/15 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📊</span> Your Stats
                  </h2>
                  <button
                    onClick={openStatsModal}
                    className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Update
                  </button>
                </div>

                {(() => {
                  const growth = getFollowerGrowth(creator);
                  return (
                    <div className="space-y-4">
                      {/* Instagram */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-pink-400">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                          </span>
                          <span className="text-white/50 text-xs">@{creator.instagramHandle}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-white font-semibold">{growth.instagram.current.toLocaleString()}</span>
                          {growth.instagram.change !== 0 && (
                            <span className={`text-xs ${growth.instagram.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {growth.instagram.change > 0 ? '+' : ''}{growth.instagram.change.toLocaleString()} ({growth.instagram.percent}%)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* TikTok */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                            </svg>
                          </span>
                          <span className="text-white/50 text-xs">@{creator.tiktokHandle}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-white font-semibold">{growth.tiktok.current.toLocaleString()}</span>
                          {growth.tiktok.change !== 0 && (
                            <span className={`text-xs ${growth.tiktok.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {growth.tiktok.change > 0 ? '+' : ''}{growth.tiktok.change.toLocaleString()} ({growth.tiktok.percent}%)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Last Updated */}
                      {growth.lastUpdated && (
                        <div className="pt-3 border-t border-white/10">
                          <span className="text-white/40 text-xs">
                            Last updated: {formatDate(growth.lastUpdated)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

        {/* Perks Card */}
              <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/15 transition-all duration-300">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>🎁</span> Unlock Perks
                </h2>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: '⭐', text: 'Get featured', unlocked: videosSubmitted >= 3 },
                    { icon: '🎁', text: 'Early drops', unlocked: creator.collaboration?.status === 'completed' },
                    { icon: '💰', text: 'Paid collabs', unlocked: creator.collaboration?.status === 'completed' },
                    { icon: '🏀', text: 'Creator Squad', unlocked: videosSubmitted >= 1 },
            ].map((perk, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center gap-2 p-3 rounded-xl transition-all ${
                        perk.unlocked 
                          ? 'bg-green-500/10 border border-green-500/20' 
                          : 'bg-white/5 border border-white/5 opacity-50'
                      }`}
                    >
                      <span className="text-xl">{perk.icon}</span>
                      <span className={`text-xs font-medium ${perk.unlocked ? 'text-green-400' : 'text-white/50'}`}>
                        {perk.text}
                      </span>
                      {perk.unlocked && <span className="ml-auto text-green-400 text-xs">✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pending/Denied Timeline Only */}
          {creator.collaboration && ['pending', 'denied'].includes(creator.collaboration.status) && (
            <SectionCard title="Your Journey" icon="📋" className="hover:border-white/20 transition-all duration-300">
              <div className="relative">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-white/10" />

                {timelineSteps.map((step, index) => (
                  <div key={index} className="relative mb-6 last:mb-0 pl-10">
                    <div
                      className={`absolute left-0 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${
                        step.status === 'completed'
                          ? 'bg-green-500 shadow-lg shadow-green-500/30'
                          : step.status === 'active'
                            ? 'bg-orange-500 ring-4 ring-orange-500/30 animate-pulse'
                            : step.status === 'failed'
                              ? 'bg-red-500 shadow-lg shadow-red-500/30'
                              : 'bg-white/20'
                      }`}
                    >
                      {step.status === 'completed' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {step.status === 'failed' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    <div>
                      <div className={`font-medium ${
                        step.status === 'completed' ? 'text-white' :
                        step.status === 'active' ? 'text-orange-400' :
                        step.status === 'failed' ? 'text-red-400' :
                        'text-white/40'
                      }`}>
                        {step.label}
                      </div>
                      {step.date && (
                        <div className="text-sm text-white/50 mt-0.5">{step.date}</div>
                      )}
                    </div>
              </div>
            ))}
          </div>
        </SectionCard>
          )}

          {/* Update Stats Modal */}
          {showStatsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowStatsModal(false)}
              />
              
              {/* Modal */}
              <div className="relative bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold text-white mb-2">Update Your Stats</h3>
                <p className="text-white/50 text-sm mb-6">
                  Keep your follower counts up to date to unlock better opportunities.
                </p>

                <div className="space-y-4">
                  {/* Instagram Input */}
                  <div>
                    <label className="block text-white/50 text-xs uppercase tracking-wider mb-2">
                      Instagram Followers
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </span>
                      <input
                        type="number"
                        value={newInstagramFollowers}
                        onChange={(e) => setNewInstagramFollowers(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* TikTok Input */}
                  <div>
                    <label className="block text-white/50 text-xs uppercase tracking-wider mb-2">
                      TikTok Followers
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                        </svg>
                      </span>
                      <input
                        type="number"
                        value={newTiktokFollowers}
                        onChange={(e) => setNewTiktokFollowers(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Rate limit notice */}
                <p className="text-white/40 text-xs mt-4">
                  You can update your stats once every 24 hours.
                </p>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowStatsModal(false)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateStats}
                    disabled={updatingStats}
                    className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {updatingStats ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Past Collaborations Section */}
          {pastCollaborations.length > 0 && (
            <div className="mt-6">
              <SectionCard title="Past Collaborations" icon="📜" className="hover:border-white/20 transition-all duration-300">
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
                            {collab.product} <span className="text-white/50 text-sm">({collab.size})</span>
                          </div>
                          <div className="text-white/50 text-xs">
                            Collab #{collab.collabNumber} • {formatDate(collab.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className={`text-xs font-medium px-3 py-1 rounded-full ${
                        collab.status === 'completed' 
                          ? 'bg-green-500/20 text-green-400' 
                          : collab.status === 'denied'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                      }`}>
                        {collab.status === 'completed' ? 'Completed' : collab.status === 'denied' ? 'Not Approved' : 'Ghosted'}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Stats summary */}
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-sm">
                  <span className="text-white/50">
                    Total collaborations: <span className="text-white font-medium">{creator.totalCollaborations}</span>
                  </span>
                  <span className="text-white/50">
                    Completed: <span className="text-green-400 font-medium">
                      {pastCollaborations.filter(c => c.status === 'completed').length + (creator.collaboration?.status === 'completed' ? 1 : 0)}
                    </span>
                  </span>
                </div>
              </SectionCard>
            </div>
          )}
      </div>
    </div>
    </ProtectedRoute>
  );
}