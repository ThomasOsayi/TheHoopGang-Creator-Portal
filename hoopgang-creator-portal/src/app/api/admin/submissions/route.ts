// src/app/api/admin/submissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllV3Submissions, getCreatorById } from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { V3SubmissionType, V3SubmissionStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Check admin role (you may want to verify against your users collection)
    // For now, we'll trust the token - add admin check as needed
    
    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as V3SubmissionType | null;
    const status = searchParams.get('status') as V3SubmissionStatus | null;
    const weekOf = searchParams.get('weekOf');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Fetch submissions
    const { submissions, hasMore } = await getAllV3Submissions({
      type: type || undefined,
      status: status || undefined,
      weekOf: weekOf || undefined,
      limit,
    });

    // Enrich with creator info
    const enrichedSubmissions = await Promise.all(
      submissions.map(async (submission) => {
        const creator = await getCreatorById(submission.creatorId);
        return {
          ...submission,
          creatorName: creator?.fullName || 'Unknown',
          creatorHandle: creator?.tiktokHandle || 'Unknown',
          creatorEmail: creator?.email || 'Unknown',
        };
      })
    );

    return NextResponse.json({
      success: true,
      submissions: enrichedSubmissions,
      hasMore,
    });
  } catch (error) {
    console.error('Admin submissions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}