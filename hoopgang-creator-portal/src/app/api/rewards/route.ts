// src/app/api/rewards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getActiveRewards } from '@/lib/firestore';
import { RewardCategory } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as RewardCategory | null;

    // Fetch active rewards, optionally filtered by category
    const rewards = await getActiveRewards(category || undefined);

    return NextResponse.json({
      success: true,
      rewards,
    });
  } catch (error) {
    console.error('Rewards fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}