// src/app/api/admin/leaderboard/gmv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getLeaderboard, 
  upsertLeaderboardEntry,
  getCreatorById,
  getCreatorByCreatorId,
} from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { getCurrentMonth, getPreviousMonths } from '@/lib/week-utils';
import { collection, query, where, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// GET - Fetch GMV leaderboard for a month
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || getCurrentMonth();

    // Get leaderboard entries
    const entries = await getLeaderboard('gmv', period, 50);

    return NextResponse.json({
      success: true,
      period,
      entries,
      availableMonths: getPreviousMonths(6),
    });
  } catch (error) {
    console.error('GMV leaderboard fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GMV leaderboard' },
      { status: 500 }
    );
  }
}

// POST - Add or update a GMV entry
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminId = decodedToken.uid;

    // Parse request body
    const { creatorId, gmvAmount, period } = await request.json();

    if (!creatorId || gmvAmount === undefined || !period) {
      return NextResponse.json(
        { error: 'creatorId, gmvAmount, and period are required' },
        { status: 400 }
      );
    }

    // Get creator info
    let creator = await getCreatorById(creatorId);
    
    // If not found by doc ID, try by creator display ID (e.g., "CRT-2024-001")
    if (!creator) {
      creator = await getCreatorByCreatorId(creatorId);
    }

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Upsert the entry (rank will be recalculated)
    const entryId = await upsertLeaderboardEntry(
      {
        type: 'gmv',
        period,
        creatorId: creator.id,
        creatorName: creator.fullName,
        creatorHandle: creator.tiktokHandle,
        value: gmvAmount,
        rank: 0, // Will be recalculated
      },
      adminId
    );

    // Recalculate ranks for this period
    await recalculateGMVRanks(period);

    return NextResponse.json({
      success: true,
      entryId,
      message: 'GMV entry saved and ranks recalculated',
    });
  } catch (error) {
    console.error('GMV entry save error:', error);
    return NextResponse.json(
      { error: 'Failed to save GMV entry' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a GMV entry
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');
    const period = searchParams.get('period');

    if (!entryId) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 });
    }

    // Delete the entry
    await deleteDoc(doc(db, 'leaderboardEntries', entryId));

    // Recalculate ranks if period provided
    if (period) {
      await recalculateGMVRanks(period);
    }

    return NextResponse.json({
      success: true,
      message: 'Entry deleted',
    });
  } catch (error) {
    console.error('GMV entry delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete GMV entry' },
      { status: 500 }
    );
  }
}

// Helper function to recalculate GMV ranks for a period
async function recalculateGMVRanks(period: string): Promise<void> {
  const q = query(
    collection(db, 'leaderboardEntries'),
    where('type', '==', 'gmv'),
    where('period', '==', period)
  );

  const snapshot = await getDocs(q);
  
  // Sort by value descending
  const entries = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => b.value - a.value);

  // Update ranks
  const batch = writeBatch(db);
  entries.forEach((entry: any, index: number) => {
    batch.update(doc(db, 'leaderboardEntries', entry.id), {
      rank: index + 1,
    });
  });

  await batch.commit();
}