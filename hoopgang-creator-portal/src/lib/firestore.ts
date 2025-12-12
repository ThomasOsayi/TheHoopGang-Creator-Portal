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
 * Creates a new creator document in Firestore
 */
export async function createCreator(
  data: CreatorApplicationInput,
  userId?: string
): Promise<string> {
  const now = Timestamp.now();
  
  // Use sequential ID instead of random
  const creatorId = await generateSequentialCreatorId();
  
  const initialStatusHistory = [
    {
      status: 'pending' as CreatorStatus,
      timestamp: now,
    },
  ];

  // Initialize follower history with application data
  const initialFollowerHistory = [
    {
      date: now.toDate(),
      instagramFollowers: data.instagramFollowers,
      tiktokFollowers: data.tiktokFollowers,
      source: 'application' as const,
    },
  ];

  const creatorData = {
    ...data,
    id: '', // Will be set after document creation
    creatorId,
    status: 'pending' as CreatorStatus,
    statusHistory: initialStatusHistory,
    followerHistory: initialFollowerHistory, // ✅ ADD THIS LINE
    contentSubmissions: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(userId && { userId }), // Only include if defined
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
 */
export async function updateCreator(
  id: string,
  data: Partial<Creator>
): Promise<void> {
  const docRef = doc(db, CREATORS_COLLECTION, id);
  const updateData: any = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  // If status is being changed, append to statusHistory
  if (data.status !== undefined) {
    const currentDoc = await getDoc(docRef);
    if (currentDoc.exists()) {
      const currentCreator = convertTimestamps<Creator>({
        id: currentDoc.id,
        ...currentDoc.data(),
      });

      const newStatusEntry = {
        status: data.status,
        timestamp: Timestamp.now(),
      };

      // Convert existing statusHistory entries to Timestamps
      const existingHistory = (currentCreator.statusHistory || []).map((entry) => ({
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
 */
export async function addContentSubmission(
  creatorId: string,
  url: string
): Promise<ContentSubmission> {
  const creator = await getCreatorById(creatorId);
  if (!creator) {
    throw new Error('Creator not found');
  }

  if (creator.contentSubmissions.length >= MAX_CONTENT_SUBMISSIONS) {
    throw new Error(`Maximum of ${MAX_CONTENT_SUBMISSIONS} content submissions allowed`);
  }

  const newSubmission: ContentSubmission = {
    url,
    submittedAt: new Date(),
  };

  const updatedSubmissions = [...creator.contentSubmissions, newSubmission];

  await updateCreator(creatorId, {
    contentSubmissions: updatedSubmissions,
  });

  return newSubmission;
}

/**
 * Calculates dashboard statistics
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

  const stats: DashboardStats = {
    totalApplications: allCreators.length,
    pendingReview: allCreators.filter((c) => c.status === 'pending').length,
    activeCollabs: allCreators.filter((c) =>
      ['approved', 'shipped', 'delivered'].includes(c.status)
    ).length,
    completed: allCreators.filter((c) => c.status === 'completed').length,
    ghosted: allCreators.filter((c) => c.status === 'ghosted').length,
    ghostRate: 0,
  };

  if (stats.totalApplications > 0) {
    stats.ghostRate = (stats.ghosted / stats.totalApplications) * 100;
  }

  return stats;
}

