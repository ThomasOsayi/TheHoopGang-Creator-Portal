// src/app/admin/submissions/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Navbar, 
  AnimatedCounter, 
  GlowCard, 
  FilterPill,
  ConfirmModal,
  SuccessAnimation,
  PageHeader,
  MilestoneReviewModal,
} from '@/components/ui';
import { ProtectedRoute } from '@/components/auth';
import { auth } from '@/lib/firebase';
import { V3ContentSubmission, V3SubmissionType, V3SubmissionStatus, V3SubmissionFormat } from '@/types';
import { getCurrentWeek, getPreviousWeeks } from '@/lib/week-utils';

// ============================================
// Types
// ============================================
interface EnrichedSubmission extends V3ContentSubmission {
  creatorName: string;
  creatorHandle: string;
  creatorEmail: string;
}

// ============================================
// Icon Components
// ============================================
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

function PlayIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function XMarkIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ============================================
// Utility Functions
// ============================================
function truncateTikTokUrl(url: string): string {
  try {
    const match = url.match(/@([^/]+)\/video\/(\d+)/);
    if (match) {
      const username = match[1];
      const videoId = match[2].slice(0, 6);
      return `@${username}/video/${videoId}...`;
    }
    return url.length > 30 ? url.slice(0, 30) + '...' : url;
  } catch {
    return url.slice(0, 30) + '...';
  }
}

function formatRelativeDate(date: Date | string): { date: string; time: string } {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const inputDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const time = d.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  if (inputDate.getTime() === today.getTime()) {
    return { date: 'Today', time };
  } else if (inputDate.getTime() === yesterday.getTime()) {
    return { date: 'Yesterday', time };
  } else {
    return { 
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time 
    };
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============================================
// Badge Components
// ============================================
function TypeBadge({ type }: { type: V3SubmissionType }) {
  const config = {
    volume: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Volume' },
    milestone: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', label: 'Milestone' },
  };
  const style = config[type] || config.volume;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

function SubmissionStatusBadge({ status }: { status: V3SubmissionStatus }) {
  const config = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Pending' },
    approved: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Approved' },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'Rejected' },
  };
  const style = config[status] || config.pending;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

function FormatBadge({ format }: { format: V3SubmissionFormat | undefined }) {
  const actualFormat = format || 'url';
  const config = {
    url: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'URL', Icon: LinkIcon },
    file: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'File', Icon: VideoIcon },
  };
  const style = config[actualFormat] || config.url;
  const Icon = style.Icon;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border} inline-flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {style.label}
    </span>
  );
}

function TierBadge({ tier }: { tier: string | null | undefined }) {
  if (!tier) return <span className="text-zinc-600">—</span>;

  const config: Record<string, { bg: string; text: string; border: string; label: string }> = {
    '100k': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: '100K' },
    '500k': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', label: '500K' },
    '1m': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: '1M+' },
  };
  const style = config[tier.toLowerCase()] || config['100k'];

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

// ============================================
// Download Progress Modal Component
// ============================================
interface DownloadProgressModalProps {
  isOpen: boolean;
  currentFile: number;
  totalFiles: number;
  currentFileName: string;
  onCancel: () => void;
}

