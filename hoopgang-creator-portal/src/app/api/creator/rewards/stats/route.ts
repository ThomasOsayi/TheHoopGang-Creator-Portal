// src/app/api/creator/rewards/stats/route.ts
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function GET(request: Request) {
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
    const usersSnapshot = await adminDb.collection('users').where('uid', '==', userId).limit(1).get();
    if (usersSnapshot.empty) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = usersSnapshot.docs[0].data();
    const creatorId = userData.creatorId;

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Fetch all redemptions for this creator
    const redemptionsSnapshot = await adminDb.collection('redemptions')
      .where('creatorId', '==', creatorId)
      .get();

    interface RedemptionData {
      id: string;
      rewardId?: string;
      status: string;
      cashAmount?: number;
      storeCreditAmount?: number;
      submissionId?: string;
    }

    const redemptions: RedemptionData[] = redemptionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as RedemptionData));

    // Calculate stats
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
          // Add to total earned (cash + store credit)
          totalEarned += redemption.cashAmount || 0;
          totalEarned += redemption.storeCreditAmount || 0;
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

    // Also check for milestone submissions that are approved but not yet redeemed
    const milestoneSubmissionsSnapshot = await adminDb.collection('submissions')
      .where('creatorId', '==', creatorId)
      .where('type', '==', 'milestone')
      .where('status', '==', 'approved')
      .get();

    // Check which approved milestones don't have a redemption yet
    for (const doc of milestoneSubmissionsSnapshot.docs) {
      const hasRedemption = redemptions.some(
        (r) => r.submissionId === doc.id
      );
      if (!hasRedemption) {
        readyToClaim += 1;
      }
    }

    // Check volume-based rewards based on total submissions
    const volumeSubmissionsSnapshot = await adminDb.collection('submissions')
      .where('creatorId', '==', creatorId)
      .where('type', '==', 'volume')
      .get();

    const totalVolumeSubmissions = volumeSubmissionsSnapshot.size;

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