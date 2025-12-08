// src/app/api/tracking/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getCreatorById, updateCreator } from '@/lib/firestore';
import { createTracking, getTrackingStatus, isValidTrackingNumber } from '@/lib/tracking';
import { Carrier, ShipmentTracking } from '@/types';

/**
 * Helper function to remove undefined values from an object
 * Firestore doesn't allow undefined field values
 */
function removeUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}

/**
 * POST /api/tracking
 * Creates a new tracking entry and updates creator
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

    if (!carrier || !['yanwen', 'usps', 'ups', 'fedex'].includes(carrier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid carrier. Must be yanwen, usps, ups, or fedex' },
        { status: 400 }
      );
    }

    // Clean tracking number: uppercase, no spaces
    const cleanedTrackingNumber = trackingNumber.trim().toUpperCase().replace(/\s+/g, '');

    if (!isValidTrackingNumber(cleanedTrackingNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tracking number format' },
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

    // Create tracking in TrackingMore API
    console.log('[POST /api/tracking] Registering tracking with TrackingMore:', { trackingNumber: cleanedTrackingNumber, carrier });
    const trackingResponse = await createTracking(cleanedTrackingNumber, carrier as Carrier);
    console.log('[POST /api/tracking] createTracking response:', JSON.stringify(trackingResponse));

    // Get initial tracking status
    const shipment = await getTrackingStatus(cleanedTrackingNumber, carrier as Carrier);

    // Set trackingMoreId from createTracking response
    shipment.trackingMoreId = trackingResponse.id;

    // Build shipment object, excluding undefined values
    const shipmentData: ShipmentTracking = {
      trackingNumber: cleanedTrackingNumber,
      carrier: carrier as Carrier,
      shippingStatus: shipment.shippingStatus,
      lastUpdate: shipment.lastUpdate,
      events: shipment.events,
      ...(shipment.trackingMoreId && { trackingMoreId: shipment.trackingMoreId }),
      ...(shipment.estimatedDelivery && { estimatedDelivery: shipment.estimatedDelivery }),
    };

    // Update creator in Firestore (remove undefined values)
    await updateCreator(creatorId, removeUndefined({
      trackingNumber: cleanedTrackingNumber,
      carrier: carrier as Carrier,
      shipment: shipmentData,
      status: 'shipped',
      shippedAt: new Date(),
    }));

    return NextResponse.json({
      success: true,
      shipment,
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
 * Refreshes tracking status and updates creator
 */
export async function GET(request: NextRequest) {
  // Temporary debugging
  console.log('API KEY exists:', !!process.env.TRACKINGMORE_API_KEY);
  console.log('API KEY value:', process.env.TRACKINGMORE_API_KEY?.slice(0, 8) + '...');

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

    // Validate tracking info exists
    if (!creator.trackingNumber || !creator.carrier) {
      return NextResponse.json(
        { success: false, error: 'No tracking information found for this creator' },
        { status: 400 }
      );
    }

    // Refresh tracking status from TrackingMore API
    console.log('[GET /api/tracking] Fetching status for:', { trackingNumber: creator.trackingNumber, carrier: creator.carrier });
    const shipment = await getTrackingStatus(creator.trackingNumber, creator.carrier);
    console.log('[GET /api/tracking] TrackingMore response:', JSON.stringify(shipment));

    // Build shipment object, excluding undefined values
    const shipmentData: ShipmentTracking = {
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      shippingStatus: shipment.shippingStatus,
      lastUpdate: shipment.lastUpdate,
      events: shipment.events,
      ...(shipment.trackingMoreId && { trackingMoreId: shipment.trackingMoreId }),
      ...(shipment.estimatedDelivery && { estimatedDelivery: shipment.estimatedDelivery }),
    };

    // Update creator with new tracking data
    const updateData: any = {
      shipment: shipmentData,
    };

    // If status is delivered and creator was shipped, auto-update status
    if (shipment.shippingStatus === 'delivered' && creator.status === 'shipped') {
      const deliveredAt = new Date();
      const contentDeadline = new Date();
      contentDeadline.setDate(contentDeadline.getDate() + 14); // 14 days from now

      updateData.status = 'delivered';
      updateData.deliveredAt = deliveredAt;
      updateData.contentDeadline = contentDeadline;
    }

    // Remove undefined values before updating Firestore
    await updateCreator(creatorId, removeUndefined(updateData));

    return NextResponse.json({
      success: true,
      status: shipment.shippingStatus,
      events: shipment.events,
    });
  } catch (error: any) {
    console.error('Error refreshing tracking:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to refresh tracking' },
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

