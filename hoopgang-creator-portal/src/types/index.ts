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