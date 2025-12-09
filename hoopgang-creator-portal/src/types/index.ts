// src/types/index.ts

export type CreatorStatus = 
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

export interface StatusHistoryEntry {
  status: CreatorStatus;
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

export interface Creator {
  // Document ID: auto-generated
  id: string;
  userId?: string; // Firebase Auth UID - links to users collection
  
  // --- Application Data (from /apply form) ---
  fullName: string;
  email: string;
  phone: string;
  
  // Social profiles
  instagramHandle: string;
  instagramFollowers: number;
  tiktokHandle: string;
  tiktokFollowers: number;
  bestContentUrl: string;
  
  // Product selection
  product: ProductType;
  size: Size;
  
  // Shipping
  shippingAddress: ShippingAddress;
  
  // Application questions
  whyCollab: string;
  previousBrands: boolean;
  agreedToTerms: boolean;
  
  // --- Status Pipeline ---
  status: CreatorStatus;
  statusHistory: StatusHistoryEntry[];
  
  // --- Shipping/Tracking ---
  trackingNumber?: string;
  carrier?: Carrier;
  shippedAt?: Date;
  deliveredAt?: Date;
  shipment?: ShipmentTracking;
  
  // --- Content Submissions (max 3 TikToks) ---
  contentSubmissions: ContentSubmission[];
  contentDeadline?: Date;  // 14 days after delivery
  
  // --- Admin Review ---
  rating?: number;  // 1-5 stars
  internalNotes?: string;
  
  // --- Metadata ---
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;  // Display ID like "CRT-2024-047"
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
  phone: string;
  instagramHandle: string;
  instagramFollowers: number;
  tiktokHandle: string;
  tiktokFollowers: number;
  bestContentUrl: string;
  product: ProductType;
  size: Size;
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