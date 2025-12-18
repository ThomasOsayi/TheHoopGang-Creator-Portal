// src/app/creator/submissions/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar, AnimatedCounter, BackgroundOrbs, FilterPill } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { V3ContentSubmission, V3SubmissionType, V3SubmissionStatus } from '@/types';
import { ProtectedRoute } from '@/components/auth';

type FilterType = 'all' | 'approved' | 'pending' | 'rejected' | 'milestone';

// TikTok Icon Component
function TikTokIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  );
}

// Date Group Header Component
function DateGroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="px-6 py-3 bg-zinc-900/80 border-y border-zinc-800 flex items-center justify-between sticky top-0 z-10">
      <span className="text-zinc-400 font-medium text-sm">{label}</span>
      <span className="text-zinc-500 text-sm">{count} submission{count !== 1 ? 's' : ''}</span>
    </div>
  );
}

// Submission Row Component
function SubmissionRow({ 
  submission,
}: { 
  submission: V3ContentSubmission;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const statusConfig = {
    approved: { 
      label: 'Approved', 
      bg: 'bg-green-500/20', 
      text: 'text-green-400', 
      icon: '✓',
      border: 'border-green-500/30'
    },
    pending: { 
      label: 'Pending', 
      bg: 'bg-yellow-500/20', 
      text: 'text-yellow-400', 
      icon: '⏳',
      border: 'border-yellow-500/30'
    },
    rejected: { 
      label: 'Rejected', 
      bg: 'bg-red-500/20', 
      text: 'text-red-400', 
      icon: '✕',
      border: 'border-red-500/30'
    },
  };

  const typeConfig = {
    volume: { label: 'Volume', bg: 'bg-blue-500/20', text: 'text-blue-400' },
    milestone: { label: 'Milestone', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  };

  const statusStyle = statusConfig[submission.status] || statusConfig.pending;
  const typeStyle = typeConfig[submission.type] || typeConfig.volume;

  // Extract username and video ID from TikTok URL
  const extractUrlParts = (url: string) => {
    const match = url.match(/@([^/]+)\/video\/(\d+)/);
    if (match) {
      return { username: match[1], videoId: match[2] };
    }
    return { username: 'creator', videoId: url.slice(-10) };
  };

  const { username, videoId } = extractUrlParts(submission.tiktokUrl);
  const displayUrl = `@${username}/video/${videoId.slice(0, 8)}...`;

  // Format relative date
  const getRelativeDate = (date: Date) => {
    const now = new Date();
    const submittedDate = new Date(date);
    const diffTime = now.getTime() - submittedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      return submittedDate.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return submittedDate.toLocaleDateString('en-US', { weekday: 'short' }).replace(/^\w/, c => 'Last ' + c);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTierDisplay = (tier: string) => {
    const tierMap: Record<string, string> = {
      '100k': '100K Views → $10',
      '500k': '500K Views → $25 + Product',
      '1m': '1M+ Views → $50 + Merch',
    };
    return tierMap[tier] || tier;
  };

  return (
    <div 
      className={`flex items-center justify-between px-6 py-4 transition-all duration-300 group ${
        isHovered ? `border-l-4 ${statusStyle.border} bg-zinc-800/40` : 'border-l-4 border-transparent hover:bg-zinc-800/30'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left side - Icon, URL, Date */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* TikTok Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
          isHovered ? 'bg-zinc-700 scale-105' : 'bg-zinc-800'
        }`}>
          <TikTokIcon className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
        </div>

        {/* URL and Date */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-white font-medium group-hover:text-orange-100 transition-colors truncate">
              {displayUrl}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
              {typeStyle.label}
            </span>
            {submission.claimedTier && (
              <span className="text-zinc-400 text-xs">
                {getTierDisplay(submission.claimedTier)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-zinc-400 text-sm">{getRelativeDate(submission.submittedAt)}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-500 text-sm">{formatDate(submission.submittedAt)}</span>
          </div>
          
          {/* Rejection Reason */}
          {submission.rejectionReason && (
            <div className="mt-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg inline-block">
              <span className="text-red-400 text-xs">
                Rejection reason: {submission.rejectionReason}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Status and Actions */}
      <div className="flex items-center gap-4">
        {/* Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusStyle.bg} ${statusStyle.border} border`}>
          <span className={statusStyle.text}>{statusStyle.icon}</span>
          <span className={`text-sm font-medium ${statusStyle.text}`}>{statusStyle.label}</span>
        </div>

        {/* External Link */}
        <a 
          href={submission.tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-2.5 rounded-xl transition-all duration-300 ${
            isHovered 
              ? 'bg-orange-500/20 text-orange-400' 
              : 'bg-zinc-800 text-zinc-500 hover:text-orange-400'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}

export default function SubmissionHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [submissions, setSubmissions] = useState<V3ContentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

      const response = await fetch('/api/submissions/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      setSubmissions(data.submissions || []);
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
  }, [user]);

  // Filter submissions
  const filteredSubmissions = submissions.filter(sub => {
    // Search filter
    if (searchQuery && !sub.tiktokUrl.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Status/type filter
    if (activeFilter === 'all') return true;
    if (activeFilter === 'approved') return sub.status === 'approved';
    if (activeFilter === 'pending') return sub.status === 'pending';
    if (activeFilter === 'rejected') return sub.status === 'rejected';
    if (activeFilter === 'milestone') return sub.type === 'milestone';
    return true;
  });

  // Group submissions by date
  const groupSubmissionsByDate = (subs: V3ContentSubmission[]) => {
    const groups: Record<string, V3ContentSubmission[]> = {};
    const now = new Date();
    
    subs.forEach(sub => {
      const submittedDate = new Date(sub.submittedAt);
      const diffTime = now.getTime() - submittedDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let group: string;
      if (diffDays === 0) {
        group = 'Today';
      } else if (diffDays === 1) {
        group = 'Yesterday';
      } else if (diffDays < 7) {
        group = 'This Week';
      } else {
        group = 'Earlier';
      }
      
      if (!groups[group]) groups[group] = [];
      groups[group].push(sub);
    });
    
    return groups;
  };

  const groupedSubmissions = groupSubmissionsByDate(filteredSubmissions);

  // Calculate stats
  const stats = {
    total: submissions.length,
    approved: submissions.filter(s => s.status === 'approved').length,
    pending: submissions.filter(s => s.status === 'pending').length,
    thisWeek: submissions.filter(s => {
      const submittedDate = new Date(s.submittedAt);
      const now = new Date();
      const diffTime = now.getTime() - submittedDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays < 7;
    }).length,
  };

  // Filter counts
  const filterCounts = {
    all: submissions.length,
    approved: submissions.filter(s => s.status === 'approved').length,
    pending: submissions.filter(s => s.status === 'pending').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
    milestone: submissions.filter(s => s.type === 'milestone').length,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['creator']}>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        <Navbar />
        
        {/* Background Orbs */}
        <BackgroundOrbs colors={['blue', 'orange', 'purple']} />

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-white mb-2">
            Submission History 📋
          </h1>
          <p className="text-zinc-400 text-lg">
            Track all your submitted TikToks in one place
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-8 animate-fade-in-up">
          <div 
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center transition-all duration-300 hover:border-orange-500/50 hover:scale-[1.02] hover:-translate-y-1 cursor-default"
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 30px -5px rgba(249, 115, 22, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div className="text-2xl font-bold text-white mb-1">
              <AnimatedCounter value={stats.total} />
            </div>
            <div className="text-zinc-500 text-sm">Total</div>
          </div>
          
          <div 
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center transition-all duration-300 hover:border-green-500/50 hover:scale-[1.02] hover:-translate-y-1 cursor-default"
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 30px -5px rgba(34, 197, 94, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div className="text-2xl font-bold text-green-400 mb-1">
              <AnimatedCounter value={stats.approved} />
            </div>
            <div className="text-zinc-500 text-sm">Approved</div>
          </div>
          
          <div 
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center transition-all duration-300 hover:border-yellow-500/50 hover:scale-[1.02] hover:-translate-y-1 cursor-default"
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 30px -5px rgba(234, 179, 8, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              <AnimatedCounter value={stats.pending} />
            </div>
            <div className="text-zinc-500 text-sm">Pending</div>
          </div>
          
          <div 
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center transition-all duration-300 hover:border-blue-500/50 hover:scale-[1.02] hover:-translate-y-1 cursor-default"
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 30px -5px rgba(59, 130, 246, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div className="text-2xl font-bold text-blue-400 mb-1">
              <AnimatedCounter value={stats.thisWeek} />
            </div>
            <div className="text-zinc-500 text-sm">This Week</div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search submissions..."
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterPill 
            label="All" 
            active={activeFilter === 'all'} 
            onClick={() => setActiveFilter('all')}
            count={filterCounts.all}
          />
          <FilterPill 
            label="Approved" 
            active={activeFilter === 'approved'} 
            onClick={() => setActiveFilter('approved')}
            count={filterCounts.approved}
            icon="✓"
          />
          <FilterPill 
            label="Pending" 
            active={activeFilter === 'pending'} 
            onClick={() => setActiveFilter('pending')}
            count={filterCounts.pending}
            icon="⏳"
          />
          <FilterPill 
            label="Rejected" 
            active={activeFilter === 'rejected'} 
            onClick={() => setActiveFilter('rejected')}
            count={filterCounts.rejected}
            icon="✕"
          />
          <FilterPill 
            label="Milestones" 
            active={activeFilter === 'milestone'} 
            onClick={() => setActiveFilter('milestone')}
            count={filterCounts.milestone}
            icon="⭐"
          />
        </div>

        {/* Submissions List */}
        <div 
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 hover:border-zinc-700"
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
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
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-5xl mb-4">📭</div>
              <div className="text-zinc-400 text-lg mb-2">No submissions found</div>
              <div className="text-zinc-500 text-sm mb-6">
                {activeFilter !== 'all' || searchQuery
                  ? "Try changing your filters to see more results"
                  : "Start submitting TikToks to see them here"
                }
              </div>
              {activeFilter !== 'all' || searchQuery ? (
                <button 
                  onClick={() => {
                    setActiveFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-orange-400 hover:text-orange-300 font-medium"
                >
                  Clear filters →
                </button>
              ) : (
                <button 
                  onClick={() => router.push('/creator/submit')}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
                >
                  Submit Content →
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Today */}
              {groupedSubmissions['Today'] && (
                <>
                  <DateGroupHeader label="Today" count={groupedSubmissions['Today'].length} />
                  <div className="divide-y divide-zinc-800/50">
                    {groupedSubmissions['Today'].map((sub) => (
                      <SubmissionRow key={sub.id} submission={sub} />
                    ))}
                  </div>
                </>
              )}

              {/* Yesterday */}
              {groupedSubmissions['Yesterday'] && (
                <>
                  <DateGroupHeader label="Yesterday" count={groupedSubmissions['Yesterday'].length} />
                  <div className="divide-y divide-zinc-800/50">
                    {groupedSubmissions['Yesterday'].map((sub) => (
                      <SubmissionRow key={sub.id} submission={sub} />
                    ))}
                  </div>
                </>
              )}

              {/* This Week */}
              {groupedSubmissions['This Week'] && (
                <>
                  <DateGroupHeader label="This Week" count={groupedSubmissions['This Week'].length} />
                  <div className="divide-y divide-zinc-800/50">
                    {groupedSubmissions['This Week'].map((sub) => (
                      <SubmissionRow key={sub.id} submission={sub} />
                    ))}
                  </div>
                </>
              )}

              {/* Earlier */}
              {groupedSubmissions['Earlier'] && (
                <>
                  <DateGroupHeader label="Earlier" count={groupedSubmissions['Earlier'].length} />
                  <div className="divide-y divide-zinc-800/50">
                    {groupedSubmissions['Earlier'].map((sub) => (
                      <SubmissionRow key={sub.id} submission={sub} />
                    ))}
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
                <span className="text-zinc-500 text-sm">
                  Showing {filteredSubmissions.length} of {submissions.length} submissions
                </span>
                {filteredSubmissions.length < submissions.length && (
                  <button 
                    onClick={() => {
                      setActiveFilter('all');
                      setSearchQuery('');
                    }}
                    className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
                  >
                    Show All →
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Pro Tip */}
        <div className="mt-8 p-5 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl flex items-start gap-4 transition-all duration-300 hover:border-blue-500/30">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="text-white font-semibold mb-1">Pro Tip</h4>
            <p className="text-zinc-400 text-sm">
              Submissions are usually reviewed within 24 hours. If your submission is rejected, 
              make sure your TikTok clearly shows HoopGang products and tags <span className="text-orange-400">@thehoopgang</span>.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        {submissions.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/creator/submit')}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25"
            >
              Submit More Content →
            </button>
          </div>
        )}
      </main>
      </div>
    </ProtectedRoute>
  );
}