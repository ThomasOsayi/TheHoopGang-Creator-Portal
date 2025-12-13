// src/app/admin/leaderboard/gmv/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { LeaderboardEntry } from '@/types';
import { getCurrentMonth } from '@/lib/week-utils';

export default function GMVLeaderboardAdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Period selection
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LeaderboardEntry | null>(null);
  
  // Form state
  const [formCreatorId, setFormCreatorId] = useState('');
  const [formGmvAmount, setFormGmvAmount] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Bulk import state
  const [bulkText, setBulkText] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

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

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/admin/leaderboard/gmv?period=${selectedMonth}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setEntries(data.entries);
      setAvailableMonths(data.availableMonths);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadLeaderboard();
    }
  }, [user, isAdmin, selectedMonth]);

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
          period: selectedMonth,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save entry');
      }

      // Reset and reload
      setFormCreatorId('');
      setFormGmvAmount('');
      setShowAddModal(false);
      setEditingEntry(null);
      await loadLeaderboard();
    } catch (err) {
      console.error('Save error:', err);
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (entry: LeaderboardEntry) => {
    if (!confirm(`Delete ${entry.creatorName}'s GMV entry?`)) return;
    
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `/api/admin/leaderboard/gmv?entryId=${entry.id}&period=${selectedMonth}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete entry');
      }

      await loadLeaderboard();
    } catch (err) {
      console.error('Delete error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete');
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
      const entries = lines.map(line => {
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
          entries,
          period: selectedMonth,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk import failed');
      }

      setBulkResults(data.results);
      await loadLeaderboard();
    } catch (err) {
      console.error('Bulk import error:', err);
      alert(err instanceof Error ? err.message : 'Bulk import failed');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const openEditModal = (entry: LeaderboardEntry) => {
    setEditingEntry(entry);
    setFormCreatorId(entry.creatorId);
    setFormGmvAmount(entry.value.toString());
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingEntry(null);
    setFormCreatorId('');
    setFormGmvAmount('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">💰 GMV Leaderboard</h1>
            <p className="text-zinc-400">
              Manage monthly sales leaderboard rankings
            </p>
          </div>
          
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
          >
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {month} {month === getCurrentMonth() ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
          >
            + Add Entry
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors"
          >
            📋 Bulk Import
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-white">{entries.length}</div>
            <div className="text-zinc-400 text-sm">Total Entries</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(entries.reduce((sum, e) => sum + e.value, 0))}
            </div>
            <div className="text-zinc-400 text-sm">Total GMV</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-orange-400">
              {entries.length > 0 ? formatCurrency(entries[0]?.value || 0) : '$0'}
            </div>
            <div className="text-zinc-400 text-sm">Top GMV</div>
          </div>
        </div>

        {/* Table */}
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
              <div className="text-5xl mb-4">💰</div>
              <p className="text-zinc-400 mb-2">No GMV entries for this month</p>
              <p className="text-zinc-500 text-sm">Add entries manually or use bulk import</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700/50">
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Rank</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Creator</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">GMV</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Updated</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr 
                      key={entry.id}
                      className={`border-b border-zinc-700/30 hover:bg-zinc-700/20 transition-colors ${
                        entry.rank <= 3 ? 'bg-zinc-700/10' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <span className={`font-bold ${
                          entry.rank === 1 ? 'text-yellow-400' :
                          entry.rank === 2 ? 'text-gray-300' :
                          entry.rank === 3 ? 'text-orange-400' :
                          'text-zinc-400'
                        }`}>
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-white font-medium">{entry.creatorName}</div>
                        <div className="text-zinc-500 text-sm">@{entry.creatorHandle}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-green-400 font-bold">{formatCurrency(entry.value)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-zinc-400 text-sm">{formatDate(entry.updatedAt)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(entry)}
                            className="px-3 py-1.5 bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(entry)}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeAddModal}
          />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingEntry ? 'Edit GMV Entry' : 'Add GMV Entry'}
            </h3>
            
            <form onSubmit={handleAddOrEdit} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-2">
                  Creator ID or Handle
                </label>
                <input
                  type="text"
                  value={formCreatorId}
                  onChange={(e) => setFormCreatorId(e.target.value)}
                  placeholder="e.g., CRT-2024-001 or @handle"
                  disabled={!!editingEntry}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-zinc-400 text-sm mb-2">
                  GMV Amount ($)
                </label>
                <input
                  type="number"
                  value={formGmvAmount}
                  onChange={(e) => setFormGmvAmount(e.target.value)}
                  placeholder="e.g., 1500"
                  min="0"
                  step="0.01"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || !formCreatorId.trim() || !formGmvAmount}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {formSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !bulkSubmitting && setShowBulkModal(false)}
          />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold text-white mb-2">Bulk Import</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Paste data from Euka export. Format: one entry per line, handle and amount separated by comma or tab.
            </p>
            
            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-2">
                  Data (handle, amount)
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`@creator1, 1500\n@creator2, 890\n@creator3, 450`}
                  rows={8}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono text-sm resize-none"
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
                  className="flex-1 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting || !bulkText.trim()}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {bulkSubmitting ? 'Importing...' : 'Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}