// src/app/api/competitions/active/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getActiveCompetition, getCompetitionLeaderboard } from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'volume') as 'volume' | 'gmv';

    const competition = await getActiveCompetition(type);
    
    if (!competition) {
      return NextResponse.json({
        success: true,
        active: false,
        competition: null,
        leaderboard: [],
        timeRemaining: null,
      });
    }

    const leaderboard = await getCompetitionLeaderboard(competition.id, 25);
    
    const timeRemaining = competition.endsAt 
      ? (() => {
          // endsAt is already converted to Date in getActiveCompetition, but just in case
          const endsAtDate = competition.endsAt instanceof Date 
            ? competition.endsAt 
            : new Date(competition.endsAt);
          return Math.max(0, endsAtDate.getTime() - Date.now());
        })()
      : null;

    return NextResponse.json({
      success: true,
      active: true,
      competition: {
        id: competition.id,
        name: competition.name,
        startedAt: competition.startedAt,
        endsAt: competition.endsAt,
      },
      leaderboard,
      timeRemaining,
    });
  } catch (error) {
    console.error('Active competition fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competition' },
      { status: 500 }
    );
  }
}

