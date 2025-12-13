// src/app/api/admin/submissions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getV3SubmissionById, getCreatorById } from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    // Get submission
    const submission = await getV3SubmissionById(id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Enrich with creator info
    const creator = await getCreatorById(submission.creatorId);
    
    return NextResponse.json({
      success: true,
      submission: {
        ...submission,
        creatorName: creator?.fullName || 'Unknown',
        creatorHandle: creator?.tiktokHandle || 'Unknown',
        creatorEmail: creator?.email || 'Unknown',
      },
    });
  } catch (error) {
    console.error('Fetch submission error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submission' },
      { status: 500 }
    );
  }
}

