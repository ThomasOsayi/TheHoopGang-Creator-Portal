// src/app/api/admin/submissions/bulk/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { V3SubmissionStatus } from '@/types';

interface BulkActionRequest {
  ids: string[];
  action: 'approve' | 'reject';
  reason?: string;
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Parse request body
    const body: BulkActionRequest = await request.json();
    const { ids, action, reason } = body;

    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent timeouts
    if (ids.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 submissions per batch' },
        { status: 400 }
      );
    }

    const newStatus: V3SubmissionStatus = action === 'approve' ? 'approved' : 'rejected';
    const now = new Date().toISOString();
    const results: { id: string; success: boolean; error?: string }[] = [];

    // Process each submission
    // Note: Firestore batch writes are limited to 500 operations
    const batch = adminDb.batch();
    
    for (const submissionId of ids) {
      try {
        // Find the submission across all creators
        // Submissions are stored as: creators/{creatorId}/v3Submissions/{submissionId}
        const creatorsSnapshot = await adminDb.collection('creators').get();
        
        let found = false;
        for (const creatorDoc of creatorsSnapshot.docs) {
          const submissionRef = adminDb
            .collection('creators')
            .doc(creatorDoc.id)
            .collection('v3Submissions')
            .doc(submissionId);
          
          const submissionDoc = await submissionRef.get();
          
          if (submissionDoc.exists) {
            const updateData: Record<string, any> = {
              status: newStatus,
              reviewedAt: now,
              reviewedBy: decodedToken.uid,
            };
            
            if (action === 'reject' && reason) {
              updateData.rejectionReason = reason;
            }
            
            batch.update(submissionRef, updateData);
            results.push({ id: submissionId, success: true });
            found = true;
            break;
          }
        }
        
        if (!found) {
          results.push({ 
            id: submissionId, 
            success: false, 
            error: 'Submission not found' 
          });
        }
      } catch (err) {
        console.error(`Error processing submission ${submissionId}:`, err);
        results.push({ 
          id: submissionId, 
          success: false, 
          error: 'Processing failed' 
        });
      }
    }

    // Commit the batch
    await batch.commit();

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `${successCount} submission(s) ${action}d successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results,
      summary: {
        total: ids.length,
        succeeded: successCount,
        failed: failCount,
      },
    });

  } catch (error) {
    console.error('Bulk submission action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}