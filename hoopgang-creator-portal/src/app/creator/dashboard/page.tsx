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
      // Refetch creator data
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

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['creator']}>
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-8 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center py-12">
              <p className="text-white/60">Loading...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!creator) {
    return (
      <ProtectedRoute allowedRoles={['creator']}>
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-8 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center py-12">
              <p className="text-white/60 mb-4">No application found</p>
              <Link href="/apply">
                <Button variant="primary">Apply Now</Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const firstName = getFirstName(creator.fullName);
  const timelineSteps = getTimelineSteps();
  const daysRemaining = getDaysRemaining();

  return (
    <ProtectedRoute allowedRoles={['creator']}>
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-8 text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Welcome back, {firstName}! 🏀
          </h1>
          <p className="text-white/90">You're officially part of the HoopGang Creator Squad</p>
        </div>

        {/* Completion Banner - show when all 3 videos submitted */}
        {creator.contentSubmissions.length >= 3 && creator.status !== 'completed' && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-8 text-center mb-8">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              All Content Submitted!
            </h2>
            <p className="text-white/90">
              Amazing work! Your submissions are being reviewed. You'll be marked as completed soon!
            </p>
          </div>
        )}

        {/* Already Completed Banner */}
        {creator.status === 'completed' && (
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl p-8 text-center mb-8">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Collaboration Complete!
            </h2>
            <p className="text-white/90 mb-4">
              You crushed it! Thanks for being part of HoopGang.
            </p>
            <Link href="/apply">
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white">
                Start a New Collaboration
              </Button>
            </Link>
          </div>
        )}

        {/* Status Timeline */}
        <SectionCard title="Your Collaboration Status" icon="📋" className="mb-6">
          <div className="relative">
            {/* Vertical line - positioned to align with header icon */}
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-white/20" />

            {timelineSteps.map((step, index) => (
              <div key={index} className="relative mb-6 last:mb-0 pl-10">
                {/* Dot - aligned with line */}
                <div
                  className={`absolute left-0 w-4 h-4 rounded-full ${
                    step.status === 'completed'
                      ? 'bg-green-500'
                      : step.status === 'active'
                        ? 'bg-orange-500 animate-pulse'
                        : step.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-white/20'
                  }`}
                />

                {/* Content */}
                <div>
                  <div className="font-medium text-white">{step.label}</div>
                  {step.date && (
                    <div className="text-sm text-white/50 mt-0.5">{step.date}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Package Card - Only show if not pending */}
        {creator.status !== 'pending' && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span>📦</span> Your Package
            </h2>

            {creator.trackingNumber ? (
              <div className="space-y-6">
                {/* Map status to ShippingStatus */}
                {(() => {
                  let currentStatus: ShippingStatus;
                  
                  if (creator.shipment?.shippingStatus) {
                    currentStatus = creator.shipment.shippingStatus;
                  } else {
                    // Map creator.status to ShippingStatus
                    if (creator.status === 'shipped') {
                      currentStatus = 'transit'; // Default to transit when shipped
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

                {/* Countdown for delivered packages */}
                {creator.status === 'delivered' && creator.contentDeadline && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-6 text-center">
                    {(() => {
                      const deadline = creator.contentDeadline!;
                      const now = new Date();
                      const diffTime = deadline.getTime() - now.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const isOverdue = diffDays < 0;
                      
                      return (
                        <>
                          <div className="text-5xl font-bold text-orange-500 mb-2">
                            {isOverdue ? 0 : diffDays}
                          </div>
                          <div className="text-white font-medium text-lg">
                            {isOverdue ? 'Deadline passed' : `${diffDays === 1 ? 'day' : 'days'} left to post content`}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : creator.status === 'approved' ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 text-center">
                <p className="text-blue-400 text-lg">
                  Your package will ship soon! We'll update you when it's on the way.
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Only show content-related sections after approval */}
        {!['pending', 'denied'].includes(creator.status) && (
          <>
            {/* Content Submission Card */}
            <SectionCard title="Submit Your Content" icon="🎥" className="mb-6">
              {[0, 1, 2].map((index) => {
                const submission = creator.contentSubmissions[index];
                const isNextToSubmit = index === creator.contentSubmissions.length;
                const isPending = index > creator.contentSubmissions.length;

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-4 py-3 ${
                      index < 2 ? 'border-b border-white/10' : ''
                    }`}
                  >
                    <div className="font-medium text-white w-24">TikTok {index + 1}:</div>

                    {submission ? (
                      <>
                        <div className="flex-1 text-white/70 truncate">{submission.url}</div>
                        <Button variant="secondary" disabled size="sm">
                          ✓ Submitted
                        </Button>
                      </>
                    ) : isNextToSubmit ? (
                      <>
                        <input
                          type="url"
                          value={newContentUrl}
                          onChange={(e) => setNewContentUrl(e.target.value)}
                          placeholder="Enter TikTok URL..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
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
                        <div className="flex-1 text-white/30">—</div>
                        <Button variant="secondary" disabled size="sm">
                          Pending
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </SectionCard>

            {/* Agreement Card */}
            <SectionCard title="Your Agreement" icon="📋" className="mb-6">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-4">You agreed to:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-xl">🏀</span>
                    <span className="text-white/80 text-sm">
                      Post 3 TikToks featuring your HoopGang product within 14 days
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">🏀</span>
                    <span className="text-white/80 text-sm">Tag @thehoopgang in every post</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">🏀</span>
                    <span className="text-white/80 text-sm">Use trending basketball sounds</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">🏀</span>
                    <span className="text-white/80 text-sm">Show the product in action</span>
                  </li>
                </ul>

                {/* Countdown with dates */}
                <div className="bg-white/5 rounded-xl p-4 mt-6 text-center">
                  {creator.deliveredAt && creator.contentDeadline ? (
                    <>
                      <div className="text-4xl font-bold text-orange-500 mb-1">
                        {daysRemaining.days !== null ? Math.max(0, daysRemaining.days) : '—'}
                      </div>
                      <div className="text-white/60 text-sm mb-3">{daysRemaining.label}</div>
                      <div className="border-t border-white/10 pt-3 mt-3">
                        <div className="flex justify-between text-sm">
                          <div>
                            <span className="text-white/40">Start:</span>{' '}
                            <span className="text-white/70">{formatDate(creator.deliveredAt)}</span>
                          </div>
                          <div>
                            <span className="text-white/40">Deadline:</span>{' '}
                            <span className="text-white/70">{formatDate(creator.contentDeadline)}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl font-bold text-orange-500 mb-1">—</div>
                      <div className="text-white/60 text-sm">{daysRemaining.label}</div>
                    </>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Perks Card */}
            <SectionCard title="What's Next" icon="🎁">
              <p className="text-white/60 mb-4">
                Complete all 3 TikToks to unlock exclusive perks:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: '⭐', text: 'Get featured on @thehoopgang' },
                  { icon: '🎁', text: 'Early access to new drops' },
                  { icon: '💰', text: 'Unlock paid collaboration opportunities' },
                  { icon: '🏀', text: 'Join the exclusive Creator Squad' },
                ].map((perk, index) => (
                  <div key={index} className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
                    <span className="text-2xl">{perk.icon}</span>
                    <span className="text-white/80 text-sm">{perk.text}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        )}

        {/* Show pending message for pending/denied creators */}
        {creator.status === 'pending' && (
          <SectionCard title="What's Next?" icon="⏳" className="mb-6">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
              <p className="text-yellow-400 text-lg font-medium mb-2">
                Your application is under review!
              </p>
              <p className="text-white/60">
                We'll notify you once your application has been approved. This usually takes 1-3 business days.
              </p>
            </div>
          </SectionCard>
        )}

        {creator.status === 'denied' && (
          <SectionCard title="Application Status" icon="❌" className="mb-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
              <p className="text-red-400 text-lg font-medium mb-2">
                Application Not Approved
              </p>
              <p className="text-white/60 mb-4">
                Unfortunately, your application wasn't approved this time. You can apply again with a new application.
              </p>
              <Link href="/apply">
                <Button variant="primary">Apply Again</Button>
              </Link>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
    </ProtectedRoute>
  );
}

