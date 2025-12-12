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
} from '@/types';
import { generateCreatorId, MAX_CONTENT_SUBMISSIONS } from './constants';

const CREATORS_COLLECTION = 'creators';

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

