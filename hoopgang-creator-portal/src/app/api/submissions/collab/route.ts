// src/app/api/submissions/collab/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  createCollabSubmission, 
  getCreatorByUserId, 
  getActiveCompetition,
  recalculateVolumeLeaderboard,
  recalculateCompetitionLeaderboard,
} from '@/lib/firestore';
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
    
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    const userId = decodedToken.uid;

    // Get creator
    const creator = await getCreatorByUserId(userId);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Check if creator has an active collaboration
    if (!creator.activeCollaborationId) {
      return NextResponse.json({ 
        error: 'No active collaboration found' 
      }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { tiktokUrl } = body;

    // Validate TikTok URL
    if (!tiktokUrl || typeof tiktokUrl !== 'string') {
      return NextResponse.json({ error: 'TikTok URL is required' }, { status: 400 });
    }

    // Basic URL validation
    const tiktokRegex = /^https?:\/\/(www\.|vm\.)?tiktok\.com\/.+/i;
    if (!tiktokRegex.test(tiktokUrl)) {
      return NextResponse.json({ 
        error: 'Please enter a valid TikTok URL' 
      }, { status: 400 });
    }

    // Get current week and active competition
    const weekOf = getCurrentWeek();
    const activeCompetition = await getActiveCompetition('volume');
    const competitionId = activeCompetition?.id || null;

    // Create collab submission (counts toward both collab AND leaderboard)
    const { submission, collabUpdated } = await createCollabSubmission(
      creator.id,
      creator.activeCollaborationId,
      tiktokUrl,
      weekOf,
      competitionId
    );

    // Recalculate leaderboard since this counts toward it
    await recalculateVolumeLeaderboard(weekOf);
    
    if (competitionId) {
      await recalculateCompetitionLeaderboard(competitionId);
    }

    return NextResponse.json({
      success: true,
      submission,
      collabUpdated,
      competitionId,
      message: 'Content submitted successfully! It counts toward your collaboration and the leaderboard.',
    });
  } catch (error) {
    console.error('Collab submission error:', error);
    
    if (error instanceof Error) {
      // Handle known errors
      if (error.message.includes('already submitted')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes('Maximum')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to submit content' },
      { status: 500 }
    );
  }
}

