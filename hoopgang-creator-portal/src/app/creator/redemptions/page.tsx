// src/app/creator/redemptions/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Navbar, 
  AnimatedCounter, 
  BackgroundOrbs,
  FilterPill,
  useToast,
  PageHeader,
} from '@/components/ui';
import { getCreatorByUserId } from '@/lib/firestore';
import { Creator, Redemption, RedemptionStatus, FulfillmentType, CashMethod, ShippingAddress } from '@/types';
import { auth } from '@/lib/firebase';
import { ProtectedRoute } from '@/components/auth';

type TabType = 'available' | 'processing' | 'completed';

// ============================================
// Helper Functions
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRedemptionIcon(fulfillmentType: FulfillmentType): string {
  switch (fulfillmentType) {
    case 'cash': return '💵';
    case 'store_credit': return '🎁';
    case 'product': return '📦';
    case 'mixed': return '✨';
    default: return '🎁';
  }
}

function getRedemptionValue(redemption: Redemption): string {
  const parts: string[] = [];
  
  if (redemption.cashValue) {
    parts.push(formatCurrency(redemption.cashValue));
  }
  if (redemption.storeCreditValue) {
    parts.push(`${formatCurrency(redemption.storeCreditValue)} Credit`);
  }
  if (redemption.productName) {
    parts.push(redemption.productName);
  }
  
  // Fallback to legacy field
  if (parts.length === 0 && redemption.cashAmount) {
    parts.push(formatCurrency(redemption.cashAmount));
  }
  
  return parts.length > 0 ? parts.join(' + ') : 'Reward';
}

function getSourceLabel(source: string): string {
  switch (source) {
    case 'milestone_submission': return 'Milestone';
    case 'volume_win': return 'Volume Competition';
    case 'gmv_win': return 'GMV Competition';
    case 'competition_win': return 'Competition';
    default: return 'Reward';
  }
}

// ============================================
// Status Badge Component
// ============================================

