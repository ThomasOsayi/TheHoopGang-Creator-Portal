// src/app/admin/submissions/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth';
import { PageHeader, Skeleton } from '@/components/ui';
import { V3ContentSubmission, V3SubmissionType, V3SubmissionStatus, V3SubmissionFormat, Creator } from '@/types';
import { auth } from '@/lib/firebase';
import { getCurrentWeek, getPreviousWeeks } from '@/lib/week-utils';

// ===== ICON COMPONENTS =====

function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ExternalLinkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function DownloadIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function VideoIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function LinkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function PlayIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ===== BADGE COMPONENTS =====

function TypeBadge({ type }: { type: V3SubmissionType }) {
  const config = {
    volume: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Volume' },
    milestone: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Milestone' },
  };
  const style = config[type] || config.volume;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function StatusBadge({ status }: { status: V3SubmissionStatus }) {
  const config = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending' },
    approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Approved' },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' },
  };
  const style = config[status] || config.pending;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function FormatBadge({ format }: { format: V3SubmissionFormat }) {
  const config = {
    url: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'URL', icon: LinkIcon },
    file: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'File', icon: VideoIcon },
  };
  const style = config[format] || config.url;
  const Icon = style.icon;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {style.label}
    </span>
  );
}

function TierBadge({ tier }: { tier?: string }) {
  if (!tier) return <span className="text-zinc-700">—</span>;
  const config: Record<string, { bg: string; text: string; label: string }> = {
    '100k': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '100K' },
    '500k': { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '500K' },
    '1m': { bg: 'bg-red-500/20', text: 'text-red-400', label: '1M+' },
  };
  const style = config[tier] || config['100k'];
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

// ===== FILTER PILL COMPONENT =====

