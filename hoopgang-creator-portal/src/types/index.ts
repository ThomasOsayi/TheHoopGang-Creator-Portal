// src/types/index.ts

export type CreatorStatus = 
  | 'pending' 
  | 'denied'
  | 'approved' 
  | 'shipped' 
  | 'delivered' 
  | 'completed' 
  | 'ghosted';

export type CollaborationStatus = 
  | 'pending' 
  | 'denied'
  | 'approved' 
  | 'shipped' 
  | 'delivered' 
  | 'completed' 
  | 'ghosted';

export type ProductType = 
  | 'Reversible Shorts' 
  | 'Hoodies' 
  | 'Tees' 
  | 'Cropped Sweats';

export type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type Carrier = 'yanwen';

export interface ContentSubmission {
  url: string;
  submittedAt: Date;
  views?: number;  // Optional: manually entered or scraped later
}

export interface FollowerHistoryEntry {
  date: Date;
  instagramFollowers: number;
  tiktokFollowers: number;
  source: 'manual' | 'application';
}

export interface StatusHistoryEntry {
  status: CreatorStatus | CollaborationStatus;
  timestamp: Date;
  updatedBy?: string;  // Admin user ID who made the change
}

export interface ShippingAddress {
  street: string;
  unit?: string;
  city: string;
  state: string;
  zipCode: string;
}

// UPDATED: Creator (profile only)
export interface Creator {
  id: string;
  userId?: string;
  creatorId: string;             // "CRT-2024-047"
  
  // Profile
  fullName: string;
  email: string;
  instagramHandle: string;
  instagramFollowers: number;
  tiktokHandle: string;
  tiktokFollowers: number;
  followerHistory?: FollowerHistoryEntry[];
  bestContentUrl: string;
  
  // Shipping Address (reused for all collabs)
  shippingAddress: ShippingAddress;
  
  // Application Questions (from first application)
  whyCollab: string;
  previousBrands: boolean;
  agreedToTerms: boolean;
  height?: string;
  weight?: string;
  
  // V2 Fields
  isBlocked: boolean;                    // True if ghosted
  activeCollaborationId?: string;        // Current active collab ID
  totalCollaborations: number;           // Count of all collabs
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// For backwards compatibility during migration
export interface CreatorWithCollab extends Creator {
  collaboration?: Collaboration;         // Active collab joined
  collaborations?: Collaboration[];      // All collabs (when needed)
}

export type UserRole = 'admin' | 'creator';

export interface User {
  id: string;  // Firebase Auth UID
  email: string;
  role: UserRole;
  creatorDocId?: string;  // Links to creators collection (if role === 'creator')
  createdAt: Date;
}

export interface CreatorApplicationInput {
  fullName: string;
  email: string;
  instagramHandle: string;
  instagramFollowers: number;
  tiktokHandle: string;
  tiktokFollowers: number;
  bestContentUrl: string;
  product: string;
  size: Size;
  height?: string;
  weight?: string;
  shippingAddress: ShippingAddress;
  whyCollab: string;
  previousBrands: boolean;
  agreedToTerms: boolean;
}

export interface DashboardStats {
  totalApplications: number;
  pendingReview: number;
  activeCollabs: number;
  completed: number;
  ghosted: number;
  ghostRate: number;
}

// --- Shipping Tracking Types ---

export type ShippingStatus = 
  | 'pending' 
  | 'transit' 
  | 'pickup' 
  | 'delivered' 
  | 'undelivered' 
  | 'exception' 
  | 'expired';

export interface TrackingEvent {
  date: string;
  description: string;
  location: string;
}

export interface ShipmentTracking {
  trackingNumber: string;
  carrier: Carrier;
  shippingStatus: ShippingStatus;
  estimatedDelivery?: string;
  lastUpdate: Date;
  events: TrackingEvent[];
  trackingMoreId?: string;
}

// --- Collaboration Types ---

export interface Collaboration {
  id: string;                    // Firestore doc ID
  creatorId: string;             // Parent creator's doc ID
  collabNumber: number;          // Sequential: 1, 2, 3...
  collabDisplayId: string;       // "CRT-2024-047-01"
  
  // Product Selection
  product: string;
  size: Size;
  
