// src/app/api/webhooks/tracking/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { collection, collectionGroup, query, where, getDocs, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeStatus, parseTrackingEvents, getCarrierFromTrackingMoreCode } from '@/lib/tracking';
import { Collaboration, TrackingEvent, ShipmentTracking, Carrier, CollaborationStatus } from '@/types';

/**
 * Converts Firestore Timestamps to JavaScript Dates
 */
function convertTimestamps<T>(data: any): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (data?.toDate && typeof data.toDate === 'function') {
    return data.toDate() as any;
  }

  if (Array.isArray(data)) {
    return data.map((item) => convertTimestamps(item)) as any;
  }

  if (typeof data === 'object') {
    const converted: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        converted[key] = convertTimestamps(data[key]);
      }
    }
    return converted as T;
  }

  return data;
}

/**
 * GET /api/webhooks/tracking
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/webhooks/tracking
 * Handles TrackingMore push notifications
 * V2: Now queries collaborations subcollection instead of creators
 */
export async function POST(request: NextRequest) {
  try {
    // Parse payload (data may be wrapped in 'data' key or at root)
    const body = await request.json();
    const payload = body.data || body;

    // Extract required fields
    const trackingNumber = payload.tracking_number || payload.trackingNumber;
    const courierCode = payload.courier_code || payload.courierCode;
    const deliveryStatus = payload.delivery_status || payload.deliveryStatus || payload.status;
    const originInfo = payload.origin_info || payload.originInfo;
    const destinationInfo = payload.destination_info || payload.destinationInfo;

    // Log webhook receipt for debugging
    console.log('[Tracking Webhook] Received:', {
      trackingNumber,
      courierCode,
      deliveryStatus,
      timestamp: new Date().toISOString(),
    });

    // Validate required fields
    if (!trackingNumber) {
      console.error('[Tracking Webhook] Missing tracking_number');
      return NextResponse.json(
        { success: false, error: 'tracking_number is required' },
        { status: 400 }
      );
    }

    if (!deliveryStatus) {
      console.error('[Tracking Webhook] Missing delivery_status');
      return NextResponse.json(
        { success: false, error: 'delivery_status is required' },
        { status: 400 }
      );
    }

    // Normalize status
    const shippingStatus = normalizeStatus(deliveryStatus);

    // Parse tracking events
    const events = parseTrackingEvents(originInfo, destinationInfo);

    // Get last update time
    let lastUpdate = new Date();
    if (payload.updated_at) {
      lastUpdate = new Date(payload.updated_at);
    } else if (payload.update_time) {
      lastUpdate = new Date(payload.update_time);
    } else if (events.length > 0 && events[0].date) {
      lastUpdate = new Date(events[0].date);
    }

    // V2: Query collaborations subcollection using collectionGroup
    // This searches ALL collaborations across all creators
    const collabQuery = query(
      collectionGroup(db, 'collaborations'),
      where('trackingNumber', '==', trackingNumber)
    );
    const querySnapshot = await getDocs(collabQuery);

    if (querySnapshot.empty) {
      console.log(`[Tracking Webhook] No collaborations found with tracking number: ${trackingNumber}`);
      return NextResponse.json({
        success: true,
        trackingNumber,
        collaborationsUpdated: 0,
      });
    }

    // Update each matching collaboration
    const updatePromises = querySnapshot.docs.map(async (docSnap) => {
      const collaboration = convertTimestamps<Collaboration>({
        id: docSnap.id,
        ...docSnap.data(),
      });

      // Get the parent creator ID from the document path
      // Path format: creators/{creatorId}/collaborations/{collabId}
      const pathParts = docSnap.ref.path.split('/');
      const creatorId = pathParts[1]; // Index 1 is the creator ID

      // Determine carrier - convert TrackingMore code to our internal code
      let carrier: Carrier = collaboration.carrier || 'yanwen';
      if (courierCode) {
        const mappedCarrier = getCarrierFromTrackingMoreCode(courierCode);
        if (mappedCarrier) {
          carrier = mappedCarrier;
        }
      }

      // Create updated shipment object
      const shipment: ShipmentTracking = {
        trackingNumber,
        carrier,
        shippingStatus,
        estimatedDelivery: payload.expected_delivery || payload.estimated_delivery_date,
        lastUpdate,
        events,
        trackingMoreId: payload.id || payload.tracking_id || collaboration.shipment?.trackingMoreId,
      };

      // Prepare update data for collaboration
      const updateData: Record<string, unknown> = {
        shipment,
        carrier,
        updatedAt: serverTimestamp(),
      };

      // If status is delivered and collaboration was shipped, auto-update status
      if (shippingStatus === 'delivered' && collaboration.status === 'shipped') {
        const deliveredAt = new Date();
        const contentDeadline = new Date();
        contentDeadline.setDate(contentDeadline.getDate() + 14); // 14 days from now

        updateData.status = 'delivered' as CollaborationStatus;
        updateData.deliveredAt = Timestamp.fromDate(deliveredAt);
        updateData.contentDeadline = Timestamp.fromDate(contentDeadline);

        // Add to status history
        const existingHistory = (collaboration.statusHistory || []).map((entry) => ({
          ...entry,
          timestamp: entry.timestamp instanceof Date 
            ? Timestamp.fromDate(entry.timestamp) 
            : entry.timestamp,
        }));
        
        updateData.statusHistory = [
          ...existingHistory,
          { status: 'delivered' as CollaborationStatus, timestamp: Timestamp.now() },
        ];

        console.log(`[Tracking Webhook] Auto-updating collaboration ${collaboration.id} to delivered`);
      }

      // V2: Update the collaboration document directly
      const collabRef = doc(db, 'creators', creatorId, 'collaborations', collaboration.id);
      await updateDoc(collabRef, updateData);

      console.log(`[Tracking Webhook] Updated collaboration ${collaboration.id} (${collaboration.collabDisplayId})`);
    });

    await Promise.all(updatePromises);

    console.log(`[Tracking Webhook] Successfully updated ${querySnapshot.size} collaboration(s) for tracking ${trackingNumber}`);

    return NextResponse.json({
      success: true,
      trackingNumber,
      collaborationsUpdated: querySnapshot.size,
    });
  } catch (error: any) {
    console.error('[Tracking Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process webhook' },
      { status: 500 }
    );
  }
}