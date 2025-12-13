// src/app/api/admin/rewards/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';

const REWARDS_COLLECTION = 'rewards';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    // Check reward exists
    const docRef = doc(db, REWARDS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    const body = await req.json();

    // Build update data (only include provided fields)
    const updateData: Record<string, any> = {
      updatedAt: Timestamp.now(),
    };

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.category !== undefined) updateData.category = body.category;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.milestoneTier !== undefined) updateData.milestoneTier = body.milestoneTier;
    if (body.leaderboardRank !== undefined) updateData.leaderboardRank = body.leaderboardRank;
    if (body.cashValue !== undefined) updateData.cashValue = body.cashValue;
    if (body.storeCreditValue !== undefined) updateData.storeCreditValue = body.storeCreditValue;
    if (body.productName !== undefined) updateData.productName = body.productName?.trim() || null;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl?.trim() || null;

    await updateDoc(docRef, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const docRef = doc(db, REWARDS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    const data = docSnap.data();
    // Convert timestamps
    const reward = {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    };

    return NextResponse.json({ reward });
  } catch (error) {
    console.error('Error fetching reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