  // Status Pipeline
  status: CollaborationStatus;
  statusHistory: StatusHistoryEntry[];
  
  // Shipping
  trackingNumber?: string;
  carrier?: Carrier;
  shippedAt?: Date;
  deliveredAt?: Date;
  shipment?: ShipmentTracking;
  
  // Content
  contentSubmissions: ContentSubmission[];
  contentDeadline?: Date;
  
  // Review
  rating?: number;
  internalNotes?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ===== V3 CONTENT SUBMISSION & REWARDS SYSTEM =====

/**
 * V3 Content Submissions - for volume and milestone tracking
 * Different from the basic ContentSubmission used in Collaborations
 */
export type V3SubmissionType = 'volume' | 'milestone';
export type V3SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type MilestoneTier = '100k' | '500k' | '1m';

export interface V3ContentSubmission {
  id: string;
  creatorId: string;                    // Firestore doc ID of creator
  tiktokUrl: string;
  type: V3SubmissionType;
  
  // Milestone-specific fields
  claimedTier?: MilestoneTier;
  verifiedViews?: number;               // Admin-entered after verification
  
  // Status
  status: V3SubmissionStatus;
  reviewedBy?: string;                  // Admin user ID
  reviewedAt?: Date;
  rejectionReason?: string;
  
  // Tracking
  submittedAt: Date;
  weekOf: string;                       // ISO week: "2025-W50"
}

/**
 * Leaderboard Entries - weekly volume and monthly GMV rankings
 */
export type LeaderboardType = 'volume' | 'gmv';
export type LeaderboardPeriod = string; // "2025-W50" for weekly, "2025-12" for monthly

export interface LeaderboardEntry {
  id: string;
  type: LeaderboardType;
  period: LeaderboardPeriod;            // "2025-W50" or "2025-12"
  creatorId: string;                    // Firestore doc ID
  creatorName: string;                  // Denormalized for display
  creatorHandle: string;                // TikTok handle
  profileImage?: string;
  value: number;                        // Post count or GMV amount
  rank: number;                         // 1, 2, 3...
  updatedBy?: string;                   // Admin who last updated
  updatedAt: Date;
}

/**
 * Rewards Catalog - available rewards for milestones and leaderboard wins
 */
export type RewardCategory = 'milestone' | 'volume_leaderboard' | 'gmv_leaderboard';
export type FulfillmentType = 'cash' | 'store_credit' | 'product' | 'mixed';

export interface Reward {
  id: string;
  name: string;
  description: string;
  category: RewardCategory;
  
  // Category-specific fields
  milestoneTier?: MilestoneTier;        // For milestone rewards
  leaderboardRank?: number;             // For leaderboard rewards (1st, 2nd, 3rd)
  
  // Reward values
  cashValue?: number;
  storeCreditValue?: number;
  productName?: string;
  imageUrl?: string;
  
  // Status
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Redemptions - tracks reward fulfillment
 */
export type RedemptionSource = 'milestone_submission' | 'volume_win' | 'gmv_win';
export type RedemptionStatus = 'pending' | 'approved' | 'fulfilled' | 'rejected';
export type CashMethod = 'paypal' | 'venmo';

export interface Redemption {
  id: string;
  creatorId: string;
  rewardId: string;
  rewardName: string;                   // Denormalized for display
  source: RedemptionSource;
  sourceId?: string;                    // V3ContentSubmission ID or LeaderboardEntry ID
  
  // Fulfillment details
  fulfillmentType: FulfillmentType;
  cashAmount?: number;
  cashMethod?: CashMethod;
  cashHandle?: string;                  // PayPal email or Venmo handle
  storeCreditCode?: string;
  productShipped?: boolean;
  trackingNumber?: string;
  
  // Status
  status: RedemptionStatus;
  fulfilledAt?: Date;
  fulfilledBy?: string;                 // Admin user ID
  notes?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt?: Date;
}

// ===== V3 STATS TYPES =====

export interface V3VolumeStats {
  weeklyCount: number;
  allTimeCount: number;
  currentRank: number | null;
  totalCreators: number;
}

export interface V3MilestoneStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalEarned: number;                  // Sum of cash + store credit value
}

export interface V3CreatorStats {
  volume: V3VolumeStats;
  milestone: V3MilestoneStats;
}