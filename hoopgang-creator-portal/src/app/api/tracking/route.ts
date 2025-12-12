// src/app/api/tracking/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { 
  getCreatorById, 
  getCollaborationById,
  updateCollaboration 
} from '@/lib/firestore';
import { sendShippedEmail } from '@/lib/email/send-email';
import { Carrier } from '@/types';

/**
 * POST /api/tracking
 * V2: Saves tracking info to collaboration subcollection and sends shipped email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorId, collaborationId, trackingNumber, carrier } = body;

    // Validate inputs
    if (!creatorId || typeof creatorId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'creatorId is required' },
        { status: 400 }
      );
    }

    // V2: collaborationId is now required
    if (!collaborationId || typeof collaborationId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'collaborationId is required' },
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

    // Get creator (for email info)
    const creator = await getCreatorById(creatorId);
    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      );
    }

    // V2: Verify collaboration exists
    const collaboration = await getCollaborationById(creatorId, collaborationId);
    if (!collaboration) {
      return NextResponse.json(
        { success: false, error: 'Collaboration not found' },
        { status: 404 }
      );
    }

    // V2: Update COLLABORATION in Firestore (not creator)
    await updateCollaboration(creatorId, collaborationId, {
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
 * GET /api/tracking?creatorId=xxx&collaborationId=yyy
 * V2: Returns tracking information for a specific collaboration
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const creatorId = searchParams.get('creatorId');
    const collaborationId = searchParams.get('collaborationId');

    if (!creatorId) {
      return NextResponse.json(
        { success: false, error: 'creatorId query parameter is required' },
        { status: 400 }
      );
    }

    // V2: collaborationId is now required
    if (!collaborationId) {
      return NextResponse.json(
        { success: false, error: 'collaborationId query parameter is required' },
        { status: 400 }
      );
    }

    // V2: Get collaboration instead of creator
    const collaboration = await getCollaborationById(creatorId, collaborationId);
    if (!collaboration) {
      return NextResponse.json(
        { success: false, error: 'Collaboration not found' },
        { status: 404 }
      );
    }

    // Return tracking info if it exists
    if (!collaboration.trackingNumber || !collaboration.carrier) {
      return NextResponse.json(
        { success: false, error: 'No tracking information found for this collaboration' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      trackingNumber: collaboration.trackingNumber,
      carrier: collaboration.carrier,
      status: collaboration.status,
      shipment: collaboration.shipment,
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
 * DELETE /api/tracking?creatorId=xxx&collaborationId=yyy
 * V2: Removes tracking information from collaboration
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const creatorId = searchParams.get('creatorId');
    const collaborationId = searchParams.get('collaborationId');

    if (!creatorId) {
      return NextResponse.json(
        { success: false, error: 'creatorId query parameter is required' },
        { status: 400 }
      );
    }

    // V2: collaborationId is now required
    if (!collaborationId) {
      return NextResponse.json(
        { success: false, error: 'collaborationId query parameter is required' },
        { status: 400 }
      );
    }

    // V2: Verify collaboration exists
    const collaboration = await getCollaborationById(creatorId, collaborationId);
    if (!collaboration) {
      return NextResponse.json(
        { success: false, error: 'Collaboration not found' },
        { status: 404 }
      );
    }

    // V2: Remove tracking information from COLLABORATION
    await updateCollaboration(creatorId, collaborationId, {
      trackingNumber: null as any,
      carrier: null as any,
      shipment: null as any,
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

