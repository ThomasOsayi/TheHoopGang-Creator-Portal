// src/lib/firestore.ts

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  runTransaction,
  limit,
  startAfter,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Creator,
  CreatorApplicationInput,
  CreatorStatus,
  ContentSubmission,
  DashboardStats,
  StatusHistoryEntry,
  Collaboration,
  CollaborationStatus,
  CreatorWithCollab,
  Size,
  V3ContentSubmission,
  V3SubmissionType,
  V3SubmissionStatus,
  MilestoneTier,
  LeaderboardEntry,
  LeaderboardType,
  Reward,
  RewardCategory,
  Redemption,
  RedemptionSource,
  RedemptionStatus,
  V3VolumeStats,
  V3MilestoneStats,
  V3CreatorStats,
} from '@/types';
import { generateCreatorId, MAX_CONTENT_SUBMISSIONS } from './constants';

const CREATORS_COLLECTION = 'creators';

// ===== V3 COLLECTION NAMES =====
const V3_SUBMISSIONS_COLLECTION = 'v3ContentSubmissions';
const LEADERBOARD_COLLECTION = 'leaderboardEntries';
const REWARDS_COLLECTION = 'rewards';
const REDEMPTIONS_COLLECTION = 'redemptions';

/**
 * Recursively converts Firestore Timestamps to JavaScript Dates
 */
function convertTimestamps<T>(data: any): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Timestamp) {
    return data.toDate() as any;
  }

  if (Array.isArray(data)) {
    return data.map((item) => convertTimestamps(item)) as any;
  }

  if (typeof data === 'object') {
    const converted: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        converted[key] = convertTimestamps(data[key]);
      }
    }
    return converted as T;
  }

  return data;
}

/**
 * Generates a sequential creator ID using a Firestore counter
 * Format: CRT-YYYY-XXX (e.g., CRT-2024-001, CRT-2024-002)
 */
export async function generateSequentialCreatorId(): Promise<string> {
  const year = new Date().getFullYear();
  const counterDocRef = doc(db, 'counters', 'creatorId');

  const newCount = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterDocRef);

    let currentCount = 0;
    let currentYear = year;

    if (counterDoc.exists()) {
      const data = counterDoc.data();
      currentCount = data.currentValue || 0;
      currentYear = data.year || year;

      // Reset counter if it's a new year
      if (currentYear !== year) {
        currentCount = 0;
        currentYear = year;
      }
    }

    const nextCount = currentCount + 1;

    transaction.set(counterDocRef, {
      currentValue: nextCount,
      year: currentYear,
      updatedAt: Timestamp.now(),
    });

    return nextCount;
  });

  // Pad the number to 3 digits (001, 002, ... 999)
  const paddedCount = newCount.toString().padStart(3, '0');
  return `CRT-${year}-${paddedCount}`;
}

/**
 * Creates a new creator document in Firestore (V2 - profile only)
 */
export async function createCreator(
  data: CreatorApplicationInput,
  userId?: string
): Promise<string> {
  const now = Timestamp.now();
  
  // Use sequential ID instead of random
  const creatorId = await generateSequentialCreatorId();
  
  // Initialize follower history with application data
  const initialFollowerHistory = [
    {
      date: now.toDate(),
      instagramFollowers: data.instagramFollowers,
      tiktokFollowers: data.tiktokFollowers,
      source: 'application' as const,
    },
  ];

  // V2: Creator is profile-only, no collaboration data
  const creatorData = {
    // Profile fields from application
    fullName: data.fullName,
    email: data.email,
    instagramHandle: data.instagramHandle,
    instagramFollowers: data.instagramFollowers,
    tiktokHandle: data.tiktokHandle,
    tiktokFollowers: data.tiktokFollowers,
    bestContentUrl: data.bestContentUrl,
    shippingAddress: data.shippingAddress,
    whyCollab: data.whyCollab,
    previousBrands: data.previousBrands,
    agreedToTerms: data.agreedToTerms,
    height: data.height,
    weight: data.weight,
    
    // V2 fields
    id: '', // Will be set after document creation
    creatorId,
    followerHistory: initialFollowerHistory,
    isBlocked: false,
    activeCollaborationId: null,
    totalCollaborations: 0,
    
    // Metadata
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(userId && { userId }),
  };

  const docRef = await addDoc(collection(db, CREATORS_COLLECTION), creatorData);
  
  // Update the document with its own ID
  await updateDoc(docRef, { id: docRef.id });

  return docRef.id;
}

/**
 * Fetches a single creator document by Firestore document ID
 */
