// src/app/creator/leaderboard/page.tsx
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
  Skeleton,
} from '@/components/ui';
import { LeaderboardEntry } from '@/types';

interface ActiveCompetition {
  id: string;
  name: string;
  status: 'active' | 'ended' | 'finalized';
  startedAt: string;
  endsAt: string;
  endedAt?: string;
  durationDays: number;
  totalCreators?: number;
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
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      <Navbar />
      
      {/* Background Orbs */}
      <BackgroundOrbs colors={['orange', 'purple', 'orange']} />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8 text-center animate-fade-in">
          <h1 className="text-4xl font-bold text-white mb-2">
            Leaderboard
            <span className="inline-block ml-2">🏆</span>
          </h1>
          <p className="text-zinc-400">
            Compete with other creators for weekly prizes
          </p>
        </div>

        {/* Your Current Rank Card */}
        {userStats.currentRank && (
          <div className="mb-6 p-6 bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-orange-500/20 border border-orange-500/30 rounded-2xl animate-fade-in-up">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Rank Badge */}
              <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <span className="text-3xl font-bold text-white">#{userStats.currentRank}</span>
              </div>
              
              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="text-zinc-400 text-sm">Your Current Rank</div>
                <div className="text-2xl font-bold text-white">{userStats.creatorName || 'Creator'}</div>
                <div className="text-green-400">
                  <AnimatedCounter value={userStats.weeklySubmissions} /> submissions this week
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {userStats.bestFinish ? `#${userStats.bestFinish}` : '—'}
                  </div>
                  <div className="text-zinc-500 text-sm">Best Finish</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    <AnimatedCounter value={userStats.competitionsEntered} />
                  </div>
                  <div className="text-zinc-500 text-sm">Competitions</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Competition Status Banner */}
        {!competitionLoading && activeCompetition?.status === 'active' && (
          <GlowCard glowColor="green" className="mb-6 bg-zinc-900/50 border-green-500/20">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-2xl">🏆</span>
                <span className="text-green-400 font-bold">{activeCompetition.name} is LIVE!</span>
                <span className="text-zinc-400">•</span>
                <span className="text-zinc-400">{totalCreators} creators competing</span>
              </div>
              
              <div className="text-zinc-500 text-sm mb-3">Competition ends in</div>
              <LiveCountdown targetDate={new Date(activeCompetition.endsAt)} size="lg" />
            </div>
          </GlowCard>
        )}

        {!competitionLoading && activeCompetition?.status === 'ended' && (
          <GlowCard glowColor="yellow" className="mb-6 bg-yellow-500/5 border-yellow-500/20">
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">⏳</span>
              <div className="text-center">
                <span className="text-yellow-400 font-semibold">{activeCompetition.name} - Results Pending</span>
                <p className="text-zinc-400 text-sm">Competition has ended! Winners announced soon.</p>
              </div>
            </div>
          </GlowCard>
        )}

        {!competitionLoading && !activeCompetition && (
          <GlowCard glowColor="orange" className="mb-6 text-center py-8">
            <div className="text-4xl mb-3">🏁</div>
            <h3 className="text-white font-semibold mb-2">No Active Competition</h3>
            <p className="text-zinc-400 text-sm">Check back soon! A new competition will be announced shortly.</p>
          </GlowCard>
        )}

        {/* Prize Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place - Silver */}
          <div className="bg-gradient-to-br from-zinc-400/20 to-zinc-500/10 border border-zinc-400/30 rounded-2xl p-6 text-center animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="text-4xl mb-2">🥈</div>
            <div className="text-white font-bold text-lg">2nd Place</div>
            <div className="text-green-400 font-bold">$25</div>
          </div>
          
          {/* 1st Place - Gold */}
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-2xl p-6 text-center animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <div className="text-4xl mb-2">🥇</div>
            <div className="text-white font-bold text-lg">1st Place</div>
            <div className="text-green-400 font-bold">$50</div>
          </div>
          
          {/* 3rd Place - Bronze */}
          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-2xl p-6 text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="text-4xl mb-2">🥉</div>
            <div className="text-white font-bold text-lg">3rd Place</div>
            <div className="text-green-400 font-bold">$10</div>
          </div>
        </div>

        {/* Current Week Leaderboard */}
        <GlowCard glowColor="orange" delay="0.25s" noPadding>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <div className="col-span-2">Rank</div>
              <div className="col-span-7">Creator</div>
              <div className="col-span-3 text-right">Submissions</div>
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={loadLeaderboard}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📊</div>
                <p className="text-zinc-400 mb-2">No submissions yet</p>
                <p className="text-zinc-500 text-sm">Be the first to post and claim the top spot!</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {entries.map((entry) => {
                  const { icon, color } = getRankDisplay(entry.rank);
                  const isCurrent = isCurrentUser(entry.creatorId);
                  
                  return (
                    <div 
                      key={entry.id}
                      className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors ${
                        isCurrent 
                          ? 'bg-orange-500/10 border-l-4 border-orange-500' 
                          : 'hover:bg-zinc-800/30'
                      }`}
                    >
                      {/* Rank */}
                      <div className={`col-span-2 font-bold text-xl ${color}`}>
                        {icon}
                      </div>
                      
                      {/* Creator */}
                      <div className="col-span-7 flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          isCurrent 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-zinc-700 text-zinc-300'
                        }`}>
                          {getInitial(entry.creatorName)}
                        </div>
                        
                        {/* Name */}
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isCurrent ? 'text-orange-400' : 'text-white'}`}>
                            {entry.creatorName}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 text-xs rounded-full">
                              YOU
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Submissions */}
                      <div className="col-span-3 text-right">
                        <div className="text-white font-bold text-xl">
                          <AnimatedCounter value={entry.value} />
                        </div>
                        <div className="text-zinc-500 text-xs">submissions</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            {entries.length > 0 && (
              <div className="px-6 py-4 border-t border-zinc-800 text-center">
                <span className="text-zinc-500 text-sm">
                  Showing top {entries.length} of {totalCreators} creators
                </span>
              </div>
            )}
          </GlowCard>

        {/* CTA Card */}
        {!isAdmin && (
          <GlowCard glowColor="orange" delay="0.3s" className="mt-8 text-center">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-xl font-bold text-white mb-2">Want to climb the ranks?</h3>
            <p className="text-zinc-400 mb-6">Submit more TikToks to increase your position!</p>
            <Link href="/creator/submit">
              <button className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/25">
                Submit Content →
              </button>
            </Link>
          </GlowCard>
        )}
      </main>
    </div>
  );
}