// src/app/api/admin/redemptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';
import { Redemption, RedemptionStatus, RedemptionSource } from '@/types';

const REDEMPTIONS_COLLECTION = 'redemptions';
const CREATORS_COLLECTION = 'creators';

// Helper to convert Firestore timestamps
function convertTimestamps<T>(data: any): T {
  if (data === null || data === undefined) return data;
  if (data.toDate) return data.toDate() as any;
  if (Array.isArray(data)) return data.map((item) => convertTimestamps(item)) as any;
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

export async function GET(request: NextRequest) {
  try {
    // Verify admin
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Check admin role (optional: add your admin check logic)
    // For now, any authenticated user can access - add role check if needed

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as RedemptionStatus | null;
    const source = searchParams.get('source') as RedemptionSource | null;

    // Build query
    let q = query(
      collection(db, REDEMPTIONS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    // Note: Firestore requires indexes for compound queries
    // We'll do server-side filtering for flexibility
    const snapshot = await getDocs(q);

    let redemptions = snapshot.docs.map((docSnap) =>
      convertTimestamps<Redemption>({ id: docSnap.id, ...docSnap.data() })
    );

    // Apply filters
    if (status) {
      redemptions = redemptions.filter((r) => r.status === status);
    }
    if (source) {
      redemptions = redemptions.filter((r) => r.source === source);
    }

    // Enrich with creator info
    const enrichedRedemptions = await Promise.all(
      redemptions.map(async (redemption) => {
        try {
          const creatorDoc = await getDoc(doc(db, CREATORS_COLLECTION, redemption.creatorId));
          if (creatorDoc.exists()) {
            const creatorData = creatorDoc.data();
            return {
              ...redemption,
              creatorName: creatorData.fullName || 'Unknown',
              creatorEmail: creatorData.email || '',
            };
          }
        } catch (err) {
          console.error('Error fetching creator:', err);
        }
        return {
          ...redemption,
          creatorName: 'Unknown',
          creatorEmail: '',
        };
      })
    );

    return NextResponse.json({
      success: true,
      redemptions: enrichedRedemptions,
      total: enrichedRedemptions.length,
    });
  } catch (error) {
    console.error('Error fetching redemptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch redemptions' },
      { status: 500 }
    );
  }
}