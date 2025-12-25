// src/app/api/creator/rewards/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getCreatorByUserId, 
  getRedemptionsByCreatorId,
  getV3SubmissionsByCreatorId,
} from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify token and get user
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get creator by userId (FIXED: use proper function)
    const creator = await getCreatorByUserId(userId);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Fetch all redemptions for this creator
    const redemptions = await getRedemptionsByCreatorId(creator.id);

    // Calculate stats from redemptions
    let totalEarned = 0;
    let pending = 0;
    let readyToClaim = 0;
    const earnedRewardIds: string[] = [];

    redemptions.forEach((redemption) => {
      // Track earned reward IDs
      if (redemption.rewardId) {
        earnedRewardIds.push(redemption.rewardId);
      }

      // Calculate totals based on status
      switch (redemption.status) {
        case 'fulfilled':
          // Add to total earned
          totalEarned += redemption.cashAmount || 0;
          break;
        case 'pending':
          pending += 1;
          break;
        case 'approved':
          // Approved but not yet fulfilled = ready to claim
          readyToClaim += 1;
          break;
      }
    });

    // Check for approved milestone submissions that don't have redemptions yet
    // (Edge case - shouldn't happen if review endpoint works correctly)
    const approvedMilestones = await getV3SubmissionsByCreatorId(creator.id, {
      type: 'milestone',
      status: 'approved',
    });

    for (const milestone of approvedMilestones) {
      const hasRedemption = redemptions.some(r => r.sourceId === milestone.id);
      if (!hasRedemption) {
        readyToClaim += 1;
      }
    }

    // Get volume submission count for volume-based rewards
    const volumeSubmissions = await getV3SubmissionsByCreatorId(creator.id, {
      type: 'volume',
      status: 'approved',
    });
    const totalVolumeSubmissions = volumeSubmissions.length;

    // Map to catalog reward IDs based on volume thresholds
    if (totalVolumeSubmissions >= 1) earnedRewardIds.push('bonus-first');
    if (totalVolumeSubmissions >= 10) earnedRewardIds.push('vol-10');
    if (totalVolumeSubmissions >= 25) earnedRewardIds.push('vol-25');
    if (totalVolumeSubmissions >= 50) earnedRewardIds.push('vol-50');

    return NextResponse.json({
      totalEarned,
      pending,
      readyToClaim,
      earnedRewardIds,
    });
  } catch (error) {
    console.error('Error fetching reward stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reward stats' },
      { status: 500 }
    );
  }
}