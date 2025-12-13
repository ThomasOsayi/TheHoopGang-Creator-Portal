// src/app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, recalculateVolumeLeaderboard } from '@/lib/firestore';
import { getCurrentWeek, getCurrentMonth } from '@/lib/week-utils';
import { LeaderboardType } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'volume') as LeaderboardType;
    const period = searchParams.get('period') || (type === 'volume' ? getCurrentWeek() : getCurrentMonth());
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Get leaderboard entries
    const entries = await getLeaderboard(type, period, limit);

    return NextResponse.json({
      success: true,
      type,
      period,
      entries,
      isCurrentPeriod: type === 'volume' 
        ? period === getCurrentWeek() 
        : period === getCurrentMonth(),
    });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

// POST endpoint to manually trigger leaderboard recalculation (admin only)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekOf = searchParams.get('weekOf') || getCurrentWeek();

    await recalculateVolumeLeaderboard(weekOf);

    return NextResponse.json({
      success: true,
      message: `Leaderboard recalculated for ${weekOf}`,
    });
  } catch (error) {
    console.error('Leaderboard recalculation error:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate leaderboard' },
      { status: 500 }
    );
  }
}