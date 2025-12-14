// src/app/api/admin/redemptions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';
import { Redemption, RedemptionStatus } from '@/types';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify admin
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    // Fetch redemption
    const docRef = doc(db, REDEMPTIONS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }

    const redemption = convertTimestamps<Redemption>({
      id: docSnap.id,
      ...docSnap.data(),
    });

    // Enrich with creator info
    try {
      const creatorDoc = await getDoc(doc(db, CREATORS_COLLECTION, redemption.creatorId));
      if (creatorDoc.exists()) {
        const creatorData = creatorDoc.data();
        return NextResponse.json({
          success: true,
          redemption: {
            ...redemption,
            creatorName: creatorData.fullName || 'Unknown',
            creatorEmail: creatorData.email || '',
          },
        });
      }
    } catch (err) {
      console.error('Error fetching creator:', err);
    }

    return NextResponse.json({
      success: true,
      redemption: {
        ...redemption,
        creatorName: 'Unknown',
        creatorEmail: '',
      },
    });
  } catch (error) {
    console.error('Error fetching redemption:', error);
    return NextResponse.json(
      { error: 'Failed to fetch redemption' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify admin
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminId = decodedToken.uid;

    // Check redemption exists
    const docRef = doc(db, REDEMPTIONS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, ...fulfillmentDetails } = body;

    // Build update data
    const updateData: Record<string, any> = {
      updatedAt: Timestamp.now(),
    };

    // Status update
    if (status) {
      updateData.status = status;

      // If fulfilling, add fulfillment metadata
      if (status === 'fulfilled') {
        updateData.fulfilledAt = Timestamp.now();
        updateData.fulfilledBy = adminId;
      }
    }

    // Fulfillment details
    if (fulfillmentDetails.cashAmount !== undefined) {
      updateData.cashAmount = fulfillmentDetails.cashAmount;
    }
    if (fulfillmentDetails.cashMethod !== undefined) {
      updateData.cashMethod = fulfillmentDetails.cashMethod;
    }
    if (fulfillmentDetails.cashHandle !== undefined) {
      updateData.cashHandle = fulfillmentDetails.cashHandle;
    }
    if (fulfillmentDetails.storeCreditCode !== undefined) {
      updateData.storeCreditCode = fulfillmentDetails.storeCreditCode;
    }
    if (fulfillmentDetails.productShipped !== undefined) {
      updateData.productShipped = fulfillmentDetails.productShipped;
    }
    if (fulfillmentDetails.trackingNumber !== undefined) {
      updateData.trackingNumber = fulfillmentDetails.trackingNumber;
    }
    if (fulfillmentDetails.notes !== undefined) {
      updateData.notes = fulfillmentDetails.notes;
    }

    await updateDoc(docRef, updateData);

    return NextResponse.json({
      success: true,
      message: 'Redemption updated successfully',
    });
  } catch (error) {
    console.error('Error updating redemption:', error);
    return NextResponse.json(
      { error: 'Failed to update redemption' },
      { status: 500 }
    );
  }
}