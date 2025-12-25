// src/app/creator/submit/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Navbar, 
  GlowCard, 
  AnimatedCounter, 
  LiveCountdown, 
  BackgroundOrbs,
  Confetti,
  SuccessToast,
  Skeleton,
  PageHeader,
} from '@/components/ui';
import { getCreatorByUserId } from '@/lib/firestore';
import { getCurrentWeek, getWeekEnd } from '@/lib/week-utils';
import { Creator } from '@/types';
import { auth } from '@/lib/firebase';
import { ProtectedRoute } from '@/components/auth';

// TikTok Icon SVG Component
function TikTokIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

// External Link Icon
function ExternalLinkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

// Upload Cloud Icon
function UploadIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

// File Video Icon
function FileVideoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
  );
}

// X/Close Icon
function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SubmitContentPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Volume submission state
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [volumeStats, setVolumeStats] = useState({
    weeklyCount: 0,
    allTimeCount: 0,
    currentRank: null as number | null,
    totalCreators: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Milestone rewards state
  const [milestoneRewards, setMilestoneRewards] = useState<Array<{
    id: string;
    name: string;
    description?: string;
    milestoneTier: string;
  }>>([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  
  // Recent submissions
  const [recentSubmissions, setRecentSubmissions] = useState<Array<{
    id: string;
    tiktokUrl: string;
    createdAt: Date;
  }>>([]);
  
  // Competition state
  const [activeCompetition, setActiveCompetition] = useState<{
    id: string;
    name: string;
    status: string;
    endsAt: string;
  } | null>(null);
  const [competitionLoading, setCompetitionLoading] = useState(true);
  
  // Success states
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successSubMessage, setSuccessSubMessage] = useState('');

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Helper function to get auth token
  const getAuthToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  // Function to load volume stats
  const loadVolumeStats = async () => {
    setStatsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/submissions/volume/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVolumeStats(data.stats);
        
        // Set recent submissions if available
        if (data.recentSubmissions) {
          setRecentSubmissions(data.recentSubmissions.slice(0, 3));
        }
      }
    } catch (error) {
      console.error('Error loading volume stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Function to fetch competition status
  const fetchCompetition = async () => {
    setCompetitionLoading(true);
    try {
      const response = await fetch('/api/competitions/active?type=volume');
      const data = await response.json();
      if (data.competition) {
        setActiveCompetition(data.competition);
      } else {
        setActiveCompetition(null);
      }
    } catch (err) {
      console.error('Error fetching competition:', err);
      setActiveCompetition(null);
    } finally {
      setCompetitionLoading(false);
    }
  };

  // Function to fetch milestone rewards from catalog
  const fetchMilestoneRewards = async () => {
    setRewardsLoading(true);
    try {
      const response = await fetch('/api/rewards?category=milestone');
      if (response.ok) {
        const data = await response.json();
        // Sort by tier value (100k, 500k, 1m)
        const tierOrder: Record<string, number> = { '100k': 1, '500k': 2, '1m': 3 };
        const sorted = (data.rewards || []).sort((a: any, b: any) => {
          return (tierOrder[a.milestoneTier] || 0) - (tierOrder[b.milestoneTier] || 0);
        });
        setMilestoneRewards(sorted);
      }
    } catch (error) {
      console.error('Error fetching milestone rewards:', error);
    } finally {
      setRewardsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadCreator() {
      if (!user) return;
      
      try {
        const creatorData = await getCreatorByUserId(user.uid);
        if (!creatorData) {
          router.push('/apply');
          return;
        }
        setCreator(creatorData);
      } catch (error) {
        console.error('Error loading creator:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadCreator();
      loadVolumeStats();
      fetchCompetition();
      fetchMilestoneRewards();
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiktokUrl.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/submissions/volume', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tiktokUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      // Clear input and refresh stats
      setTiktokUrl('');
      await loadVolumeStats();
      
      // Show celebration!
      setSuccessMessage('Content Submitted! 🎉');
      setSuccessSubMessage(`You now have ${volumeStats.weeklyCount + 1} submissions this week`);
      setShowConfetti(true);
      setShowSuccessToast(true);
      
      // Hide confetti after 3 seconds
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (error) {
      console.error('Submission error:', error);
      alert(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const validateTikTokUrl = (url: string): boolean => {
    return url.includes('tiktok.com/') || url.includes('vm.tiktok.com/');
  };

  // Format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Extract shortened URL for display
  const shortenUrl = (url: string): string => {
    try {
      const match = url.match(/@([^/]+)\/video\/(\d+)/);
      if (match) {
        return `@${match[1]}/video/${match[2].slice(0, 3)}...`;
      }
      return url.slice(0, 30) + '...';
    } catch {
      return url.slice(0, 30) + '...';
    }
  };

  // ===== FILE UPLOAD FUNCTIONS =====
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload MP4, MOV, WebM, AVI, or MKV';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 100MB';
    }
    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const error = validateFile(file);
      if (error) {
        alert(error);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const error = validateFile(file);
      if (error) {
        alert(error);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || isUploading) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', '/api/submissions/volume/file');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      await uploadPromise;

      // Clear file and refresh stats
      setSelectedFile(null);
      setUploadProgress(0);
      await loadVolumeStats();
      
      // Show celebration!
      setSuccessMessage('Video Uploaded! 🎬');
      setSuccessSubMessage(`You now have ${volumeStats.weeklyCount + 1} submissions this week`);
      setShowConfetti(true);
      setShowSuccessToast(true);
      
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/60">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['creator']}>
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      <Navbar />
      
      {/* Background Orbs */}
      <BackgroundOrbs colors={['orange', 'purple', 'orange']} />
      
      {/* Confetti on successful submission */}
      <Confetti show={showConfetti} />
      
      {/* Success Toast */}
      <SuccessToast 
        show={showSuccessToast}
        message={successMessage}
        subMessage={successSubMessage}
        onClose={() => setShowSuccessToast(false)}
      />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <PageHeader 
          title="Submit Content"
          subtitle="Post TikToks and climb the leaderboard"
          icon="🚀"
          accentColor="green"
        />

        {/* Competition Banner */}
        {!competitionLoading && activeCompetition?.status === 'active' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-green-500/10 border border-green-500/30 rounded-2xl animate-fade-in-up">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse inline-block" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <span className="text-green-400 font-bold">{activeCompetition.name} is LIVE!</span>
                </div>
                <span className="text-zinc-400 hidden sm:inline">Your submissions count toward the leaderboard</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-zinc-500 text-xs mb-1">Ends in</div>
                  <LiveCountdown targetDate={new Date(activeCompetition.endsAt)} size="md" />
                </div>
              </div>
            </div>
          </div>
        )}

        {!competitionLoading && (!activeCompetition || activeCompetition.status !== 'active') && (
          <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <span className="text-zinc-300 font-medium">No active competition</span>
                  <p className="text-zinc-500 text-sm">Your submissions will still be tracked</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-zinc-500 text-xs mb-1">Week resets in</div>
                <LiveCountdown targetDate={getWeekEnd(getCurrentWeek())} size="md" />
              </div>
            </div>
          </div>
        )}

        {/* Stats Row - 3 Large Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <GlowCard glowColor="orange" delay="0.1s" className="text-center py-8 hover:border-green-500/30 hover:shadow-[0_0_25px_-5px_rgba(34,197,94,0.25)]">
            <div className="text-4xl font-bold text-white mb-2">
              {statsLoading ? (
                <Skeleton className="w-12 h-10 mx-auto" />
              ) : activeCompetition?.status === 'active' ? (
                <AnimatedCounter value={volumeStats.weeklyCount} />
              ) : (
                <span className="text-zinc-500">—</span>
              )}
            </div>
            <div className="text-zinc-400">
              {activeCompetition?.status === 'active' ? 'This Competition' : 'Competition'}
            </div>
            {activeCompetition?.status !== 'active' && (
              <div className="text-zinc-600 text-xs">No active competition</div>
            )}
          </GlowCard>
          
          <GlowCard glowColor="orange" delay="0.15s" className="text-center py-8 border-orange-500/30 hover:border-amber-500/30 hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.25)]">
            <div className="text-4xl font-bold text-orange-400 mb-2">
              {statsLoading ? (
                <Skeleton className="w-16 h-10 mx-auto" />
              ) : activeCompetition?.status === 'active' && volumeStats.currentRank ? (
                <>
                  #<AnimatedCounter value={volumeStats.currentRank} />
                </>
              ) : (
                <span className="text-zinc-500">—</span>
              )}
            </div>
            <div className="text-zinc-400">Your Rank</div>
            {activeCompetition?.status === 'active' && volumeStats.totalCreators > 0 ? (
              <div className="text-zinc-500 text-sm">of {volumeStats.totalCreators} creators</div>
            ) : (
              <div className="text-zinc-600 text-xs">No active competition</div>
            )}
          </GlowCard>
          
          <GlowCard glowColor="orange" delay="0.2s" className="text-center py-8 hover:border-blue-500/30 hover:shadow-[0_0_25px_-5px_rgba(59,130,246,0.25)]">
            <div className="text-4xl font-bold text-white mb-2">
              {statsLoading ? (
                <Skeleton className="w-12 h-10 mx-auto" />
              ) : (
                <AnimatedCounter value={volumeStats.allTimeCount} />
              )}
            </div>
            <div className="text-zinc-400">All-Time</div>
          </GlowCard>
        </div>

        {/* Drop Your TikTok Link Card */}
        <GlowCard glowColor="orange" delay="0.25s" className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">Drop Your TikTok Link</h2>
            <p className="text-zinc-400">Paste your TikTok URL and we&apos;ll add it to your stats</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <TikTokIcon className="w-5 h-5" />
              </div>
              <input
                type="url"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@username/video/..."
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={!tiktokUrl.trim() || submitting || !validateTikTokUrl(tiktokUrl)}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white disabled:text-zinc-500 font-semibold rounded-xl transition-all"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit to Leaderboard →'
              )}
            </button>
          </form>
        </GlowCard>

        {/* Upload Video File Card */}
        <GlowCard glowColor="purple" delay="0.3s" className="mb-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-white">Or Upload a Video</h2>
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full">NEW</span>
            </div>
            <p className="text-zinc-400">Upload your video directly — no TikTok link needed</p>
          </div>

          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              dragActive 
                ? 'border-purple-500 bg-purple-500/10' 
                : selectedFile 
                  ? 'border-green-500/50 bg-green-500/5' 
                  : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/30'
            }`}
          >
            {!selectedFile ? (
              <>
                <div className={`mx-auto mb-4 transition-colors ${dragActive ? 'text-purple-400' : 'text-zinc-500'}`}>
                  <UploadIcon className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-white font-medium mb-1">
                  {dragActive ? 'Drop your video here' : 'Drag & drop your video'}
                </p>
                <p className="text-zinc-500 text-sm mb-4">or click to browse</p>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
                  <span>MP4, MOV, WebM</span>
                  <span>•</span>
                  <span>Max 100MB</span>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {/* Selected File Info */}
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <FileVideoIcon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-medium truncate max-w-[200px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-zinc-500 text-xs">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  {!isUploading && (
                    <button
                      onClick={clearSelectedFile}
                      className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-zinc-400 text-sm">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}

                {/* Upload Button */}
                {!isUploading && (
                  <button
                    onClick={handleFileUpload}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all"
                  >
                    Upload to Leaderboard →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Info Note */}
          <p className="text-zinc-500 text-xs text-center mt-4">
            📱 Video uploads count toward the leaderboard just like TikTok links
          </p>
        </GlowCard>

        {/* Recent Submissions */}
        <GlowCard glowColor="orange" delay="0.35s" className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📋</span>
            <h3 className="text-lg font-semibold text-white">Recent Submissions</h3>
          </div>

          {recentSubmissions.length > 0 ? (
            <div className="space-y-3">
              {recentSubmissions.map((submission) => (
                <div 
                  key={submission.id}
                  className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-white text-sm">
                        {submission.tiktokUrl ? shortenUrl(submission.tiktokUrl) : '📁 Video Upload'}
                      </div>
                      <div className="text-zinc-500 text-xs">{formatRelativeTime(submission.createdAt)}</div>
                    </div>
                  </div>
                  {submission.tiktokUrl && (
                    <a 
                      href={submission.tiktokUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <ExternalLinkIcon />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              <p>No submissions yet this week</p>
              <p className="text-sm">Submit your first TikTok above!</p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-zinc-700/50 text-center">
            <Link 
              href="/creator/submissions"
              className="text-zinc-400 hover:text-white transition-colors text-sm"
            >
              View All History →
            </Link>
          </div>
        </GlowCard>

        {/* Milestone Bonuses */}
        <GlowCard glowColor="amber" delay="0.4s" className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏆</span>
            <h3 className="text-lg font-semibold text-white">Milestone Bonuses</h3>
          </div>
          <p className="text-zinc-400 text-sm mb-6">Got a viral video? Claim extra rewards!</p>

          {rewardsLoading ? (
            // Loading skeletons
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-32 bg-zinc-800/50 rounded-xl animate-pulse" />
              <div className="h-32 bg-zinc-800/50 rounded-xl animate-pulse" />
              <div className="h-32 bg-zinc-800/50 rounded-xl animate-pulse" />
            </div>
          ) : milestoneRewards.length > 0 ? (
            // Dynamic rewards as cards
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {milestoneRewards.map((reward) => {
                const tierEmoji = reward.milestoneTier === '1m' ? '👑' : 
                                  reward.milestoneTier === '500k' ? '🔥' : '🎯';
                const tierLabel = reward.milestoneTier === '1m' ? '1M+ Views' :
                                  reward.milestoneTier === '500k' ? '500K Views' : '100K Views';
                const tierColor = reward.milestoneTier === '1m' ? 'from-amber-500/20 to-yellow-500/10 border-amber-500/30' :
                                  reward.milestoneTier === '500k' ? 'from-orange-500/20 to-red-500/10 border-orange-500/30' : 
                                  'from-purple-500/20 to-pink-500/10 border-purple-500/30';
                
                return (
                  <Link href={`/creator/rewards?reward=${reward.id}`} key={reward.id} className="block group">
                    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${tierColor} p-4 h-full transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}>
                      {/* Badge */}
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs font-medium rounded-full">
                          Milestone
                        </span>
                      </div>
                      
                      {/* Emoji */}
                      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                        {tierEmoji}
                      </div>
                      
                      {/* Title */}
                      <h4 className="text-white font-semibold mb-1">{tierLabel}</h4>
                      
                      {/* Reward Value */}
                      <div className="mt-2">
                        <span className="inline-block px-3 py-1 bg-zinc-800/80 text-green-400 text-sm font-medium rounded-full">
                          {reward.description || reward.name}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            // Fallback if no rewards configured
            <div className="text-center py-8 text-zinc-500">
              <p>Milestone rewards coming soon!</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link 
              href="/creator/rewards?filter=milestone"
              className="text-zinc-400 hover:text-white transition-colors text-sm"
            >
              View All Rewards →
            </Link>
          </div>
        </GlowCard>

        {/* Maximize Your Content - Pro Tips */}
        <GlowCard glowColor="purple" delay="0.45s" className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💡</span>
            <h3 className="text-lg font-semibold text-white">Maximize Your Content</h3>
          </div>

          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-zinc-400">
              <span className="text-orange-400 mt-0.5">•</span>
              <span>Tag <span className="text-orange-400">@thehoopgang</span> in every post for bonus visibility</span>
            </li>
            <li className="flex items-start gap-2 text-zinc-400">
              <span className="text-orange-400 mt-0.5">•</span>
              <span>Use trending sounds to boost your reach</span>
            </li>
            <li className="flex items-start gap-2 text-zinc-400">
              <span className="text-orange-400 mt-0.5">•</span>
              <span>Post during peak hours (6-9 PM) for maximum engagement</span>
            </li>
          </ul>
        </GlowCard>

        {/* Bottom Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <Link 
            href="/creator/leaderboard"
            className="text-zinc-400 hover:text-orange-400 transition-colors text-sm"
          >
            View leaderboard →
          </Link>
          <span className="text-zinc-700 hidden sm:inline">•</span>
          <Link 
            href="/creator/dashboard"
            className="text-zinc-400 hover:text-orange-400 transition-colors text-sm"
          >
            Back to dashboard →
          </Link>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}

export default function SubmitContentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <SubmitContentPageContent />
    </Suspense>
  );
}