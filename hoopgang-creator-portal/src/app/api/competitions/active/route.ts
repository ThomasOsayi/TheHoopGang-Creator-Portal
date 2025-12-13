// app/api/competitions/active/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getActiveCompetition, getCompetitionLeaderboard, getRecentCompetitions } from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') as 'volume' | 'gmv') || 'volume';
    const includeEnded = searchParams.get('includeEnded') === 'true';

    // First try to get active competition
    let competition = await getActiveCompetition(type);

    // If no active and includeEnded, check for recently ended competition
    if (!competition && includeEnded) {
      const recentCompetitions = await getRecentCompetitions(type, 1);
      if (recentCompetitions.length > 0 && recentCompetitions[0].status === 'ended') {
        competition = recentCompetitions[0];
      }
    }

    if (!competition) {
      return NextResponse.json({
        active: false,
        competition: null,
        leaderboard: [],
        timeRemaining: null,
      });
    }

    // Calculate time remaining (only for active)
    const now = Date.now();
    const endsAt = competition.endsAt ? new Date(competition.endsAt).getTime() : null;
    const timeRemaining = competition.status === 'active' && endsAt 
      ? Math.max(0, endsAt - now) 
      : null;

    // Get leaderboard for this competition
    const leaderboard = await getCompetitionLeaderboard(competition.id, 25);

    // Serialize dates for JSON response
    const serializedCompetition = {
      ...competition,
      startedAt: competition.startedAt instanceof Date ? competition.startedAt.toISOString() : competition.startedAt,
      endsAt: competition.endsAt instanceof Date ? competition.endsAt.toISOString() : competition.endsAt,
      endedAt: competition.endedAt instanceof Date ? competition.endedAt.toISOString() : competition.endedAt,
      finalizedAt: competition.finalizedAt instanceof Date ? competition.finalizedAt.toISOString() : competition.finalizedAt,
      createdAt: competition.createdAt instanceof Date ? competition.createdAt.toISOString() : competition.createdAt,
      updatedAt: competition.updatedAt instanceof Date ? competition.updatedAt.toISOString() : competition.updatedAt,
    };

    return NextResponse.json({
      active: competition.status === 'active',
      competition: serializedCompetition,
      leaderboard,
      timeRemaining,
    });
  } catch (error) {
    console.error('Error fetching active competition:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competition' },
      { status: 500 }
    );
  }
}

