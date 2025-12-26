// src/app/api/submissions/volume/stats/route.ts
// FIXED: Now returns recentSubmissions for the Recent Submissions card

import { NextRequest, NextResponse } from 'next/server';
import { 
  getCreatorByUserId, 
  getVolumeStats, 
  getActiveCompetition,
  getV3SubmissionsByCreatorId,
} from '@/lib/firestore';
import { getCurrentWeek } from '@/lib/week-utils';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
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

    // Get current week (still used for weekOf tracking)
    const currentWeek = getCurrentWeek();

    // Get active competition (if any)
    const activeCompetition = await getActiveCompetition('volume');

    // Get stats - pass competitionId if active
    const stats = await getVolumeStats(
      creator.id, 
      currentWeek,
      activeCompetition?.id || null
    );

    // ===== FIX: Fetch recent submissions for the Recent Submissions card =====
    // Get all volume submissions for this creator, sorted by most recent
    const allSubmissions = await getV3SubmissionsByCreatorId(creator.id, {
      type: 'volume',
    });

    // Sort by submittedAt descending (most recent first) and take top 5
    const recentSubmissions = allSubmissions
      .sort((a, b) => {
        const dateA = a.submittedAt instanceof Date ? a.submittedAt : new Date(a.submittedAt);
        const dateB = b.submittedAt instanceof Date ? b.submittedAt : new Date(b.submittedAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5)
      .map(sub => ({
        id: sub.id,
        tiktokUrl: sub.tiktokUrl || null,
        createdAt: sub.submittedAt,
        // Include file info for file uploads
        submissionFormat: sub.submissionFormat || 'url',
        fileName: sub.fileName || null,
        fileUrl: sub.fileUrl || null,
      }));

    return NextResponse.json({
      success: true,
      stats,
      weekOf: currentWeek,
      competitionId: activeCompetition?.id || null,
      competitionActive: activeCompetition?.status === 'active',
      // ===== FIX: Include recent submissions in response =====
      recentSubmissions,
    });
  } catch (error) {
    console.error('Volume stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}