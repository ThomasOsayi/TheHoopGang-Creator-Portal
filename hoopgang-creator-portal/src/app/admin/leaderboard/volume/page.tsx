// src/app/admin/leaderboard/volume/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Navbar, 
  AnimatedCounter,
  GlowCard,
  ConfirmModal,
  SuccessAnimation 
} from '@/components/ui';
import { ProtectedRoute } from '@/components/auth';
import { auth } from '@/lib/firebase';
import { Competition, LeaderboardEntry } from '@/types';

// ============================================
// Countdown Timer Component
// ============================================
function CountdownTimer({ endDate }: { endDate: Date | string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endDate).getTime();
      const now = Date.now();
      const difference = end - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  return (
    <div className="flex gap-2">
      {[
        { value: timeLeft.days, label: 'Days' },
        { value: timeLeft.hours, label: 'Hours' },
        { value: timeLeft.minutes, label: 'Min' },
        { value: timeLeft.seconds, label: 'Sec' },
      ].map((unit) => (
        <div key={unit.label} className="text-center">
          <div className="w-14 h-14 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl font-bold text-white border border-zinc-700">
            {String(unit.value).padStart(2, '0')}
          </div>
          <div className="text-zinc-500 text-xs mt-1">{unit.label}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Prize Display Component
// ============================================
interface PrizeDisplayProps {
  prizes: { first: string; second: string; third: string };
}

function PrizeDisplay({ prizes }: PrizeDisplayProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border border-yellow-500/30 p-1">
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />

      <div className="relative bg-zinc-900/80 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl animate-bounce">🏆</span>
          <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400">
            PRIZES UP FOR GRABS!
          </h3>
          <span className="text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>💰</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* 1st Place */}
          <div className="relative group">
            <div className="absolute inset-0 bg-yellow-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100" />
            <div className="relative bg-zinc-800/80 border border-yellow-500/30 rounded-xl p-4 text-center hover:scale-105 transition-transform cursor-default">
              <div className="text-3xl mb-1">🥇</div>
              <div className="text-yellow-400 font-bold text-sm">1st Place</div>
              <div className="text-white font-bold text-lg">{prizes.first}</div>
            </div>
          </div>

          {/* 2nd Place */}
          <div className="relative group">
            <div className="absolute inset-0 bg-zinc-400/20 rounded-xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100" />
            <div className="relative bg-zinc-800/80 border border-zinc-500/30 rounded-xl p-4 text-center hover:scale-105 transition-transform cursor-default">
              <div className="text-3xl mb-1">🥈</div>
              <div className="text-zinc-300 font-bold text-sm">2nd Place</div>
              <div className="text-white font-bold text-lg">{prizes.second}</div>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="relative group">
            <div className="absolute inset-0 bg-amber-700/20 rounded-xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100" />
            <div className="relative bg-zinc-800/80 border border-amber-700/30 rounded-xl p-4 text-center hover:scale-105 transition-transform cursor-default">
              <div className="text-3xl mb-1">🥉</div>
              <div className="text-amber-500 font-bold text-sm">3rd Place</div>
              <div className="text-white font-bold text-lg">{prizes.third}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <span className="text-zinc-400 text-sm">🔥 Post the most content to win! 🔥</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Leaderboard Row Component
// ============================================
interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  onClick: () => void;
}

function LeaderboardRow({ entry, onClick }: LeaderboardRowProps) {
  const rankConfig: Record<number, { bg: string; border: string; text: string; icon: string }> = {
    1: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: '🥇' },
    2: { bg: 'bg-zinc-400/10', border: 'border-zinc-500/30', text: 'text-zinc-300', icon: '🥈' },
    3: { bg: 'bg-amber-700/10', border: 'border-amber-700/30', text: 'text-amber-500', icon: '🥉' },
  };

  const style = rankConfig[entry.rank] || { 
    bg: 'bg-zinc-800/30', 
    border: 'border-zinc-800', 
    text: 'text-zinc-400', 
    icon: '' 
  };

  const isTopThree = entry.rank <= 3;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-xl border ${style.bg} ${style.border} transition-all duration-300 hover:scale-[1.01] cursor-pointer`}
    >
      {/* Rank */}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${style.text} ${isTopThree ? 'text-2xl' : 'bg-zinc-800 text-lg'}`}>
        {style.icon || `#${entry.rank}`}
      </div>

      {/* Creator */}
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold">
          {entry.creatorName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-white font-medium">{entry.creatorName}</div>
          <div className="text-zinc-500 text-sm">@{entry.creatorHandle}</div>
        </div>
      </div>

      {/* Score */}
      <div className={`text-2xl font-bold ${isTopThree ? style.text : 'text-white'}`}>
        {entry.value}
      </div>
      <div className="text-zinc-500 text-sm">posts</div>
    </div>
  );
}

// ============================================
// Past Competition Card with Inline Expansion
// ============================================
interface PastCompetitionCardProps {
  competition: Competition;
  isExpanded: boolean;
  onToggle: () => void;
}

function PastCompetitionCard({ competition, isExpanded, onToggle }: PastCompetitionCardProps) {
  const formatDateRange = (start: Date | string | null, end: Date | string | null) => {
    if (!start || !end) return 'N/A';
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const totalPosts = competition.winners?.reduce((sum, w) => sum + (w.value || 0), 0) || 0;
  const participantCount = competition.leaderboardSnapshot?.length || competition.winners?.length || 0;

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300 hover:border-zinc-700">
      <button
        onClick={onToggle}
        className="w-full p-4 bg-zinc-800/30 text-left hover:bg-zinc-800/50 transition-all flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-white font-medium">{competition.name}</span>
            <span className="text-zinc-500 text-sm">
              {formatDateRange(competition.startedAt, competition.endedAt)}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-400">{participantCount} participants</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">{totalPosts} posts</span>
            {competition.winners?.[0] && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="text-green-400">Winner: @{competition.winners[0].creatorHandle}</span>
              </>
            )}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 animate-scale-in">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{participantCount}</div>
              <div className="text-zinc-500 text-xs">Participants</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-400">{totalPosts}</div>
              <div className="text-zinc-500 text-xs">Total Posts</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-orange-400">{competition.winners?.[0]?.value || 0}</div>
              <div className="text-zinc-500 text-xs">Top Score</div>
            </div>
          </div>

          {/* Final Standings */}
          {competition.winners && competition.winners.length > 0 && (
            <div>
              <h4 className="text-zinc-400 text-sm mb-2">Final Standings</h4>
              <div className="space-y-2">
                {competition.winners.slice(0, 3).map((winner) => {
                  const icons = ['🥇', '🥈', '🥉'];
                  const colors = ['text-yellow-400', 'text-zinc-300', 'text-amber-500'];
                  return (
                    <div key={winner.creatorId} className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded-lg">
                      <span className="text-xl">{icons[winner.rank - 1]}</span>
                      <span className="text-white flex-1">{winner.creatorName}</span>
                      <span className={`font-bold ${colors[winner.rank - 1]}`}>{winner.value} posts</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Tab Button Component
// ============================================
interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

function TabButton({ label, active, onClick, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
        active
          ? 'bg-orange-500 text-white'
          : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          active ? 'bg-white/20' : 'bg-zinc-700'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ============================================
// Main Page Component
// ============================================
export default function VolumeCompetitionAdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data state
  const [activeCompetition, setActiveCompetition] = useState<Competition | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentCompetitions, setRecentCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');
  const [expandedCompId, setExpandedCompId] = useState<string | null>(null);

  // Modal state
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  // Form state
  const [competitionName, setCompetitionName] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [prizes, setPrizes] = useState({ first: '$50 Cash', second: '$25 Credit', third: 'Free Product' });
  const [editPrizes, setEditPrizes] = useState({ first: '', second: '', third: '' });
  const [editName, setEditName] = useState('');

  // Action states
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<{ icon: string; message: string } | null>(null);

  // Creator submissions modal
  const [selectedCreator, setSelectedCreator] = useState<LeaderboardEntry | null>(null);
  const [creatorSubmissions, setCreatorSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // ============================================
  // Auth Check
  // ============================================
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

  // ============================================
  // Data Fetching
  // ============================================
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
      setLeaderboard(data.leaderboard || []);
      setRecentCompetitions(data.recentCompetitions || []);

      // Set edit form defaults
      if (data.activeCompetition) {
        setEditName(data.activeCompetition.name);
        setEditPrizes({
          first: data.activeCompetition.prizes?.first || '$50 Cash',
          second: data.activeCompetition.prizes?.second || '$25 Credit',
          third: data.activeCompetition.prizes?.third || 'Free Product',
        });
      }
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

  // ============================================
  // Actions
  // ============================================
  const handleStart = async () => {
    if (!competitionName.trim()) return;

    setIsStarting(true);
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
          prizes,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setShowStartModal(false);
      setCompetitionName('');
      setSuccessAnimation({ icon: '🚀', message: 'Competition Started!' });
      await loadCompetition();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start');
    } finally {
      setIsStarting(false);
    }
  };

  const handleEnd = async () => {
    setIsEnding(true);
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

      setShowEndModal(false);
      setSuccessAnimation({ icon: '⏹️', message: 'Competition Ended!' });
      await loadCompetition();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to end');
    } finally {
      setIsEnding(false);
    }
  };

  const handleFinalize = async () => {
    if (!activeCompetition) return;

    setIsFinalizing(true);
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

      setShowFinalizeModal(false);
      setSuccessAnimation({ icon: '🎉', message: 'Winners Paid Out!' });
      await loadCompetition();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to finalize');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!activeCompetition) return;

    setIsSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/admin/competitions/${activeCompetition.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName,
          prizes: editPrizes,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setShowEditModal(false);
      setSuccessAnimation({ icon: '✅', message: 'Changes Saved!' });
      await loadCompetition();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
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

  // ============================================
  // Computed Values
  // ============================================
  const stats = useMemo(() => ({
    participants: leaderboard.length,
    totalPosts: leaderboard.reduce((sum, e) => sum + e.value, 0),
    topScore: leaderboard[0]?.value || 0,
  }), [leaderboard]);

  const pastCompetitions = useMemo(() => 
    recentCompetitions.filter(c => c.status === 'finalized'),
    [recentCompetitions]
  );

  const hasActiveCompetition = activeCompetition && 
    (activeCompetition.status === 'active' || activeCompetition.status === 'ended');

  const competitionPrizes = activeCompetition?.prizes || prizes;

  // ============================================
  // Render Loading
  // ============================================
  if (authLoading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="min-h-screen bg-zinc-950">
          <Navbar />
          <div className="flex items-center justify-center h-[80vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // ============================================
  // Main Render
  // ============================================
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        {/* Background Gradient Orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -left-40 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl" />
        </div>

        <Navbar />

        <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 pt-24">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <span>📊</span> Volume Competition
              </h1>
              <p className="text-zinc-400 mt-1">Manage weekly volume competitions</p>
            </div>

            {/* Header Actions */}
            <div className="flex gap-3">
              {hasActiveCompetition ? (
                <>
                  <button
                    onClick={() => {
                      setEditName(activeCompetition?.name || '');
                      setEditPrizes({
                        first: activeCompetition?.prizes?.first || '$50 Cash',
                        second: activeCompetition?.prizes?.second || '$25 Credit',
                        third: activeCompetition?.prizes?.third || 'Free Product',
                      });
                      setShowEditModal(true);
                    }}
                    className="px-4 py-2.5 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2"
                  >
                    <span>✏️</span> Edit
                  </button>
                  <button
                    onClick={() => setShowEndModal(true)}
                    className="px-4 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-medium hover:bg-red-500/30 transition-colors flex items-center gap-2"
                  >
                    <span>⏹</span> End Competition
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowStartModal(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  <span>🚀</span> Start New Competition
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <TabButton
              label="Current Competition"
              active={activeTab === 'current'}
              onClick={() => setActiveTab('current')}
            />
            <TabButton
              label="Past Competitions"
              active={activeTab === 'past'}
              onClick={() => setActiveTab('past')}
              count={pastCompetitions.length}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={loadCompetition}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : activeTab === 'current' ? (
            /* CURRENT COMPETITION TAB */
            <div className="space-y-6">
              {!hasActiveCompetition ? (
                /* No Active Competition State */
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4 animate-bounce">🏁</div>
                    <h2 className="text-2xl font-bold text-white mb-2">No Active Competition</h2>
                    <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                      Start a new volume competition to encourage creators to submit more content and win exciting prizes!
                    </p>
                    <button
                      onClick={() => setShowStartModal(true)}
                      className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all inline-flex items-center gap-2 shadow-lg shadow-orange-500/20"
                    >
                      <span>🚀</span> Start New Competition
                    </button>
                    <p className="text-zinc-500 text-sm mt-4">
                      or view{' '}
                      <button
                        onClick={() => setActiveTab('past')}
                        className="text-orange-400 hover:text-orange-300 underline"
                      >
                        past competitions
                      </button>
                    </p>
                  </div>

                  {/* Recent Competitions Preview */}
                  {pastCompetitions.length > 0 && (
                    <div className="border-t border-zinc-800 pt-6 mt-6">
                      <h3 className="text-zinc-400 text-sm text-center mb-4">Recent Competitions</h3>
                      <div className="flex justify-center gap-4">
                        {pastCompetitions.slice(0, 2).map((comp) => (
                          <div key={comp.id} className="bg-zinc-800/50 rounded-xl px-4 py-3 text-center">
                            <div className="text-white font-medium">{comp.name}</div>
                            <div className="text-zinc-500 text-sm">
                              Winner: @{comp.winners?.[0]?.creatorHandle || 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Active/Ended Competition */
                <>
                  {/* Competition Header Card */}
                  <div className={`rounded-2xl border p-6 ${
                    activeCompetition?.status === 'active'
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h2 className="text-xl font-bold text-white">{activeCompetition?.name}</h2>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            activeCompetition?.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {activeCompetition?.status === 'active' ? '● Active' : '⏸ Ended'}
                          </span>
                        </div>
                        <p className="text-zinc-400 text-sm">
                          {activeCompetition?.status === 'active'
                            ? 'Competition ends automatically at midnight'
                            : 'Ready to finalize and pay winners'}
                        </p>
                      </div>

                      {activeCompetition?.status === 'active' && activeCompetition?.endsAt && (
                        <div className="text-right">
                          <p className="text-zinc-400 text-sm mb-2">Time Remaining</p>
                          <CountdownTimer endDate={activeCompetition.endsAt} />
                        </div>
                      )}

                      {activeCompetition?.status === 'ended' && (
                        <button
                          onClick={() => setShowFinalizeModal(true)}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-green-500/20"
                        >
                          <span>🏁</span> Finalize & Pay Winners
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Prize Display */}
                  <PrizeDisplay prizes={competitionPrizes} />

                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <GlowCard glowColor="purple">
                      <div className="text-3xl font-bold text-purple-400 mb-1">
                        <AnimatedCounter value={stats.participants} />
                      </div>
                      <div className="text-zinc-500 text-sm">Participants</div>
                    </GlowCard>
                    <GlowCard glowColor="blue">
                      <div className="text-3xl font-bold text-blue-400 mb-1">
                        <AnimatedCounter value={stats.totalPosts} />
                      </div>
                      <div className="text-zinc-500 text-sm">Total Posts</div>
                    </GlowCard>
                    <GlowCard glowColor="orange">
                      <div className="text-3xl font-bold text-orange-400 mb-1">
                        <AnimatedCounter value={stats.topScore} />
                      </div>
                      <div className="text-zinc-500 text-sm">Top Score</div>
                    </GlowCard>
                  </div>

                  {/* Leaderboard */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-800">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span>🏆</span> Leaderboard
                      </h3>
                    </div>

                    {leaderboard.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-4xl mb-2">📭</div>
                        <p className="text-zinc-400">No submissions yet</p>
                        <p className="text-zinc-500 text-sm">Creators will appear here when they submit content</p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        {leaderboard.map((entry) => (
                          <LeaderboardRow
                            key={entry.id}
                            entry={entry}
                            onClick={() => loadCreatorSubmissions(entry)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* PAST COMPETITIONS TAB */
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>📜</span> Past Competitions
                </h3>
              </div>

              {pastCompetitions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-2">🏁</div>
                  <p className="text-zinc-400">No past competitions yet</p>
                  <p className="text-zinc-500 text-sm">Completed competitions will appear here</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {pastCompetitions.map((comp) => (
                    <PastCompetitionCard
                      key={comp.id}
                      competition={comp}
                      isExpanded={expandedCompId === comp.id}
                      onToggle={() => setExpandedCompId(expandedCompId === comp.id ? null : comp.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* START COMPETITION MODAL */}
        {showStartModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowStartModal(false)} />
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full animate-scale-in">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🚀</span>
                <h3 className="text-xl font-bold text-white">Start New Competition</h3>
              </div>

              <div className="space-y-5 mb-6">
                {/* Name */}
                <div>
                  <label className="text-zinc-400 text-sm block mb-2">Competition Name</label>
                  <input
                    type="text"
                    value={competitionName}
                    onChange={(e) => setCompetitionName(e.target.value)}
                    placeholder="e.g., Week 51 Volume Challenge"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="text-zinc-400 text-sm block mb-2">Duration</label>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value={3}>3 days</option>
                    <option value={5}>5 days</option>
                    <option value={7}>7 days (1 week)</option>
                    <option value={14}>14 days (2 weeks)</option>
                    <option value={30}>30 days (1 month)</option>
                  </select>
                </div>

                {/* Prizes */}
                <div>
                  <label className="text-zinc-400 text-sm block mb-2">Prizes</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-yellow-400 mb-1 flex items-center gap-1">
                        <span>🥇</span> 1st Place
                      </div>
                      <input
                        type="text"
                        value={prizes.first}
                        onChange={(e) => setPrizes({ ...prizes, first: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-300 mb-1 flex items-center gap-1">
                        <span>🥈</span> 2nd Place
                      </div>
                      <input
                        type="text"
                        value={prizes.second}
                        onChange={(e) => setPrizes({ ...prizes, second: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-500/30 rounded-xl text-white text-sm focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-amber-500 mb-1 flex items-center gap-1">
                        <span>🥉</span> 3rd Place
                      </div>
                      <input
                        type="text"
                        value={prizes.third}
                        onChange={(e) => setPrizes({ ...prizes, third: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-amber-700/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-600 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
                <div className="text-sm text-zinc-400 mb-1">Preview:</div>
                <div className="text-white font-medium">{competitionName || 'Untitled Competition'}</div>
                <div className="text-zinc-500 text-sm">Runs for {durationDays} days starting today</div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStartModal(false)}
                  disabled={isStarting}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStart}
                  disabled={isStarting || !competitionName.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isStarting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <span>🚀</span> Start Competition
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT COMPETITION MODAL */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full animate-scale-in">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">✏️</span>
                <h3 className="text-xl font-bold text-white">Edit Competition</h3>
              </div>

              <div className="space-y-5 mb-6">
                {/* Name */}
                <div>
                  <label className="text-zinc-400 text-sm block mb-2">Competition Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                {/* Prizes */}
                <div>
                  <label className="text-zinc-400 text-sm block mb-2">Prizes</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={editPrizes.first}
                      onChange={(e) => setEditPrizes({ ...editPrizes, first: e.target.value })}
                      className="px-3 py-2 bg-zinc-800 border border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500"
                    />
                    <input
                      type="text"
                      value={editPrizes.second}
                      onChange={(e) => setEditPrizes({ ...editPrizes, second: e.target.value })}
                      className="px-3 py-2 bg-zinc-800 border border-zinc-500/30 rounded-xl text-white text-sm focus:outline-none focus:border-zinc-400"
                    />
                    <input
                      type="text"
                      value={editPrizes.third}
                      onChange={(e) => setEditPrizes({ ...editPrizes, third: e.target.value })}
                      className="px-3 py-2 bg-zinc-800 border border-amber-700/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* END COMPETITION CONFIRMATION */}
        <ConfirmModal
          isOpen={showEndModal}
          onClose={() => setShowEndModal(false)}
          onConfirm={handleEnd}
          title="End Competition Early?"
          message="This will stop the competition and lock the current leaderboard. You can still finalize and pay winners after."
          confirmLabel="End Competition"
          confirmColor="red"
          isProcessing={isEnding}
          icon="⏹️"
        />

        {/* FINALIZE CONFIRMATION */}
        <ConfirmModal
          isOpen={showFinalizeModal}
          onClose={() => setShowFinalizeModal(false)}
          onConfirm={handleFinalize}
          title="Finalize Competition?"
          message={`This will create redemption records for the top 3 winners and mark the competition as complete.`}
          confirmLabel="Finalize & Pay Winners"
          confirmColor="green"
          isProcessing={isFinalizing}
          icon="🏁"
        />

        {/* CREATOR SUBMISSIONS MODAL */}
        {selectedCreator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedCreator(null)} />
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedCreator.creatorName}'s Submissions</h3>
                  <p className="text-zinc-400 text-sm">@{selectedCreator.creatorHandle} • {selectedCreator.value} posts</p>
                </div>
                <button
                  onClick={() => setSelectedCreator(null)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingSubmissions ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
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
                            <a
                              href={sub.tiktokUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-orange-400 hover:text-orange-300 text-sm truncate"
                            >
                              {sub.tiktokUrl}
                            </a>
                            <p className="text-zinc-500 text-xs mt-1">
                              {new Date(sub.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <a
                            href={sub.tiktokUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors"
                          >
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

        {/* Success Animation */}
        {successAnimation !== null && (
          <SuccessAnimation
            icon={successAnimation.icon}
            message={successAnimation.message}
            onComplete={() => setSuccessAnimation(null)}
          />
        )}

        {/* Global Styles for shimmer animation */}
        <style jsx global>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-shimmer {
            animation: shimmer 3s infinite;
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}