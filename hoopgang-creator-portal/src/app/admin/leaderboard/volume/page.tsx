// src/app/admin/leaderboard/volume/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { Competition, LeaderboardEntry } from '@/types';

export default function VolumeCompetitionAdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [activeCompetition, setActiveCompetition] = useState<Competition | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentCompetitions, setRecentCompetitions] = useState<Competition[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Action states
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  
  // Start competition form
  const [showStartModal, setShowStartModal] = useState(false);
  const [competitionName, setCompetitionName] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  
  // Submission modal
  const [selectedCreator, setSelectedCreator] = useState<LeaderboardEntry | null>(null);
  const [creatorSubmissions, setCreatorSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

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

  const getAuthToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  const loadCompetition = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/competitions?type=volume', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch competition');

      const data = await response.json();
      setActiveCompetition(data.activeCompetition);
      setLeaderboard(data.leaderboard);
      setRecentCompetitions(data.recentCompetitions);
      setTimeRemaining(data.timeRemaining);
    } catch (err) {
      console.error('Error loading competition:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadCompetition();
    }
  }, [user, isAdmin]);

  // Countdown timer
  useEffect(() => {
    if (!timeRemaining || timeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (!prev || prev <= 1000) {
          loadCompetition(); // Reload when timer hits 0
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timeRemaining]);

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return 'Ended';
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const handleStart = async () => {
    if (!competitionName.trim()) {
      alert('Please enter a competition name');
      return;
    }
    
    setStarting(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/competitions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'volume',
          name: competitionName.trim(),
          durationDays,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setShowStartModal(false);
      setCompetitionName('');
      await loadCompetition();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start');
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    if (!confirm('Are you sure you want to end this competition early? You can still finalize and pay winners after.')) {
      return;
    }
    
    setEnding(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/competitions', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'volume' }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await loadCompetition();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to end');
    } finally {
      setEnding(false);
    }
  };

  const handleFinalize = async () => {
    if (!activeCompetition) return;
    
    if (!confirm('This will create redemption records for the top 3 winners. Continue?')) {
      return;
    }
    
    setFinalizing(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/competitions/finalize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ competitionId: activeCompetition.id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      alert(`Competition finalized!\n\nWinners:\n${data.winners.map((w: any) => 
        `#${w.rank} ${w.creatorName} - $${w.rewardAmount}`
      ).join('\n')}`);
      
      await loadCompetition();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to finalize');
    } finally {
      setFinalizing(false);
    }
  };

  const loadCreatorSubmissions = async (entry: LeaderboardEntry) => {
    if (!activeCompetition) return;
    
    setSelectedCreator(entry);
    setLoadingSubmissions(true);
    
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `/api/admin/submissions?type=volume&competitionId=${activeCompetition.id}&creatorId=${entry.creatorId}&limit=50`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const data = await response.json();
      setCreatorSubmissions(data.submissions || []);
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: 'text-yellow-400' };
    if (rank === 2) return { emoji: '🥈', color: 'text-gray-300' };
    if (rank === 3) return { emoji: '🥉', color: 'text-orange-400' };
    return { emoji: `#${rank}`, color: 'text-zinc-400' };
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">📊 Volume Competition</h1>
          <p className="text-zinc-400">Manage weekly volume competitions</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={loadCompetition} className="px-4 py-2 bg-orange-500 text-white rounded-lg">
              Retry
            </button>
          </div>
        ) : !activeCompetition || activeCompetition.status === 'finalized' ? (
          /* No Active Competition */
          <div className="space-y-6">
            <div className="p-8 bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/50 text-center">
              <div className="text-5xl mb-4">🏁</div>
              <h2 className="text-xl font-bold text-white mb-2">No Active Competition</h2>
              <p className="text-zinc-400 mb-6">Start a new competition to begin tracking creator submissions</p>
              <button
                onClick={() => setShowStartModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all"
              >
                🚀 Start New Competition
              </button>
            </div>

            {/* Recent Competitions History */}
            {recentCompetitions.length > 0 && (
              <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Competitions</h3>
                <div className="space-y-3">
                  {recentCompetitions.filter(c => c.status === 'finalized').slice(0, 5).map(comp => (
                    <div key={comp.id} className="p-4 bg-zinc-900/50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">{comp.name}</span>
                          <p className="text-zinc-500 text-sm">
                            {formatDate(comp.startedAt)} - {formatDate(comp.endedAt)}
                          </p>
                        </div>
                        {comp.winners?.[0] && (
                          <div className="text-right">
                            <span className="text-yellow-400">🥇 {comp.winners[0].creatorName}</span>
                            <p className="text-zinc-500 text-sm">{comp.winners[0].value} posts</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeCompetition.status === 'active' ? (
          /* Active Competition */
          <div className="space-y-6">
            {/* Status Banner */}
            <div className="p-6 bg-green-500/20 border border-green-500/30 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-green-400 font-semibold">Competition Active</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{activeCompetition.name}</h2>
                  <p className="text-zinc-400 text-sm">
                    Started {activeCompetition.startedAt ? formatDate(activeCompetition.startedAt) : 'Just now'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-400 text-sm">Ends in</p>
                  <p className="text-2xl font-bold text-orange-400 font-mono">
                    {timeRemaining !== null && timeRemaining > 0 
                      ? formatTimeRemaining(timeRemaining) 
                      : activeCompetition.endsAt 
                        ? formatTimeRemaining(new Date(activeCompetition.endsAt).getTime() - Date.now())
                        : 'Calculating...'}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-green-500/20">
                <button
                  onClick={handleEnd}
                  disabled={ending}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors"
                >
                  {ending ? 'Ending...' : '⏹️ End Competition Early'}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                <div className="text-2xl font-bold text-white">{leaderboard.length}</div>
                <div className="text-zinc-400 text-sm">Participants</div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                <div className="text-2xl font-bold text-blue-400">
                  {leaderboard.reduce((sum, e) => sum + e.value, 0)}
                </div>
                <div className="text-zinc-400 text-sm">Total Posts</div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                <div className="text-2xl font-bold text-orange-400">
                  {leaderboard[0]?.value || 0}
                </div>
                <div className="text-zinc-400 text-sm">Top Score</div>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/50 overflow-hidden">
              <div className="p-4 border-b border-zinc-700/50">
                <h3 className="text-lg font-semibold text-white">Current Standings</h3>
              </div>
              {leaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-zinc-400">No submissions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-700/50">
                  {leaderboard.map((entry) => {
                    const { emoji, color } = getRankDisplay(entry.rank);
                    const prize = entry.rank === 1 ? '$25' : entry.rank === 2 ? '$15' : entry.rank === 3 ? '$10' : null;
                    
                    return (
                      <div 
                        key={entry.id}
                        onClick={() => loadCreatorSubmissions(entry)}
                        className={`flex items-center gap-4 p-4 hover:bg-zinc-700/20 transition-colors cursor-pointer ${
                          entry.rank <= 3 ? 'bg-zinc-700/10' : ''
                        }`}
                      >
                        <div className={`w-12 text-center font-bold text-xl ${color}`}>{emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium truncate">{entry.creatorName}</span>
                            {prize && (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                {prize}
                              </span>
                            )}
                          </div>
                          <div className="text-zinc-500 text-sm">@{entry.creatorHandle}</div>
                        </div>
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
          </div>
        ) : activeCompetition.status === 'ended' ? (
          /* Ended - Ready to Finalize */
          <div className="space-y-6">
            <div className="p-6 bg-yellow-500/20 border border-yellow-500/30 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-yellow-400 font-semibold">⏸️ Competition Ended</span>
                  <h2 className="text-xl font-bold text-white">{activeCompetition.name}</h2>
                  <p className="text-zinc-400 text-sm">
                    {formatDate(activeCompetition.startedAt)} - {formatDate(activeCompetition.endedAt)}
                  </p>
                </div>
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-zinc-600 disabled:to-zinc-600 text-white font-semibold rounded-xl transition-all"
                >
                  {finalizing ? 'Finalizing...' : '🏁 Finalize & Pay Winners'}
                </button>
              </div>
            </div>

            {/* Final Standings */}
            <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/50 overflow-hidden">
              <div className="p-4 border-b border-zinc-700/50">
                <h3 className="text-lg font-semibold text-white">Final Standings</h3>
              </div>
              <div className="divide-y divide-zinc-700/50">
                {leaderboard.map((entry) => {
                  const { emoji, color } = getRankDisplay(entry.rank);
                  const prize = entry.rank === 1 ? '$25' : entry.rank === 2 ? '$15' : entry.rank === 3 ? '$10' : null;
                  
                  return (
                    <div 
                      key={entry.id}
                      onClick={() => loadCreatorSubmissions(entry)}
                      className={`flex items-center gap-4 p-4 hover:bg-zinc-700/20 transition-colors cursor-pointer ${
                        entry.rank <= 3 ? 'bg-zinc-700/10' : ''
                      }`}
                    >
                      <div className={`w-12 text-center font-bold text-xl ${color}`}>{emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium truncate">{entry.creatorName}</span>
                          {prize && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                              {prize}
                            </span>
                          )}
                        </div>
                        <div className="text-zinc-500 text-sm">@{entry.creatorHandle}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-lg">{entry.value}</div>
                        <div className="text-zinc-500 text-xs">posts</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Start Competition Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowStartModal(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Start New Competition</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Competition Name</label>
                <input
                  type="text"
                  value={competitionName}
                  onChange={(e) => setCompetitionName(e.target.value)}
                  placeholder="e.g., Week 1 Volume Challenge"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Duration (days)</label>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={5}>5 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowStartModal(false)}
                  className="flex-1 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStart}
                  disabled={starting || !competitionName.trim()}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
                >
                  {starting ? 'Starting...' : 'Start Competition'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Creator Submissions Modal */}
      {selectedCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedCreator(null)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedCreator.creatorName}'s Submissions</h3>
                <p className="text-zinc-400 text-sm">@{selectedCreator.creatorHandle} • {selectedCreator.value} posts</p>
              </div>
              <button onClick={() => setSelectedCreator(null)} className="p-2 text-zinc-400 hover:text-white rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingSubmissions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                </div>
              ) : creatorSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-400">No submissions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {creatorSubmissions.map((sub, i) => (
                    <div key={sub.id} className="p-4 bg-zinc-800/50 rounded-xl">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <span className="text-zinc-400 text-sm">#{i + 1}</span>
                          <a href={sub.tiktokUrl} target="_blank" rel="noopener noreferrer"
                            className="block text-orange-400 hover:text-orange-300 text-sm truncate">
                            {sub.tiktokUrl}
                          </a>
                          <p className="text-zinc-500 text-xs mt-1">
                            {new Date(sub.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <a href={sub.tiktokUrl} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg">
                          Open ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}