function DownloadProgressModal({ 
  isOpen, 
  currentFile, 
  totalFiles, 
  currentFileName,
  onCancel 
}: DownloadProgressModalProps) {
  if (!isOpen) return null;

  const progress = totalFiles > 0 ? (currentFile / totalFiles) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md mx-4 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Creating ZIP File</h3>
          <button 
            onClick={onCancel}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-400">Downloading files...</span>
            <span className="text-white font-medium">{currentFile} / {totalFiles}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="text-sm text-zinc-500 truncate">
          {currentFileName ? `📁 ${currentFileName}` : 'Preparing...'}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Video Preview Modal Component
// ============================================
interface VideoPreviewModalProps {
  isOpen: boolean;
  submission: EnrichedSubmission | null;
  onClose: () => void;
  onApprove: (submission: EnrichedSubmission) => void;
  onReject: (submission: EnrichedSubmission) => void;
  isProcessing: boolean;
}

function VideoPreviewModal({ 
  isOpen, 
  submission, 
  onClose, 
  onApprove, 
  onReject,
  isProcessing 
}: VideoPreviewModalProps) {
  if (!isOpen || !submission) return null;

  const { date, time } = formatRelativeDate(submission.submittedAt);
  const isPending = submission.status === 'pending';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fade-in-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold">
              {submission.creatorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-white font-medium">{submission.creatorName}</div>
              <div className="text-zinc-500 text-sm">@{submission.creatorHandle}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <SubmissionStatusBadge status={submission.status} />
            <button 
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[60vh]">
          {submission.fileUrl ? (
            <video 
              src={submission.fileUrl}
              controls
              autoPlay
              className="max-w-full max-h-full"
              style={{ maxHeight: '60vh' }}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="text-zinc-500 flex flex-col items-center gap-2">
              <VideoIcon className="w-12 h-12" />
              <span>Video not available</span>
            </div>
          )}
        </div>

        {/* Footer with Info & Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
          {/* File Info Row */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <VideoIcon className="w-4 h-4" />
              <span className="text-zinc-300">{submission.fileName || 'Untitled Video'}</span>
            </div>
            <div className="text-zinc-500">
              {formatFileSize(submission.fileSize)}
            </div>
            <div className="text-zinc-500">
              {date} at {time}
            </div>
            <FormatBadge format={submission.submissionFormat} />
            <TypeBadge type={submission.type} />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (submission.fileUrl) {
                  window.open(submission.fileUrl, '_blank');
                }
              }}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              Download
            </button>

            {isPending ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onReject(submission)}
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>✕</span>
                  )}
                  Reject
                </button>
                <button
                  onClick={() => onApprove(submission)}
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>✓</span>
                  )}
                  Approve
                </button>
              </div>
            ) : (
              <div className="text-zinc-500 text-sm">
                {submission.status === 'approved' ? '✅ Already approved' : '🚫 Already rejected'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Submission Row Component
// ============================================
interface SubmissionRowProps {
  submission: EnrichedSubmission;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onReview: (submission: EnrichedSubmission) => void;
  onDownload: (submission: EnrichedSubmission) => void;
}

function SubmissionRow({ submission, isSelected, onSelect, onReview, onDownload }: SubmissionRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const needsReview = submission.status === 'pending' && submission.type === 'milestone';
  const isFile = submission.submissionFormat === 'file';
  const { date, time } = formatRelativeDate(submission.submittedAt);

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
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
            {submission.creatorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white font-medium">{submission.creatorName}</div>
            <div className="text-zinc-500 text-sm">@{submission.creatorHandle}</div>
          </div>
        </div>
      </td>

      {/* Content (URL or File) */}
      <td className="py-4 px-4">
        {isFile ? (
          <div className="flex items-center gap-3">
            {/* File Thumbnail */}
            <div 
              className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center relative group cursor-pointer"
              onClick={() => onDownload(submission)}
            >
              <VideoIcon className="w-5 h-5 text-zinc-500" />
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <PlayIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <div className="text-white text-sm truncate max-w-[160px]" title={submission.fileName}>
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
            <span>{truncateTikTokUrl(submission.tiktokUrl)}</span>
            <svg 
              className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </td>

      {/* Format */}
      <td className="py-4 px-4">
        <FormatBadge format={submission.submissionFormat} />
      </td>

      {/* Type */}
      <td className="py-4 px-4">
        <TypeBadge type={submission.type} />
      </td>

      {/* Tier */}
      <td className="py-4 px-4">
        <TierBadge tier={submission.claimedTier} />
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <SubmissionStatusBadge status={submission.status} />
      </td>

      {/* Date */}
      <td className="py-4 px-4">
        <div>
          <div className="text-zinc-300">{date}</div>
          <div className="text-zinc-500 text-xs">{time}</div>
        </div>
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          {/* Download button for files */}
          {isFile && submission.fileUrl && (
            <button
              onClick={() => onDownload(submission)}
              className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
              title="Download Video"
            >
              <DownloadIcon className="w-4 h-4" />
            </button>
          )}

          {/* Review/View button */}
          {needsReview ? (
            <button
              onClick={() => onReview(submission)}
              className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors"
            >
              Review
            </button>
          ) : isFile ? (
            <button
              onClick={() => onReview(submission)}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-sm font-medium hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
            >
              View
            </button>
          ) : (
            <a
              href={submission.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-sm font-medium hover:bg-zinc-700 hover:text-zinc-300 transition-colors inline-block"
            >
              View
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

// ============================================
// Bulk Action Bar Component
// ============================================
interface BulkActionBarProps {
  selectedCount: number;
  selectedFileCount: number;
  totalFileSize: number;
  onApprove: () => void;
  onReject: () => void;
  onDownloadZip: () => void;
  onClear: () => void;
}

function BulkActionBar({ 
  selectedCount, 
  selectedFileCount,
  totalFileSize,
  onApprove, 
  onReject, 
  onDownloadZip,
  onClear 
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 z-50 animate-fade-in-up">
      <div className="flex flex-col">
        <span className="text-white font-medium">{selectedCount} selected</span>
        {selectedFileCount > 0 && (
          <span className="text-zinc-500 text-xs">
            {selectedFileCount} file{selectedFileCount !== 1 ? 's' : ''} • {formatFileSize(totalFileSize)}
          </span>
        )}
      </div>
      
      <div className="w-px h-8 bg-zinc-700" />
      
      <div className="flex items-center gap-2">
        {/* Download ZIP button - only show if files selected */}
        {selectedFileCount > 0 && (
          <button
            onClick={onDownloadZip}
            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-colors flex items-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            Download ZIP
          </button>
        )}
        
        <button
          onClick={onApprove}
          className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm font-medium hover:bg-green-500/30 transition-colors flex items-center gap-2"
        >
          <span>✓</span> Approve All
        </button>
        <button
          onClick={onReject}
          className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-2"
        >
          <span>✕</span> Reject All
        </button>
      </div>
      
      <button
        onClick={onClear}
        className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
      >
        Clear
      </button>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================
export default function AdminSubmissionsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data state - ALL submissions loaded once
  const [allSubmissions, setAllSubmissions] = useState<EnrichedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state - ALL filtering is client-side
  const [formatFilter, setFormatFilter] = useState<V3SubmissionFormat | ''>('');
  const [typeFilter, setTypeFilter] = useState<V3SubmissionType | ''>('');
  const [statusFilter, setStatusFilter] = useState<V3SubmissionStatus | ''>('');
  const [weekFilter, setWeekFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<{ icon: string; message: string } | null>(null);

  // ZIP download state
  const [zipProgress, setZipProgress] = useState<{
    isDownloading: boolean;
    currentFile: number;
    totalFiles: number;
    currentFileName: string;
  }>({
    isDownloading: false,
    currentFile: 0,
    totalFiles: 0,
    currentFileName: '',
  });
  const [zipCancelled, setZipCancelled] = useState(false);

  // Video preview modal state
  const [previewSubmission, setPreviewSubmission] = useState<EnrichedSubmission | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isPreviewProcessing, setIsPreviewProcessing] = useState(false);

  // Milestone review modal state
  const [milestoneReviewSubmission, setMilestoneReviewSubmission] = useState<EnrichedSubmission | null>(null);
  const [isMilestoneReviewOpen, setIsMilestoneReviewOpen] = useState(false);

  const weekOptions = getPreviousWeeks(8);

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
  // Data Fetching - Load ALL submissions once
  // ============================================
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

      // Only pass weekFilter to API - everything else is client-side
      const params = new URLSearchParams();
      if (weekFilter) params.set('weekOf', weekFilter);

      const response = await fetch(`/api/admin/submissions?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch submissions');

      const data = await response.json();
      setAllSubmissions(data.submissions || []);
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  // Only refetch when week changes (or on initial load)
  useEffect(() => {
    if (user && isAdmin) {
      loadSubmissions();
    }
  }, [user, isAdmin, weekFilter]);

  // ============================================
  // Client-Side Filtering
  // ============================================
  const filteredSubmissions = useMemo(() => {
    let filtered = [...allSubmissions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.creatorName.toLowerCase().includes(query) ||
          sub.creatorHandle.toLowerCase().includes(query) ||
          sub.tiktokUrl?.toLowerCase().includes(query) ||
          sub.fileName?.toLowerCase().includes(query)
      );
    }

    // Format filter (URL vs File)
    if (formatFilter) {
      filtered = filtered.filter((s) => (s.submissionFormat || 'url') === formatFilter);
    }

    // Type filter (client-side)
    if (typeFilter) {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }

    // Status filter (client-side)
    if (statusFilter) {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    return filtered;
  }, [allSubmissions, searchQuery, formatFilter, typeFilter, statusFilter]);

  // Stats - calculated from ALL submissions (not filtered)
  const stats = useMemo(() => ({
    total: allSubmissions.length,
    pending: allSubmissions.filter((s) => s.status === 'pending').length,
    volume: allSubmissions.filter((s) => s.type === 'volume').length,
    milestones: allSubmissions.filter((s) => s.type === 'milestone').length,
    files: allSubmissions.filter((s) => s.submissionFormat === 'file').length,
    urls: allSubmissions.filter((s) => s.submissionFormat !== 'file').length,
  }), [allSubmissions]);

  // Selected file stats
  const selectedSubmissions = useMemo(() => 
    filteredSubmissions.filter(s => selectedIds.has(s.id)),
    [filteredSubmissions, selectedIds]
  );
  
  const selectedFileCount = useMemo(() => 
    selectedSubmissions.filter(s => s.submissionFormat === 'file').length,
    [selectedSubmissions]
  );
  
  const totalFileSize = useMemo(() => 
    selectedSubmissions
      .filter(s => s.submissionFormat === 'file')
      .reduce((sum, s) => sum + (s.fileSize || 0), 0),
    [selectedSubmissions]
  );

  // ============================================
  // Selection Handlers
  // ============================================
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
      setSelectedIds(new Set(filteredSubmissions.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const allSelected = filteredSubmissions.length > 0 && filteredSubmissions.every((s) => selectedIds.has(s.id));

  // ============================================
  // Individual File Download
  // ============================================
  const handleDownloadFile = async (submission: EnrichedSubmission) => {
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

  // ============================================
  // ZIP Download (HG-511)
  // ============================================
  const handleDownloadZip = async () => {
    // Get selected file submissions
    const fileSubmissions = selectedSubmissions.filter(s => s.submissionFormat === 'file' && s.fileUrl);
    
    if (fileSubmissions.length === 0) {
      alert('No video files selected');
      return;
    }

    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    setZipCancelled(false);
    setZipProgress({
      isDownloading: true,
      currentFile: 0,
      totalFiles: fileSubmissions.length,
      currentFileName: '',
    });

    try {
      for (let i = 0; i < fileSubmissions.length; i++) {
        // Check if cancelled
        if (zipCancelled) {
          setZipProgress(prev => ({ ...prev, isDownloading: false }));
          return;
        }

        const submission = fileSubmissions[i];
        const fileName = submission.fileName || `video-${i + 1}.mp4`;
        
        setZipProgress(prev => ({
          ...prev,
          currentFile: i + 1,
          currentFileName: fileName,
        }));

        try {
          // Fetch the file
          const response = await fetch(submission.fileUrl!);
          if (!response.ok) throw new Error(`Failed to fetch ${fileName}`);
          
          const blob = await response.blob();
          
          // Add to zip with creator prefix for organization
          const zipFileName = `${submission.creatorHandle}_${fileName}`;
          zip.file(zipFileName, blob);
        } catch (fileError) {
          console.error(`Error downloading ${fileName}:`, fileError);
          // Continue with other files
        }
      }

      // Generate the ZIP
      setZipProgress(prev => ({ ...prev, currentFileName: 'Creating ZIP...' }));
      
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Download the ZIP
      const today = new Date().toISOString().split('T')[0];
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hoopgang-videos-${today}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessAnimation({
        icon: '📦',
        message: `${fileSubmissions.length} videos downloaded!`
      });
    } catch (error) {
      console.error('ZIP creation failed:', error);
      alert('Failed to create ZIP file. Please try again.');
    } finally {
      setZipProgress({
        isDownloading: false,
        currentFile: 0,
        totalFiles: 0,
        currentFileName: '',
      });
    }
  };

  const handleCancelZip = () => {
    setZipCancelled(true);
  };

  // ============================================
  // Bulk Actions
  // ============================================
  const handleBulkApprove = async () => {
    setIsProcessing(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/submissions/bulk', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: 'approve',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve submissions');
      }

      const result = await response.json();
      setSuccessAnimation({ 
        icon: '✅', 
        message: `${result.summary?.succeeded || selectedIds.size} Submissions Approved!` 
      });
      setSelectedIds(new Set());
      setBulkAction(null);
      await loadSubmissions();
    } catch (error) {
      console.error('Error bulk approving:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    setIsProcessing(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/submissions/bulk', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: 'reject',
          reason: 'Bulk rejected by admin',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject submissions');
      }

      const result = await response.json();
      setSuccessAnimation({ 
        icon: '🚫', 
        message: `${result.summary?.succeeded || selectedIds.size} Submissions Rejected` 
      });
      setSelectedIds(new Set());
      setBulkAction(null);
      await loadSubmissions();
    } catch (error) {
      console.error('Error bulk rejecting:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewClick = (submission: EnrichedSubmission) => {
    // Milestones open in modal, others navigate to detail page
    if (submission.type === 'milestone' && submission.status === 'pending') {
      handleMilestoneReviewClick(submission);
    } else {
      router.push(`/admin/submissions/${submission.id}`);
    }
  };

  // ============================================
  // Video Preview Modal Handlers
  // ============================================
  const handleOpenPreview = (submission: EnrichedSubmission) => {
    setPreviewSubmission(submission);
    setIsPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    setPreviewSubmission(null);
  };

  const handlePreviewApprove = async (submission: EnrichedSubmission) => {
    setIsPreviewProcessing(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/submissions/bulk', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: [submission.id],
          action: 'approve',
        }),
      });

      if (!response.ok) throw new Error('Failed to approve submission');

      setSuccessAnimation({ icon: '✅', message: 'Submission Approved!' });
      handleClosePreview();
      await loadSubmissions();
    } catch (error) {
      console.error('Error approving submission:', error);
    } finally {
      setIsPreviewProcessing(false);
    }
  };

  const handlePreviewReject = async (submission: EnrichedSubmission) => {
    setIsPreviewProcessing(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/submissions/bulk', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: [submission.id],
          action: 'reject',
          reason: 'Rejected via preview modal',
        }),
      });

      if (!response.ok) throw new Error('Failed to reject submission');

      setSuccessAnimation({ icon: '🚫', message: 'Submission Rejected' });
      handleClosePreview();
      await loadSubmissions();
    } catch (error) {
      console.error('Error rejecting submission:', error);
    } finally {
      setIsPreviewProcessing(false);
    }
  };

  // ============================================
  // Milestone Review Modal Handlers
  // ============================================
  const handleMilestoneReviewClick = (submission: EnrichedSubmission) => {
    setMilestoneReviewSubmission(submission);
    setIsMilestoneReviewOpen(true);
  };

  const handleMilestoneApprove = async (submissionId: string, verifiedViews: number) => {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/api/admin/submissions/${submissionId}/review`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        decision: 'approved',
        verifiedViews,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to approve milestone');
    }

    setSuccessAnimation({ icon: '🎉', message: 'Milestone Approved! Reward Unlocked!' });
    setIsMilestoneReviewOpen(false);
    setMilestoneReviewSubmission(null);
    await loadSubmissions();
  };

  const handleMilestoneReject = async (submissionId: string, reason: string) => {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/api/admin/submissions/${submissionId}/review`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        decision: 'rejected',
        rejectionReason: reason,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to reject milestone');
    }

    setSuccessAnimation({ icon: '🚫', message: 'Milestone Rejected' });
    setIsMilestoneReviewOpen(false);
    setMilestoneReviewSubmission(null);
    await loadSubmissions();
  };

  // ============================================
  // Render
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

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        {/* Background Gradient Orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <Navbar />

        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 pt-24">
          {/* Header */}
          <PageHeader 
            title="Content Submissions"
            subtitle="Review and manage creator content"
            icon="📹"
            accentColor="blue"
            align="left"
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
            <GlowCard glowColor="blue">
              <div className="text-3xl font-bold text-white mb-1">
                <AnimatedCounter value={stats.total} />
              </div>
              <div className="text-zinc-500 text-sm">Total</div>
            </GlowCard>

            <GlowCard glowColor="yellow" urgent={stats.pending > 0}>
              <div className="text-3xl font-bold text-yellow-400 mb-1">
                <AnimatedCounter value={stats.pending} />
              </div>
              <div className="text-yellow-400/70 text-sm">Pending</div>
            </GlowCard>

            <GlowCard glowColor="blue">
              <div className="text-3xl font-bold text-blue-400 mb-1">
                <AnimatedCounter value={stats.volume} />
              </div>
              <div className="text-zinc-500 text-sm">Volume</div>
            </GlowCard>

            <GlowCard glowColor="purple">
              <div className="text-3xl font-bold text-purple-400 mb-1">
                <AnimatedCounter value={stats.milestones} />
              </div>
              <div className="text-zinc-500 text-sm">Milestones</div>
            </GlowCard>

            <GlowCard glowColor="green">
              <div className="text-3xl font-bold text-emerald-400 mb-1">
                <AnimatedCounter value={stats.files} />
              </div>
              <div className="text-zinc-500 text-sm">Video Files</div>
            </GlowCard>

            <GlowCard glowColor="orange">
              <div className="text-3xl font-bold text-cyan-400 mb-1">
                <AnimatedCounter value={stats.urls} />
              </div>
              <div className="text-zinc-500 text-sm">TikTok URLs</div>
            </GlowCard>
          </div>

          {/* Table Section */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="p-6 border-b border-zinc-800">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
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
                    value={formatFilter}
                    onChange={(e) => setFormatFilter(e.target.value as V3SubmissionFormat | '')}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-300 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">All Formats</option>
                    <option value="url">TikTok URLs</option>
                    <option value="file">Video Files</option>
                  </select>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as V3SubmissionType | '')}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-300 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">All Types</option>
                    <option value="volume">Volume</option>
                    <option value="milestone">Milestone</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as V3SubmissionStatus | '')}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-300 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select
                    value={weekFilter}
                    onChange={(e) => setWeekFilter(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-300 focus:outline-none focus:border-orange-500"
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

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2 mt-4">
                <FilterPill
                  label="All"
                  active={!formatFilter && !typeFilter && !statusFilter}
                  onClick={() => {
                    setFormatFilter('');
                    setTypeFilter('');
                    setStatusFilter('');
                  }}
                  count={stats.total}
                />
                <FilterPill
                  label="⏳ Pending"
                  active={statusFilter === 'pending'}
                  onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')}
                  count={stats.pending}
                />
                <FilterPill
                  label="🔗 URLs"
                  active={formatFilter === 'url'}
                  onClick={() => setFormatFilter(formatFilter === 'url' ? '' : 'url')}
                  count={stats.urls}
                />
                <FilterPill
                  label="🎬 Files"
                  active={formatFilter === 'file'}
                  onClick={() => setFormatFilter(formatFilter === 'file' ? '' : 'file')}
                  count={stats.files}
                />
                <FilterPill
                  label="📊 Volume"
                  active={typeFilter === 'volume'}
                  onClick={() => setTypeFilter(typeFilter === 'volume' ? '' : 'volume')}
                  count={stats.volume}
                />
                <FilterPill
                  label="⭐ Milestone"
                  active={typeFilter === 'milestone'}
                  onClick={() => setTypeFilter(typeFilter === 'milestone' ? '' : 'milestone')}
                  count={stats.milestones}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
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
                  <div className="text-4xl mb-3">📭</div>
                  <div className="text-zinc-400">No submissions found</div>
                  <div className="text-zinc-500 text-sm mt-1">Try adjusting your filters</div>
                </div>
              ) : (
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
                      <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((submission) => (
                      <SubmissionRow
                        key={submission.id}
                        submission={submission}
                        isSelected={selectedIds.has(submission.id)}
                        onSelect={handleSelect}
                        onReview={(sub) => {
                          if (sub.type === 'milestone' && sub.status === 'pending') {
                            handleMilestoneReviewClick(sub);
                          } else if (sub.submissionFormat === 'file') {
                            handleOpenPreview(sub);
                          } else {
                            handleReviewClick(sub);
                          }
                        }}
                        onDownload={handleDownloadFile}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Table Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
              <span className="text-zinc-500 text-sm">
                Showing {filteredSubmissions.length} of {allSubmissions.length} submissions
              </span>
              <span className="text-zinc-400 text-sm">Page 1 of 1</span>
            </div>
          </div>
        </main>

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedIds.size}
          selectedFileCount={selectedFileCount}
          totalFileSize={totalFileSize}
          onApprove={() => setBulkAction('approve')}
          onReject={() => setBulkAction('reject')}
          onDownloadZip={handleDownloadZip}
          onClear={() => setSelectedIds(new Set())}
        />

        {/* ZIP Download Progress Modal */}
        <DownloadProgressModal
          isOpen={zipProgress.isDownloading}
          currentFile={zipProgress.currentFile}
          totalFiles={zipProgress.totalFiles}
          currentFileName={zipProgress.currentFileName}
          onCancel={handleCancelZip}
        />

        {/* Bulk Approve Confirmation Modal */}
        <ConfirmModal
          isOpen={bulkAction === 'approve'}
          onClose={() => setBulkAction(null)}
          onConfirm={handleBulkApprove}
          title="Approve Selected Submissions?"
          message={`This will approve ${selectedIds.size} selected submission(s).`}
          confirmLabel="Approve All"
          confirmColor="green"
          isProcessing={isProcessing}
          icon="✅"
        />

        {/* Bulk Reject Confirmation Modal */}
        <ConfirmModal
          isOpen={bulkAction === 'reject'}
          onClose={() => setBulkAction(null)}
          onConfirm={handleBulkReject}
          title="Reject Selected Submissions?"
          message={`This will reject ${selectedIds.size} selected submission(s).`}
          confirmLabel="Reject All"
          confirmColor="red"
          isProcessing={isProcessing}
          icon="🚫"
        />

        {/* Success Animation */}
        {successAnimation && (
          <SuccessAnimation
            icon={successAnimation.icon}
            message={successAnimation.message}
            onComplete={() => setSuccessAnimation(null)}
          />
        )}

        {/* Video Preview Modal */}
        <VideoPreviewModal
          isOpen={isPreviewModalOpen}
          submission={previewSubmission}
          onClose={handleClosePreview}
          onApprove={handlePreviewApprove}
          onReject={handlePreviewReject}
          isProcessing={isPreviewProcessing}
        />

        {/* Milestone Review Modal */}
        <MilestoneReviewModal
          isOpen={isMilestoneReviewOpen}
          onClose={() => {
            setIsMilestoneReviewOpen(false);
            setMilestoneReviewSubmission(null);
          }}
          submission={milestoneReviewSubmission}
          onApprove={handleMilestoneApprove}
          onReject={handleMilestoneReject}
        />
      </div>
    </ProtectedRoute>
  );
}