function StatusBadge({ status }: { status: RedemptionStatus }) {
  const config: Record<RedemptionStatus, { bg: string; text: string; label: string }> = {
    awaiting_claim: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Ready to Claim' },
    ready_to_fulfill: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Processing' },
    fulfilled: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' },
  };

  const { bg, text, label } = config[status] || config.awaiting_claim;

  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${bg} ${text}`}>
      {label}
    </span>
  );
}

// ============================================
// Redemption Card Component
// ============================================

interface RedemptionCardProps {
  redemption: Redemption;
  onClaim: (redemption: Redemption) => void;
}

function RedemptionCard({ redemption, onClaim }: RedemptionCardProps) {
  const isClaimable = redemption.status === 'awaiting_claim';
  const isProcessing = redemption.status === 'ready_to_fulfill';
  const isCompleted = redemption.status === 'fulfilled';
  const isRejected = redemption.status === 'rejected';

  return (
    <div 
      className={`bg-zinc-900/70 border rounded-2xl p-5 transition-all duration-300 ${
        isClaimable 
          ? 'border-yellow-500/30 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10' 
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Icon + Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
            isClaimable ? 'bg-yellow-500/20' :
            isProcessing ? 'bg-blue-500/20' :
            isCompleted ? 'bg-green-500/20' :
            'bg-red-500/20'
          }`}>
            {getRedemptionIcon(redemption.fulfillmentType)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-semibold truncate">{redemption.rewardName}</h3>
              <StatusBadge status={redemption.status} />
            </div>
            
            <div className="text-zinc-500 text-sm mt-1">
              {getSourceLabel(redemption.source)} • {formatDate(redemption.createdAt)}
            </div>

            {/* Value */}
            <div className={`text-lg font-bold mt-2 ${
              isClaimable ? 'text-yellow-400' :
              isProcessing ? 'text-blue-400' :
              isCompleted ? 'text-green-400' :
              'text-zinc-500 line-through'
            }`}>
              {getRedemptionValue(redemption)}
            </div>

            {/* Payment Info (if claimed) */}
            {isProcessing && redemption.cashMethod && (
              <div className="mt-2 text-sm text-zinc-400">
                Payment via <span className="text-white capitalize">{redemption.cashMethod}</span>
                {redemption.cashHandle && (
                  <span className="text-zinc-500"> • {redemption.cashHandle}</span>
                )}
              </div>
            )}

            {/* Fulfillment Info (if completed) */}
            {isCompleted && (
              <div className="mt-2 text-sm text-green-400">
                ✓ Fulfilled on {redemption.fulfilledAt ? formatDate(redemption.fulfilledAt) : 'N/A'}
                {redemption.trackingNumber && (
                  <span className="text-zinc-400"> • Tracking: {redemption.trackingNumber}</span>
                )}
              </div>
            )}

            {/* Rejection Reason */}
            {isRejected && redemption.rejectionReason && (
              <div className="mt-2 text-sm text-red-400">
                Reason: {redemption.rejectionReason}
              </div>
            )}
          </div>
        </div>

        {/* Right: Action Button */}
        {isClaimable && (
          <button
            onClick={() => onClaim(redemption)}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/25 flex-shrink-0"
          >
            Claim →
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Empty State Component
// ============================================

function EmptyState({ tab }: { tab: TabType }) {
  const config = {
    available: {
      icon: '🎉',
      title: 'No rewards to claim',
      subtitle: 'Hit milestones or win competitions to earn rewards!',
    },
    processing: {
      icon: '⏳',
      title: 'Nothing processing',
      subtitle: 'Claimed rewards will appear here while being fulfilled.',
    },
    completed: {
      icon: '🏆',
      title: 'No completed rewards yet',
      subtitle: 'Your fulfilled rewards will show up here.',
    },
  };

  const { icon, title, subtitle } = config[tab];

  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">{icon}</div>
      <div className="text-white text-xl font-semibold mb-2">{title}</div>
      <div className="text-zinc-500">{subtitle}</div>
    </div>
  );
}

// ============================================
// Cash Claim Modal Component
// ============================================

interface CashClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  redemption: Redemption | null;
  onSubmit: (redemptionId: string, cashMethod: CashMethod, cashHandle: string) => Promise<void>;
}

function CashClaimModal({ isOpen, onClose, redemption, onSubmit }: CashClaimModalProps) {
  const [cashMethod, setCashMethod] = useState<CashMethod | null>(null);
  const [cashHandle, setCashHandle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCashMethod(null);
      setCashHandle('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !redemption) return null;

  const paymentMethods: { id: CashMethod; name: string; icon: string; placeholder: string }[] = [
    { id: 'paypal', name: 'PayPal', icon: '💳', placeholder: 'PayPal email address' },
    { id: 'venmo', name: 'Venmo', icon: '📱', placeholder: '@username' },
    { id: 'cashapp', name: 'Cash App', icon: '💸', placeholder: '$cashtag' },
    { id: 'zelle', name: 'Zelle', icon: '🏦', placeholder: 'Phone or email' },
  ];

  const handleSubmit = async () => {
    if (!cashMethod) {
      setError('Please select a payment method');
      return;
    }
    if (!cashHandle.trim()) {
      setError('Please enter your payment handle');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(redemption.id, cashMethod, cashHandle.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim reward');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-yellow-500/20 rounded-xl flex items-center justify-center text-2xl">
              💵
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Claim Your Reward</h2>
              <div className="text-yellow-400 font-semibold">
                {getRedemptionValue(redemption)}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Payment Method Selection */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-3">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => {
                    setCashMethod(method.id);
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    cashMethod === method.id
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                  } disabled:opacity-50`}
                >
                  <div className="text-2xl mb-1">{method.icon}</div>
                  <div className="text-white font-medium text-sm">{method.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Handle Input */}
          {cashMethod && (
            <div className="animate-fade-in">
              <label className="block text-zinc-300 text-sm font-medium mb-2">
                {paymentMethods.find(m => m.id === cashMethod)?.name} Handle
              </label>
              <input
                type="text"
                value={cashHandle}
                onChange={(e) => {
                  setCashHandle(e.target.value);
                  setError(null);
                }}
                placeholder={paymentMethods.find(m => m.id === cashMethod)?.placeholder}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Info Note */}
          <div className="p-3 bg-zinc-800/50 rounded-xl text-zinc-400 text-sm">
            💡 Payment will be sent within 3-5 business days after claiming.
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !cashMethod || !cashHandle.trim()}
            className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Claiming...
              </>
            ) : (
              'Claim Reward →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Simple Claim Modal (for non-cash rewards)
// ============================================

interface SimpleClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  redemption: Redemption | null;
  onSubmit: (redemptionId: string) => Promise<void>;
}

