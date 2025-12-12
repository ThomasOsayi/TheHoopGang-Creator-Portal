// src/app/api/creator/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';  // ✅ CHANGE THIS
import { adminAuth, adminDb } from '@/lib/firebase-admin';  // ✅ CHANGE THIS

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header (Firebase ID token)
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the token using Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Parse request body
    const body = await request.json();
    const { instagramFollowers, tiktokFollowers } = body;

    // Validate input
    if (typeof instagramFollowers !== 'number' || instagramFollowers < 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid Instagram followers count' },
        { status: 400 }
      );
    }

    if (typeof tiktokFollowers !== 'number' || tiktokFollowers < 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid TikTok followers count' },
        { status: 400 }
      );
    }

    // Get user document to find creatorId
    const userDoc = await adminDb.collection('users').doc(userId).get();  // ✅ CHANGED
    if (!userDoc.exists) {  // ✅ CHANGED (no parentheses)
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (!userData || userData.role !== 'creator' || !userData.creatorId) {
      return NextResponse.json(
        { success: false, message: 'Not a creator' },
        { status: 403 }
      );
    }

    const creatorId = userData.creatorId;

    // Get creator document
    const creatorDoc = await adminDb.collection('creators').doc(creatorId).get();  // ✅ CHANGED
    if (!creatorDoc.exists) {  // ✅ CHANGED (no parentheses)
      return NextResponse.json(
        { success: false, message: 'Creator not found' },
        { status: 404 }
      );
    }

    // Check for rate limiting (1 update per 24 hours)
    const creatorData = creatorDoc.data();
    const followerHistory = creatorData?.followerHistory || [];
    
    if (followerHistory.length > 0) {
      const lastUpdate = followerHistory[followerHistory.length - 1];
      const lastUpdateDate = lastUpdate.date?.toDate 
        ? lastUpdate.date.toDate() 
        : new Date(lastUpdate.date);
      const hoursSinceLastUpdate = (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastUpdate < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastUpdate);
        return NextResponse.json(
          { 
            success: false, 
            message: `You can update your stats again in ${hoursRemaining} hour${hoursRemaining === 1 ? '' : 's'}` 
          },
          { status: 429 }
        );
      }
    }

    // Create new history entry
    const newHistoryEntry = {
      date: new Date(),  // ✅ Use regular Date object
      instagramFollowers,
      tiktokFollowers,
      source: 'manual',
    };

    // Update creator document
    await adminDb.collection('creators').doc(creatorId).update({  // ✅ CHANGED
      instagramFollowers,
      tiktokFollowers,
      followerHistory: FieldValue.arrayUnion(newHistoryEntry),  // ✅ CHANGED
      updatedAt: FieldValue.serverTimestamp(),  // ✅ CHANGED
    });

    return NextResponse.json({
      success: true,
      message: 'Stats updated successfully',
    });

  } catch (error) {
    console.error('Error updating creator stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update stats' },
      { status: 500 }
    );
  }
}