function FilterPill({ 
  label, 
  active, 
  onClick, 
  count, 
  urgent 
}: { 
  label: string; 
  active: boolean; 
  onClick: () => void; 
  count?: number; 
  urgent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 flex items-center gap-2 relative ${
        active
          ? urgent 
            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/25'
            : 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
          : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700'
      }`}
    >
      {urgent && !active && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse" />
      )}
      {label}
      {count !== undefined && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          active 
            ? urgent ? 'bg-black/20' : 'bg-white/20' 
            : 'bg-zinc-700'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ===== HELPER FUNCTIONS =====

function formatFileSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function shortenUrl(url: string): string {
  if (!url) return '—';
  try {
    const match = url.match(/@([^/]+)\/video\/(\d+)/);
    if (match) {
      return `@${match[1]}/video/${match[2].slice(0, 6)}...`;
    }
    return url.slice(0, 35) + '...';
  } catch {
    return url.slice(0, 35) + '...';
  }
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ===== SUBMISSION ROW COMPONENT =====

interface SubmissionWithCreator extends V3ContentSubmission {
  creatorName?: string;
  creatorHandle?: string;
}

function SubmissionRow({ 
  submission, 
  isSelected, 
  onSelect,
  onReview,
}: { 
  submission: SubmissionWithCreator;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onReview: (submission: SubmissionWithCreator) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const needsReview = submission.status === 'pending' && submission.type === 'milestone';
  const isFile = submission.submissionFormat === 'file';

  const handleDownload = async () => {
    if (!submission.fileUrl) return;
    
    try {
      const response = await fetch(submission.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = submission.fileName || 'video.mp4';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(submission.fileUrl, '_blank');
    }
  };

  return (
    <tr 
      className={`border-b border-zinc-800/50 transition-all duration-200 ${
        isHovered ? 'bg-zinc-800/30' : ''
      } ${needsReview ? 'bg-yellow-500/5' : ''} ${isSelected ? 'bg-orange-500/10' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Checkbox */}
      <td className="py-4 px-4 w-12">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(submission.id, e.target.checked)}
          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
        />
      </td>
      
      {/* Creator */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-sm font-bold">
            {submission.creatorName?.charAt(0) || '?'}
          </div>
          <div>
            <div className="text-white font-medium">{submission.creatorName || 'Unknown'}</div>
            <div className="text-zinc-500 text-sm">@{submission.creatorHandle || 'unknown'}</div>
          </div>
        </div>
      </td>
      
      {/* Content (URL or File) */}
      <td className="py-4 px-4">
        {isFile ? (
          <div className="flex items-center gap-3">
            {/* File Thumbnail */}
            <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center relative group cursor-pointer" onClick={handleDownload}>
              <VideoIcon className="w-5 h-5 text-zinc-500" />
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <PlayIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <div className="text-white text-sm truncate max-w-[180px]" title={submission.fileName}>
                {submission.fileName || 'Untitled Video'}
              </div>
              <div className="text-zinc-500 text-xs">{formatFileSize(submission.fileSize)}</div>
            </div>
          </div>
        ) : (
          <a 
            href={submission.tiktokUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 group"
          >
            <span>{shortenUrl(submission.tiktokUrl)}</span>
            <ExternalLinkIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        )}
      </td>
      
      {/* Format */}
      <td className="py-4 px-4">
        <FormatBadge format={submission.submissionFormat || 'url'} />
      </td>
      
      {/* Type */}
      <td className="py-4 px-4">
        <TypeBadge type={submission.type} />
      </td>
      
      {/* Tier (only for milestones) */}
      <td className="py-4 px-4">
        <TierBadge tier={submission.claimedTier} />
      </td>
      
      {/* Status */}
      <td className="py-4 px-4">
        <StatusBadge status={submission.status} />
      </td>
      
      {/* Date */}
      <td className="py-4 px-4">
        <div className="text-zinc-300">{formatRelativeDate(submission.submittedAt)}</div>
      </td>
      
      {/* Actions */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          {/* Download button for files */}
          {isFile && submission.fileUrl && (
            <button
              onClick={handleDownload}
              className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
              title="Download Video"
            >
              <DownloadIcon className="w-4 h-4" />
            </button>
          )}
          
          {/* Review button for pending milestones */}
          {needsReview ? (
            <button
              onClick={() => onReview(submission)}
              className="px-3 py-1.5 bg-yellow-500 text-black text-sm font-medium rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Review
            </button>
          ) : (
            <Link
              href={`/admin/submissions/${submission.id}`}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
            >
              View
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

// ===== BULK ACTION BAR =====

function BulkActionBar({ 
  selectedCount,
  selectedFileCount,
  totalFileSize,
  onApprove,
  onReject,
  onDownloadZip,
  onClear,
}: {
  selectedCount: number;
  selectedFileCount: number;
  totalFileSize: number;
  onApprove: () => void;
  onReject: () => void;
  onDownloadZip: () => void;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-6 animate-slide-up z-50">
      <div className="flex flex-col">
        <span className="text-white font-medium">{selectedCount} selected</span>
        {selectedFileCount > 0 && (
          <span className="text-zinc-500 text-xs">
            {selectedFileCount} files • {formatFileSize(totalFileSize)}
          </span>
        )}
      </div>
      
      <div className="h-8 w-px bg-zinc-700" />
      
      <div className="flex items-center gap-2">
        {/* Download ZIP (only if files selected) */}
        {selectedFileCount > 0 && (
          <button
            onClick={onDownloadZip}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors flex items-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            Download ZIP
          </button>
        )}
        
        <button
          onClick={onApprove}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 transition-colors flex items-center gap-2"
        >
          <CheckIcon className="w-4 h-4" />
          Approve
        </button>
        
        <button
          onClick={onReject}
          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors flex items-center gap-2"
        >
          <XIcon className="w-4 h-4" />
          Reject
        </button>
      </div>
      
      <div className="h-8 w-px bg-zinc-700" />
      
      <button
        onClick={onClear}
        className="text-zinc-400 hover:text-white transition-colors text-sm"
      >
        Clear
      </button>
    </div>
  );
}

// ===== STATS CARD =====

function StatCard({ 
  label, 
  value, 
  color = 'zinc',
  urgent = false,
  loading = false,
}: { 
  label: string; 
  value: number; 
  color?: 'zinc' | 'yellow' | 'blue' | 'purple' | 'emerald';
  urgent?: boolean;
  loading?: boolean;
}) {
  const colorClasses = {
    zinc: 'border-zinc-800 hover:border-zinc-700',
    yellow: 'border-yellow-500/30 bg-yellow-500/10 hover:border-yellow-500/50',
    blue: 'border-zinc-800 hover:border-blue-500/30',
    purple: 'border-zinc-800 hover:border-purple-500/30',
    emerald: 'border-zinc-800 hover:border-emerald-500/30',
  };

  const textColors = {
    zinc: 'text-white',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400',
  };

  return (
    <div className={`bg-zinc-900/50 border rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] relative ${colorClasses[color]}`}>
      {urgent && value > 0 && (
        <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse" />
      )}
      <div className={`text-3xl font-bold mb-1 ${textColors[color]}`}>
        {loading ? <Skeleton className="w-12 h-8" /> : value}
      </div>
      <div className={`text-sm ${color === 'yellow' ? 'text-yellow-400/70' : 'text-zinc-500'}`}>
        {label}
      </div>
    </div>
  );
}

// ===== MAIN PAGE COMPONENT =====

type FormatFilter = 'all' | 'url' | 'file';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type TypeFilter = 'all' | 'volume' | 'milestone';

export default function AdminSubmissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Data state
  const [submissions, setSubmissions] = useState<SubmissionWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    volume: 0,
    milestones: 0,
    files: 0,
    urls: 0,
  });
  
  // Filter state
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Get auth token
  const getAuthToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  // Load submissions
  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      // Build query params
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (weekFilter !== 'all') params.append('weekOf', weekFilter);

      const response = await fetch(`/api/admin/submissions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
        
        // Calculate stats
        const allSubs = data.submissions || [];
        setStats({
          total: allSubs.length,
          pending: allSubs.filter((s: V3ContentSubmission) => s.status === 'pending').length,
          volume: allSubs.filter((s: V3ContentSubmission) => s.type === 'volume').length,
          milestones: allSubs.filter((s: V3ContentSubmission) => s.type === 'milestone').length,
          files: allSubs.filter((s: V3ContentSubmission) => s.submissionFormat === 'file').length,
          urls: allSubs.filter((s: V3ContentSubmission) => s.submissionFormat === 'url' || !s.submissionFormat).length,
        });
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, weekFilter]);

  useEffect(() => {
    if (!authLoading && user) {
      loadSubmissions();
    }
  }, [user, authLoading, loadSubmissions]);

  // Filter submissions
  const filteredSubmissions = submissions.filter(sub => {
    // Format filter
    if (formatFilter === 'url' && sub.submissionFormat === 'file') return false;
    if (formatFilter === 'file' && sub.submissionFormat !== 'file') return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = sub.creatorName?.toLowerCase().includes(query);
      const matchesHandle = sub.creatorHandle?.toLowerCase().includes(query);
      const matchesUrl = sub.tiktokUrl?.toLowerCase().includes(query);
      const matchesFile = sub.fileName?.toLowerCase().includes(query);
      if (!matchesName && !matchesHandle && !matchesUrl && !matchesFile) return false;
    }
    
    return true;
  });

  // Selection handlers
  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredSubmissions.map(s => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Calculate selected file stats
  const selectedSubmissions = filteredSubmissions.filter(s => selectedIds.has(s.id));
  const selectedFileCount = selectedSubmissions.filter(s => s.submissionFormat === 'file').length;
  const totalFileSize = selectedSubmissions
    .filter(s => s.submissionFormat === 'file')
    .reduce((sum, s) => sum + (s.fileSize || 0), 0);

  // Bulk action handlers
  const handleBulkApprove = async () => {
    // TODO: Implement bulk approve
    console.log('Bulk approve:', selectedIds);
    alert('Bulk approve coming soon!');
  };

  const handleBulkReject = async () => {
    // TODO: Implement bulk reject
    console.log('Bulk reject:', selectedIds);
    alert('Bulk reject coming soon!');
  };

  const handleDownloadZip = async () => {
    // TODO: Implement ZIP download (HG-511)
    console.log('Download ZIP:', selectedIds);
    alert('ZIP download coming in HG-511!');
  };

  const handleReview = (submission: SubmissionWithCreator) => {
    router.push(`/admin/submissions/${submission.id}`);
  };

  // Week options for dropdown
  const currentWeek = getCurrentWeek();
  const weekOptions = [
    { value: 'all', label: 'All Weeks' },
    { value: currentWeek, label: 'This Week' },
    ...getPreviousWeeks(4).map(week => ({
      value: week,
      label: week,
    })),
  ];

  const allSelected = filteredSubmissions.length > 0 && 
    filteredSubmissions.every(s => selectedIds.has(s.id));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-zinc-950">
        {/* Background Orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <PageHeader 
            title="Content Submissions"
            subtitle="Review and manage creator submissions"
            icon="📋"
            accentColor="orange"
            align="left"
          />

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard label="Total" value={stats.total} loading={loading} />
            <StatCard label="Pending Review" value={stats.pending} color="yellow" urgent loading={loading} />
            <StatCard label="Volume" value={stats.volume} color="blue" loading={loading} />
            <StatCard label="Milestones" value={stats.milestones} color="purple" loading={loading} />
            <StatCard label="Video Files" value={stats.files} color="emerald" loading={loading} />
            <StatCard label="TikTok URLs" value={stats.urls} loading={loading} />
          </div>

          {/* Table Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="p-6 border-b border-zinc-800">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <SearchIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, handle, URL, or filename..."
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                </div>
                
                {/* Dropdowns */}
                <div className="flex flex-wrap gap-2">
                  <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-300 focus:outline-none focus:border-orange-500"
                  >
                    <option value="all">All Types</option>
                    <option value="volume">Volume</option>
                    <option value="milestone">Milestone</option>
                  </select>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-300 focus:outline-none focus:border-orange-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select 
                    value={weekFilter}
                    onChange={(e) => setWeekFilter(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-300 focus:outline-none focus:border-orange-500"
                  >
                    {weekOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Format Filter Pills */}
              <div className="flex flex-wrap gap-2 mt-4">
                <FilterPill 
                  label="All Content" 
                  active={formatFilter === 'all'} 
                  onClick={() => setFormatFilter('all')}
                  count={stats.total}
                />
                <FilterPill 
                  label="🔗 TikTok URLs" 
                  active={formatFilter === 'url'} 
                  onClick={() => setFormatFilter('url')}
                  count={stats.urls}
                />
                <FilterPill 
                  label="🎬 Video Files" 
                  active={formatFilter === 'file'} 
                  onClick={() => setFormatFilter('file')}
                  count={stats.files}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="py-3 px-4 w-12">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Creator</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Content</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Format</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Tier</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    // Loading skeletons
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-zinc-800/50">
                        <td className="py-4 px-4"><Skeleton className="w-4 h-4" /></td>
                        <td className="py-4 px-4"><Skeleton className="w-32 h-8" /></td>
                        <td className="py-4 px-4"><Skeleton className="w-40 h-6" /></td>
                        <td className="py-4 px-4"><Skeleton className="w-16 h-6" /></td>
                        <td className="py-4 px-4"><Skeleton className="w-16 h-6" /></td>
                        <td className="py-4 px-4"><Skeleton className="w-12 h-6" /></td>
                        <td className="py-4 px-4"><Skeleton className="w-16 h-6" /></td>
                        <td className="py-4 px-4"><Skeleton className="w-12 h-6" /></td>
                        <td className="py-4 px-4"><Skeleton className="w-16 h-8" /></td>
                      </tr>
                    ))
                  ) : filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-zinc-500">
                        <div className="text-4xl mb-2">📭</div>
                        <div>No submissions found</div>
                        <div className="text-sm">Try adjusting your filters</div>
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((submission) => (
                      <SubmissionRow 
                        key={submission.id} 
                        submission={submission}
                        isSelected={selectedIds.has(submission.id)}
                        onSelect={handleSelect}
                        onReview={handleReview}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
              <span className="text-zinc-500 text-sm">
                Showing {filteredSubmissions.length} of {submissions.length} submissions
              </span>
              <div className="flex items-center gap-2">
                <button 
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50" 
                  disabled
                >
                  Previous
                </button>
                <span className="text-zinc-400 text-sm">Page 1 of 1</span>
                <button 
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50" 
                  disabled
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Action Bar */}
          <BulkActionBar 
            selectedCount={selectedIds.size}
            selectedFileCount={selectedFileCount}
            totalFileSize={totalFileSize}
            onApprove={handleBulkApprove}
            onReject={handleBulkReject}
            onDownloadZip={handleDownloadZip}
            onClear={() => setSelectedIds(new Set())}
          />
        </main>

        {/* Global Styles */}
        <style>{`
          @keyframes slide-up {
            from { 
              opacity: 0;
              transform: translateX(-50%) translateY(20px);
            }
            to { 
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
          
          .animate-slide-up {
            animation: slide-up 0.3s ease-out forwards;
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}