// src/app/admin/leaderboard/volume/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { LeaderboardEntry } from '@/types';
import { getCurrentWeek, getPreviousWeeks, formatTimeUntilReset } from '@/lib/week-utils';

interface WeekStatus {
  weekOf: string;
  isCurrentWeek: boolean;
  isPastWeek: boolean;
  isFinalized: boolean;
  finalizationData: {
    finalizedAt: Date;
    winners: Array<{ rank: number; creatorName: string; rewardName: string; cashAmount: number }>;
  } | null;
  leaderboard: LeaderboardEntry[];
  canFinalize: boolean;
}

export default function VolumeLeaderboardAdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [status, setStatus] = useState<WeekStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  
  // Period selection
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const weekOptions = getPreviousWeeks(8);
  
  // Countdown
  const [timeUntilReset, setTimeUntilReset] = useState(formatTimeUntilReset());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && !isAdmin) {
      router.push('/');
      return;
    }
  }, [user, isAdmin, authLoading, router]);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilReset(formatTimeUntilReset());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getAuthToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/admin/leaderboard/volume/status?weekOf=${selectedWeek}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Error loading status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadStatus();
    }
  }, [user, isAdmin, selectedWeek]);

  const handleFinalize = async () => {
    if (!confirm(`Are you sure you want to finalize week ${selectedWeek}? This will create redemption records for the top 3 winners and cannot be undone.`)) {
      return;
    }
    
    setFinalizing(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/leaderboard/volume/finalize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ weekOf: selectedWeek }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to finalize');
      }

      alert(`Week finalized successfully!\n\nWinners:\n${data.winners.map((w: any) => `#${w.rank} ${w.creatorName} - ${w.rewardName}`).join('\n')}`);
      await loadStatus();
    } catch (err) {
      console.error('Finalize error:', err);
      alert(err instanceof Error ? err.message : 'Failed to finalize');
    } finally {
      setFinalizing(false);
    }
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: 'text-yellow-400' };
    if (rank === 2) return { emoji: '🥈', color: 'text-gray-300' };
    if (rank === 3) return { emoji: '🥉', color: 'text-orange-400' };
    return { emoji: `#${rank}`, color: 'text-zinc-400' };
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">📊 Volume Leaderboard</h1>
            <p className="text-zinc-400">
              Manage weekly volume rankings and finalize winners
            </p>
          </div>
          
          {/* Week Selector */}
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
          >
            {weekOptions.map((week) => (
              <option key={week} value={week}>
                {week} {week === getCurrentWeek() ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Status Banner */}
        {status && (
          <div className={`mb-6 p-4 rounded-xl border ${
            status.isFinalized 
              ? 'bg-green-500/20 border-green-500/30' 
              : status.isCurrentWeek
                ? 'bg-blue-500/20 border-blue-500/30'
                : 'bg-yellow-500/20 border-yellow-500/30'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-semibold ${
                    status.isFinalized ? 'text-green-400' : status.isCurrentWeek ? 'text-blue-400' : 'text-yellow-400'
                  }`}>
                    {status.isFinalized 
                      ? '✓ Week Finalized' 
                      : status.isCurrentWeek 
                        ? '⏳ Week In Progress'
                        : '⚠️ Ready to Finalize'}
                  </span>
                </div>
                {status.isCurrentWeek && (
                  <p className="text-zinc-400 text-sm">
                    Resets in: <span className="text-orange-400 font-mono">{timeUntilReset}</span>
                  </p>
                )}
                {status.isFinalized && status.finalizationData && (
                  <p className="text-zinc-400 text-sm">
                    Finalized on {formatDate(status.finalizationData.finalizedAt)}
                  </p>
                )}
              </div>
              
              {status.canFinalize && (
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {finalizing ? 'Finalizing...' : '🏁 Finalize Week'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Winners Summary (if finalized) */}
        {status?.isFinalized && status.finalizationData?.winners && (
          <div className="mb-6 p-4 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50">
            <h3 className="text-lg font-semibold text-white mb-3">🏆 Winners</h3>
            <div className="grid gap-3">
              {status.finalizationData.winners.map((winner) => {
                const { emoji, color } = getRankDisplay(winner.rank);
                return (
                  <div key={winner.rank} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`text-xl ${color}`}>{emoji}</span>
                      <span className="text-white font-medium">{winner.creatorName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-green-400 font-bold">${winner.cashAmount}</span>
                      <span className="text-zinc-500 text-sm ml-2">({winner.rewardName})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        {status && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
              <div className="text-2xl font-bold text-white">{status.leaderboard.length}</div>
              <div className="text-zinc-400 text-sm">Participants</div>
            </div>
            <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
              <div className="text-2xl font-bold text-blue-400">
                {status.leaderboard.reduce((sum, e) => sum + e.value, 0)}
              </div>
              <div className="text-zinc-400 text-sm">Total Posts</div>
            </div>
            <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
              <div className="text-2xl font-bold text-orange-400">
                {status.leaderboard[0]?.value || 0}
              </div>
              <div className="text-zinc-400 text-sm">Top Score</div>
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
                onClick={loadStatus}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : !status || status.leaderboard.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-zinc-400 mb-2">No submissions for this week</p>
              <p className="text-zinc-500 text-sm">Creators need to submit content first</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-700/50">
              {status.leaderboard.map((entry) => {
                const { emoji, color } = getRankDisplay(entry.rank);
                const prize = entry.rank === 1 ? '$25' : entry.rank === 2 ? '$15' : entry.rank === 3 ? '$10' : null;
                
                return (
                  <div 
                    key={entry.id}
                    className={`flex items-center gap-4 p-4 hover:bg-zinc-700/20 transition-colors ${
                      entry.rank <= 3 ? 'bg-zinc-700/10' : ''
                    }`}
                  >
                    {/* Rank */}
                    <div className={`w-12 text-center font-bold text-xl ${color}`}>
                      {emoji}
                    </div>
                    
                    {/* Creator Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium truncate">
                          {entry.creatorName}
                        </span>
                        {prize && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            {prize}
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-500 text-sm">@{entry.creatorHandle}</div>
                    </div>
                    
                    {/* Post Count */}
                    <div className="text-right">
                      <div className="text-white font-bold text-lg">{entry.value}</div>
                      <div className="text-zinc-500 text-xs">posts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}