// src/app/admin/leaderboard/gmv/page.tsx
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
import { LeaderboardEntry } from '@/types';
import { getCurrentMonth, getPreviousMonths } from '@/lib/week-utils';

// ============================================
// GMV Prize Display Component (Green Theme)
// ============================================
interface GMVPrizeDisplayProps {
  prizes: { first: string; second: string; third: string };
}

function GMVPrizeDisplay({ prizes }: GMVPrizeDisplayProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 border border-green-500/30 p-1">
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />

      <div className="relative bg-zinc-900/80 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl animate-bounce">💸</span>
          <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400">
            TOP SELLER REWARDS!
          </h3>
          <span className="text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>🛒</span>
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
          <span className="text-zinc-400 text-sm">💰 Drive the most sales to win! 💰</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// GMV Leaderboard Row Component
// ============================================
interface GMVLeaderboardRowProps {
  entry: LeaderboardEntry & { orders?: number };
  onEdit: () => void;
  onDelete: () => void;
}

function GMVLeaderboardRow({ entry, onEdit, onDelete }: GMVLeaderboardRowProps) {
  const [isHovered, setIsHovered] = useState(false);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border ${style.bg} ${style.border} transition-all duration-300 hover:scale-[1.01]`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Rank */}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${style.text} ${isTopThree ? 'text-2xl' : 'bg-zinc-800 text-lg'}`}>
        {style.icon || entry.rank}
      </div>

      {/* Creator */}
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
          {entry.creatorName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-white font-medium">{entry.creatorName}</div>
          <div className="text-zinc-500 text-sm">@{entry.creatorHandle}</div>
        </div>
      </div>

      {/* GMV & Orders */}
      <div className="text-right">
        <div className={`text-2xl font-bold ${isTopThree ? 'text-green-400' : 'text-white'}`}>
          {formatCurrency(entry.value)}
        </div>
        {entry.orders !== undefined && (
          <div className="text-zinc-500 text-sm">{entry.orders} orders</div>
        )}
      </div>

      {/* Action buttons on hover */}
      <div className={`flex gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================
// Past Month Card with Inline Expansion
// ============================================
interface PastMonthData {
  period: string;
  name: string;
  totalGMV: number;
  totalOrders: number;
  participants: number;
  winner?: string;
  leaderboard: Array<{ handle: string; gmv: number }>;
}

interface PastMonthCardProps {
  month: PastMonthData;
  isExpanded: boolean;
  onToggle: () => void;
}

function PastMonthCard({ month, isExpanded, onToggle }: PastMonthCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300 hover:border-zinc-700">
      <button
        onClick={onToggle}
        className="w-full p-4 bg-zinc-800/30 text-left hover:bg-zinc-800/50 transition-all flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-white font-medium">{month.name}</span>
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
              {formatCurrency(month.totalGMV)}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-400">{month.participants} creators</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">{month.totalOrders} orders</span>
            {month.winner && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="text-green-400">Winner: @{month.winner}</span>
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
          {/* Final Standings */}
          {month.leaderboard.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-zinc-400 mb-3">Final Standings</h4>
              <div className="space-y-2">
                {month.leaderboard.slice(0, 3).map((entry, index) => {
                  const icons = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={entry.handle} className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg">
                      <span className="text-lg">{icons[index]}</span>
                      <span className="text-white flex-1">@{entry.handle}</span>
                      <span className="text-green-400 font-medium">{formatCurrency(entry.gmv)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
              <div className="text-lg font-bold text-blue-400">{month.participants}</div>
              <div className="text-zinc-500 text-xs">Creators</div>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
              <div className="text-lg font-bold text-purple-400">{month.totalOrders}</div>
              <div className="text-zinc-500 text-xs">Orders</div>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
              <div className="text-lg font-bold text-green-400">{formatCurrency(month.totalGMV)}</div>
              <div className="text-zinc-500 text-xs">Total GMV</div>
            </div>
          </div>
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
          ? 'bg-green-500 text-white'
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
export default function GMVLeaderboardAdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data state
  const [entries, setEntries] = useState<(LeaderboardEntry & { orders?: number })[]>([]);
  const [pastMonthsData, setPastMonthsData] = useState<PastMonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab & period state
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [expandedMonthId, setExpandedMonthId] = useState<string | null>(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LeaderboardEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<LeaderboardEntry | null>(null);

  // Form state
  const [formCreatorId, setFormCreatorId] = useState('');
  const [formGmvAmount, setFormGmvAmount] = useState('');
  const [formOrders, setFormOrders] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Bulk import state
  const [bulkText, setBulkText] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  // Action states
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<{ icon: string; message: string } | null>(null);

  // Prizes (can be made configurable later)
  const prizes = { first: '$100 Cash', second: '$50 Credit', third: 'Free Product' };

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

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/admin/leaderboard/gmv?period=${selectedMonth}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch leaderboard');

      const data = await response.json();
      setEntries(data.entries || []);
      setAvailableMonths(data.availableMonths || getPreviousMonths(6));

      // Load past months data for the Past tab
      await loadPastMonthsData(token);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const loadPastMonthsData = async (token: string) => {
    try {
      const months = getPreviousMonths(6).slice(1); // Skip current month
      const pastData: PastMonthData[] = [];

      for (const month of months.slice(0, 3)) { // Load last 3 months
        const response = await fetch(`/api/admin/leaderboard/gmv?period=${month}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.entries && data.entries.length > 0) {
            const monthDate = new Date(month + '-01');
            pastData.push({
              period: month,
              name: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              totalGMV: data.entries.reduce((sum: number, e: any) => sum + e.value, 0),
              totalOrders: data.entries.reduce((sum: number, e: any) => sum + (e.orders || 0), 0),
              participants: data.entries.length,
              winner: data.entries[0]?.creatorHandle,
              leaderboard: data.entries.slice(0, 3).map((e: any) => ({
                handle: e.creatorHandle,
                gmv: e.value,
              })),
            });
          }
        }
      }

      setPastMonthsData(pastData);
    } catch (err) {
      console.error('Error loading past months:', err);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadLeaderboard();
    }
  }, [user, isAdmin, selectedMonth]);

  // ============================================
  // Handlers
  // ============================================
  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCreatorId.trim() || !formGmvAmount) return;

    setFormSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/leaderboard/gmv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId: formCreatorId.trim(),
          gmvAmount: parseFloat(formGmvAmount),
          orders: formOrders ? parseInt(formOrders) : undefined,
          period: selectedMonth,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save');

      closeAddModal();
      setSuccessAnimation({ icon: '💰', message: editingEntry ? 'Entry Updated!' : 'Entry Added!' });
      await loadLeaderboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;

    setIsDeleting(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `/api/admin/leaderboard/gmv?entryId=${deletingEntry.id}&period=${selectedMonth}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to delete');

      setShowDeleteModal(false);
      setDeletingEntry(null);
      setSuccessAnimation({ icon: '🗑️', message: 'Entry Deleted!' });
      await loadLeaderboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    setBulkSubmitting(true);
    setBulkResults(null);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      // Parse bulk text (format: handle, amount per line)
      const lines = bulkText.trim().split('\n');
      const parsedEntries = lines.map(line => {
        const parts = line.split(/[,\t]+/).map(p => p.trim());
        return {
          handle: parts[0],
          gmvAmount: parts[1],
        };
      }).filter(e => e.handle && e.gmvAmount);

      const response = await fetch('/api/admin/leaderboard/gmv/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: parsedEntries,
          period: selectedMonth,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Bulk import failed');

      setBulkResults(data.results);
      if (data.results.success > 0) {
        await loadLeaderboard();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bulk import failed');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/leaderboard/gmv/finalize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period: selectedMonth }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to finalize');

      setShowFinalizeModal(false);
      setSuccessAnimation({ icon: '🎉', message: 'Month Finalized!' });
      await loadLeaderboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to finalize');
    } finally {
      setIsFinalizing(false);
    }
  };

  const openEditModal = (entry: LeaderboardEntry) => {
    setEditingEntry(entry);
    setFormCreatorId(entry.creatorId);
    setFormGmvAmount(entry.value.toString());
    setFormOrders((entry as any).orders?.toString() || '');
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingEntry(null);
    setFormCreatorId('');
    setFormGmvAmount('');
    setFormOrders('');
  };

  // ============================================
  // Computed Values
  // ============================================
  const stats = useMemo(() => ({
    totalGMV: entries.reduce((sum, e) => sum + e.value, 0),
    totalOrders: entries.reduce((sum, e) => sum + ((e as any).orders || 0), 0),
    participants: entries.length,
  }), [entries]);

  const isCurrentMonth = selectedMonth === getCurrentMonth();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Generate month options for dropdown
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({
        value,
        label: i === 0 ? `${label} (Current)` : label,
      });
    }
    return options;
  }, []);

  // ============================================
  // Render Loading
  // ============================================
  if (authLoading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="min-h-screen bg-zinc-950">
          <Navbar />
          <div className="flex items-center justify-center h-[80vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
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
        {/* Background Gradient Orbs (Green theme) */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -left-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <Navbar />

        <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 pt-24">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <PageHeader 
              title="GMV Competition"
              subtitle="Manage GMV-based competitions"
              icon="💰"
              accentColor="green"
              align="left"
            />

            {/* Header Actions (only show when on Current tab with data) */}
            {activeTab === 'current' && entries.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFinalizeModal(true)}
                  className="px-4 py-2.5 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2"
                >
                  <span>✓</span> Finalize Month
                </button>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-4 py-2.5 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2"
                >
                  <span>↑</span> Bulk Import
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-green-500/20"
                >
                  <span>+</span> Add Entry
                </button>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <TabButton
              label="Current Month"
              active={activeTab === 'current'}
              onClick={() => setActiveTab('current')}
            />
            <TabButton
              label="Past Months"
              active={activeTab === 'past'}
              onClick={() => setActiveTab('past')}
              count={pastMonthsData.length}
            />
          </div>

          {activeTab === 'current' && (
            <>
              {/* Month Selector */}
              <div className="flex items-center gap-4 mb-6">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500 transition-colors"
                >
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="text-zinc-500 text-sm">
                  Gross Merchandise Value from creator-driven sales
                </span>
              </div>
            </>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={loadLeaderboard}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : activeTab === 'current' ? (
            /* CURRENT MONTH TAB */
            <div className="space-y-6">
              {entries.length === 0 ? (
                /* No Data State */
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📊</div>
                    <h2 className="text-2xl font-bold text-white mb-2">No GMV Data Yet</h2>
                    <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                      Add creator sales data to track performance and reward top sellers this month!
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all inline-flex items-center gap-2 shadow-lg shadow-green-500/20"
                      >
                        <span>+</span> Add First Entry
                      </button>
                      <button
                        onClick={() => setShowBulkModal(true)}
                        className="px-6 py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors inline-flex items-center gap-2"
                      >
                        <span>↑</span> Bulk Import
                      </button>
                    </div>
                    <p className="text-zinc-500 text-sm mt-4">
                      or view{' '}
                      <button
                        onClick={() => setActiveTab('past')}
                        className="text-green-400 hover:text-green-300 underline"
                      >
                        past months
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                /* Has Data */
                <>
                  {/* Prize Display */}
                  <GMVPrizeDisplay prizes={prizes} />

                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <GlowCard glowColor="green">
                      <div className="text-3xl font-bold text-green-400 mb-1">
                        {formatCurrency(stats.totalGMV)}
                      </div>
                      <div className="text-zinc-500 text-sm">Total GMV</div>
                    </GlowCard>
                    <GlowCard glowColor="purple">
                      <div className="text-3xl font-bold text-purple-400 mb-1">
                        <AnimatedCounter value={stats.totalOrders} />
                      </div>
                      <div className="text-zinc-500 text-sm">Total Orders</div>
                    </GlowCard>
                    <GlowCard glowColor="blue">
                      <div className="text-3xl font-bold text-blue-400 mb-1">
                        <AnimatedCounter value={stats.participants} />
                      </div>
                      <div className="text-zinc-500 text-sm">Creators</div>
                    </GlowCard>
                  </div>

                  {/* Leaderboard */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span>🏆</span> Leaderboard
                      </h3>
                      <span className="text-zinc-500 text-sm">Hover rows to edit/delete</span>
                    </div>

                    <div className="p-4 space-y-3">
                      {entries.map((entry) => (
                        <GMVLeaderboardRow
                          key={entry.id}
                          entry={entry}
                          onEdit={() => openEditModal(entry)}
                          onDelete={() => {
                            setDeletingEntry(entry);
                            setShowDeleteModal(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* PAST MONTHS TAB */
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>📜</span> Past Months
                </h3>
              </div>

              {pastMonthsData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-zinc-400">No past month data yet</p>
                  <p className="text-zinc-500 text-sm">Completed months will appear here</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {pastMonthsData.map((month) => (
                    <PastMonthCard
                      key={month.period}
                      month={month}
                      isExpanded={expandedMonthId === month.period}
                      onToggle={() => setExpandedMonthId(expandedMonthId === month.period ? null : month.period)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* ADD/EDIT MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeAddModal} />
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full animate-scale-in">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{editingEntry ? '✏️' : '➕'}</span>
                <h3 className="text-xl font-bold text-white">
                  {editingEntry ? 'Edit GMV Entry' : 'Add GMV Entry'}
                </h3>
              </div>

              <form onSubmit={handleAddOrEdit} className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Creator ID or Handle</label>
                  <input
                    type="text"
                    value={formCreatorId}
                    onChange={(e) => setFormCreatorId(e.target.value)}
                    placeholder="e.g., @dKjumps or CRT-2024-001"
                    disabled={!!editingEntry}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm mb-2">GMV Amount ($)</label>
                  <input
                    type="number"
                    value={formGmvAmount}
                    onChange={(e) => setFormGmvAmount(e.target.value)}
                    placeholder="e.g., 2450"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Orders (optional)</label>
                  <input
                    type="number"
                    value={formOrders}
                    onChange={(e) => setFormOrders(e.target.value)}
                    placeholder="e.g., 23"
                    min="0"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting || !formCreatorId.trim() || !formGmvAmount}
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {formSubmitting ? 'Saving...' : 'Save Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* BULK IMPORT MODAL */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !bulkSubmitting && setShowBulkModal(false)} />
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📋</span>
                <h3 className="text-xl font-bold text-white">Bulk Import</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                Paste data from Euka export. Format: one entry per line, handle and amount separated by comma or tab.
              </p>

              <form onSubmit={handleBulkImport} className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Data (handle, amount)</label>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`@creator1, 1500\n@creator2, 890\n@creator3, 450`}
                    rows={8}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 transition-colors font-mono text-sm resize-none"
                  />
                </div>

                {bulkResults && (
                  <div className={`p-3 rounded-lg ${
                    bulkResults.failed > 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-green-500/20 border border-green-500/30'
                  }`}>
                    <p className={bulkResults.failed > 0 ? 'text-yellow-400' : 'text-green-400'}>
                      ✓ {bulkResults.success} imported, {bulkResults.failed} failed
                    </p>
                    {bulkResults.errors.length > 0 && (
                      <div className="mt-2 text-xs text-zinc-400 max-h-20 overflow-y-auto">
                        {bulkResults.errors.slice(0, 5).map((err, i) => (
                          <div key={i}>• {err}</div>
                        ))}
                        {bulkResults.errors.length > 5 && (
                          <div>...and {bulkResults.errors.length - 5} more errors</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    disabled={bulkSubmitting}
                    className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={bulkSubmitting || !bulkText.trim()}
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {bulkSubmitting ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingEntry(null);
          }}
          onConfirm={handleDelete}
          title="Delete Entry?"
          message={`Are you sure you want to delete ${deletingEntry?.creatorName}'s GMV entry? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmColor="red"
          isProcessing={isDeleting}
          icon="🗑️"
        />

        {/* FINALIZE CONFIRMATION */}
        <ConfirmModal
          isOpen={showFinalizeModal}
          onClose={() => setShowFinalizeModal(false)}
          onConfirm={handleFinalize}
          title="Finalize Month?"
          message="This will lock the current standings and create reward records for the top 3 creators. Make sure all GMV data is accurate before finalizing."
          confirmLabel="Finalize & Reward Winners"
          confirmColor="green"
          isProcessing={isFinalizing}
          icon="🏁"
        />

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
        `}</style>
      </div>
    </ProtectedRoute>
  );
}