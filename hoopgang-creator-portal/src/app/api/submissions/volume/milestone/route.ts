// src/app/api/submissions/milestone/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createMilestoneSubmission, getCreatorByUserId } from '@/lib/firestore';
import { getCurrentWeek } from '@/lib/week-utils';
import { adminAuth } from '@/lib/firebase-admin';
import { MilestoneTier } from '@/types';

const VALID_TIERS: MilestoneTier[] = ['100k', '500k', '1m'];

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get creator
    const creator = await getCreatorByUserId(userId);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Parse request body
    const { tiktokUrl, claimedTier } = await request.json();

    // Validate TikTok URL
    if (!tiktokUrl || typeof tiktokUrl !== 'string') {
      return NextResponse.json({ error: 'TikTok URL is required' }, { status: 400 });
    }

    if (!tiktokUrl.includes('tiktok.com/') && !tiktokUrl.includes('vm.tiktok.com/')) {
      return NextResponse.json({ error: 'Invalid TikTok URL' }, { status: 400 });
    }

    // Validate tier
    if (!claimedTier || !VALID_TIERS.includes(claimedTier)) {
      return NextResponse.json({ 
        error: 'Invalid tier. Must be one of: 100k, 500k, 1m' 
      }, { status: 400 });
    }

    // Get current week
    const weekOf = getCurrentWeek();

    // Create submission (pending for admin review)
    const submission = await createMilestoneSubmission(
      creator.id, 
      tiktokUrl, 
      claimedTier,
      weekOf
    );

    return NextResponse.json({
      success: true,
      submission,
      message: 'Milestone submitted for review. You will be notified once approved.',
    });
  } catch (error) {
    console.error('Milestone submission error:', error);
    
    // Handle duplicate URL error
    if (error instanceof Error && error.message.includes('already been submitted')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Failed to submit milestone' },
      { status: 500 }
    );
  }
}