// src/app/creator/submissions/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { V3ContentSubmission, V3SubmissionType, V3SubmissionStatus } from '@/types';

type TabType = 'all' | 'volume' | 'milestone';

export default function SubmissionHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [submissions, setSubmissions] = useState<V3ContentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

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
      if (activeTab !== 'all') {
        params.set('type', activeTab);
      }

      const response = await fetch(`/api/submissions/history?${params.toString()}`, {
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
    if (user) {
      loadSubmissions();
    }
  }, [user, activeTab]);

  const getStatusBadge = (status: V3SubmissionStatus) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', class: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'pending':
        return { label: 'Pending', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
      case 'rejected':
        return { label: 'Rejected', class: 'bg-red-500/20 text-red-400 border-red-500/30' };
      default:
        return { label: status, class: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' };
    }
  };

  const getTypeBadge = (type: V3SubmissionType) => {
    return type === 'volume'
      ? { label: 'Volume', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '📊' }
      : { label: 'Milestone', class: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '🏆' };
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

  const getTierDisplay = (tier: string) => {
    const tierMap: Record<string, { label: string; reward: string }> = {
      '100k': { label: '100K Views', reward: '$10' },
      '500k': { label: '500K Views', reward: '$25 + Product' },
      '1m': { label: '1M+ Views', reward: '$50 + Merch' },
    };
    return tierMap[tier] || { label: tier, reward: '' };
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '📋' },
    { key: 'volume', label: 'Volume', icon: '📊' },
    { key: 'milestone', label: 'Milestones', icon: '🏆' },
  ];

  // Stats
  const totalVolume = submissions.filter(s => s.type === 'volume').length;
  const totalMilestones = submissions.filter(s => s.type === 'milestone').length;
  const approvedMilestones = submissions.filter(s => s.type === 'milestone' && s.status === 'approved').length;
  const pendingMilestones = submissions.filter(s => s.type === 'milestone' && s.status === 'pending').length;

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
          <h1 className="text-3xl font-bold text-white mb-2">Submission History</h1>
          <p className="text-zinc-400">
            View all your content submissions and their status
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-white">{submissions.length}</div>
            <div className="text-zinc-400 text-sm">Total</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-blue-400">{totalVolume}</div>
            <div className="text-zinc-400 text-sm">Volume Posts</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-green-400">{approvedMilestones}</div>
            <div className="text-zinc-400 text-sm">Milestones Won</div>
          </div>
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 p-4">
            <div className="text-2xl font-bold text-yellow-400">{pendingMilestones}</div>
            <div className="text-zinc-400 text-sm">Pending Review</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 p-1 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-orange-500 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.key === 'all' && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === tab.key ? 'bg-white/20' : 'bg-zinc-700'
                }`}>
                  {submissions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={loadSubmissions}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-zinc-400 mb-2">No submissions yet</p>
              <p className="text-zinc-500 text-sm mb-6">Start posting content to see your history here</p>
              <button
                onClick={() => router.push('/creator/submit')}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
              >
                Submit Content
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-700/50">
              {submissions.map((submission) => {
                const statusBadge = getStatusBadge(submission.status);
                const typeBadge = getTypeBadge(submission.type);
                const tierInfo = submission.claimedTier ? getTierDisplay(submission.claimedTier) : null;

                return (
                  <div 
                    key={submission.id}
                    className="p-4 hover:bg-zinc-700/20 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Type Icon */}
                      <div className={`p-2 rounded-lg ${
                        submission.type === 'volume' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                      }`}>
                        <span className="text-xl">{typeBadge.icon}</span>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${typeBadge.class}`}>
                            {typeBadge.label}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${statusBadge.class}`}>
                            {statusBadge.label}
                          </span>
                          {tierInfo && (
                            <span className="text-zinc-400 text-xs">
                              {tierInfo.label} → {tierInfo.reward}
                            </span>
                          )}
                        </div>
                        
                        
                          <a
                          href={submission.tiktokUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 text-sm break-all line-clamp-1"
                        >
                          {submission.tiktokUrl}
                        </a>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                          <span>{formatDate(submission.submittedAt)}</span>
                          <span>Week {submission.weekOf}</span>
                          {submission.verifiedViews !== undefined && (
                            <span className="text-green-400">
                              ✓ {submission.verifiedViews.toLocaleString()} views verified
                            </span>
                          )}
                        </div>
                        
                        {submission.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <span className="text-red-400 text-xs">
                              Rejection reason: {submission.rejectionReason}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* External Link */}
                      
                        <a
                        href={submission.tiktokUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        {submissions.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/creator/submit')}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-orange-500/25"
            >
              Submit More Content →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}