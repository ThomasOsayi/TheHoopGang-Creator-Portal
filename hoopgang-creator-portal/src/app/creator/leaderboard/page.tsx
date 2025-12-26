// src/app/creator/leaderboard/page.tsx
// Mobile-Responsive Version

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Navbar, 
  GlowCard, 
  AnimatedCounter, 
  LiveCountdown, 
  BackgroundOrbs,
  Skeleton,
  PageHeader,
} from '@/components/ui';
import { LeaderboardEntry, CreatorSource, CollaborationStatus } from '@/types';
import { ProtectedRoute } from '@/components/auth';
import { getCreatorWithActiveCollab } from '@/lib/firestore';

interface ActiveCompetition {
  id: string;
  name: string;
  status: 'active' | 'ended' | 'finalized';
  startedAt: string;
  endsAt: string;
  endedAt?: string;
  durationDays: number;
  totalCreators?: number;
  prizes?: { first: string; second: string; third: string };
  winners?: Array<{ rank: number; creatorId: string; creatorName: string; prize: number }>;
}

export default function LeaderboardPage() {
  const { user, userData, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Competition state
  const [activeCompetition, setActiveCompetition] = useState<ActiveCompetition | null>(null);
  const [competitionLoading, setCompetitionLoading] = useState(true);
  
  // Creator source and status for feature restrictions
  const [creatorSource, setCreatorSource] = useState<CreatorSource | null>(null);
  const [collabStatus, setCollabStatus] = useState<CollaborationStatus | null>(null);
  
  // Pending modal state
  const [showPendingModal, setShowPendingModal] = useState(false);
  
  // Current user's stats
  const [userStats, setUserStats] = useState<{
    currentRank: number | null;
    weeklySubmissions: number;
    bestFinish: number | null;
    competitionsEntered: number;
    creatorName?: string;
  }>({
    currentRank: null,
    weeklySubmissions: 0,
    bestFinish: null,
    competitionsEntered: 0,
    creatorName: undefined,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch creator data for source/status check
  useEffect(() => {
    const fetchCreatorData = async () => {
      if (user && userData?.role === 'creator' && userData?.creatorId) {
        try {
          const result = await getCreatorWithActiveCollab(userData.creatorId);
          if (result) {
            setCreatorSource(result.source || null);
            if (result.collaboration) {
              setCollabStatus(result.collaboration.status);
            } else {
              setCollabStatus(null);
            }
          }
        } catch (error) {
          console.error('Error fetching creator data:', error);
        }
      }
    };
    fetchCreatorData();
  }, [user, userData]);

  // Check if creator is pending Instagram user
  const isPendingInstagramCreator = useMemo(() => {
    // TikTok creators always have access
    if (creatorSource === 'tiktok') return false;
    
    // Instagram creators need approved+ status
    if (!collabStatus) return true; // No collab = pending
    
    const activeStatuses: CollaborationStatus[] = ['approved', 'shipped', 'delivered', 'completed'];
    return !activeStatuses.includes(collabStatus);
  }, [creatorSource, collabStatus]);

  // Handle Submit Content click
  const handleSubmitContentClick = (e: React.MouseEvent) => {
    if (isPendingInstagramCreator) {
      e.preventDefault();
      setShowPendingModal(true);
    }
  };

  // Fetch active competition
  useEffect(() => {
    const fetchCompetition = async () => {
      setCompetitionLoading(true);
      try {
        const response = await fetch('/api/competitions/active?type=volume&includeEnded=true');
        const data = await response.json();
        
        if (data.competition) {
          setActiveCompetition({
            ...data.competition,
            totalCreators: data.leaderboard?.length || 0,
          });
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

    fetchCompetition();
  }, []);

  // Load leaderboard
  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!activeCompetition) {
        setEntries([]);
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/competitions/active?type=volume`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      const data = await response.json();
      const entriesData = data.leaderboard || [];
      
      setEntries(entriesData);
      
      // Find current user's entry and stats
      if (userData?.creatorId) {
        const userEntry = entriesData.find(
          (e: LeaderboardEntry) => e.creatorId === userData.creatorId
        );
        if (userEntry) {
          setUserStats(prev => ({
            ...prev,
            currentRank: userEntry.rank,
            weeklySubmissions: userEntry.value,
            creatorName: userEntry.creatorName,
          }));
        }
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !competitionLoading) {
      loadLeaderboard();
    }
  }, [user, activeCompetition, competitionLoading]);

  // Get avatar initial from name
  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  // Get rank display (trophy or number)
  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { icon: '🥇', color: 'text-yellow-400' };
    if (rank === 2) return { icon: '🥈', color: 'text-gray-300' };
    if (rank === 3) return { icon: '🥉', color: 'text-orange-400' };
    return { icon: `#${rank}`, color: 'text-zinc-400' };
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const totalCreators = activeCompetition?.totalCreators || entries.length;
  const isCurrentUser = (creatorId: string) => userData?.creatorId === creatorId;

  return (
    <ProtectedRoute allowedRoles={['creator']}>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        <Navbar />
        
        {/* Background Orbs */}
        <BackgroundOrbs colors={['orange', 'purple', 'orange']} />

        <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Header */}
          <PageHeader 
            title="Leaderboard"
            subtitle="Compete with other creators for weekly prizes"
            icon="🏆"
            accentColor="gold"
          />

          {/* Your Current Rank Card - Mobile Optimized */}
          {userStats.currentRank && (
            <div className="mb-6 p-4 sm:p-6 bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-orange-500/20 border border-orange-500/30 rounded-2xl animate-fade-in-up">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                {/* Rank Badge */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 flex-shrink-0">
                  <span className="text-2xl sm:text-3xl font-bold text-white">#{userStats.currentRank}</span>
                </div>
                
                {/* Info */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="text-zinc-400 text-xs sm:text-sm">Your Current Rank</div>
                  <div className="text-xl sm:text-2xl font-bold text-white">{userStats.creatorName || 'Creator'}</div>
                  <div className="text-green-400 text-sm sm:text-base">
                    <AnimatedCounter value={userStats.weeklySubmissions} /> submissions this week
                  </div>
                </div>
                
                {/* Stats - Hidden on mobile, shown in a row on tablet+ */}
                <div className="hidden sm:flex gap-8">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {userStats.bestFinish ? `#${userStats.bestFinish}` : '—'}
                    </div>
                    <div className="text-zinc-500 text-xs sm:text-sm">Best Finish</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      <AnimatedCounter value={userStats.competitionsEntered} />
                    </div>
                    <div className="text-zinc-500 text-xs sm:text-sm">Competitions</div>
                  </div>
                </div>
              </div>
              
              {/* Stats row on mobile only */}
              <div className="flex sm:hidden justify-center gap-8 mt-4 pt-4 border-t border-orange-500/20">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {userStats.bestFinish ? `#${userStats.bestFinish}` : '—'}
                  </div>
                  <div className="text-zinc-500 text-xs">Best Finish</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    <AnimatedCounter value={userStats.competitionsEntered} />
                  </div>
                  <div className="text-zinc-500 text-xs">Competitions</div>
                </div>
              </div>
            </div>
          )}

          {/* Competition Status Banner - Mobile Optimized */}
          {!competitionLoading && activeCompetition?.status === 'active' && (
            <GlowCard glowColor="green" className="mb-6 bg-zinc-900/50 border-green-500/20">
              <div className="flex flex-col items-center text-center">
                <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xl sm:text-2xl">🏆</span>
                  <span className="text-green-400 font-bold text-sm sm:text-base">{activeCompetition.name} is LIVE!</span>
                </div>
                <span className="text-zinc-400 text-xs sm:text-sm mb-3">{totalCreators} creators competing</span>
                
                <div className="text-zinc-500 text-xs sm:text-sm mb-2">Competition ends in</div>
                <LiveCountdown targetDate={new Date(activeCompetition.endsAt)} size="lg" />
              </div>
            </GlowCard>
          )}

          {!competitionLoading && activeCompetition?.status === 'ended' && (
            <GlowCard glowColor="yellow" className="mb-6 bg-yellow-500/5 border-yellow-500/20">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-center">
                <span className="text-xl sm:text-2xl">⏳</span>
                <div>
                  <span className="text-yellow-400 font-semibold text-sm sm:text-base block sm:inline">{activeCompetition.name} - Results Pending</span>
                  <p className="text-zinc-400 text-xs sm:text-sm">Competition has ended! Winners announced soon.</p>
                </div>
              </div>
            </GlowCard>
          )}

          {!competitionLoading && !activeCompetition && (
            <GlowCard glowColor="orange" className="mb-6 text-center py-6 sm:py-8">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🏁</div>
              <h3 className="text-white font-semibold text-sm sm:text-base mb-1 sm:mb-2">No Active Competition</h3>
              <p className="text-zinc-400 text-xs sm:text-sm">Check back soon! A new competition will be announced shortly.</p>
            </GlowCard>
          )}

          {/* Prizes Section - Mobile Optimized */}
          <div className="relative mb-6 sm:mb-8 p-4 sm:p-6 bg-zinc-900/70 rounded-2xl border-2 border-transparent overflow-hidden animate-fade-in-up"
            style={{
              background: 'linear-gradient(#18181b, #18181b) padding-box, linear-gradient(90deg, #eab308, #f97316, #ef4444) border-box',
            }}
          >
            {/* Animated Shimmer Effect */}
            <div 
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            />
            
            {/* Header */}
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-bold inline-flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl animate-bounce-subtle">🏆</span>
                <span 
                  className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent"
                  style={{ backgroundSize: '200% auto', animation: 'shimmer-text 3s linear infinite' }}
                >
                  PRIZES UP FOR GRABS!
                </span>
                <span className="text-2xl sm:text-3xl animate-bounce-subtle" style={{ animationDelay: '0.2s' }}>💰</span>
              </h2>
            </div>

            {/* Prize Cards - Stack on mobile, grid on tablet+ */}
            {/* Mobile: Horizontal scroll with 1st place first */}
            <div className="flex sm:hidden gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {/* 1st Place - Gold (First in scroll on mobile) */}
              <div 
                className="flex-shrink-0 w-[140px] bg-zinc-800/80 rounded-xl p-4 text-center border-2"
                style={{
                  borderColor: 'rgba(234, 179, 8, 0.5)',
                  boxShadow: '0 0 15px rgba(234, 179, 8, 0.3)',
                }}
              >
                <div className="text-4xl mb-2">🥇</div>
                <div className="text-yellow-400 font-bold text-sm mb-1">1st Place</div>
                <div className="text-white font-bold text-base">
                  {activeCompetition?.prizes?.first || '$50 Cash'}
                </div>
              </div>

              {/* 2nd Place - Silver */}
              <div className="flex-shrink-0 w-[130px] bg-zinc-800/80 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">🥈</div>
                <div className="text-slate-300 font-bold text-sm mb-1">2nd Place</div>
                <div className="text-white font-bold text-base">
                  {activeCompetition?.prizes?.second || '$25 Credit'}
                </div>
              </div>

              {/* 3rd Place - Bronze */}
              <div className="flex-shrink-0 w-[130px] bg-zinc-800/80 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">🥉</div>
                <div className="text-amber-600 font-bold text-sm mb-1">3rd Place</div>
                <div className="text-white font-bold text-base">
                  {activeCompetition?.prizes?.third || 'Free Product'}
                </div>
              </div>
            </div>

            {/* Tablet+: Grid layout with 1st place bigger in middle */}
            <div className="hidden sm:grid grid-cols-[1fr_1.5fr_1fr] gap-4 mb-4">
              {/* 2nd Place - Silver */}
              <div 
                className="bg-zinc-800/80 rounded-xl p-5 text-center transition-all duration-300 hover:scale-105 cursor-default group"
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(148, 163, 184, 0.4)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">🥈</div>
                <div className="text-slate-300 font-bold text-lg mb-1">2nd Place</div>
                <div className="text-white font-bold text-xl">
                  {activeCompetition?.prizes?.second || '$25 Credit'}
                </div>
              </div>

              {/* 1st Place - Gold (Bigger, in middle) */}
              <div 
                className="bg-zinc-800/80 rounded-xl p-7 text-center transition-all duration-300 hover:scale-105 cursor-default group relative border-2"
                style={{
                  borderColor: 'rgba(234, 179, 8, 0.5)',
                  boxShadow: '0 0 20px rgba(234, 179, 8, 0.3), inset 0 0 20px rgba(234, 179, 8, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(234, 179, 8, 0.6), inset 0 0 20px rgba(234, 179, 8, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(234, 179, 8, 0.8)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(234, 179, 8, 0.3), inset 0 0 20px rgba(234, 179, 8, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(234, 179, 8, 0.5)';
                }}
              >
                <div className="text-6xl mb-3 group-hover:scale-110 transition-transform">🥇</div>
                <div className="text-yellow-400 font-bold text-xl mb-1">1st Place</div>
                <div className="text-white font-bold text-2xl">
                  {activeCompetition?.prizes?.first || '$50 Cash'}
                </div>
              </div>

              {/* 3rd Place - Bronze */}
              <div 
                className="bg-zinc-800/80 rounded-xl p-5 text-center transition-all duration-300 hover:scale-105 cursor-default group"
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(180, 83, 9, 0.4)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">🥉</div>
                <div className="text-amber-600 font-bold text-lg mb-1">3rd Place</div>
                <div className="text-white font-bold text-xl">
                  {activeCompetition?.prizes?.third || 'Free Product'}
                </div>
              </div>
            </div>

            {/* Motivational Tagline */}
            <div className="text-center mt-3 sm:mt-0">
              <p className="text-zinc-400 text-xs sm:text-sm inline-flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg">🔥</span>
                Post the most content to win!
                <span className="text-base sm:text-lg">🔥</span>
              </p>
            </div>
          </div>

          {/* Current Week Leaderboard */}
          <GlowCard glowColor="orange" delay="0.25s" noPadding>
            {/* Table Header - Hidden on mobile */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <div className="col-span-2">Rank</div>
              <div className="col-span-7">Creator</div>
              <div className="col-span-3 text-right">Submissions</div>
            </div>

            {/* Mobile Header */}
            <div className="sm:hidden px-4 py-3 border-b border-zinc-800">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Rankings</span>
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="flex items-center justify-center py-12 sm:py-16">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-12 sm:py-16 px-4">
                <p className="text-red-400 mb-4 text-sm sm:text-base">{error}</p>
                <button
                  onClick={loadLeaderboard}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm"
                >
                  Retry
                </button>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 sm:py-16 px-4">
                <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📊</div>
                <p className="text-zinc-400 mb-1 sm:mb-2 text-sm sm:text-base">No submissions yet</p>
                <p className="text-zinc-500 text-xs sm:text-sm">Be the first to post and claim the top spot!</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {entries.map((entry) => {
                  const { icon, color } = getRankDisplay(entry.rank);
                  const isCurrent = isCurrentUser(entry.creatorId);
                  
                  return (
                    <div 
                      key={entry.id}
                      className={`flex sm:grid sm:grid-cols-12 gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 items-center transition-colors ${
                        isCurrent 
                          ? 'bg-orange-500/10 border-l-4 border-orange-500' 
                          : 'hover:bg-zinc-800/30'
                      }`}
                    >
                      {/* Rank */}
                      <div className={`sm:col-span-2 font-bold text-lg sm:text-xl ${color} flex-shrink-0 w-10 sm:w-auto`}>
                        {icon}
                      </div>
                      
                      {/* Creator */}
                      <div className="sm:col-span-7 flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
                          isCurrent 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-zinc-700 text-zinc-300'
                        }`}>
                          {getInitial(entry.creatorName)}
                        </div>
                        
                        {/* Name */}
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <span className={`font-medium text-sm sm:text-base truncate ${isCurrent ? 'text-orange-400' : 'text-white'}`}>
                            {entry.creatorName}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 sm:px-2 py-0.5 bg-zinc-700 text-zinc-300 text-[10px] sm:text-xs rounded-full flex-shrink-0">
                              YOU
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Submissions */}
                      <div className="sm:col-span-3 text-right flex-shrink-0">
                        <div className="text-white font-bold text-lg sm:text-xl">
                          <AnimatedCounter value={entry.value} />
                        </div>
                        <div className="text-zinc-500 text-[10px] sm:text-xs hidden sm:block">submissions</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            {entries.length > 0 && (
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-zinc-800 text-center">
                <span className="text-zinc-500 text-xs sm:text-sm">
                  Showing top {entries.length} of {totalCreators} creators
                </span>
              </div>
            )}
          </GlowCard>

          {/* CTA Card */}
          {!isAdmin && (
            <GlowCard glowColor="orange" delay="0.3s" className="mt-6 sm:mt-8 text-center">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🚀</div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Want to climb the ranks?</h3>
              <p className="text-zinc-400 text-sm mb-4 sm:mb-6">Submit more TikToks to increase your position!</p>
              
              {isPendingInstagramCreator ? (
                <button 
                  onClick={handleSubmitContentClick}
                  className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/25 text-sm sm:text-base"
                >
                  Submit Content →
                </button>
              ) : (
                <Link href="/creator/submit">
                  <button className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/25 text-sm sm:text-base">
                    Submit Content →
                  </button>
                </Link>
              )}
            </GlowCard>
          )}
        </main>

        {/* Pending Application Modal - Bottom Sheet on Mobile */}
        {showPendingModal && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowPendingModal(false)}
            />
            
            <div className="relative bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 w-full sm:max-w-md shadow-2xl shadow-black/50 animate-fade-in-up safe-bottom">
              {/* Drag indicator for mobile */}
              <div className="sm:hidden w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
              
              <button
                onClick={() => setShowPendingModal(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="text-4xl sm:text-5xl text-center mb-3 sm:mb-4">⏳</div>
              
              <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-2 sm:mb-3">
                Application Under Review
              </h3>
              
              <p className="text-white/60 text-sm text-center mb-2">
                Your application is still being reviewed by our team. Once approved, you'll be able to submit content and start earning rewards!
              </p>
              
              <p className="text-white/40 text-xs text-center mb-5 sm:mb-6">
                We typically review applications within 24-48 hours.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowPendingModal(false)}
                  className="flex-1 px-4 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-all duration-200 active:scale-[0.98]"
                >
                  Got It
                </button>
                <Link
                  href="/creator/dashboard"
                  onClick={() => setShowPendingModal(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 text-center active:scale-[0.98]"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}