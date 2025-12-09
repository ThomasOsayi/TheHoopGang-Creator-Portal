// src/app/creator/dashboard/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Creator, ShippingStatus } from '@/types';
import { getCreatorByUserId, addContentSubmission } from '@/lib/firestore';
import { SectionCard, Button, useToast, TrackingProgress } from '@/components/ui';
import { CONTENT_DEADLINE_DAYS } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/auth';

/**
 * Formats a date to a readable string
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Extracts first name from full name
 */
function getFirstName(fullName: string): string {
  return fullName.split(' ')[0];
}

export default function CreatorDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newContentUrl, setNewContentUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch creator data
  useEffect(() => {
    if (user) {
      fetchCreator();
    }
  }, [user]);

  const fetchCreator = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const creatorData = await getCreatorByUserId(user.uid);
      setCreator(creatorData);
    } catch (err) {
      console.error('Error fetching creator:', err);
      setError('Failed to load your dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitContent = async () => {
    if (!creator) return;

    if (!newContentUrl.trim()) {
      showToast('Please enter a valid URL', 'error');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addContentSubmission(creator.id, newContentUrl.trim());
      setNewContentUrl('');
      await fetchCreator();
      showToast('Content submitted!', 'success');
    } catch (err) {
      console.error('Error submitting content:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit content. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate days remaining for content deadline
  const getDaysRemaining = (): { days: number | null; label: string } => {
    if (!creator) return { days: null, label: 'Starts after delivery' };

    let deadline: Date | null = null;

    if (creator.contentDeadline) {
      deadline = creator.contentDeadline;
    } else if (creator.deliveredAt) {
      deadline = new Date(creator.deliveredAt);
      deadline.setDate(deadline.getDate() + CONTENT_DEADLINE_DAYS);
    }

    if (!deadline) {
      return { days: null, label: 'Starts after delivery' };
    }

    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { days: diffDays, label: diffDays > 0 ? 'DAYS REMAINING' : 'DEADLINE PASSED' };
  };

  // Determine timeline step states
  const getTimelineSteps = (): Array<{ label: string; status: 'completed' | 'active' | 'pending' | 'failed'; date?: string }> => {
    if (!creator) return [];

    const status = creator.status;
    const steps: Array<{ label: string; status: 'completed' | 'active' | 'pending' | 'failed'; date?: string }> = [
      { label: 'Application Received', status: 'completed' },
      { label: 'Application Approved', status: 'pending' },
      { label: 'Package Shipped', status: 'pending' },
      { label: 'Package Delivered', status: 'pending' },
      { label: 'Content Completed', status: 'pending' },
    ];

    if (status === 'pending') {
      steps[0].status = 'completed';
      steps[1].status = 'active';
    } else if (status === 'denied') {
      steps[0].status = 'completed';
      steps[1].status = 'failed';
    } else if (status === 'approved') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'active';
    } else if (status === 'shipped') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'completed';
      steps[3].status = 'active';
    } else if (status === 'delivered') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'completed';
      steps[3].status = 'completed';
      steps[4].status = 'active';
    } else if (status === 'completed') {
      steps.forEach((step) => (step.status = 'completed'));
    } else if (status === 'ghosted') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'completed';
      steps[3].status = 'completed';
      steps[4].status = 'failed';
    }

    // Add dates from statusHistory if available
    steps.forEach((step, index) => {
      const statusMap: Record<number, Creator['status']> = {
        0: 'pending',
        1: 'approved',
        2: 'shipped',
        3: 'delivered',
        4: 'completed',
      };
      const targetStatus = statusMap[index];
      if (targetStatus && creator.statusHistory) {
        const historyEntry = creator.statusHistory.find((h) => h.status === targetStatus);
        if (historyEntry) {
          step.date = formatDate(historyEntry.timestamp);
        }
      }
    });

    return steps;
  };

  // Get status label for stats
  const getStatusLabel = (status: Creator['status']): string => {
    const labels: Record<Creator['status'], string> = {
      pending: 'Under Review',
      denied: 'Not Approved',
      approved: 'Approved',
      shipped: 'In Transit',
      delivered: 'Delivered',
      completed: 'Completed',
      ghosted: 'Ghosted',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['creator']}>
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/60">Loading your dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!creator) {
    return (
      <ProtectedRoute allowedRoles={['creator']}>
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">🏀</div>
            <h1 className="text-2xl font-bold text-white mb-4">No Application Found</h1>
            <p className="text-white/60 mb-8">
              You haven't applied to join the HoopGang Creator Squad yet.
            </p>
              <Link href="/apply">
              <Button variant="primary" size="lg">Apply Now</Button>
              </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const firstName = getFirstName(creator.fullName);
  const timelineSteps = getTimelineSteps();
  const daysRemaining = getDaysRemaining();
  const videosSubmitted = creator.contentSubmissions.length;

  return (
    <ProtectedRoute allowedRoles={['creator']}>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        {/* Background Gradient Orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Welcome Banner */}
          <div className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 text-center mb-6 overflow-hidden hover:bg-white/[0.08] hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 cursor-default">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all duration-300" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/15 transition-all duration-300" />
            <div className="absolute top-4 left-4 text-6xl opacity-10 group-hover:opacity-20 transition-opacity">🏀</div>
            <div className="absolute bottom-4 right-4 text-6xl opacity-10 group-hover:opacity-20 transition-opacity">🏀</div>
            
            <div className="relative">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-orange-100 transition-colors">
            Welcome back, {firstName}! 🏀
          </h1>
              <p className="text-white/70 group-hover:text-white/90 transition-colors">
                You're officially part of the HoopGang Creator Squad
              </p>
            </div>
        </div>

          {/* Quick Stats Bar */}
          {!['pending', 'denied'].includes(creator.status) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center hover:bg-white/[0.08] hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
                <div className="text-2xl mb-1">📍</div>
                <div className="text-white font-semibold text-sm">{getStatusLabel(creator.status)}</div>
                <div className="text-white/50 text-xs">Current Status</div>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center hover:bg-white/[0.08] hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
                <div className="text-2xl mb-1">🎥</div>
                <div className="text-white font-semibold text-sm">{videosSubmitted}/3</div>
                <div className="text-white/50 text-xs">Videos Posted</div>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center hover:bg-white/[0.08] hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
                <div className="text-2xl mb-1">⏰</div>
                <div className={`font-semibold text-sm ${
                  daysRemaining.days !== null && daysRemaining.days <= 3 ? 'text-red-400' : 'text-white'
                }`}>
                  {daysRemaining.days !== null ? `${Math.max(0, daysRemaining.days)} days` : '—'}
                </div>
                <div className="text-white/50 text-xs">Time Left</div>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center hover:bg-white/[0.08] hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
                <div className="text-2xl mb-1">👕</div>
                <div className="text-white font-semibold text-sm truncate">{creator.product}</div>
                <div className="text-white/50 text-xs">Size {creator.size}</div>
              </div>
            </div>
          )}

          {/* Completion Banner */}
          {creator.contentSubmissions.length >= 3 && creator.status !== 'completed' && (
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🎉</div>
                <div>
                  <h2 className="text-lg font-bold text-green-400">All Content Submitted!</h2>
                  <p className="text-white/60 text-sm">
                    Amazing work! Your submissions are being reviewed. You'll be marked as completed soon!
                  </p>
                </div>
              </div>
          </div>
          )}

          {/* Already Completed Banner */}
          {creator.status === 'completed' && (
            <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🏆</div>
            <div>
                    <h2 className="text-lg font-bold text-cyan-400">Collaboration Complete!</h2>
                    <p className="text-white/60 text-sm">You crushed it! Thanks for being part of HoopGang.</p>
                  </div>
                </div>
                <Link href="/apply">
                  <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white">
                    Start New Collab
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Pending Status Banner */}
          {creator.status === 'pending' && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl animate-pulse">⏳</div>
            <div>
                  <h2 className="text-lg font-bold text-yellow-400">Application Under Review</h2>
                  <p className="text-white/60 text-sm">
                    We'll notify you once your application has been approved. Usually takes 1-3 business days.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Denied Status Banner */}
          {creator.status === 'denied' && (
            <div className="bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30 rounded-2xl p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">😔</div>
            <div>
                    <h2 className="text-lg font-bold text-red-400">Application Not Approved</h2>
                    <p className="text-white/60 text-sm">
                      Unfortunately, your application wasn't approved this time. Feel free to apply again!
                    </p>
                  </div>
            </div>
                <Link href="/apply">
                  <Button variant="primary">Apply Again</Button>
                </Link>
              </div>
            </div>
          )}

          {/* Main Two-Column Grid - Only show for active/shipped/delivered/completed/ghosted */}
          {!['pending', 'denied'].includes(creator.status) && (
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left Column - Timeline (2/5 width on desktop) */}
              <div className="lg:col-span-2">
              <SectionCard title="Your Journey" icon="📋" className="h-full hover:border-white/20 transition-all duration-300">
                <div className="relative">
                  {/* Vertical progress line */}
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-white/10" />

                  {timelineSteps.map((step, index) => (
                    <div key={index} className="relative mb-6 last:mb-0 pl-10">
                      {/* Progress line fill */}
                      {step.status === 'completed' && index < timelineSteps.length - 1 && (
                        <div 
                          className="absolute left-2 top-4 w-0.5 h-full bg-gradient-to-b from-green-500 to-green-500/50"
                          style={{ height: 'calc(100% + 1.5rem)' }}
                        />
                      )}
                      
                      {/* Dot */}
                      <div
                        className={`absolute left-0 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${
                          step.status === 'completed'
                            ? 'bg-green-500 shadow-lg shadow-green-500/30'
                            : step.status === 'active'
                              ? 'bg-orange-500 ring-4 ring-orange-500/30 animate-pulse'
                              : step.status === 'failed'
                                ? 'bg-red-500 shadow-lg shadow-red-500/30'
                                : 'bg-white/20'
                        }`}
                      >
                        {step.status === 'completed' && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
          </div>

                      {/* Content */}
                      <div>
                        <div className={`font-medium ${
                          step.status === 'completed' ? 'text-white' :
                          step.status === 'active' ? 'text-orange-400' :
                          step.status === 'failed' ? 'text-red-400' :
                          'text-white/40'
                        }`}>
                          {step.label}
                        </div>
                        {step.date && (
                          <div className="text-sm text-white/50 mt-0.5">{step.date}</div>
                        )}
                        {step.status === 'active' && (
                          <div className="text-xs text-orange-400 mt-1">In Progress</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* Right Column - Package & Content (3/5 width on desktop) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Package Tracking Card */}
              {creator.status !== 'pending' && creator.status !== 'denied' && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>📦</span> Your Package
                  </h2>

                  {creator.trackingNumber ? (
                    <div className="space-y-6">
                      {(() => {
                        let currentStatus: ShippingStatus;
                        
                        if (creator.shipment?.shippingStatus) {
                          currentStatus = creator.shipment.shippingStatus;
                        } else {
                          if (creator.status === 'shipped') {
                            currentStatus = 'transit';
                          } else if (creator.status === 'delivered') {
                            currentStatus = 'delivered';
                          } else {
                            currentStatus = 'pending';
                          }
                        }
                        
                        return (
                          <TrackingProgress
                            currentStatus={currentStatus}
                            trackingNumber={creator.trackingNumber}
                            carrier={creator.carrier}
                            lastUpdate={creator.shipment?.lastUpdate}
                          />
                        );
                      })()}
                    </div>
                  ) : creator.status === 'approved' ? (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 text-center">
                      <div className="text-3xl mb-3">📬</div>
                      <p className="text-blue-400 text-lg font-medium">
                        Your package will ship soon!
                      </p>
                      <p className="text-white/50 text-sm mt-1">
                        We'll update you when it's on the way.
                      </p>
                    </div>
                  ) : null}
            </div>
          )}

        {/* Content Submission Card */}
              {!['pending', 'denied'].includes(creator.status) && (
                <SectionCard title="Submit Your Content" icon="🎥" className="hover:border-white/20 transition-all duration-300">
                  {/* Progress indicator */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/60">Progress</span>
                      <span className="text-white font-medium">{videosSubmitted}/3 videos</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${(videosSubmitted / 3) * 100}%` }}
                      />
                    </div>
                    {videosSubmitted > 0 && videosSubmitted < 3 && (
                      <p className="text-orange-400 text-xs mt-2">
                        🔥 {videosSubmitted} down, {3 - videosSubmitted} to go!
                      </p>
                    )}
                  </div>

          {[0, 1, 2].map((index) => {
            const submission = creator.contentSubmissions[index];
            const isNextToSubmit = index === creator.contentSubmissions.length;
            const isPending = index > creator.contentSubmissions.length;

            return (
              <div
                key={index}
                        className={`flex items-center gap-4 py-4 ${
                  index < 2 ? 'border-b border-white/10' : ''
                }`}
              >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                          submission ? 'bg-green-500/20 text-green-400' :
                          isNextToSubmit ? 'bg-orange-500/20 text-orange-400' :
                          'bg-white/10 text-white/30'
                        }`}>
                          {submission ? '✓' : index + 1}
                        </div>

                {submission ? (
                  <>
                            <div className="flex-1 min-w-0">
                              <a 
                                href={submission.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/70 text-sm truncate block hover:text-orange-400 transition-colors"
                              >
                                {submission.url}
                              </a>
                              <div className="text-white/40 text-xs mt-0.5">
                                Submitted {formatDate(submission.submittedAt)}
                              </div>
                            </div>
                            <span className="text-green-400 text-xs font-medium px-2 py-1 bg-green-500/10 rounded-lg">
                              ✓ Done
                            </span>
                  </>
                ) : isNextToSubmit ? (
                  <>
                    <input
                      type="url"
                      value={newContentUrl}
                      onChange={(e) => setNewContentUrl(e.target.value)}
                              placeholder="Paste your TikTok URL..."
                              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      disabled={submitting}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSubmitContent}
                      disabled={submitting || !newContentUrl.trim()}
                      loading={submitting}
                    >
                      Submit
                    </Button>
                  </>
                ) : (
                  <>
                            <div className="flex-1 text-white/30 text-sm">Waiting...</div>
                            <span className="text-white/30 text-xs font-medium px-2 py-1 bg-white/5 rounded-lg">
                      Pending
                            </span>
                  </>
                )}
              </div>
            );
          })}
        </SectionCard>
              )}
              </div>
            </div>
          )}

          {/* Bottom Section - Agreement & Perks (Full Width) */}
          {!['pending', 'denied'].includes(creator.status) && (
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {/* Agreement Card */}
              <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/15 transition-all duration-300">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>📋</span> Your Agreement
                </h2>
                
                <div className="space-y-3">
                  {[
                    { icon: '🎥', text: 'Post 3 TikToks featuring HoopGang' },
                    { icon: '🏷️', text: 'Tag @thehoopgang in every post' },
                    { icon: '🎵', text: 'Use trending basketball sounds' },
                    { icon: '🏀', text: 'Show the product in action' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-white/70">{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Deadline info */}
                {creator.deliveredAt && creator.contentDeadline && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Started: {formatDate(creator.deliveredAt)}</span>
                      <span className="text-white/40">Due: {formatDate(creator.contentDeadline)}</span>
                    </div>
                  </div>
                )}
          </div>

        {/* Perks Card */}
              <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/15 transition-all duration-300">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>🎁</span> Unlock Perks
                </h2>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: '⭐', text: 'Get featured', unlocked: videosSubmitted >= 3 },
                    { icon: '🎁', text: 'Early drops', unlocked: creator.status === 'completed' },
                    { icon: '💰', text: 'Paid collabs', unlocked: creator.status === 'completed' },
                    { icon: '🏀', text: 'Creator Squad', unlocked: videosSubmitted >= 1 },
            ].map((perk, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center gap-2 p-3 rounded-xl transition-all ${
                        perk.unlocked 
                          ? 'bg-green-500/10 border border-green-500/20' 
                          : 'bg-white/5 border border-white/5 opacity-50'
                      }`}
                    >
                      <span className="text-xl">{perk.icon}</span>
                      <span className={`text-xs font-medium ${perk.unlocked ? 'text-green-400' : 'text-white/50'}`}>
                        {perk.text}
                      </span>
                      {perk.unlocked && <span className="ml-auto text-green-400 text-xs">✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pending/Denied Timeline Only */}
          {['pending', 'denied'].includes(creator.status) && (
            <SectionCard title="Your Journey" icon="📋" className="hover:border-white/20 transition-all duration-300">
              <div className="relative">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-white/10" />

                {timelineSteps.map((step, index) => (
                  <div key={index} className="relative mb-6 last:mb-0 pl-10">
                    <div
                      className={`absolute left-0 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${
                        step.status === 'completed'
                          ? 'bg-green-500 shadow-lg shadow-green-500/30'
                          : step.status === 'active'
                            ? 'bg-orange-500 ring-4 ring-orange-500/30 animate-pulse'
                            : step.status === 'failed'
                              ? 'bg-red-500 shadow-lg shadow-red-500/30'
                              : 'bg-white/20'
                      }`}
                    >
                      {step.status === 'completed' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {step.status === 'failed' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    <div>
                      <div className={`font-medium ${
                        step.status === 'completed' ? 'text-white' :
                        step.status === 'active' ? 'text-orange-400' :
                        step.status === 'failed' ? 'text-red-400' :
                        'text-white/40'
                      }`}>
                        {step.label}
                      </div>
                      {step.date && (
                        <div className="text-sm text-white/50 mt-0.5">{step.date}</div>
                      )}
                    </div>
              </div>
            ))}
          </div>
        </SectionCard>
          )}
      </div>
    </div>
    </ProtectedRoute>
  );
}