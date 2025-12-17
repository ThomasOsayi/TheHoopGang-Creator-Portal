// src/app/api/admin/rewards/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';

const REWARDS_COLLECTION = 'rewards';

type RewardType = 'cash' | 'credit' | 'product' | 'custom';
type RewardCategory = 'milestone' | 'volume_leaderboard' | 'gmv_leaderboard';
type MilestoneTier = '100k' | '500k' | '1m';

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

// GET single reward
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const { id } = await params;
    const docRef = doc(db, REWARDS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    const reward = convertTimestamps({
      id: docSnap.id,
      ...docSnap.data(),
    });

    return NextResponse.json({ reward });
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
    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const { id } = await params;
    const body = await req.json();

    // Check if reward exists
    const docRef = doc(db, REWARDS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    // Build update data (only include fields that are provided)
    const updateData: Record<string, any> = {
      updatedAt: Timestamp.now(),
    };

    // Basic fields
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updateData.description = body.description.trim();
    }

    if (body.value !== undefined) {
      if (!body.value.trim()) {
        return NextResponse.json({ error: 'Value cannot be empty' }, { status: 400 });
      }
      updateData.value = body.value.trim();
    }

    // Type validation
    if (body.type !== undefined) {
      const validTypes: RewardType[] = ['cash', 'credit', 'product', 'custom'];
      if (!validTypes.includes(body.type)) {
        return NextResponse.json({ error: 'Invalid reward type' }, { status: 400 });
      }
      updateData.type = body.type;
    }

    // Category validation
    if (body.category !== undefined) {
      const validCategories: RewardCategory[] = ['milestone', 'volume_leaderboard', 'gmv_leaderboard'];
      if (!validCategories.includes(body.category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      updateData.category = body.category;
    }

    // Milestone tier (only valid for milestone category)
    if (body.milestoneTier !== undefined) {
      const category = body.category || docSnap.data()?.category;
      if (category === 'milestone') {
        const validTiers: MilestoneTier[] = ['100k', '500k', '1m'];
        if (body.milestoneTier && !validTiers.includes(body.milestoneTier)) {
          return NextResponse.json({ error: 'Invalid milestone tier' }, { status: 400 });
        }
        updateData.milestoneTier = body.milestoneTier || null;
      }
    }

    // Leaderboard rank (only valid for leaderboard categories)
    if (body.leaderboardRank !== undefined) {
      const category = body.category || docSnap.data()?.category;
      if (category === 'volume_leaderboard' || category === 'gmv_leaderboard') {
        if (body.leaderboardRank && (body.leaderboardRank < 1 || body.leaderboardRank > 10)) {
          return NextResponse.json({ error: 'Invalid leaderboard rank (must be 1-10)' }, { status: 400 });
        }
        updateData.leaderboardRank = body.leaderboardRank || null;
      }
    }

    // Icon
    if (body.icon !== undefined) {
      updateData.icon = body.icon;
    }

    // Active status
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }

    // Perform update
    await updateDoc(docRef, updateData);

    // Fetch updated reward
    const updatedSnap = await getDoc(docRef);
    const updatedReward = convertTimestamps({
      id: updatedSnap.id,
      ...updatedSnap.data(),
    });

    return NextResponse.json({
      success: true,
      reward: updatedReward,
    });
  } catch (error) {
    console.error('Error updating reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}