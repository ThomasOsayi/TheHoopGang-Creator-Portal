// src/app/admin/leaderboard/volume/page.tsx
// Mobile-Responsive Version

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Navbar, 
  AnimatedCounter,
  GlowCard,
  ConfirmModal,
  SuccessAnimation,
  PageHeader
} from '@/components/ui';
import { ProtectedRoute } from '@/components/auth';
import { auth } from '@/lib/firebase';
import { Competition, LeaderboardEntry } from '@/types';

// ============================================
// Countdown Timer Component - Mobile Optimized
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
    <div className="flex gap-1.5 sm:gap-2">
      {[
        { value: timeLeft.days, label: 'D', fullLabel: 'Days' },
        { value: timeLeft.hours, label: 'H', fullLabel: 'Hours' },
        { value: timeLeft.minutes, label: 'M', fullLabel: 'Min' },
        { value: timeLeft.seconds, label: 'S', fullLabel: 'Sec' },
      ].map((unit) => (
        <div key={unit.fullLabel} className="text-center">
          <div className="w-10 h-10 sm:w-14 sm:h-14 bg-zinc-800 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-2xl font-bold text-white border border-zinc-700">
            {String(unit.value).padStart(2, '0')}
          </div>
          <div className="text-zinc-500 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
            <span className="sm:hidden">{unit.label}</span>
            <span className="hidden sm:inline">{unit.fullLabel}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Prize Display Component - Mobile Optimized
// ============================================
interface PrizeDisplayProps {
  prizes: { first: string; second: string; third: string };
}

function PrizeDisplay({ prizes }: PrizeDisplayProps) {
  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border border-yellow-500/30 p-0.5 sm:p-1">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />

      <div className="relative bg-zinc-900/80 rounded-lg sm:rounded-xl p-3 sm:p-5">
        <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
          <span className="text-xl sm:text-2xl animate-bounce">🏆</span>
          <h3 className="text-sm sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400">
            PRIZES UP FOR GRABS!
          </h3>
          <span className="text-xl sm:text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>💰</span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* 1st Place */}
          <div className="relative group">
            <div className="relative bg-zinc-800/80 border border-yellow-500/30 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center hover:scale-105 transition-transform cursor-default">
              <div className="text-2xl sm:text-3xl mb-0.5 sm:mb-1">🥇</div>
              <div className="text-yellow-400 font-bold text-[10px] sm:text-sm">1st Place</div>
              <div className="text-white font-bold text-xs sm:text-lg truncate">{prizes.first}</div>
            </div>
          </div>

          {/* 2nd Place */}
          <div className="relative group">
            <div className="relative bg-zinc-800/80 border border-zinc-500/30 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center hover:scale-105 transition-transform cursor-default">
              <div className="text-2xl sm:text-3xl mb-0.5 sm:mb-1">🥈</div>
              <div className="text-zinc-300 font-bold text-[10px] sm:text-sm">2nd Place</div>
              <div className="text-white font-bold text-xs sm:text-lg truncate">{prizes.second}</div>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="relative group">
            <div className="relative bg-zinc-800/80 border border-amber-700/30 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center hover:scale-105 transition-transform cursor-default">
              <div className="text-2xl sm:text-3xl mb-0.5 sm:mb-1">🥉</div>
              <div className="text-amber-500 font-bold text-[10px] sm:text-sm">3rd Place</div>
              <div className="text-white font-bold text-xs sm:text-lg truncate">{prizes.third}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 text-center">
          <span className="text-zinc-400 text-xs sm:text-sm">🔥 Post the most content to win! 🔥</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Leaderboard Row Component - Mobile Optimized
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
      className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border ${style.bg} ${style.border} transition-all duration-300 hover:scale-[1.01] cursor-pointer active:scale-[0.99]`}
    >
      {/* Rank */}
      <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold ${style.text} ${isTopThree ? 'text-xl sm:text-2xl' : 'bg-zinc-800 text-sm sm:text-lg'}`}>
        {style.icon || `#${entry.rank}`}
      </div>

      {/* Creator */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
          {entry.creatorName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-white font-medium text-sm sm:text-base truncate">{entry.creatorName}</div>
          <div className="text-zinc-500 text-xs sm:text-sm truncate">@{entry.creatorHandle}</div>
        </div>
      </div>

      {/* Score */}
      <div className="text-right flex-shrink-0">
        <div className={`text-lg sm:text-2xl font-bold ${isTopThree ? style.text : 'text-white'}`}>
          {entry.value}
        </div>
        <div className="text-zinc-500 text-[10px] sm:text-sm">posts</div>
      </div>
    </div>
  );
}

// ============================================
// Past Competition Card - Mobile Optimized
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
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const totalPosts = competition.winners?.reduce((sum, w) => sum + (w.value || 0), 0) || 0;
  const participantCount = competition.leaderboardSnapshot?.length || competition.winners?.length || 0;

  return (
    <div className="border border-zinc-800 rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 hover:border-zinc-700">
      <button
        onClick={onToggle}
        className="w-full p-3 sm:p-4 bg-zinc-800/30 text-left hover:bg-zinc-800/50 transition-all flex items-center justify-between gap-2 active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
            <span className="text-white font-medium text-sm sm:text-base truncate">{competition.name}</span>
            <span className="text-zinc-500 text-xs sm:text-sm hidden xs:inline">
              {formatDateRange(competition.startedAt, competition.endedAt)}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
            <span className="text-zinc-400">{participantCount} <span className="hidden xs:inline">participants</span></span>
            <span className="text-zinc-600 hidden xs:inline">•</span>
            <span className="text-zinc-400">{totalPosts} posts</span>
            {competition.winners?.[0] && (
              <>
                <span className="text-zinc-600 hidden sm:inline">•</span>
                <span className="text-green-400 hidden sm:inline">Winner: @{competition.winners[0].creatorHandle}</span>
              </>
            )}
          </div>
        </div>
        <svg
          className={`w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-900/50 animate-scale-in">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="bg-zinc-800/50 rounded-lg p-2 sm:p-3 text-center">
              <div className="text-base sm:text-lg font-bold text-white">{participantCount}</div>
              <div className="text-zinc-500 text-[10px] sm:text-xs">Participants</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2 sm:p-3 text-center">
              <div className="text-base sm:text-lg font-bold text-blue-400">{totalPosts}</div>
              <div className="text-zinc-500 text-[10px] sm:text-xs">Total Posts</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2 sm:p-3 text-center">
              <div className="text-base sm:text-lg font-bold text-orange-400">{competition.winners?.[0]?.value || 0}</div>
              <div className="text-zinc-500 text-[10px] sm:text-xs">Top Score</div>
            </div>
          </div>

          {/* Final Standings */}
          {competition.winners && competition.winners.length > 0 && (
            <div>
              <h4 className="text-zinc-400 text-xs sm:text-sm mb-2">Final Standings</h4>
              <div className="space-y-1.5 sm:space-y-2">
                {competition.winners.slice(0, 3).map((winner) => {
                  const icons = ['🥇', '🥈', '🥉'];
                  const colors = ['text-yellow-400', 'text-zinc-300', 'text-amber-500'];
                  return (
                    <div key={winner.creatorId} className="flex items-center gap-2 sm:gap-3 p-2 bg-zinc-800/30 rounded-lg">
                      <span className="text-lg sm:text-xl">{icons[winner.rank - 1]}</span>
                      <span className="text-white flex-1 text-sm sm:text-base truncate">{winner.creatorName}</span>
                      <span className={`font-bold text-xs sm:text-sm ${colors[winner.rank - 1]}`}>{winner.value} posts</span>
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
// Tab Button Component - Mobile Optimized
// ============================================
interface TabButtonProps {
  label: string;
  shortLabel?: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

function TabButton({ label, shortLabel, active, onClick, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base active:scale-[0.98] ${
        active
          ? 'bg-orange-500 text-white'
          : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800'
      }`}
    >
      <span className="sm:hidden">{shortLabel || label}</span>
      <span className="hidden sm:inline">{label}</span>
      {count !== undefined && (
        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
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
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-orange-500" />
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
          <div className="absolute -top-40 -right-40 w-64 sm:w-96 h-64 sm:h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -left-40 w-56 sm:w-80 h-56 sm:h-80 bg-yellow-500/5 rounded-full blur-3xl" />
        </div>

        <Navbar />

        <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 sm:pt-24">
          {/* Header - Stack on mobile */}
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <PageHeader 
              title="Volume Competition"
              subtitle="Manage volume-based competitions"
              icon="📊"
              accentColor="orange"
              align="left"
            />

            {/* Header Actions */}
            <div className="flex gap-2 sm:gap-3 flex-wrap">
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
                    className="px-3 sm:px-4 py-2 sm:py-2.5 bg-zinc-800 text-white rounded-lg sm:rounded-xl font-medium hover:bg-zinc-700 transition-colors flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base active:scale-[0.98]"
                  >
                    <span>✏️</span> Edit
                  </button>
                  <button
                    onClick={() => setShowEndModal(true)}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg sm:rounded-xl font-medium hover:bg-red-500/30 transition-colors flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base active:scale-[0.98]"
                  >
                    <span>⏹</span> <span className="hidden xs:inline">End</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowStartModal(true)}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg sm:rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-orange-500/20 text-sm sm:text-base active:scale-[0.98]"
                >
                  <span>🚀</span> <span className="hidden xs:inline">Start New</span><span className="xs:hidden">Start</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 sm:mb-6">
            <TabButton
              label="Current Competition"
              shortLabel="Current"
              active={activeTab === 'current'}
              onClick={() => setActiveTab('current')}
            />
            <TabButton
              label="Past Competitions"
              shortLabel="Past"
              active={activeTab === 'past'}
              onClick={() => setActiveTab('past')}
              count={pastCompetitions.length}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 sm:py-16">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-orange-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12 sm:py-16">
              <p className="text-red-400 mb-4 text-sm sm:text-base">{error}</p>
              <button
                onClick={loadCompetition}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm sm:text-base active:scale-[0.98]"
              >
                Retry
              </button>
            </div>
          ) : activeTab === 'current' ? (
            /* CURRENT COMPETITION TAB */
            <div className="space-y-4 sm:space-y-6">
              {!hasActiveCompetition ? (
                /* No Active Competition State */
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-8">
                  <div className="text-center py-6 sm:py-8">
                    <div className="text-5xl sm:text-6xl mb-3 sm:mb-4 animate-bounce">🏁</div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">No Active Competition</h2>
                    <p className="text-zinc-400 text-sm sm:text-base mb-4 sm:mb-6 max-w-md mx-auto">
                      Start a new volume competition to encourage creators to submit more content!
                    </p>
                    <button
                      onClick={() => setShowStartModal(true)}
                      className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg sm:rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all inline-flex items-center gap-2 shadow-lg shadow-orange-500/20 text-sm sm:text-base active:scale-[0.98]"
                    >
                      <span>🚀</span> Start New Competition
                    </button>
                    <p className="text-zinc-500 text-xs sm:text-sm mt-4">
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
                    <div className="border-t border-zinc-800 pt-4 sm:pt-6 mt-4 sm:mt-6">
                      <h3 className="text-zinc-400 text-xs sm:text-sm text-center mb-3 sm:mb-4">Recent Competitions</h3>
                      <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                        {pastCompetitions.slice(0, 2).map((comp) => (
                          <div key={comp.id} className="bg-zinc-800/50 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-center">
                            <div className="text-white font-medium text-sm sm:text-base">{comp.name}</div>
                            <div className="text-zinc-500 text-xs sm:text-sm">
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
                  <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 ${
                    activeCompetition?.status === 'active'
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
                            <h2 className="text-lg sm:text-xl font-bold text-white truncate">{activeCompetition?.name}</h2>
                            <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ${
                              activeCompetition?.status === 'active'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {activeCompetition?.status === 'active' ? '● Active' : '⏸ Ended'}
                            </span>
                          </div>
                          <p className="text-zinc-400 text-xs sm:text-sm">
                            {activeCompetition?.status === 'active'
                              ? 'Competition ends automatically at midnight'
                              : 'Ready to finalize and pay winners'}
                          </p>
                        </div>
                      </div>

                      {activeCompetition?.status === 'active' && activeCompetition?.endsAt && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <p className="text-zinc-400 text-xs sm:text-sm">Time Remaining</p>
                          <CountdownTimer endDate={activeCompetition.endsAt} />
                        </div>
                      )}

                      {activeCompetition?.status === 'ended' && (
                        <button
                          onClick={() => setShowFinalizeModal(true)}
                          className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 text-sm sm:text-base active:scale-[0.98]"
                        >
                          <span>🏁</span> Finalize & Pay Winners
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Prize Display */}
                  <PrizeDisplay prizes={competitionPrizes} />

                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <GlowCard glowColor="purple">
                      <div className="text-xl sm:text-3xl font-bold text-purple-400 mb-0.5 sm:mb-1">
                        <AnimatedCounter value={stats.participants} />
                      </div>
                      <div className="text-zinc-500 text-[10px] sm:text-sm">Participants</div>
                    </GlowCard>
                    <GlowCard glowColor="blue">
                      <div className="text-xl sm:text-3xl font-bold text-blue-400 mb-0.5 sm:mb-1">
                        <AnimatedCounter value={stats.totalPosts} />
                      </div>
                      <div className="text-zinc-500 text-[10px] sm:text-sm">Total Posts</div>
                    </GlowCard>
                    <GlowCard glowColor="orange">
                      <div className="text-xl sm:text-3xl font-bold text-orange-400 mb-0.5 sm:mb-1">
                        <AnimatedCounter value={stats.topScore} />
                      </div>
                      <div className="text-zinc-500 text-[10px] sm:text-sm">Top Score</div>
                    </GlowCard>
                  </div>

                  {/* Leaderboard */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden">
                    <div className="p-3 sm:p-4 border-b border-zinc-800">
                      <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                        <span>🏆</span> Leaderboard
                      </h3>
                    </div>

                    {leaderboard.length === 0 ? (
                      <div className="text-center py-10 sm:py-12">
                        <div className="text-3xl sm:text-4xl mb-2">📭</div>
                        <p className="text-zinc-400 text-sm sm:text-base">No submissions yet</p>
                        <p className="text-zinc-500 text-xs sm:text-sm">Creators will appear here when they submit content</p>
                      </div>
                    ) : (
                      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
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
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-zinc-800">
                <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <span>📜</span> Past Competitions
                </h3>
              </div>

              {pastCompetitions.length === 0 ? (
                <div className="text-center py-10 sm:py-12">
                  <div className="text-3xl sm:text-4xl mb-2">🏁</div>
                  <p className="text-zinc-400 text-sm sm:text-base">No past competitions yet</p>
                  <p className="text-zinc-500 text-xs sm:text-sm">Completed competitions will appear here</p>
                </div>
              ) : (
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
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

        {/* START COMPETITION MODAL - Mobile Optimized */}
        {showStartModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowStartModal(false)} />
            <div className="relative bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full sm:max-w-lg sm:mx-4 max-h-[90vh] overflow-y-auto animate-scale-in safe-bottom">
              <div className="sm:hidden w-12 h-1 bg-zinc-600 rounded-full mx-auto mb-4" />
              
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <span className="text-2xl sm:text-3xl">🚀</span>
                <h3 className="text-lg sm:text-xl font-bold text-white">Start New Competition</h3>
              </div>

              <div className="space-y-4 sm:space-y-5 mb-4 sm:mb-6">
                {/* Name */}
                <div>
                  <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">Competition Name</label>
                  <input
                    type="text"
                    value={competitionName}
                    onChange={(e) => setCompetitionName(e.target.value)}
                    placeholder="e.g., Week 51 Volume Challenge"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">Duration</label>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
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
                  <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">Prizes</label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div>
                      <div className="text-[10px] sm:text-xs text-yellow-400 mb-1 flex items-center gap-1">
                        <span>🥇</span> <span className="hidden xs:inline">1st</span>
                      </div>
                      <input
                        type="text"
                        value={prizes.first}
                        onChange={(e) => setPrizes({ ...prizes, first: e.target.value })}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 border border-yellow-500/30 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-yellow-500 transition-colors"
                      />
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-xs text-zinc-300 mb-1 flex items-center gap-1">
                        <span>🥈</span> <span className="hidden xs:inline">2nd</span>
                      </div>
                      <input
                        type="text"
                        value={prizes.second}
                        onChange={(e) => setPrizes({ ...prizes, second: e.target.value })}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 border border-zinc-500/30 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-xs text-amber-500 mb-1 flex items-center gap-1">
                        <span>🥉</span> <span className="hidden xs:inline">3rd</span>
                      </div>
                      <input
                        type="text"
                        value={prizes.third}
                        onChange={(e) => setPrizes({ ...prizes, third: e.target.value })}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 border border-amber-700/30 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-600 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-zinc-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="text-xs sm:text-sm text-zinc-400 mb-0.5 sm:mb-1">Preview:</div>
                <div className="text-white font-medium text-sm sm:text-base">{competitionName || 'Untitled Competition'}</div>
                <div className="text-zinc-500 text-xs sm:text-sm">Runs for {durationDays} days starting today</div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStartModal(false)}
                  disabled={isStarting}
                  className="flex-1 py-2.5 sm:py-3 bg-zinc-800 text-zinc-300 rounded-lg sm:rounded-xl font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50 text-sm active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStart}
                  disabled={isStarting || !competitionName.trim()}
                  className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
                >
                  {isStarting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>🚀</span> Start
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT COMPETITION MODAL - Mobile Optimized */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
            <div className="relative bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full sm:max-w-lg sm:mx-4 animate-scale-in safe-bottom">
              <div className="sm:hidden w-12 h-1 bg-zinc-600 rounded-full mx-auto mb-4" />
              
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <span className="text-2xl sm:text-3xl">✏️</span>
                <h3 className="text-lg sm:text-xl font-bold text-white">Edit Competition</h3>
              </div>

              <div className="space-y-4 sm:space-y-5 mb-4 sm:mb-6">
                {/* Name */}
                <div>
                  <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">Competition Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-800 border border-zinc-700 rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                {/* Prizes */}
                <div>
                  <label className="text-zinc-400 text-xs sm:text-sm block mb-1.5 sm:mb-2">Prizes</label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <input
                      type="text"
                      value={editPrizes.first}
                      onChange={(e) => setEditPrizes({ ...editPrizes, first: e.target.value })}
                      placeholder="1st"
                      className="px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 border border-yellow-500/30 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-yellow-500"
                    />
                    <input
                      type="text"
                      value={editPrizes.second}
                      onChange={(e) => setEditPrizes({ ...editPrizes, second: e.target.value })}
                      placeholder="2nd"
                      className="px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 border border-zinc-500/30 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-zinc-400"
                    />
                    <input
                      type="text"
                      value={editPrizes.third}
                      onChange={(e) => setEditPrizes({ ...editPrizes, third: e.target.value })}
                      placeholder="3rd"
                      className="px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 border border-amber-700/30 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 sm:py-3 bg-zinc-800 text-zinc-300 rounded-lg sm:rounded-xl font-medium hover:bg-zinc-700 transition-colors text-sm active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex-1 py-2.5 sm:py-3 bg-orange-500 text-white rounded-lg sm:rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
                >
                  {isSaving ? 'Saving...' : 'Save'}
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
          message="This will stop the competition and lock the current leaderboard."
          confirmLabel="End"
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
          message="This will create redemptions for top 3 winners."
          confirmLabel="Finalize"
          confirmColor="green"
          isProcessing={isFinalizing}
          icon="🏁"
        />

        {/* CREATOR SUBMISSIONS MODAL - Mobile Optimized */}
        {selectedCreator && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedCreator(null)} />
            <div className="relative bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full sm:max-w-2xl sm:mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-scale-in safe-bottom">
              <div className="sm:hidden w-12 h-1 bg-zinc-600 rounded-full mx-auto mb-4" />
              
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white truncate">{selectedCreator.creatorName}'s Submissions</h3>
                  <p className="text-zinc-400 text-xs sm:text-sm">@{selectedCreator.creatorHandle} • {selectedCreator.value} posts</p>
                </div>
                <button
                  onClick={() => setSelectedCreator(null)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingSubmissions ? (
                  <div className="flex items-center justify-center py-10 sm:py-12">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-t-2 border-b-2 border-orange-500" />
                  </div>
                ) : creatorSubmissions.length === 0 ? (
                  <div className="text-center py-10 sm:py-12">
                    <p className="text-zinc-400 text-sm">No submissions found</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {creatorSubmissions.map((sub, i) => (
                      <div key={sub.id} className="p-3 sm:p-4 bg-zinc-800/50 rounded-lg sm:rounded-xl">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-zinc-400 text-xs sm:text-sm">#{i + 1}</span>
                            <a
                              href={sub.tiktokUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-orange-400 hover:text-orange-300 text-xs sm:text-sm truncate"
                            >
                              {sub.tiktokUrl}
                            </a>
                            <p className="text-zinc-500 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                              {new Date(sub.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <a
                            href={sub.tiktokUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs sm:text-sm rounded-lg transition-colors flex-shrink-0"
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

        {/* Global Styles */}
        <style jsx global>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-shimmer {
            animation: shimmer 3s infinite;
          }
          .safe-bottom {
            padding-bottom: max(1rem, env(safe-area-inset-bottom));
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}