export async function getCreatorById(id: string): Promise<Creator | null> {
  const docRef = doc(db, CREATORS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const creator = convertTimestamps<Creator>({
    id: docSnap.id,
    ...docSnap.data(),
  });

  return creator;
}

/**
 * Fetches a creator by display ID (e.g., "CRT-2024-047")
 */
export async function getCreatorByCreatorId(creatorId: string): Promise<Creator | null> {
  const q = query(
    collection(db, CREATORS_COLLECTION),
    where('creatorId', '==', creatorId)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const docSnap = querySnapshot.docs[0];
  const creator = convertTimestamps<Creator>({
    id: docSnap.id,
    ...docSnap.data(),
  });

  return creator;
}

/**
 * Fetches a creator by Firebase Auth user ID
 */
export async function getCreatorByUserId(userId: string): Promise<Creator | null> {
  const q = query(collection(db, CREATORS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  const docSnap = snapshot.docs[0];
  return convertTimestamps<Creator>({ id: docSnap.id, ...docSnap.data() });
}

/**
 * Fetches creators with pagination support
 */
export async function getAllCreators(filters?: {
  status?: CreatorStatus;
  minFollowers?: number;
  search?: string;
  limit?: number;
  lastDoc?: any; // For cursor-based pagination
}): Promise<{ creators: Creator[]; lastDoc: any; hasMore: boolean }> {
  const pageLimit = filters?.limit || 10;

  // Build query based on filters
  let q;
  if (filters?.status) {
    q = query(
      collection(db, CREATORS_COLLECTION),
      where('status', '==', filters.status),
      orderBy('createdAt', 'desc'),
      limit(pageLimit + 1) // Fetch one extra to check if there are more
    );
  } else {
    q = query(
      collection(db, CREATORS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(pageLimit + 1) // Fetch one extra to check if there are more
    );
  }

  if (filters?.lastDoc) {
    q = query(q, startAfter(filters.lastDoc));
  }

  const querySnapshot = await getDocs(q);
  const docs = querySnapshot.docs;

  // Check if there are more results
  const hasMore = docs.length > pageLimit;
  const resultDocs = hasMore ? docs.slice(0, pageLimit) : docs;

  let creators = resultDocs.map((docSnap) =>
    convertTimestamps<Creator>({
      id: docSnap.id,
      ...docSnap.data(),
    })
  );

  // Client-side filtering for minFollowers and search
  if (filters?.minFollowers) {
    creators = creators.filter(
      (creator) =>
        creator.instagramFollowers >= filters.minFollowers! ||
        creator.tiktokFollowers >= filters.minFollowers!
    );
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    creators = creators.filter(
      (creator) =>
        creator.fullName.toLowerCase().includes(searchLower) ||
        creator.email.toLowerCase().includes(searchLower) ||
        creator.instagramHandle.toLowerCase().includes(searchLower) ||
        creator.tiktokHandle.toLowerCase().includes(searchLower) ||
        creator.creatorId.toLowerCase().includes(searchLower)
    );
  }

  return {
    creators,
    lastDoc: resultDocs[resultDocs.length - 1] || null,
    hasMore,
  };
}

/**
 * Updates a creator document
 * @deprecated This function may reference legacy fields. Update to use Collaboration model.
 */
export async function updateCreator(
  id: string,
  data: Partial<Creator & { status?: CreatorStatus; statusHistory?: StatusHistoryEntry[]; contentSubmissions?: ContentSubmission[] }>
): Promise<void> {
  const docRef = doc(db, CREATORS_COLLECTION, id);
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  // If status is being changed, append to statusHistory (legacy field - use Collaboration model)
  if (data.status !== undefined) {
    const currentDoc = await getDoc(docRef);
    if (currentDoc.exists()) {
      const currentData = currentDoc.data();
      const currentCreator = convertTimestamps<Creator & { statusHistory?: StatusHistoryEntry[] }>({
        id: currentDoc.id,
        ...currentData,
      });

      const newStatusEntry = {
        status: data.status,
        timestamp: Timestamp.now(),
      };

      // Convert existing statusHistory entries to Timestamps
      const existingHistory = ((currentCreator as { statusHistory?: StatusHistoryEntry[] }).statusHistory || []).map((entry: StatusHistoryEntry) => ({
        ...entry,
        timestamp: entry.timestamp instanceof Date 
          ? Timestamp.fromDate(entry.timestamp) 
          : entry.timestamp,
      }));

      updateData.statusHistory = [
        ...existingHistory,
        newStatusEntry,
      ];
    }
  }

  // Convert Date objects to Timestamps for Firestore
  const firestoreData: any = {};
  for (const key in updateData) {
    if (updateData[key] instanceof Date) {
      firestoreData[key] = Timestamp.fromDate(updateData[key]);
    } else if (Array.isArray(updateData[key])) {
      if (key === 'statusHistory') {
        // statusHistory is already converted above
        firestoreData[key] = updateData[key];
      } else if (key === 'contentSubmissions') {
        // Convert Date objects in contentSubmissions array
        firestoreData[key] = updateData[key].map((submission: any) => ({
          ...submission,
          submittedAt: submission.submittedAt instanceof Date
            ? Timestamp.fromDate(submission.submittedAt)
            : submission.submittedAt,
        }));
      } else {
        firestoreData[key] = updateData[key];
      }
    } else {
      firestoreData[key] = updateData[key];
    }
  }

  await updateDoc(docRef, firestoreData);
}

/**
 * Adds a content submission to a creator's contentSubmissions array
 * @deprecated Use addContentSubmissionToCollaboration instead. This function references legacy fields.
 */
export async function addContentSubmission(
  creatorId: string,
  url: string
): Promise<ContentSubmission> {
  const creator = await getCreatorById(creatorId);
  if (!creator) {
    throw new Error('Creator not found');
  }

  // Check if creator has active collaboration
  if (!creator.activeCollaborationId) {
    throw new Error('Creator has no active collaboration');
  }

  // Get the active collaboration
  const collaboration = await getCollaborationById(creatorId, creator.activeCollaborationId);
  if (!collaboration) {
    throw new Error('Active collaboration not found');
  }

  if (collaboration.contentSubmissions.length >= MAX_CONTENT_SUBMISSIONS) {
    throw new Error(`Maximum of ${MAX_CONTENT_SUBMISSIONS} content submissions allowed`);
  }

  const newSubmission: ContentSubmission = {
    url,
    submittedAt: new Date(),
  };

  const updatedSubmissions = [...collaboration.contentSubmissions, newSubmission];

  await updateCollaboration(creatorId, creator.activeCollaborationId, {
    contentSubmissions: updatedSubmissions,
  });

  return newSubmission;
}

/**
 * Calculates dashboard statistics
 * @deprecated Updated to use Collaboration model. This function now checks active collaborations.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Fetch all creators without pagination for stats
  const q = query(collection(db, CREATORS_COLLECTION));
  const querySnapshot = await getDocs(q);

  const allCreators = querySnapshot.docs.map((docSnap) =>
    convertTimestamps<Creator>({
      id: docSnap.id,
      ...docSnap.data(),
    })
  );

  // Get active collaborations for each creator to determine status
  const creatorsWithCollabs = await Promise.all(
    allCreators.map(async (creator) => {
      if (creator.activeCollaborationId) {
        const collab = await getCollaborationById(creator.id, creator.activeCollaborationId);
        return { creator, collab };
      }
      return { creator, collab: null };
    })
  );

  const stats: DashboardStats = {
    totalApplications: allCreators.length,
    pendingReview: creatorsWithCollabs.filter(({ collab }) => collab?.status === 'pending').length,
    activeCollabs: creatorsWithCollabs.filter(({ collab }) =>
      collab && ['approved', 'shipped', 'delivered'].includes(collab.status)
    ).length,
    completed: creatorsWithCollabs.filter(({ collab }) => collab?.status === 'completed').length,
    ghosted: creatorsWithCollabs.filter(({ collab }) => collab?.status === 'ghosted').length + 
             allCreators.filter((c) => c.isBlocked).length,
    ghostRate: 0,
  };

  if (stats.totalApplications > 0) {
    stats.ghostRate = (stats.ghosted / stats.totalApplications) * 100;
  }

  return stats;
}

// ===== COLLABORATION CRUD =====

/**
 * Creates a new collaboration for an existing creator
 */
export async function createCollaboration(
  creatorId: string,
  data: { product: string; size: Size }
): Promise<string> {
  const creator = await getCreatorById(creatorId);
  if (!creator) throw new Error('Creator not found');
  if (creator.isBlocked) throw new Error('Creator is blocked');
  if (creator.activeCollaborationId) throw new Error('Creator has active collaboration');
  
  const collabNumber = creator.totalCollaborations + 1;
  const collabDisplayId = `${creator.creatorId}-${collabNumber.toString().padStart(2, '0')}`;
  
  const collabData = {
    creatorId,
    collabNumber,
    collabDisplayId,
    product: data.product,
    size: data.size,
    status: 'pending' as CollaborationStatus,
    statusHistory: [{ status: 'pending' as CollaborationStatus, timestamp: Timestamp.now() }],
    contentSubmissions: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const collabRef = await addDoc(
    collection(db, 'creators', creatorId, 'collaborations'),
    collabData
  );
  
  // Update creator
  await updateDoc(doc(db, 'creators', creatorId), {
    activeCollaborationId: collabRef.id,
    totalCollaborations: collabNumber,
    updatedAt: serverTimestamp(),
  });
  
  return collabRef.id;
}

/**
 * Gets a collaboration by ID
 */
export async function getCollaborationById(
  creatorId: string,
  collabId: string
): Promise<Collaboration | null> {
  const docRef = doc(db, 'creators', creatorId, 'collaborations', collabId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return convertTimestamps<Collaboration>({
    id: docSnap.id,
    ...docSnap.data(),
  });
}

/**
 * Gets all collaborations for a creator
 */
export async function getCollaborationsByCreatorId(
  creatorId: string
): Promise<Collaboration[]> {
  const q = query(
    collection(db, 'creators', creatorId, 'collaborations'),
    orderBy('collabNumber', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => 
    convertTimestamps<Collaboration>({ id: doc.id, ...doc.data() })
  );
}

/**
 * Gets creator with their active collaboration joined
 */
export async function getCreatorWithActiveCollab(
  creatorId: string
): Promise<CreatorWithCollab | null> {
  const creator = await getCreatorById(creatorId);
  if (!creator) return null;
  
  let collaboration: Collaboration | undefined;
  if (creator.activeCollaborationId) {
    collaboration = await getCollaborationById(creatorId, creator.activeCollaborationId) || undefined;
  }
  
  return { ...creator, collaboration };
}

/**
 * Updates a collaboration
 */
export async function updateCollaboration(
  creatorId: string,
  collabId: string,
  data: Partial<Collaboration>
): Promise<void> {
  const docRef = doc(db, 'creators', creatorId, 'collaborations', collabId);
  
  // Handle status changes
  if (data.status) {
    const currentDoc = await getDoc(docRef);
    if (currentDoc.exists()) {
      const current = currentDoc.data();
      const existingHistory = (current.statusHistory || []).map((entry: StatusHistoryEntry) => ({
        ...entry,
        timestamp: entry.timestamp instanceof Date 
          ? Timestamp.fromDate(entry.timestamp) 
          : entry.timestamp,
      }));
      
      data.statusHistory = [
        ...existingHistory,
        { status: data.status, timestamp: Timestamp.now() },
      ];
      
      // If completing or ghosting, clear activeCollaborationId
      if (['completed', 'ghosted', 'denied'].includes(data.status)) {
        const creatorRef = doc(db, 'creators', creatorId);
        const updates: Record<string, unknown> = { 
          activeCollaborationId: null, 
          updatedAt: serverTimestamp() 
        };
        
        // Block creator if ghosted
        if (data.status === 'ghosted') {
          updates.isBlocked = true;
        }
        
        await updateDoc(creatorRef, updates);
      }
    }
  }
  
  // Convert Date objects to Timestamps for Firestore
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  
  const firestoreData: Record<string, unknown> = {};
  for (const key in updateData) {
    if (updateData[key] instanceof Date) {
      firestoreData[key] = Timestamp.fromDate(updateData[key] as Date);
    } else if (Array.isArray(updateData[key])) {
      if (key === 'statusHistory') {
        firestoreData[key] = updateData[key];
      } else if (key === 'contentSubmissions') {
        firestoreData[key] = (updateData[key] as ContentSubmission[]).map((submission) => ({
          ...submission,
          submittedAt: submission.submittedAt instanceof Date
            ? Timestamp.fromDate(submission.submittedAt)
            : submission.submittedAt,
        }));
      } else {
        firestoreData[key] = updateData[key];
      }
    } else {
      firestoreData[key] = updateData[key];
    }
  }
  
  await updateDoc(docRef, firestoreData);
}

/**
 * Updated: Get all creators with their active collab for admin list
 */
export async function getAllCreatorsWithCollabs(filters?: {
  status?: CollaborationStatus;
  limit?: number;
  lastDoc?: Parameters<typeof startAfter>[0];
}): Promise<{ creators: CreatorWithCollab[]; lastDoc: Parameters<typeof startAfter>[0] | null; hasMore: boolean }> {
  // Fetch creators first (note: getAllCreators uses CreatorStatus, so we'll need to adapt)
  const { creators, lastDoc, hasMore } = await getAllCreators({
    limit: filters?.limit,
    lastDoc: filters?.lastDoc,
  });
  
  // Join active collaborations
  const creatorsWithCollabs = await Promise.all(
    creators.map(async (creator) => {
      let collaboration: Collaboration | undefined;
      if (creator.activeCollaborationId) {
        collaboration = await getCollaborationById(creator.id, creator.activeCollaborationId) || undefined;
        
        // Filter by collaboration status if provided
        if (filters?.status && collaboration?.status !== filters.status) {
          return null;
        }
      } else if (filters?.status) {
        // If filtering by status but no active collab, skip
        return null;
      }
      return { ...creator, collaboration };
    })
  );
  
  // Filter out nulls (from status filtering)
  const filtered = creatorsWithCollabs.filter((c) => c !== null) as CreatorWithCollab[];
  
  return { creators: filtered, lastDoc, hasMore };
}

// ===== V3 CONTENT SUBMISSIONS =====

/**
 * Creates a volume content submission (auto-approved)
 */
export async function createVolumeSubmission(
  creatorId: string,
  tiktokUrl: string,
  weekOf: string
): Promise<V3ContentSubmission> {
  // Check for duplicate URL by this creator
  const existingQuery = query(
    collection(db, V3_SUBMISSIONS_COLLECTION),
    where('creatorId', '==', creatorId),
    where('tiktokUrl', '==', tiktokUrl)
  );
  const existing = await getDocs(existingQuery);
  if (!existing.empty) {
    throw new Error('You have already submitted this TikTok URL');
  }

  const submissionData = {
    creatorId,
    tiktokUrl,
    type: 'volume' as V3SubmissionType,
    status: 'approved' as V3SubmissionStatus, // Volume submissions auto-approve
    submittedAt: serverTimestamp(),
    weekOf,
  };

  const docRef = await addDoc(collection(db, V3_SUBMISSIONS_COLLECTION), submissionData);
  
  return convertTimestamps<V3ContentSubmission>({
    id: docRef.id,
    ...submissionData,
    submittedAt: new Date(),
  });
}

/**
 * Creates a milestone content submission (requires admin review)
 */
export async function createMilestoneSubmission(
  creatorId: string,
  tiktokUrl: string,
  claimedTier: MilestoneTier,
  weekOf: string
): Promise<V3ContentSubmission> {
  // Check for duplicate milestone claim on same URL
  const existingQuery = query(
    collection(db, V3_SUBMISSIONS_COLLECTION),
    where('tiktokUrl', '==', tiktokUrl),
    where('type', '==', 'milestone')
  );
  const existing = await getDocs(existingQuery);
  if (!existing.empty) {
    throw new Error('This TikTok URL has already been submitted for a milestone');
  }

  const submissionData = {
    creatorId,
    tiktokUrl,
    type: 'milestone' as V3SubmissionType,
    claimedTier,
    status: 'pending' as V3SubmissionStatus,
    submittedAt: serverTimestamp(),
    weekOf,
  };

  const docRef = await addDoc(collection(db, V3_SUBMISSIONS_COLLECTION), submissionData);
  
  return convertTimestamps<V3ContentSubmission>({
    id: docRef.id,
    ...submissionData,
    submittedAt: new Date(),
  });
}

/**
 * Gets a V3 submission by ID
 */
export async function getV3SubmissionById(id: string): Promise<V3ContentSubmission | null> {
  const docRef = doc(db, V3_SUBMISSIONS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return convertTimestamps<V3ContentSubmission>({
    id: docSnap.id,
    ...docSnap.data(),
  });
}

/**
 * Gets all V3 submissions for a creator
 */
export async function getV3SubmissionsByCreatorId(
  creatorId: string,
  filters?: {
    type?: V3SubmissionType;
    status?: V3SubmissionStatus;
    weekOf?: string;
    limit?: number;
  }
): Promise<V3ContentSubmission[]> {
  let q = query(
    collection(db, V3_SUBMISSIONS_COLLECTION),
    where('creatorId', '==', creatorId),
    orderBy('submittedAt', 'desc')
  );

  if (filters?.type) {
    q = query(q, where('type', '==', filters.type));
  }
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters?.weekOf) {
    q = query(q, where('weekOf', '==', filters.weekOf));
  }
  if (filters?.limit) {
    q = query(q, limit(filters.limit));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => 
    convertTimestamps<V3ContentSubmission>({ id: doc.id, ...doc.data() })
  );
}

/**
 * Gets all V3 submissions (admin view)
 */
export async function getAllV3Submissions(filters?: {
  type?: V3SubmissionType;
  status?: V3SubmissionStatus;
  weekOf?: string;
  limit?: number;
  lastDoc?: Parameters<typeof startAfter>[0];
}): Promise<{ submissions: V3ContentSubmission[]; lastDoc: Parameters<typeof startAfter>[0] | null; hasMore: boolean }> {
  const pageLimit = filters?.limit || 20;

  // Build query based on available filters
  // Note: Firestore compound query limitations mean we may need client-side filtering
  let q = query(collection(db, V3_SUBMISSIONS_COLLECTION));

  // Apply filters in order that works with Firestore indexes
  if (filters?.type && filters?.status) {
    q = query(q, where('type', '==', filters.type), where('status', '==', filters.status), orderBy('submittedAt', 'desc'));
  } else if (filters?.type) {
    q = query(q, where('type', '==', filters.type), orderBy('submittedAt', 'desc'));
  } else if (filters?.status) {
    q = query(q, where('status', '==', filters.status), orderBy('submittedAt', 'desc'));
  } else {
    q = query(q, orderBy('submittedAt', 'desc'));
  }

  if (filters?.lastDoc) {
    q = query(q, startAfter(filters.lastDoc));
  }
  
  q = query(q, limit(pageLimit + 1));

  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const hasMore = docs.length > pageLimit;
  const resultDocs = hasMore ? docs.slice(0, pageLimit) : docs;

  let submissions = resultDocs.map(doc =>
    convertTimestamps<V3ContentSubmission>({ id: doc.id, ...doc.data() })
  );

  // Client-side filter for weekOf (Firestore compound query limitations)
  if (filters?.weekOf) {
    submissions = submissions.filter(s => s.weekOf === filters.weekOf);
  }

  return {
    submissions,
    lastDoc: resultDocs[resultDocs.length - 1] || null,
    hasMore,
  };
}

/**
 * Reviews a milestone submission (admin action)
 */
export async function reviewMilestoneSubmission(
  submissionId: string,
  decision: 'approved' | 'rejected',
  adminId: string,
  verifiedViews?: number,
  rejectionReason?: string
): Promise<void> {
  const docRef = doc(db, V3_SUBMISSIONS_COLLECTION, submissionId);
  
  const updateData: Record<string, unknown> = {
    status: decision,
    reviewedBy: adminId,
    reviewedAt: serverTimestamp(),
  };

  if (decision === 'approved' && verifiedViews !== undefined) {
    updateData.verifiedViews = verifiedViews;
  }
  if (decision === 'rejected' && rejectionReason) {
    updateData.rejectionReason = rejectionReason;
  }

  await updateDoc(docRef, updateData);
}

/**
 * Gets volume stats for a creator
 */
export async function getVolumeStats(
  creatorId: string,
  currentWeek: string
): Promise<V3VolumeStats> {
  // Get weekly count
  const weeklyQuery = query(
    collection(db, V3_SUBMISSIONS_COLLECTION),
    where('creatorId', '==', creatorId),
    where('type', '==', 'volume'),
    where('weekOf', '==', currentWeek),
    where('status', '==', 'approved')
  );
  const weeklySnap = await getDocs(weeklyQuery);
  const weeklyCount = weeklySnap.size;

  // Get all-time count
  const allTimeQuery = query(
    collection(db, V3_SUBMISSIONS_COLLECTION),
    where('creatorId', '==', creatorId),
    where('type', '==', 'volume'),
    where('status', '==', 'approved')
  );
  const allTimeSnap = await getDocs(allTimeQuery);
  const allTimeCount = allTimeSnap.size;

  // Get current rank from leaderboard
  const leaderboardQuery = query(
    collection(db, LEADERBOARD_COLLECTION),
    where('type', '==', 'volume'),
    where('period', '==', currentWeek),
    where('creatorId', '==', creatorId)
  );
  const leaderboardSnap = await getDocs(leaderboardQuery);
  const currentRank = leaderboardSnap.empty ? null : leaderboardSnap.docs[0].data().rank;

  // Get total creators in leaderboard this week
  const allLeaderboardQuery = query(
    collection(db, LEADERBOARD_COLLECTION),
    where('type', '==', 'volume'),
    where('period', '==', currentWeek)
  );
  const allLeaderboardSnap = await getDocs(allLeaderboardQuery);
  const totalCreators = allLeaderboardSnap.size;

  return {
    weeklyCount,
    allTimeCount,
    currentRank,
    totalCreators,
  };
}

/**
 * Gets milestone stats for a creator
 */
export async function getMilestoneStats(creatorId: string): Promise<V3MilestoneStats> {
  const baseQuery = query(
    collection(db, V3_SUBMISSIONS_COLLECTION),
    where('creatorId', '==', creatorId),
    where('type', '==', 'milestone')
  );
  
  const snapshot = await getDocs(baseQuery);
  const submissions = snapshot.docs.map(doc => doc.data() as V3ContentSubmission);

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;

  // Calculate total earned from approved milestones
  // This will need to reference the rewards collection for actual values
  // For now, using hardcoded tier values from the ticket
  const tierValues: Record<MilestoneTier, number> = {
    '100k': 10,
    '500k': 25,
    '1m': 50,
  };
  
  const totalEarned = submissions
    .filter(s => s.status === 'approved' && s.claimedTier)
    .reduce((sum, s) => sum + (tierValues[s.claimedTier!] || 0), 0);

  return {
    pendingCount,
    approvedCount,
    rejectedCount,
    totalEarned,
  };
}

// ===== LEADERBOARD =====

/**
 * Gets leaderboard entries for a period
 */
export async function getLeaderboard(
  type: LeaderboardType,
  period: string,
  limitCount: number = 10
): Promise<LeaderboardEntry[]> {
  const q = query(
    collection(db, LEADERBOARD_COLLECTION),
    where('type', '==', type),
    where('period', '==', period),
    orderBy('rank', 'asc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc =>
    convertTimestamps<LeaderboardEntry>({ id: doc.id, ...doc.data() })
  );
}

/**
 * Updates or creates a leaderboard entry
 */
export async function upsertLeaderboardEntry(
  data: Omit<LeaderboardEntry, 'id' | 'updatedAt'>,
  adminId: string
): Promise<string> {
  // Check if entry exists
  const existingQuery = query(
    collection(db, LEADERBOARD_COLLECTION),
    where('type', '==', data.type),
    where('period', '==', data.period),
    where('creatorId', '==', data.creatorId)
  );
  const existing = await getDocs(existingQuery);

  if (!existing.empty) {
    // Update existing
    const docRef = doc(db, LEADERBOARD_COLLECTION, existing.docs[0].id);
    await updateDoc(docRef, {
      ...data,
      updatedBy: adminId,
      updatedAt: serverTimestamp(),
    });
    return existing.docs[0].id;
  } else {
    // Create new
    const docRef = await addDoc(collection(db, LEADERBOARD_COLLECTION), {
      ...data,
      updatedBy: adminId,
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }
}

/**
 * Recalculates volume leaderboard ranks for a week
 * Call this after new volume submissions
 */
export async function recalculateVolumeLeaderboard(weekOf: string): Promise<void> {
  // Get all approved volume submissions for the week, grouped by creator
  const submissionsQuery = query(
    collection(db, V3_SUBMISSIONS_COLLECTION),
    where('type', '==', 'volume'),
    where('weekOf', '==', weekOf),
    where('status', '==', 'approved')
  );
  const snapshot = await getDocs(submissionsQuery);
  
  // Group by creator
  const creatorCounts: Map<string, number> = new Map();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const current = creatorCounts.get(data.creatorId) || 0;
    creatorCounts.set(data.creatorId, current + 1);
  });

  // Sort by count descending
  const sorted = Array.from(creatorCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  // Update leaderboard entries
  const batch = writeBatch(db);
  
  for (let i = 0; i < sorted.length; i++) {
    const [creatorId, value] = sorted[i];
    const rank = i + 1;
    
    // Get creator info for denormalization
    const creator = await getCreatorById(creatorId);
    if (!creator) continue;

    // Check for existing entry
    const existingQuery = query(
      collection(db, LEADERBOARD_COLLECTION),
      where('type', '==', 'volume'),
      where('period', '==', weekOf),
      where('creatorId', '==', creatorId)
    );
    const existing = await getDocs(existingQuery);

    const entryData = {
      type: 'volume' as LeaderboardType,
      period: weekOf,
      creatorId,
      creatorName: creator.fullName,
      creatorHandle: creator.tiktokHandle,
      value,
      rank,
      updatedAt: serverTimestamp(),
    };

    if (existing.empty) {
      const newDocRef = doc(collection(db, LEADERBOARD_COLLECTION));
      batch.set(newDocRef, entryData);
    } else {
      batch.update(doc(db, LEADERBOARD_COLLECTION, existing.docs[0].id), entryData);
    }
  }

  await batch.commit();
}

// ===== REWARDS =====

/**
 * Gets all active rewards
 */
export async function getActiveRewards(category?: RewardCategory): Promise<Reward[]> {
  let q = query(
    collection(db, REWARDS_COLLECTION),
    where('isActive', '==', true)
  );

  if (category) {
    q = query(q, where('category', '==', category));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc =>
    convertTimestamps<Reward>({ id: doc.id, ...doc.data() })
  );
}

/**
 * Gets a reward by ID
 */
export async function getRewardById(id: string): Promise<Reward | null> {
  const docRef = doc(db, REWARDS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return convertTimestamps<Reward>({ id: docSnap.id, ...docSnap.data() });
}

/**
 * Gets reward for a specific milestone tier
 */
export async function getRewardByMilestoneTier(tier: MilestoneTier): Promise<Reward | null> {
  const q = query(
    collection(db, REWARDS_COLLECTION),
    where('category', '==', 'milestone'),
    where('milestoneTier', '==', tier),
    where('isActive', '==', true),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  return convertTimestamps<Reward>({
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  });
}

/**
 * Creates a new reward (admin)
 */
export async function createReward(data: Omit<Reward, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, REWARDS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates a reward (admin)
 */
export async function updateReward(id: string, data: Partial<Reward>): Promise<void> {
  const docRef = doc(db, REWARDS_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ===== REDEMPTIONS =====

/**
 * Creates a redemption record
 */
export async function createRedemption(
  data: Omit<Redemption, 'id' | 'createdAt' | 'status'>
): Promise<string> {
  const docRef = await addDoc(collection(db, REDEMPTIONS_COLLECTION), {
    ...data,
    status: 'pending' as RedemptionStatus,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Gets redemptions for a creator
 */
export async function getRedemptionsByCreatorId(
  creatorId: string,
  status?: RedemptionStatus
): Promise<Redemption[]> {
  let q = query(
    collection(db, REDEMPTIONS_COLLECTION),
    where('creatorId', '==', creatorId),
    orderBy('createdAt', 'desc')
  );

  if (status) {
    q = query(q, where('status', '==', status));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc =>
    convertTimestamps<Redemption>({ id: doc.id, ...doc.data() })
  );
}

/**
 * Gets all redemptions (admin view)
 */
export async function getAllRedemptions(filters?: {
  status?: RedemptionStatus;
  source?: RedemptionSource;
  limit?: number;
  lastDoc?: Parameters<typeof startAfter>[0];
}): Promise<{ redemptions: Redemption[]; lastDoc: Parameters<typeof startAfter>[0] | null; hasMore: boolean }> {
  const pageLimit = filters?.limit || 20;

  let q = query(
    collection(db, REDEMPTIONS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(pageLimit + 1)
  );

  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters?.lastDoc) {
    q = query(q, startAfter(filters.lastDoc));
  }

  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const hasMore = docs.length > pageLimit;
  const resultDocs = hasMore ? docs.slice(0, pageLimit) : docs;

  let redemptions = resultDocs.map(doc =>
    convertTimestamps<Redemption>({ id: doc.id, ...doc.data() })
  );

  // Client-side filter for source (Firestore limitation)
  if (filters?.source) {
    redemptions = redemptions.filter(r => r.source === filters.source);
  }

  return {
    redemptions,
    lastDoc: resultDocs[resultDocs.length - 1] || null,
    hasMore,
  };
}

/**
 * Updates redemption status (admin)
 */
export async function updateRedemptionStatus(
  id: string,
  status: RedemptionStatus,
  adminId: string,
  fulfillmentDetails?: Partial<Pick<Redemption, 
    'cashAmount' | 'cashMethod' | 'cashHandle' | 
    'storeCreditCode' | 'productShipped' | 'trackingNumber' | 'notes'
  >>
): Promise<void> {
  const docRef = doc(db, REDEMPTIONS_COLLECTION, id);
  
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === 'fulfilled') {
    updateData.fulfilledAt = serverTimestamp();
    updateData.fulfilledBy = adminId;
  }

  if (fulfillmentDetails) {
    Object.assign(updateData, fulfillmentDetails);
  }

  await updateDoc(docRef, updateData);
}

/**
 * Gets a redemption by ID
 */
export async function getRedemptionById(id: string): Promise<Redemption | null> {
  const docRef = doc(db, REDEMPTIONS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return convertTimestamps<Redemption>({ id: docSnap.id, ...docSnap.data() });
}

