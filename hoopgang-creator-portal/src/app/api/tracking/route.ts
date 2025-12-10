// src/app/api/tracking/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getCreatorById, updateCreator } from '@/lib/firestore';
import { sendShippedEmail } from '@/lib/email/send-email';
import { Carrier } from '@/types';

/**
 * POST /api/tracking
 * Saves tracking info and sends shipped email (no external API calls)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorId, trackingNumber, carrier } = body;

    // Validate inputs
    if (!creatorId || typeof creatorId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'creatorId is required' },
        { status: 400 }
      );
    }

    if (!trackingNumber || typeof trackingNumber !== 'string') {
      return NextResponse.json(
        { success: false, error: 'trackingNumber is required' },
        { status: 400 }
      );
    }

    if (!carrier || carrier !== 'yanwen') {
      return NextResponse.json(
        { success: false, error: 'Invalid carrier. Only Yanwen is supported' },
        { status: 400 }
      );
    }

    // Clean tracking number: uppercase, no spaces
    const cleanedTrackingNumber = trackingNumber.trim().toUpperCase().replace(/\s+/g, '');

    // Get creator
    const creator = await getCreatorById(creatorId);
    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Update creator in Firestore (simple - no TrackingMore API)
    await updateCreator(creatorId, {
      trackingNumber: cleanedTrackingNumber,
      carrier: carrier as Carrier,
      status: 'shipped',
      shippedAt: new Date(),
    });

    // Send shipped email to creator
    try {
      const firstName = creator.fullName?.split(' ')[0] || creator.instagramHandle;
      await sendShippedEmail({
        to: creator.email,
        creatorName: firstName,
        trackingNumber: cleanedTrackingNumber,
        carrier: carrier as Carrier,
      });
      console.log('[POST /api/tracking] Shipped email sent to:', creator.email);
    } catch (emailError) {
      console.error('[POST /api/tracking] Failed to send shipped email:', emailError);
    }

    return NextResponse.json({
      success: true,
      trackingNumber: cleanedTrackingNumber,
      carrier,
    });
  } catch (error: any) {
    console.error('Error creating tracking:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create tracking' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tracking?creatorId=xxx
 * Returns tracking information for a creator
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const creatorId = searchParams.get('creatorId');

    if (!creatorId) {
      return NextResponse.json(
        { success: false, error: 'creatorId query parameter is required' },
        { status: 400 }
      );
    }

    // Get creator
    const creator = await getCreatorById(creatorId);
    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Return tracking info if it exists
    if (!creator.trackingNumber || !creator.carrier) {
      return NextResponse.json(
        { success: false, error: 'No tracking information found for this creator' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      trackingNumber: creator.trackingNumber,
      carrier: creator.carrier,
      status: creator.status,
    });
  } catch (error: any) {
    console.error('Error fetching tracking:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch tracking' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tracking?creatorId=xxx
 * Removes tracking information from creator
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const creatorId = searchParams.get('creatorId');

    if (!creatorId) {
      return NextResponse.json(
        { success: false, error: 'creatorId query parameter is required' },
        { status: 400 }
      );
    }

    // Get creator to verify it exists
    const creator = await getCreatorById(creatorId);
    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Remove tracking information
    await updateCreator(creatorId, {
      trackingNumber: null as any,
      carrier: null as any,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error deleting tracking:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete tracking' },
      { status: 500 }
    );
  }
}

