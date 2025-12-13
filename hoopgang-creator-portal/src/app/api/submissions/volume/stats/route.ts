// src/app/api/submissions/volume/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCreatorByUserId, getVolumeStats } from '@/lib/firestore';
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

    // Get current week
    const currentWeek = getCurrentWeek();

    // Get stats
    const stats = await getVolumeStats(creator.id, currentWeek);

    return NextResponse.json({
      success: true,
      stats,
      weekOf: currentWeek,
    });
  } catch (error) {
    console.error('Volume stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}