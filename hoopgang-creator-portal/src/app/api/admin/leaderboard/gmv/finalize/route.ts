// src/app/api/admin/leaderboard/gmv/finalize/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getLeaderboard, createRedemption, getActiveRewards } from '@/lib/firestore';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminId = decodedToken.uid;

    const { period } = await request.json();

    if (!period) {
      return NextResponse.json({ error: 'period is required' }, { status: 400 });
    }

    // Get final leaderboard
    const leaderboard = await getLeaderboard('gmv', period, 3);

    if (leaderboard.length === 0) {
      return NextResponse.json(
        { error: 'No entries to finalize' },
        { status: 400 }
      );
    }

    // Get GMV rewards configuration
    const rewards = await getActiveRewards('gmv_leaderboard');

    const winners = [];

    // Create redemption records for top 3
    for (const entry of leaderboard) {
      const reward = rewards.find(r => r.leaderboardRank === entry.rank);
      const rewardAmount = reward?.cashValue || 0;

      winners.push({
        rank: entry.rank,
        creatorId: entry.creatorId,
        creatorName: entry.creatorName,
        creatorHandle: entry.creatorHandle,
        value: entry.value,
        rewardAmount,
      });

      if (reward) {
        await createRedemption({
          creatorId: entry.creatorId,
          rewardId: reward.id,
          rewardName: reward.name,
          source: 'gmv_win',
          sourceId: `gmv-${period}-rank-${entry.rank}`,
          fulfillmentType: 'cash',
          cashAmount: rewardAmount,
        });
      }
    }

    // Mark the period as finalized (optional: store in a separate collection)
    await adminDb.collection('finalizedPeriods').doc(`gmv-${period}`).set({
      type: 'gmv',
      period,
      finalizedAt: new Date(),
      finalizedBy: adminId,
      winners,
    });

    return NextResponse.json({
      success: true,
      message: 'Month finalized! Redemption records created for winners.',
      winners,
    });
  } catch (error) {
    console.error('GMV finalize error:', error);
    return NextResponse.json(
      { error: 'Failed to finalize month' },
      { status: 500 }
    );
  }
}