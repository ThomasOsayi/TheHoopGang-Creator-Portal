// src/app/api/admin/submissions/bulk/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { V3SubmissionStatus } from '@/types';
import { recalculateVolumeLeaderboard, recalculateCompetitionLeaderboard } from '@/lib/firestore';

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
    const results: { id: string; success: boolean; error?: string; weekOf?: string; competitionId?: string }[] = [];

    // Process each submission from the TOP-LEVEL collection
    const batch = adminDb.batch();
    
    for (const submissionId of ids) {
      try {
        // Query the top-level v3ContentSubmissions collection
        const submissionRef = adminDb.collection('v3ContentSubmissions').doc(submissionId);
        const submissionDoc = await submissionRef.get();
        
        if (submissionDoc.exists) {
          const submissionData = submissionDoc.data();
          
          const updateData: Record<string, any> = {
            status: newStatus,
            reviewedAt: now,
            reviewedBy: decodedToken.uid,
          };
          
          if (action === 'reject' && reason) {
            updateData.rejectionReason = reason;
          }
          
          batch.update(submissionRef, updateData);
          results.push({ 
            id: submissionId, 
            success: true,
            weekOf: submissionData?.weekOf,
            competitionId: submissionData?.competitionId,
          });
        } else {
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

    // Recalculate leaderboards after approvals
    if (action === 'approve') {
      const successfulResults = results.filter(r => r.success);
      
      // Get unique weeks to recalculate
      const weeksToRecalculate = new Set<string>();
      const competitionsToRecalculate = new Set<string>();
      
      for (const result of successfulResults) {
        if (result.weekOf) {
          weeksToRecalculate.add(result.weekOf);
        }
        if (result.competitionId) {
          competitionsToRecalculate.add(result.competitionId);
        }
      }
      
      // Recalculate volume leaderboards for affected weeks
      for (const week of weeksToRecalculate) {
        try {
          await recalculateVolumeLeaderboard(week);
          console.log(`Recalculated leaderboard for week: ${week}`);
        } catch (err) {
          console.error(`Failed to recalculate leaderboard for week ${week}:`, err);
        }
      }
      
      // Recalculate competition leaderboards
      for (const competitionId of competitionsToRecalculate) {
        try {
          await recalculateCompetitionLeaderboard(competitionId);
          console.log(`Recalculated competition leaderboard: ${competitionId}`);
        } catch (err) {
          console.error(`Failed to recalculate competition leaderboard ${competitionId}:`, err);
        }
      }
    }

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