// src/app/creator/leaderboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui';
import { LeaderboardEntry } from '@/types';
import { getCurrentWeek, getCurrentMonth, getPreviousWeeks, getPreviousMonths, formatTimeUntilReset } from '@/lib/week-utils';

type LeaderboardTab = 'volume' | 'gmv';

export default function LeaderboardPage() {
  const { user, userData, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('volume');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Period selection
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const weekOptions = getPreviousWeeks(8);
  const monthOptions = getPreviousMonths(6);
  
  // Countdown
  const [timeUntilReset, setTimeUntilReset] = useState(formatTimeUntilReset());
  
  // Current user's rank
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilReset(formatTimeUntilReset());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    setUserRank(null);
    
    try {
      const period = activeTab === 'volume' ? selectedWeek : selectedMonth;
      const response = await fetch(
        `/api/leaderboard?type=${activeTab}&period=${period}&limit=25`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setEntries(data.entries);
      
      // Find current user's entry
      if (userData?.creatorId) {
        const userEntry = data.entries.find(
          (e: LeaderboardEntry) => e.creatorId === userData.creatorId
        );
        setUserRank(userEntry || null);
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadLeaderboard();
    }
  }, [user, activeTab, selectedWeek, selectedMonth]);

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: 'text-yellow-400' };
    if (rank === 2) return { emoji: '🥈', color: 'text-gray-300' };
    if (rank === 3) return { emoji: '🥉', color: 'text-orange-400' };
    return { emoji: `#${rank}`, color: 'text-zinc-400' };
  };

  const getVolumePrize = (rank: number) => {
    if (rank === 1) return '$25';
    if (rank === 2) return '$15';
    if (rank === 3) return '$10';
    return null;
  };

  const getGMVPrize = (rank: number) => {
    if (rank === 1) return '$50';
    if (rank === 2) return '$30';
    if (rank === 3) return '$20';
    return null;
  };

  const getPrize = (rank: number) => {
    return activeTab === 'volume' ? getVolumePrize(rank) : getGMVPrize(rank);
  };

  const isCurrentPeriod = activeTab === 'volume' 
    ? selectedWeek === getCurrentWeek() 
    : selectedMonth === getCurrentMonth();

  const formatValue = (value: number) => {
    if (activeTab === 'gmv') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toString();
  };

  const getValueLabel = () => {
    return activeTab === 'volume' ? 'posts' : 'sales';
  };

  if (authLoading) {
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

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">🏆 Leaderboard</h1>
          <p className="text-zinc-400">
            Compete with other creators for weekly and monthly prizes
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 flex gap-2 p-1 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('volume')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'volume'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
            }`}
          >
            <span>📊</span>
            <span>Weekly Volume</span>
          </button>
          <button
            onClick={() => setActiveTab('gmv')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'gmv'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
            }`}
          >
            <span>💰</span>
            <span>Monthly GMV</span>
          </button>
        </div>

        {/* Period Selector & Timer */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50">
          <div className="flex items-center gap-3">
            <label className="text-zinc-400 text-sm">
              {activeTab === 'volume' ? 'Week:' : 'Month:'}
            </label>
            {activeTab === 'volume' ? (
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors"
              >
                {weekOptions.map((week) => (
                  <option key={week} value={week}>
                    {week} {week === getCurrentWeek() ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors"
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {month} {month === getCurrentMonth() ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          {activeTab === 'volume' && isCurrentPeriod && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-sm">Resets in:</span>
              <span className="text-orange-400 font-mono font-bold">{timeUntilReset}</span>
            </div>
          )}
        </div>

        {/* Prize Pool Banner */}
        {isCurrentPeriod && (
          <div className="mb-6 p-4 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-xl border border-orange-500/30">
            <div className="flex items-center justify-center gap-6 text-center">
              <div>
                <div className="text-2xl">🥇</div>
                <div className="text-white font-bold">{activeTab === 'volume' ? '$25' : '$50'}</div>
                <div className="text-zinc-400 text-xs">1st Place</div>
              </div>
              <div>
                <div className="text-2xl">🥈</div>
                <div className="text-white font-bold">{activeTab === 'volume' ? '$15' : '$30'}</div>
                <div className="text-zinc-400 text-xs">2nd Place</div>
              </div>
              <div>
                <div className="text-2xl">🥉</div>
                <div className="text-white font-bold">{activeTab === 'volume' ? '$10' : '$20'}</div>
                <div className="text-zinc-400 text-xs">3rd Place</div>
              </div>
            </div>
          </div>
        )}

        {/* User's Current Position (if not in top 10) */}
        {userRank && userRank.rank > 10 && (
          <div className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-orange-400 font-bold">📍 Your Position</span>
                <span className="text-white font-medium">{userRank.creatorName}</span>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">#{userRank.rank}</div>
                <div className="text-zinc-400 text-sm">{formatValue(userRank.value)} {getValueLabel()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
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
              <div className="text-5xl mb-4">{activeTab === 'volume' ? '📊' : '💰'}</div>
              <p className="text-zinc-400 mb-2">
                {activeTab === 'volume' 
                  ? 'No submissions yet this week' 
                  : 'No GMV data for this month'}
              </p>
              <p className="text-zinc-500 text-sm">
                {activeTab === 'volume' 
                  ? 'Be the first to post and claim the top spot!' 
                  : 'Sales data will be updated by the admin team'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-700/50">
              {entries.map((entry) => {
                const { emoji, color } = getRankDisplay(entry.rank);
                const prize = getPrize(entry.rank);
                const isCurrentUser = userData?.creatorId === entry.creatorId;
                
                return (
                  <div 
                    key={entry.id}
                    className={`flex items-center gap-4 p-4 transition-colors ${
                      isCurrentUser 
                        ? 'bg-orange-500/20 border-l-4 border-orange-500' 
                        : entry.rank <= 3 
                          ? 'bg-zinc-700/10 hover:bg-zinc-700/20' 
                          : 'hover:bg-zinc-700/20'
                    }`}
                  >
                    {/* Rank */}
                    <div className={`w-12 text-center font-bold text-xl ${color}`}>
                      {emoji}
                    </div>
                    
                    {/* Creator Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${isCurrentUser ? 'text-orange-400' : 'text-white'}`}>
                          {entry.creatorName}
                          {isCurrentUser && <span className="ml-2 text-xs">(You)</span>}
                        </span>
                        {prize && isCurrentPeriod && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            {prize}
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-500 text-sm">@{entry.creatorHandle}</div>
                    </div>
                    
                    {/* Value */}
                    <div className="text-right">
                      <div className={`font-bold text-lg ${activeTab === 'gmv' ? 'text-green-400' : 'text-white'}`}>
                        {formatValue(entry.value)}
                      </div>
                      <div className="text-zinc-500 text-xs">{getValueLabel()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA - Hide for admins */}
        {activeTab === 'volume' && isCurrentPeriod && !isAdmin && (
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/creator/submit')}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-orange-500/25"
            >
              Submit Content →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}