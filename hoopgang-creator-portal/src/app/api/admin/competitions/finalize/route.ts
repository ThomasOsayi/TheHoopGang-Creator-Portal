// src/app/api/admin/competitions/finalize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getCompetitionById,
  getCompetitionLeaderboard,
  finalizeCompetition,
  createRedemption,
  getActiveRewards,
} from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { CompetitionWinner } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminId = decodedToken.uid;

    const { competitionId } = await request.json();

    if (!competitionId) {
      return NextResponse.json(
        { error: 'competitionId is required' },
        { status: 400 }
      );
    }

    // Get competition
    const competition = await getCompetitionById(competitionId);
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    if (competition.status === 'finalized') {
      return NextResponse.json(
        { error: 'Competition already finalized' },
        { status: 400 }
      );
    }

    if (competition.status === 'active') {
      return NextResponse.json(
        { error: 'Competition is still active. End it first.' },
        { status: 400 }
      );
    }

    // Get final leaderboard
    const leaderboard = await getCompetitionLeaderboard(competitionId, 3);
    
    if (leaderboard.length === 0) {
      return NextResponse.json(
        { error: 'No submissions in this competition' },
        { status: 400 }
      );
    }

    // Get rewards
    const rewards = await getActiveRewards('volume_leaderboard');
    
    // Create winners array and redemptions
    const winners: CompetitionWinner[] = [];
    
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
          source: 'competition_win',
          sourceId: `${competitionId}-rank-${entry.rank}`,
          fulfillmentType: 'cash',
          cashAmount: rewardAmount,
        });
      }
    }

    // Finalize competition
    await finalizeCompetition(competitionId, winners, adminId);

    return NextResponse.json({
      success: true,
      message: 'Competition finalized! Redemptions created for winners.',
      winners,
    });
  } catch (error) {
    console.error('Finalize competition error:', error);
    return NextResponse.json(
      { error: 'Failed to finalize competition' },
      { status: 500 }
    );
  }
}

