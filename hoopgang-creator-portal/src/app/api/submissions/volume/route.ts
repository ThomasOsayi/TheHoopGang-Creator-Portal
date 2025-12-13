// src/app/api/submissions/volume/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createVolumeSubmission, getCreatorByUserId, recalculateVolumeLeaderboard, getActiveCompetition, recalculateCompetitionLeaderboard } from '@/lib/firestore';
import { getCurrentWeek } from '@/lib/week-utils';
import { adminAuth } from '@/lib/firebase-admin';

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
    const { tiktokUrl } = await request.json();

    // Validate TikTok URL
    if (!tiktokUrl || typeof tiktokUrl !== 'string') {
      return NextResponse.json({ error: 'TikTok URL is required' }, { status: 400 });
    }

    if (!tiktokUrl.includes('tiktok.com/') && !tiktokUrl.includes('vm.tiktok.com/')) {
      return NextResponse.json({ error: 'Invalid TikTok URL' }, { status: 400 });
    }

    // Get current week
    const weekOf = getCurrentWeek();

    // Get active competition (if any)
    const activeCompetition = await getActiveCompetition('volume');
    const competitionId = activeCompetition?.id || null;

    // Create submission (auto-approved for volume)
    const submission = await createVolumeSubmission(creator.id, tiktokUrl, weekOf, competitionId);

    // Recalculate leaderboard after successful submission
    // Note: In production, you might want to do this via a background job
    await recalculateVolumeLeaderboard(weekOf);

    // Recalculate competition leaderboard if there's an active competition
    if (competitionId) {
      await recalculateCompetitionLeaderboard(competitionId);
    }

    return NextResponse.json({
      success: true,
      submission,
      competitionId,
    });
  } catch (error) {
    console.error('Volume submission error:', error);
    
    // Handle duplicate URL error
    if (error instanceof Error && error.message.includes('already submitted')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Failed to submit content' },
      { status: 500 }
    );
  }
}