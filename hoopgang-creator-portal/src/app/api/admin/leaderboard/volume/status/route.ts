// src/app/api/admin/leaderboard/volume/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { getCurrentWeek, getWeekEnd } from '@/lib/week-utils';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const { searchParams } = new URL(request.url);
    const weekOf = searchParams.get('weekOf') || getCurrentWeek();

    // Get leaderboard for the week
    const leaderboard = await getLeaderboard('volume', weekOf, 10);

    // Check if already finalized
    const finalizationQuery = query(
      collection(db, 'weeklyFinalizations'),
      where('weekOf', '==', weekOf),
      limit(1)
    );
    const finalizationSnap = await getDocs(finalizationQuery);
    const isFinalized = !finalizationSnap.empty;
    const finalizationData = isFinalized ? finalizationSnap.docs[0].data() : null;

    // Get week end time
    const weekEnd = getWeekEnd(weekOf);
    const isCurrentWeek = weekOf === getCurrentWeek();
    const isPastWeek = new Date() > weekEnd;

    return NextResponse.json({
      success: true,
      weekOf,
      isCurrentWeek,
      isPastWeek,
      isFinalized,
      finalizationData: finalizationData ? {
        finalizedAt: finalizationData.finalizedAt?.toDate(),
        winners: finalizationData.winners,
      } : null,
      leaderboard,
      canFinalize: !isFinalized && (isPastWeek || !isCurrentWeek),
    });
  } catch (error) {
    console.error('Status fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}