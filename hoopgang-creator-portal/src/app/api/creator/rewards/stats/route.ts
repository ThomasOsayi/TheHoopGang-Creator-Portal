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

    // Get creator by userId
    const creator = await getCreatorByUserId(userId);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Fetch all redemptions for this creator
    const redemptions = await getRedemptionsByCreatorId(creator.id);

    // Calculate stats from redemptions
    let totalEarned = 0;           // Total $ value of fulfilled redemptions
    let totalEarnedValue = 0;      // Total value including store credit
    let readyToClaimCount = 0;     // Redemptions waiting for creator to claim
    let readyToClaimValue = 0;     // $ value of claimable redemptions
    let processingCount = 0;       // Redemptions being processed by admin
    let processingValue = 0;       // $ value of processing redemptions
    const earnedRewardIds: string[] = [];

    redemptions.forEach((redemption) => {
      // Track earned reward IDs
      if (redemption.rewardId) {
        earnedRewardIds.push(redemption.rewardId);
      }

      // Get redemption value (prefer new fields, fallback to legacy)
      const cashValue = redemption.cashValue || redemption.cashAmount || 0;
      const storeCreditValue = redemption.storeCreditValue || 0;
      const totalValue = cashValue + storeCreditValue;

      // Calculate totals based on status
      switch (redemption.status) {
        case 'fulfilled':
          // Completed - add to total earned
          totalEarned += cashValue;
          totalEarnedValue += totalValue;
          break;
          
        case 'awaiting_claim':
          // Waiting for creator to provide payment info = Ready to Claim
          readyToClaimCount += 1;
          readyToClaimValue += totalValue;
          break;
          
        case 'ready_to_fulfill':
          // Creator claimed, waiting for admin to fulfill = Processing
          processingCount += 1;
          processingValue += totalValue;
          break;
          
        // 'rejected' status is not counted in active stats
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
        readyToClaimCount += 1;
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
      // Primary stats for display
      totalEarned,                    // Cash value of fulfilled redemptions
      totalEarnedValue,               // Total value including store credit
      readyToClaim: readyToClaimCount, // Number ready to claim
      readyToClaimValue,              // Value of claimable rewards
      pending: processingCount,        // Number being processed (legacy name for backwards compat)
      processing: processingCount,     // Alias for clarity
      processingValue,                // Value being processed
      
      // For reward availability
      earnedRewardIds,
      
      // Detailed counts for UI
      counts: {
        awaitingClaim: readyToClaimCount,
        processing: processingCount,
        fulfilled: redemptions.filter(r => r.status === 'fulfilled').length,
        rejected: redemptions.filter(r => r.status === 'rejected').length,
        total: redemptions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching reward stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reward stats' },
      { status: 500 }
    );
  }
}