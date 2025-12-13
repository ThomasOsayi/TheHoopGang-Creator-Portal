// src/app/api/admin/leaderboard/volume/finalize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getLeaderboard, 
  recalculateVolumeLeaderboard,
  createRedemption,
  getActiveRewards,
  getCreatorById,
} from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { getCurrentWeek } from '@/lib/week-utils';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    const { weekOf } = await request.json();
    const targetWeek = weekOf || getCurrentWeek();

    // Check if this week has already been finalized
    const existingRedemptions = await checkExistingRedemptions(targetWeek);
    if (existingRedemptions.length > 0) {
      return NextResponse.json({ 
        error: `Week ${targetWeek} has already been finalized. ${existingRedemptions.length} redemptions exist.`,
        alreadyFinalized: true,
      }, { status: 400 });
    }

    // Recalculate final rankings
    await recalculateVolumeLeaderboard(targetWeek);

    // Get top 3 winners
    const leaderboard = await getLeaderboard('volume', targetWeek, 3);
    
    if (leaderboard.length === 0) {
      return NextResponse.json({ 
        error: 'No submissions found for this week',
        noEntries: true,
      }, { status: 400 });
    }

    // Get volume leaderboard rewards
    const rewards = await getActiveRewards('volume_leaderboard');
    
    // Create redemptions for top 3
    const redemptionsCreated: Array<{
      rank: number;
      creatorName: string;
      rewardName: string;
      cashAmount: number;
    }> = [];

    for (const entry of leaderboard) {
      // Find matching reward for this rank
      const reward = rewards.find(r => r.leaderboardRank === entry.rank);
      
      if (reward) {
        const creator = await getCreatorById(entry.creatorId);
        
        await createRedemption({
          creatorId: entry.creatorId,
          rewardId: reward.id,
          rewardName: reward.name,
          source: 'volume_win',
          sourceId: `${targetWeek}-rank-${entry.rank}`,
          fulfillmentType: reward.cashValue ? 'cash' : 'store_credit',
          cashAmount: reward.cashValue,
        });

        redemptionsCreated.push({
          rank: entry.rank,
          creatorName: entry.creatorName,
          rewardName: reward.name,
          cashAmount: reward.cashValue || 0,
        });

        // TODO: Send winner notification email
        // await sendWinnerEmail(creator?.email, entry.rank, reward, targetWeek);
      }
    }

    // Mark the week as finalized (optional - store in a separate collection)
    await markWeekFinalized(targetWeek, adminId, redemptionsCreated);

    return NextResponse.json({
      success: true,
      weekOf: targetWeek,
      message: `Week ${targetWeek} finalized successfully`,
      winners: redemptionsCreated,
      totalRedemptions: redemptionsCreated.length,
    });
  } catch (error) {
    console.error('Weekly finalize error:', error);
    return NextResponse.json(
      { error: 'Failed to finalize week' },
      { status: 500 }
    );
  }
}

// Check if redemptions already exist for this week
async function checkExistingRedemptions(weekOf: string): Promise<string[]> {
  const q = query(
    collection(db, 'redemptions'),
    where('source', '==', 'volume_win'),
    where('sourceId', '>=', `${weekOf}-rank-`),
    where('sourceId', '<=', `${weekOf}-rank-\uf8ff`)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.id);
}

// Store finalization record
async function markWeekFinalized(
  weekOf: string, 
  adminId: string, 
  winners: Array<{ rank: number; creatorName: string; rewardName: string; cashAmount: number }>
): Promise<void> {
  const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
  const { db } = await import('@/lib/firebase');
  
  await addDoc(collection(db, 'weeklyFinalizations'), {
    weekOf,
    finalizedBy: adminId,
    finalizedAt: serverTimestamp(),
    winners,
  });
}