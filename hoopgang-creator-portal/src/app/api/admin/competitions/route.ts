// src/app/api/admin/competitions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getActiveCompetition,
  getRecentCompetitions,
  startCompetition,
  endCompetition,
  getCompetitionLeaderboard,
} from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';

// GET - Get active competition and recent history
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'volume') as 'volume' | 'gmv';

    const activeCompetition = await getActiveCompetition(type);
    const recentCompetitions = await getRecentCompetitions(type, 10);
    
    let leaderboard: any[] = [];
    let timeRemaining: number | null = null;
    
    if (activeCompetition) {
      leaderboard = await getCompetitionLeaderboard(activeCompetition.id, 25);
      
      if (activeCompetition.endsAt) {
        // endsAt is already converted to Date in getActiveCompetition, but just in case
        const endsAtDate = activeCompetition.endsAt instanceof Date 
          ? activeCompetition.endsAt 
          : new Date(activeCompetition.endsAt);
        timeRemaining = Math.max(0, endsAtDate.getTime() - Date.now());
      }
    }

    // Serialize dates explicitly for JSON response
    const serializeCompetition = (comp: any) => {
      if (!comp) return null;
      return {
        ...comp,
        startedAt: comp.startedAt instanceof Date ? comp.startedAt.toISOString() : comp.startedAt,
        endsAt: comp.endsAt instanceof Date ? comp.endsAt.toISOString() : comp.endsAt,
        endedAt: comp.endedAt instanceof Date ? comp.endedAt.toISOString() : comp.endedAt,
        finalizedAt: comp.finalizedAt instanceof Date ? comp.finalizedAt.toISOString() : comp.finalizedAt,
        createdAt: comp.createdAt instanceof Date ? comp.createdAt.toISOString() : comp.createdAt,
        updatedAt: comp.updatedAt instanceof Date ? comp.updatedAt.toISOString() : comp.updatedAt,
      };
    };

    return NextResponse.json({
      success: true,
      activeCompetition: serializeCompetition(activeCompetition),
      leaderboard,
      timeRemaining,
      recentCompetitions: recentCompetitions.map(serializeCompetition),
    });
  } catch (error) {
    console.error('Competition fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competition' },
      { status: 500 }
    );
  }
}

// POST - Start a new competition
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminId = decodedToken.uid;

    const { type = 'volume', name, durationDays = 7 } = await request.json();

    // Check for existing active competition
    const existing = await getActiveCompetition(type);
    if (existing) {
      return NextResponse.json(
        { error: `There is already an active ${type} competition. End it first.` },
        { status: 400 }
      );
    }

    const competitionId = await startCompetition(type, name, durationDays, adminId);

    return NextResponse.json({
      success: true,
      competitionId,
      message: `Competition "${name}" started!`,
    });
  } catch (error) {
    console.error('Start competition error:', error);
    return NextResponse.json(
      { error: 'Failed to start competition' },
      { status: 500 }
    );
  }
}

// PUT - End the active competition
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const { type = 'volume' } = await request.json();

    const activeCompetition = await getActiveCompetition(type);
    if (!activeCompetition) {
      return NextResponse.json(
        { error: 'No active competition to end' },
        { status: 400 }
      );
    }

    await endCompetition(activeCompetition.id);

    return NextResponse.json({
      success: true,
      message: 'Competition ended',
    });
  } catch (error) {
    console.error('End competition error:', error);
    return NextResponse.json(
      { error: 'Failed to end competition' },
      { status: 500 }
    );
  }
}

