// src/app/api/admin/submissions/[id]/review/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getV3SubmissionById, 
  reviewMilestoneSubmission, 
  getRewardByMilestoneTier,
  createRedemption,
  getCreatorById,
} from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminId = decodedToken.uid;

    // Get the submission
    const submission = await getV3SubmissionById(id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.type !== 'milestone') {
      return NextResponse.json({ error: 'Only milestone submissions can be reviewed' }, { status: 400 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Submission has already been reviewed' }, { status: 400 });
    }

    // Parse request body
    const { decision, verifiedViews, rejectionReason } = await request.json();

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision. Must be "approved" or "rejected"' }, { status: 400 });
    }

    if (decision === 'approved' && (verifiedViews === undefined || verifiedViews < 0)) {
      return NextResponse.json({ error: 'Verified view count is required for approval' }, { status: 400 });
    }

    if (decision === 'rejected' && !rejectionReason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    // Review the submission
    await reviewMilestoneSubmission(
      id,
      decision,
      adminId,
      decision === 'approved' ? verifiedViews : undefined,
      decision === 'rejected' ? rejectionReason : undefined
    );

    // If approved, create a redemption record
    if (decision === 'approved' && submission.claimedTier) {
      const reward = await getRewardByMilestoneTier(submission.claimedTier);
      const creator = await getCreatorById(submission.creatorId);
      
      if (reward) {
        await createRedemption({
          creatorId: submission.creatorId,
          rewardId: reward.id,
          rewardName: reward.name,
          source: 'milestone_submission',
          sourceId: id,
          fulfillmentType: reward.cashValue && reward.storeCreditValue 
            ? 'mixed' 
            : reward.cashValue 
              ? 'cash' 
              : reward.storeCreditValue 
                ? 'store_credit' 
                : 'product',
          cashAmount: reward.cashValue,
        });
      }

      // TODO: Send approval email to creator
      // await sendMilestoneApprovedEmail(creator?.email, submission.claimedTier, reward);
    }

    // TODO: If rejected, send rejection email to creator
    // if (decision === 'rejected') {
    //   await sendMilestoneRejectedEmail(creator?.email, rejectionReason);
    // }

    return NextResponse.json({
      success: true,
      message: `Milestone submission ${decision}`,
    });
  } catch (error) {
    console.error('Milestone review error:', error);
    return NextResponse.json(
      { error: 'Failed to review submission' },
      { status: 500 }
    );
  }
}

