// src/app/admin/submissions/[id]/page.tsx
// Mobile-Responsive Version

'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { V3ContentSubmission } from '@/types';
import Link from 'next/link';

interface EnrichedSubmission extends V3ContentSubmission {
  creatorName: string;
  creatorHandle: string;
  creatorEmail: string;
}

export default function MilestoneReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [submission, setSubmission] = useState<EnrichedSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Review form state
  const [verifiedViews, setVerifiedViews] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const loadSubmission = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getAuthToken();
      if (!token) return;

      // Fetch the specific submission
      const response = await fetch(`/api/admin/submissions/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch submission');
      }

      const data = await response.json();
      
      if (!data.submission) {
        throw new Error('Submission not found');
      }

      setSubmission(data.submission);
      
      // Pre-fill verified views based on tier minimum
      if (data.submission.claimedTier) {
        const tierMinimums: Record<string, number> = {
          '100k': 100000,
          '500k': 500000,
          '1m': 1000000,
        };
        setVerifiedViews(tierMinimums[data.submission.claimedTier]?.toString() || '');
      }
    } catch (err) {
      console.error('Error loading submission:', err);
      setError(err instanceof Error ? err.message : 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin && id) {
      loadSubmission();
    }
  }, [user, isAdmin, id]);

  const handleApprove = async () => {
    if (!verifiedViews || parseInt(verifiedViews, 10) < 0) {
      alert('Please enter a valid verified view count');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/admin/submissions/${id}/review`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'approved',
          verifiedViews: parseInt(verifiedViews, 10),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve');
      }

      alert('Milestone approved! Redemption record created.');
      router.push('/admin/submissions');
    } catch (error) {
      console.error('Approval error:', error);
      alert(error instanceof Error ? error.message : 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/admin/submissions/${id}/review`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'rejected',
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject');
      }

      alert('Milestone rejected.');
      router.push('/admin/submissions');
    } catch (error) {
      console.error('Rejection error:', error);
      alert(error instanceof Error ? error.message : 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  const getTierReward = (tier: string) => {
    const rewards: Record<string, string> = {
      '100k': '$10 store credit',
      '500k': '$25 + free product',
      '1m': '$50 + exclusive merch',
    };
    return rewards[tier] || 'Unknown';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Mobile-friendly short date
  const formatShortDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[80vh] px-4">
          <p className="text-red-400 mb-4 text-center text-sm sm:text-base">{error || 'Submission not found'}</p>
          <Link
            href="/admin/submissions"
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm sm:text-base active:scale-[0.98]"
          >
            Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  const isAlreadyReviewed = submission.status !== 'pending';

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <Navbar />
      
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 sm:w-96 h-64 sm:h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 sm:w-96 h-64 sm:h-96 bg-orange-600/10 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-6 sm:py-8 pt-20 sm:pt-24">
        {/* Back Link */}
        <Link
          href="/admin/submissions"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
        >
          <span>←</span>
          <span>Back to Submissions</span>
        </Link>

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Review Milestone</h1>
          <p className="text-zinc-400 text-sm sm:text-base">
            Verify the view count and approve or reject this milestone claim
          </p>
        </div>

        {/* Main Grid - Stack on mobile */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Submission Details */}
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-zinc-700/50 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-4">Submission Details</h2>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-zinc-500 text-xs sm:text-sm">Creator</label>
                <div className="text-white font-medium text-sm sm:text-base">{submission.creatorName}</div>
                <div className="text-zinc-400 text-xs sm:text-sm">@{submission.creatorHandle}</div>
              </div>
              
              <div>
                <label className="text-zinc-500 text-xs sm:text-sm">TikTok URL</label>
                <a
                  href={submission.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-orange-400 hover:text-orange-300 break-all text-sm sm:text-base"
                >
                  {submission.tiktokUrl}
                </a>
              </div>
              
              <div>
                <label className="text-zinc-500 text-xs sm:text-sm">Claimed Tier</label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-white font-medium text-base sm:text-lg">
                    {submission.claimedTier?.toUpperCase()} Views
                  </span>
                  <span className="text-green-400 text-xs sm:text-sm">
                    ({getTierReward(submission.claimedTier || '')})
                  </span>
                </div>
              </div>
              
              <div>
                <label className="text-zinc-500 text-xs sm:text-sm">Submitted</label>
                {/* Show short date on mobile, full date on desktop */}
                <div className="text-white text-sm sm:text-base">
                  <span className="sm:hidden">{formatShortDate(submission.submittedAt)}</span>
                  <span className="hidden sm:inline">{formatDate(submission.submittedAt)}</span>
                </div>
              </div>
              
              <div>
                <label className="text-zinc-500 text-xs sm:text-sm">Status</label>
                <div className={`inline-flex px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                  submission.status === 'pending' 
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : submission.status === 'approved'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                }`}>
                  {submission.status}
                </div>
              </div>

              {submission.verifiedViews !== undefined && (
                <div>
                  <label className="text-zinc-500 text-xs sm:text-sm">Verified Views</label>
                  <div className="text-white font-medium text-sm sm:text-base">
                    {submission.verifiedViews.toLocaleString()}
                  </div>
                </div>
              )}

              {submission.rejectionReason && (
                <div>
                  <label className="text-zinc-500 text-xs sm:text-sm">Rejection Reason</label>
                  <div className="text-red-400 text-sm sm:text-base">{submission.rejectionReason}</div>
                </div>
              )}
            </div>
          </div>

          {/* Review Actions */}
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-zinc-700/50 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-4">
              {isAlreadyReviewed ? 'Review Complete' : 'Review Actions'}
            </h2>

            {isAlreadyReviewed ? (
              <div className="text-center py-6 sm:py-8">
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">
                  {submission.status === 'approved' ? '✅' : '❌'}
                </div>
                <p className="text-zinc-400 text-sm sm:text-base">
                  This milestone has already been {submission.status}.
                </p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {/* TikTok Preview */}
                <div className="p-3 sm:p-4 bg-zinc-900/50 rounded-lg sm:rounded-xl">
                  <p className="text-zinc-400 text-xs sm:text-sm mb-2 sm:mb-3">
                    Open the TikTok video to verify the view count:
                  </p>
                  <a
                    href={submission.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg transition-colors text-sm sm:text-base active:scale-[0.98]"
                  >
                    <span>🎵</span>
                    <span>Open in TikTok</span>
                    <span>↗</span>
                  </a>
                </div>

                {/* Verified Views Input */}
                <div>
                  <label className="block text-zinc-400 text-xs sm:text-sm mb-2">
                    Verified View Count
                  </label>
                  <input
                    type="number"
                    value={verifiedViews}
                    onChange={(e) => setVerifiedViews(e.target.value)}
                    placeholder="Enter actual view count..."
                    min="0"
                    className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-white text-sm sm:text-base placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <p className="text-zinc-500 text-[10px] sm:text-xs mt-1">
                    Minimum for {submission.claimedTier}: {
                      submission.claimedTier === '100k' ? '100,000' :
                      submission.claimedTier === '500k' ? '500,000' :
                      '1,000,000'
                    } views
                  </p>
                </div>

                {/* Approve Button */}
                <button
                  onClick={handleApprove}
                  disabled={submitting || !verifiedViews}
                  className="w-full py-2.5 sm:py-3 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base active:scale-[0.98]"
                >
                  {submitting ? 'Processing...' : '✓ Approve Milestone'}
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-700"></div>
                  </div>
                  <div className="relative flex justify-center text-xs sm:text-sm">
                    <span className="px-2 bg-zinc-800/50 text-zinc-500">or</span>
                  </div>
                </div>

                {/* Rejection Reason */}
                <div>
                  <label className="block text-zinc-400 text-xs sm:text-sm mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g., View count does not meet threshold, video not related to TheHoopGang..."
                    rows={3}
                    className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-white text-sm sm:text-base placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
                  />
                </div>

                {/* Reject Button */}
                <button
                  onClick={handleReject}
                  disabled={submitting || !rejectionReason.trim()}
                  className="w-full py-2.5 sm:py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 disabled:bg-zinc-700/20 disabled:border-zinc-700 disabled:cursor-not-allowed text-red-400 disabled:text-zinc-500 font-semibold rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base active:scale-[0.98]"
                >
                  {submitting ? 'Processing...' : '✕ Reject Milestone'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}