function SimpleClaimModal({ isOpen, onClose, redemption, onSubmit }: SimpleClaimModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !redemption) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(redemption.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim reward');
    } finally {
      setIsSubmitting(false);
    }
  };

  const icon = getRedemptionIcon(redemption.fulfillmentType);
  const isStoreCredit = redemption.fulfillmentType === 'store_credit';
  const isProduct = redemption.fulfillmentType === 'product';

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="p-6 text-center border-b border-zinc-800">
          <div className="text-5xl mb-4">{icon}</div>
          <h2 className="text-xl font-bold text-white mb-2">{redemption.rewardName}</h2>
          <div className="text-orange-400 font-semibold text-lg">
            {getRedemptionValue(redemption)}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {isStoreCredit && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <div className="text-purple-400 font-medium mb-1">🎁 Store Credit</div>
              <div className="text-zinc-400 text-sm">
                A discount code will be sent to your email after claiming.
              </div>
            </div>
          )}

          {isProduct && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="text-blue-400 font-medium mb-1">📦 Product Reward</div>
              <div className="text-zinc-400 text-sm">
                Your reward will be shipped to your address on file. 
                You can update your shipping address in your profile.
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Claiming...
              </>
            ) : (
              'Confirm Claim →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function CreatorRedemptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(true);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('available');
  
  // Stats
  const [stats, setStats] = useState({
    totalEarned: 0,
    readyToClaim: 0,
    processing: 0,
  });
  
  // Modal state
  const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isSimpleModalOpen, setIsSimpleModalOpen] = useState(false);

  const getAuthToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  // Load redemptions
  const loadRedemptions = async () => {
    setRedemptionsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/creator/redemptions', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const allRedemptions = data.redemptions || [];
        setRedemptions(allRedemptions);
        
        // Calculate stats
        const available = allRedemptions.filter((r: Redemption) => r.status === 'awaiting_claim');
        const processing = allRedemptions.filter((r: Redemption) => r.status === 'ready_to_fulfill');
        const fulfilled = allRedemptions.filter((r: Redemption) => r.status === 'fulfilled');
        
        // Calculate total earned from fulfilled redemptions
        const totalEarned = fulfilled.reduce((sum: number, r: Redemption) => {
          return sum + (r.cashValue || r.cashAmount || 0) + (r.storeCreditValue || 0);
        }, 0);
        
        // Calculate value of available claims
        const claimableValue = available.reduce((sum: number, r: Redemption) => {
          return sum + (r.cashValue || r.cashAmount || 0) + (r.storeCreditValue || 0);
        }, 0);
        
        setStats({
          totalEarned,
          readyToClaim: claimableValue,
          processing: processing.length,
        });
      }
    } catch (error) {
      console.error('Error loading redemptions:', error);
      showToast('Failed to load redemptions', 'error');
    } finally {
      setRedemptionsLoading(false);
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
      loadRedemptions();
    }
  }, [user, authLoading, router]);

  // Handle claim click - determine which modal to open
  const handleClaimClick = (redemption: Redemption) => {
    setSelectedRedemption(redemption);
    
    if (redemption.fulfillmentType === 'cash' || redemption.cashValue) {
      setIsCashModalOpen(true);
    } else {
      setIsSimpleModalOpen(true);
    }
  };

  // Handle cash claim submission
  const handleCashClaim = async (redemptionId: string, cashMethod: CashMethod, cashHandle: string) => {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/api/creator/redemptions/${redemptionId}/claim`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cashMethod, cashHandle }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to claim reward');
    }

    showToast('Reward claimed successfully!', 'success');
    setIsCashModalOpen(false);
    setSelectedRedemption(null);
    await loadRedemptions();
  };

  // Handle simple claim submission (no payment info needed)
  const handleSimpleClaim = async (redemptionId: string) => {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/api/creator/redemptions/${redemptionId}/claim`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to claim reward');
    }

    showToast('Reward claimed successfully!', 'success');
    setIsSimpleModalOpen(false);
    setSelectedRedemption(null);
    await loadRedemptions();
  };

  // Filter redemptions by tab
  const filteredRedemptions = redemptions.filter((r) => {
    switch (activeTab) {
      case 'available':
        return r.status === 'awaiting_claim';
      case 'processing':
        return r.status === 'ready_to_fulfill';
      case 'completed':
        return r.status === 'fulfilled' || r.status === 'rejected';
      default:
        return true;
    }
  });

  // Count by tab
  const tabCounts = {
    available: redemptions.filter(r => r.status === 'awaiting_claim').length,
    processing: redemptions.filter(r => r.status === 'ready_to_fulfill').length,
    completed: redemptions.filter(r => r.status === 'fulfilled' || r.status === 'rejected').length,
  };

  if (authLoading || loading) {
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
        <BackgroundOrbs colors={['green', 'orange', 'amber']} />

        <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <PageHeader 
            title="My Rewards"
            subtitle="Claim your earned rewards and track payouts"
            icon="🏆"
            accentColor="green"
          />

          {/* Stats Bar */}
          <div className="mb-8 p-5 bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-green-500/10 border border-green-500/20 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
              {/* Total Earned */}
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">
                  $<AnimatedCounter value={stats.totalEarned} />
                </div>
                <div className="text-zinc-500 text-sm">Total Earned</div>
              </div>
              
              <div className="w-px h-12 bg-zinc-700 hidden sm:block" />
              
              {/* Ready to Claim */}
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">
                  $<AnimatedCounter value={stats.readyToClaim} />
                </div>
                <div className="text-zinc-500 text-sm">Ready to Claim</div>
              </div>
              
              <div className="w-px h-12 bg-zinc-700 hidden sm:block" />
              
              {/* Processing */}
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">
                  <AnimatedCounter value={stats.processing} />
                </div>
                <div className="text-zinc-500 text-sm">Processing</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('available')}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                activeTab === 'available'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <span>🎁</span> Available
              {tabCounts.available > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                  {tabCounts.available}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('processing')}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                activeTab === 'processing'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <span>⏳</span> Processing
              {tabCounts.processing > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">
                  {tabCounts.processing}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                activeTab === 'completed'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <span>✓</span> Completed
              {tabCounts.completed > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                  {tabCounts.completed}
                </span>
              )}
            </button>
          </div>

          {/* Redemptions List */}
          <div className="space-y-4">
            {redemptionsLoading ? (
              // Loading skeletons
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-zinc-800 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-zinc-800 rounded w-1/3" />
                      <div className="h-4 bg-zinc-800 rounded w-1/4" />
                      <div className="h-6 bg-zinc-800 rounded w-1/5" />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredRedemptions.length === 0 ? (
              <EmptyState tab={activeTab} />
            ) : (
              filteredRedemptions.map((redemption) => (
                <RedemptionCard
                  key={redemption.id}
                  redemption={redemption}
                  onClaim={handleClaimClick}
                />
              ))
            )}
          </div>

          {/* Link to Rewards Shop */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/creator/rewards')}
              className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
            >
              Browse Rewards Shop →
            </button>
          </div>
        </main>

        {/* Cash Claim Modal */}
        <CashClaimModal
          isOpen={isCashModalOpen}
          onClose={() => {
            setIsCashModalOpen(false);
            setSelectedRedemption(null);
          }}
          redemption={selectedRedemption}
          onSubmit={handleCashClaim}
        />

        {/* Simple Claim Modal */}
        <SimpleClaimModal
          isOpen={isSimpleModalOpen}
          onClose={() => {
            setIsSimpleModalOpen(false);
            setSelectedRedemption(null);
          }}
          redemption={selectedRedemption}
          onSubmit={handleSimpleClaim}
        />
      </div>
    </ProtectedRoute>
  );
}