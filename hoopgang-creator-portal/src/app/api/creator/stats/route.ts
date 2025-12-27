// src/app/api/creator/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

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
    const { 
      instagramHandle, 
      instagramFollowers, 
      tiktokHandle, 
      tiktokFollowers 
    } = body;

    // Validate follower counts
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

    // Validate handles (optional but if provided, must be strings)
    if (instagramHandle !== undefined && typeof instagramHandle !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid Instagram handle' },
        { status: 400 }
      );
    }

    if (tiktokHandle !== undefined && typeof tiktokHandle !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid TikTok handle' },
        { status: 400 }
      );
    }

    // Get user document to find creatorId
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
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
    const creatorDoc = await adminDb.collection('creators').doc(creatorId).get();
    if (!creatorDoc.exists) {
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
      date: new Date(),
      instagramHandle: instagramHandle?.trim() || creatorData?.instagramHandle || '',
      instagramFollowers,
      tiktokHandle: tiktokHandle?.trim() || creatorData?.tiktokHandle || '',
      tiktokFollowers,
      source: 'manual',
    };

    // Build update object
    const updateData: Record<string, any> = {
      instagramFollowers,
      tiktokFollowers,
      followerHistory: FieldValue.arrayUnion(newHistoryEntry),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Only update handles if provided (don't overwrite with empty string)
    if (instagramHandle !== undefined && instagramHandle.trim() !== '') {
      updateData.instagramHandle = instagramHandle.trim().replace('@', '');
    }
    if (tiktokHandle !== undefined && tiktokHandle.trim() !== '') {
      updateData.tiktokHandle = tiktokHandle.trim().replace('@', '');
    }

    // Update creator document
    await adminDb.collection('creators').doc(creatorId).update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });

  } catch (error) {
    console.error('Error updating creator stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}