// src/app/admin/redemptions/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { Redemption, RedemptionStatus, RedemptionSource, CashMethod } from '@/types';

interface EnrichedRedemption extends Redemption {
  creatorName?: string;
  creatorEmail?: string;
}

export default function AdminRedemptionsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [redemptions, setRedemptions] = useState<EnrichedRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<RedemptionStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState<RedemptionSource | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Process modal state
  const [selectedRedemption, setSelectedRedemption] = useState<EnrichedRedemption | null>(null);
  const [processing, setProcessing] = useState(false);

  // Fulfillment form state
  const [fulfillmentType, setFulfillmentType] = useState<'cash' | 'store_credit' | 'product' | 'mixed'>('cash');
  const [cashAmount, setCashAmount] = useState<number | ''>('');
  const [cashMethod, setCashMethod] = useState<CashMethod>('paypal');
  const [cashHandle, setCashHandle] = useState('');
  const [storeCreditCode, setStoreCreditCode] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

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

  const loadRedemptions = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (sourceFilter) params.set('source', sourceFilter);

      const response = await fetch(`/api/admin/redemptions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch redemptions');

      const data = await response.json();
      setRedemptions(data.redemptions);
    } catch (err) {
      console.error('Error loading redemptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load redemptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadRedemptions();
    }
  }, [user, isAdmin, statusFilter, sourceFilter]);

  // Client-side search filter
  const filteredRedemptions = redemptions.filter((r) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.rewardName.toLowerCase().includes(query) ||
      r.creatorName?.toLowerCase().includes(query) ||
      r.creatorEmail?.toLowerCase().includes(query)
    );
  });

  const openProcessModal = (redemption: EnrichedRedemption) => {
    setSelectedRedemption(redemption);
    // Pre-fill based on existing data
    setCashAmount(redemption.cashAmount || '');
    setCashMethod(redemption.cashMethod || 'paypal');
    setCashHandle(redemption.cashHandle || '');
    setStoreCreditCode(redemption.storeCreditCode || '');
    setTrackingNumber(redemption.trackingNumber || '');
    setNotes(redemption.notes || '');
    // Guess fulfillment type from reward
    if (redemption.cashAmount) setFulfillmentType('cash');
    else if (redemption.storeCreditCode) setFulfillmentType('store_credit');
    else if (redemption.productShipped) setFulfillmentType('product');
    else setFulfillmentType('cash');
  };

  const closeModal = () => {
    setSelectedRedemption(null);
    setCashAmount('');
    setCashMethod('paypal');
    setCashHandle('');
    setStoreCreditCode('');
    setTrackingNumber('');
    setNotes('');
  };

  const handleApprove = async () => {
    if (!selectedRedemption) return;
    await updateRedemptionStatus(selectedRedemption.id, 'approved');
  };

  const handleReject = async () => {
    if (!selectedRedemption) return;
    if (!confirm('Are you sure you want to reject this redemption?')) return;
    await updateRedemptionStatus(selectedRedemption.id, 'rejected');
  };

  const handleFulfill = async () => {
    if (!selectedRedemption) return;

    // Validation
    if (fulfillmentType === 'cash' || fulfillmentType === 'mixed') {
      if (!cashAmount || !cashHandle.trim()) {
        alert('Please enter cash amount and payment handle');
        return;
      }
    }
    if (fulfillmentType === 'store_credit' || fulfillmentType === 'mixed') {
      if (!storeCreditCode.trim()) {
        alert('Please enter a store credit code');
        return;
      }
    }
    if (fulfillmentType === 'product') {
      if (!trackingNumber.trim()) {
        alert('Please enter a tracking number');
        return;
      }
    }

    const fulfillmentDetails: Record<string, unknown> = {
      notes: notes.trim() || undefined,
    };

    if (fulfillmentType === 'cash' || fulfillmentType === 'mixed') {
      fulfillmentDetails.cashAmount = cashAmount;
      fulfillmentDetails.cashMethod = cashMethod;
      fulfillmentDetails.cashHandle = cashHandle.trim();
    }
    if (fulfillmentType === 'store_credit' || fulfillmentType === 'mixed') {
      fulfillmentDetails.storeCreditCode = storeCreditCode.trim();
    }
    if (fulfillmentType === 'product' || fulfillmentType === 'mixed') {
      fulfillmentDetails.productShipped = true;
      if (trackingNumber.trim()) {
        fulfillmentDetails.trackingNumber = trackingNumber.trim();
      }
    }

    await updateRedemptionStatus(selectedRedemption.id, 'fulfilled', fulfillmentDetails);
  };

  const updateRedemptionStatus = async (
    id: string,
    status: RedemptionStatus,
    fulfillmentDetails?: Record<string, unknown>
  ) => {
    setProcessing(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/admin/redemptions/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, ...fulfillmentDetails }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update');

      closeModal();
      await loadRedemptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update redemption');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Approve ${selectedIds.size} selected redemptions?`)) return;

    setBulkProcessing(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      for (const id of selectedIds) {
        await fetch(`/api/admin/redemptions/${id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'approved' }),
        });
      }

      setSelectedIds(new Set());
      await loadRedemptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bulk approve failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRedemptions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRedemptions.map((r) => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const getStatusBadge = (status: RedemptionStatus) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
      case 'approved':
        return { label: 'Approved', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'fulfilled':
        return { label: 'Fulfilled', class: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'rejected':
        return { label: 'Rejected', class: 'bg-red-500/20 text-red-400 border-red-500/30' };
      default:
        return { label: status, class: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' };
    }
  };

  const getSourceLabel = (source: RedemptionSource): string => {
    switch (source) {
      case 'milestone_submission':
        return 'Milestone';
      case 'volume_win':
        return 'Volume LB';
      case 'gmv_win':
        return 'GMV LB';
      case 'competition_win':
        return 'Competition';
      default:
        return source;
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">💰 Redemptions</h1>
            <p className="text-zinc-400">Process and fulfill reward redemptions</p>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-zinc-400 text-sm">{selectedIds.size} selected</span>
              <button
                onClick={handleBulkApprove}
                disabled={bulkProcessing}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium rounded-lg transition-colors text-sm"
              >
                {bulkProcessing ? 'Processing...' : 'Approve Selected'}
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 p-4 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Search by creator or reward..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RedemptionStatus | '')}
              className="bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as RedemptionSource | '')}
              className="bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="">All Sources</option>
              <option value="milestone_submission">Milestone</option>
              <option value="volume_win">Volume Leaderboard</option>
              <option value="gmv_win">GMV Leaderboard</option>
              <option value="competition_win">Competition</option>
            </select>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-white">{redemptions.length}</div>
            <div className="text-zinc-400 text-sm">Total</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {redemptions.filter((r) => r.status === 'pending').length}
            </div>
            <div className="text-zinc-400 text-sm">Pending</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-blue-400">
              {redemptions.filter((r) => r.status === 'approved').length}
            </div>
            <div className="text-zinc-400 text-sm">Approved</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-green-400">
              {redemptions.filter((r) => r.status === 'fulfilled').length}
            </div>
            <div className="text-zinc-400 text-sm">Fulfilled</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadRedemptions}
                className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredRedemptions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">💰</div>
              <p className="text-zinc-400">No redemptions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700/50">
                    <th className="text-left py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredRedemptions.length && filteredRedemptions.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                      />
                    </th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Creator</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Reward</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Source</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Status</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Created</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRedemptions.map((redemption) => {
                    const statusBadge = getStatusBadge(redemption.status);
                    return (
                      <tr
                        key={redemption.id}
                        className="border-b border-zinc-700/30 hover:bg-zinc-700/20 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(redemption.id)}
                            onChange={() => toggleSelect(redemption.id)}
                            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <div className="text-white font-medium">{redemption.creatorName || 'Unknown'}</div>
                            <div className="text-zinc-500 text-sm">{redemption.creatorEmail || ''}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-white">{redemption.rewardName}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-zinc-400 text-sm">{getSourceLabel(redemption.source)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.class}`}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-zinc-400 text-sm">{formatDate(redemption.createdAt)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => openProcessModal(redemption)}
                            className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm font-medium transition-colors"
                          >
                            {redemption.status === 'pending'
                              ? 'Process'
                              : redemption.status === 'approved'
                              ? 'Fulfill'
                              : 'View'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Process Redemption Modal */}
      {selectedRedemption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Process Redemption</h3>
              <button onClick={closeModal} className="p-2 text-zinc-400 hover:text-white rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Redemption Info */}
            <div className="mb-6 p-4 bg-zinc-800/50 rounded-xl space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-400">Creator:</span>
                <span className="text-white">{selectedRedemption.creatorName || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Reward:</span>
                <span className="text-white">{selectedRedemption.rewardName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Source:</span>
                <span className="text-white">{getSourceLabel(selectedRedemption.source)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Status:</span>
                <span className={getStatusBadge(selectedRedemption.status).class.replace('border', 'px-2 py-0.5 rounded text-xs')}>
                  {getStatusBadge(selectedRedemption.status).label}
                </span>
              </div>
            </div>

            {/* Actions based on status */}
            {selectedRedemption.status === 'pending' && (
              <div className="space-y-4">
                <p className="text-zinc-400 text-sm">Review this redemption request:</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleReject}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium rounded-lg transition-colors"
                  >
                    {processing ? 'Processing...' : 'Approve'}
                  </button>
                </div>
              </div>
            )}

            {(selectedRedemption.status === 'approved' || selectedRedemption.status === 'pending') && (
              <div className="space-y-4 mt-6 pt-6 border-t border-zinc-700/50">
                <h4 className="text-white font-semibold">Fulfillment Details</h4>

                {/* Fulfillment Type */}
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Fulfillment Type</label>
                  <select
                    value={fulfillmentType}
                    onChange={(e) => setFulfillmentType(e.target.value as typeof fulfillmentType)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="cash">Cash Payment</option>
                    <option value="store_credit">Store Credit</option>
                    <option value="product">Product Shipment</option>
                    <option value="mixed">Mixed (Multiple)</option>
                  </select>
                </div>

                {/* Cash Fields */}
                {(fulfillmentType === 'cash' || fulfillmentType === 'mixed') && (
                  <div className="space-y-3 p-4 bg-zinc-800/30 rounded-lg">
                    <h5 className="text-zinc-300 text-sm font-medium">💵 Cash Payment</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-zinc-500 text-xs mb-1">Amount ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value ? parseFloat(e.target.value) : '')}
                          placeholder="25"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-500 text-xs mb-1">Method</label>
                        <select
                          value={cashMethod}
                          onChange={(e) => setCashMethod(e.target.value as CashMethod)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="paypal">PayPal</option>
                          <option value="venmo">Venmo</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-zinc-500 text-xs mb-1">
                        {cashMethod === 'paypal' ? 'PayPal Email' : 'Venmo Handle'}
                      </label>
                      <input
                        type="text"
                        value={cashHandle}
                        onChange={(e) => setCashHandle(e.target.value)}
                        placeholder={cashMethod === 'paypal' ? 'creator@email.com' : '@username'}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}

                {/* Store Credit Fields */}
                {(fulfillmentType === 'store_credit' || fulfillmentType === 'mixed') && (
                  <div className="space-y-3 p-4 bg-zinc-800/30 rounded-lg">
                    <h5 className="text-zinc-300 text-sm font-medium">🏷️ Store Credit</h5>
                    <div>
                      <label className="block text-zinc-500 text-xs mb-1">Discount Code</label>
                      <input
                        type="text"
                        value={storeCreditCode}
                        onChange={(e) => setStoreCreditCode(e.target.value)}
                        placeholder="CREATOR10OFF"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}

                {/* Product Fields */}
                {(fulfillmentType === 'product' || fulfillmentType === 'mixed') && (
                  <div className="space-y-3 p-4 bg-zinc-800/30 rounded-lg">
                    <h5 className="text-zinc-300 text-sm font-medium">📦 Product Shipment</h5>
                    <div>
                      <label className="block text-zinc-500 text-xs mb-1">Tracking Number</label>
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="1Z999AA10123456784"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Internal Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any notes about this fulfillment..."
                    rows={2}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                  />
                </div>

                {/* Fulfill Button */}
                <button
                  onClick={handleFulfill}
                  disabled={processing}
                  className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-zinc-700 text-white font-semibold rounded-lg transition-colors"
                >
                  {processing ? 'Processing...' : '✓ Mark as Fulfilled'}
                </button>
              </div>
            )}

            {/* Fulfilled View */}
            {selectedRedemption.status === 'fulfilled' && (
              <div className="space-y-4">
                <h4 className="text-white font-semibold">Fulfillment Record</h4>
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl space-y-2">
                  {selectedRedemption.cashAmount && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Cash Sent:</span>
                      <span className="text-green-400">
                        ${selectedRedemption.cashAmount} via {selectedRedemption.cashMethod}
                      </span>
                    </div>
                  )}
                  {selectedRedemption.cashHandle && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">To:</span>
                      <span className="text-white">{selectedRedemption.cashHandle}</span>
                    </div>
                  )}
                  {selectedRedemption.storeCreditCode && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Store Credit:</span>
                      <span className="text-blue-400">{selectedRedemption.storeCreditCode}</span>
                    </div>
                  )}
                  {selectedRedemption.productShipped && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Product:</span>
                      <span className="text-orange-400">
                        Shipped {selectedRedemption.trackingNumber ? `(${selectedRedemption.trackingNumber})` : ''}
                      </span>
                    </div>
                  )}
                  {selectedRedemption.fulfilledAt && (
                    <div className="flex justify-between pt-2 border-t border-green-500/20">
                      <span className="text-zinc-400">Fulfilled:</span>
                      <span className="text-zinc-300">{formatDate(selectedRedemption.fulfilledAt)}</span>
                    </div>
                  )}
                  {selectedRedemption.notes && (
                    <div className="pt-2 border-t border-green-500/20">
                      <span className="text-zinc-400 text-sm">Notes:</span>
                      <p className="text-zinc-300 text-sm mt-1">{selectedRedemption.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rejected View */}
            {selectedRedemption.status === 'rejected' && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400">This redemption was rejected.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}