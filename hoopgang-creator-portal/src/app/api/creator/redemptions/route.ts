// src/app/api/creator/redemptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCreatorByUserId, getRedemptionsByCreatorId } from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { RedemptionStatus } from '@/types';

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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as RedemptionStatus | null;

    // Fetch redemptions
    const redemptions = await getRedemptionsByCreatorId(
      creator.id,
      status || undefined
    );

    return NextResponse.json({
      success: true,
      redemptions,
      total: redemptions.length,
    });
  } catch (error) {
    console.error('Error fetching redemptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch redemption history' },
      { status: 500 }
    );
  }
}