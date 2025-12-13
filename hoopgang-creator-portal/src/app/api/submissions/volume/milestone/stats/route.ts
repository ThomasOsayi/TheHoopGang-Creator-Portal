// src/app/api/submissions/milestone/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCreatorByUserId, getMilestoneStats } from '@/lib/firestore';
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

    // Get milestone stats
    const stats = await getMilestoneStats(creator.id);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Milestone stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch milestone stats' },
      { status: 500 }
    );
  }
}