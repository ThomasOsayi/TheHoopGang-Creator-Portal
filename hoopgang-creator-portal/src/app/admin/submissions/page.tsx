// src/app/admin/submissions/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { V3ContentSubmission, V3SubmissionType, V3SubmissionStatus } from '@/types';
import { getCurrentWeek, getPreviousWeeks } from '@/lib/week-utils';

interface EnrichedSubmission extends V3ContentSubmission {
  creatorName: string;
  creatorHandle: string;
  creatorEmail: string;
}

export default function AdminSubmissionsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [submissions, setSubmissions] = useState<EnrichedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<V3SubmissionType | ''>('');
  const [statusFilter, setStatusFilter] = useState<V3SubmissionStatus | ''>('');
  const [weekFilter, setWeekFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Available weeks for filter dropdown
  const weekOptions = getPreviousWeeks(8);

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

  const loadSubmissions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getAuthToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (weekFilter) params.set('weekOf', weekFilter);

      const response = await fetch(`/api/admin/submissions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      setSubmissions(data.submissions);
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadSubmissions();
    }
  }, [user, isAdmin, typeFilter, statusFilter, weekFilter]);

  // Client-side search filter
  const filteredSubmissions = submissions.filter((sub) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sub.creatorName.toLowerCase().includes(query) ||
      sub.creatorHandle.toLowerCase().includes(query) ||
      sub.creatorEmail.toLowerCase().includes(query) ||
      sub.tiktokUrl.toLowerCase().includes(query)
    );
  });

  const getStatusBadgeClass = (status: V3SubmissionStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  const getTypeBadgeClass = (type: V3SubmissionType) => {
    return type === 'volume'
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      : 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  };

  const handleReviewClick = (submission: EnrichedSubmission) => {
    // Navigate to review modal or page
    router.push(`/admin/submissions/${submission.id}`);
  };

  const formatDate = (date: Date) => {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Content Submissions</h1>
          <p className="text-zinc-400">
            Review and manage creator content submissions
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 p-4 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Search by name, handle, or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as V3SubmissionType | '')}
              className="bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="">All Types</option>
              <option value="volume">Volume</option>
              <option value="milestone">Milestone</option>
            </select>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as V3SubmissionStatus | '')}
              className="bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            
            {/* Week Filter */}
            <select
              value={weekFilter}
              onChange={(e) => setWeekFilter(e.target.value)}
              className="bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="">All Weeks</option>
              {weekOptions.map((week) => (
                <option key={week} value={week}>
                  {week} {week === getCurrentWeek() ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-white">{submissions.length}</div>
            <div className="text-zinc-400 text-sm">Total</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {submissions.filter(s => s.status === 'pending').length}
            </div>
            <div className="text-zinc-400 text-sm">Pending Review</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-blue-400">
              {submissions.filter(s => s.type === 'volume').length}
            </div>
            <div className="text-zinc-400 text-sm">Volume</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-purple-400">
              {submissions.filter(s => s.type === 'milestone').length}
            </div>
            <div className="text-zinc-400 text-sm">Milestones</div>
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
                onClick={loadSubmissions}
                className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-zinc-400">No submissions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700/50">
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Creator</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">URL</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Type</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Tier</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Status</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Date</th>
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((submission) => (
                    <tr 
                      key={submission.id} 
                      className="border-b border-zinc-700/30 hover:bg-zinc-700/20 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <div className="text-white font-medium">{submission.creatorName}</div>
                          <div className="text-zinc-500 text-sm">@{submission.creatorHandle}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <a
                          href={submission.tiktokUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 text-sm truncate block max-w-[200px]"
                        >
                          {submission.tiktokUrl}
                        </a>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getTypeBadgeClass(submission.type)}`}>
                          {submission.type}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {submission.claimedTier ? (
                          <span className="text-white">{submission.claimedTier}</span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(submission.status)}`}>
                          {submission.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-zinc-400 text-sm">{formatDate(submission.submittedAt)}</span>
                      </td>
                      <td className="py-4 px-4">
                        {submission.type === 'milestone' && submission.status === 'pending' ? (
                          <button
                            onClick={() => handleReviewClick(submission)}
                            className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm font-medium transition-colors"
                          >
                            Review
                          </button>
                        ) : (
                          <a
                            href={submission.tiktokUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                          >
                            View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}