// src/app/api/submissions/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCreatorByUserId, getV3SubmissionsByCreatorId } from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { V3SubmissionType } from '@/types';

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
    const type = searchParams.get('type') as V3SubmissionType | null;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Fetch submissions
    const submissions = await getV3SubmissionsByCreatorId(creator.id, {
      type: type || undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      submissions,
      total: submissions.length,
    });
  } catch (error) {
    console.error('Submission history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submission history' },
      { status: 500 }
    );
  }
}