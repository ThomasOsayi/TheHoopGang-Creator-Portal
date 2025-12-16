// src/app/api/admin/rewards/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';

const REWARDS_COLLECTION = 'rewards';

type RewardType = 'cash' | 'credit' | 'product' | 'custom';

// Helper to get default icon for type
function getDefaultIcon(type: RewardType): string {
  switch (type) {
    case 'cash': return '💵';
    case 'credit': return '🎁';
    case 'product': return '👕';
    case 'custom': return '✨';
    default: return '🎁';
  }
}

// GET single reward
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
    return NextResponse.json({
      reward: {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
      },
    });
  } catch (error) {
    console.error('Error fetching reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update reward
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

    const body = await req.json();

    // Check if reward exists
    const docRef = doc(db, REWARDS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    // Build update data - only include fields that are provided
    const updateData: Record<string, any> = {
      updatedAt: Timestamp.now(),
    };

    // Handle new format fields
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.type !== undefined) {
      const validTypes: RewardType[] = ['cash', 'credit', 'product', 'custom'];
      updateData.type = validTypes.includes(body.type) ? body.type : 'custom';
    }
    if (body.value !== undefined) updateData.value = body.value.trim();
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Handle legacy fields for backwards compatibility
    if (body.category !== undefined) updateData.category = body.category;
    if (body.milestoneTier !== undefined) updateData.milestoneTier = body.milestoneTier;
    if (body.leaderboardRank !== undefined) updateData.leaderboardRank = body.leaderboardRank;
    if (body.cashValue !== undefined) updateData.cashValue = body.cashValue;
    if (body.storeCreditValue !== undefined) updateData.storeCreditValue = body.storeCreditValue;
    if (body.productName !== undefined) updateData.productName = body.productName;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;

    await updateDoc(docRef, updateData);

    return NextResponse.json({
      success: true,
      rewardId: id,
    });
  } catch (error) {
    console.error('Error updating reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE reward
export async function DELETE(
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

    // Check if reward exists
    const docRef = doc(db, REWARDS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    await deleteDoc(docRef);

    return NextResponse.json({
      success: true,
      message: 'Reward deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}