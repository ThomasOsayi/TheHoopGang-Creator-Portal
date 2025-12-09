// src/lib/tracking.ts

import { Carrier, ShippingStatus, ShipmentTracking, TrackingEvent } from '@/types';

const BASE_URL = 'https://api.trackingmore.com/v4';
const API_KEY = process.env.TRACKINGMORE_API_KEY;

// Carrier code mapping: our internal codes -> TrackingMore API codes
const CARRIER_CODE_MAP: Record<Carrier, string> = {
  yanwen: 'yanwen-unified-api',
};

// TrackingMore API response status -> our ShippingStatus
const STATUS_MAP: Record<string, ShippingStatus> = {
  // Pending states
  'pending': 'pending',
  'notfound': 'pending',
  'inforeceived': 'pending',
  'InfoReceived': 'pending',
  
  // In transit states
  'InTransit': 'transit',
  'intransit': 'transit',
  'transit': 'transit',
  'OnTheWay': 'transit',
  'InTransport': 'transit',
  'OutForDelivery': 'transit',
  'outfordelivery': 'transit',
  
  // Pickup states
  'PickUp': 'pickup',
  'pickup': 'pickup',
  'AvailableForPickup': 'pickup',
  
  // Delivered states
  'Delivered': 'delivered',
  'delivered': 'delivered',
  'success': 'delivered',
  
  // Undelivered states
  'Undelivered': 'undelivered',
  'undelivered': 'undelivered',
  'Failed': 'undelivered',
  
  // Exception states
  'Exception': 'exception',
  'exception': 'exception',
  'Alert': 'exception',
  
  // Expired states
  'expired': 'expired',
  'Expired': 'expired',
};

/**
 * Normalizes TrackingMore API status to our ShippingStatus type
 */
export function normalizeStatus(trackingMoreStatus: string): ShippingStatus {
  // Normalize to lowercase for consistent mapping
  const normalized = trackingMoreStatus.trim().toLowerCase();
  
  // Try exact match first
  if (STATUS_MAP[normalized]) {
    return STATUS_MAP[normalized];
  }
  
  // Try case-sensitive match
  if (STATUS_MAP[trackingMoreStatus]) {
    return STATUS_MAP[trackingMoreStatus];
  }
  
  // Try partial matching for common patterns
  if (normalized.includes('deliver')) {
    return normalized.includes('undelivered') || normalized.includes('fail') 
      ? 'undelivered' 
      : 'delivered';
  }
  
  if (normalized.includes('transit') || normalized.includes('way')) {
    return 'transit';
  }
  
  if (normalized.includes('pickup') || normalized.includes('pick-up')) {
    return 'pickup';
  }
  
  if (normalized.includes('exception') || normalized.includes('alert')) {
    return 'exception';
  }
  
  if (normalized.includes('expired')) {
    return 'expired';
  }
  
  // Default to pending if status is unknown
  return 'pending';
}

/**
 * Validates tracking number format (8+ alphanumeric characters)
 */
export function isValidTrackingNumber(trackingNumber: string): boolean {
  if (!trackingNumber || typeof trackingNumber !== 'string') {
    return false;
  }
  
  const trimmed = trackingNumber.trim();
  
  // Must be at least 8 characters and alphanumeric
  return trimmed.length >= 8 && /^[A-Za-z0-9]+$/.test(trimmed);
}

/**
 * Gets the TrackingMore API carrier code for our internal carrier
 */
function getCarrierCode(carrier: Carrier): string {
  return CARRIER_CODE_MAP[carrier];
}

/**
 * Converts TrackingMore API carrier code back to our internal carrier code
 */
export function getCarrierFromTrackingMoreCode(trackingMoreCode: string): Carrier | null {
  // Reverse mapping: TrackingMore code -> our internal code
  const reverseMap: Record<string, Carrier> = {
    'yanwen-unified-api': 'yanwen',
  };

  return reverseMap[trackingMoreCode] || null;
}

/**
 * Gets the API key from environment
 */
function getApiKey(): string {
  if (!API_KEY) {
    throw new Error('TRACKINGMORE_API_KEY is not configured');
  }
  return API_KEY;
}

/**
 * Makes an API request to TrackingMore
 */
async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Tracking-Api-Key': apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[apiRequest] TrackingMore API error:', { 
      status: response.status, 
      statusText: response.statusText,
      errorData 
    });
    throw new Error(
      errorData.meta?.message || 
      errorData.message || 
      `TrackingMore API error: ${response.status} ${response.statusText}`
    );
  }
  
  const data = await response.json();
  console.log('[apiRequest] TrackingMore API success:', { endpoint, dataKeys: Object.keys(data) });
  
  // TrackingMore API wraps responses in a data object
  if (data.data !== undefined) {
    return data.data;
  }
  
  return data;
}

/**
 * Parses tracking events from TrackingMore API response
 */
export function parseTrackingEvents(originInfo: any, destinationInfo: any): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  
  // Parse origin_info.trackinfo
  if (originInfo?.trackinfo && Array.isArray(originInfo.trackinfo)) {
    originInfo.trackinfo.forEach((item: any) => {
      events.push({
        date: item.date || item.time || '',
        description: item.details || item.description || item.track_status || '',
        location: item.location || item.details || '',
      });
    });
  }
  
  // Parse destination_info.trackinfo
  if (destinationInfo?.trackinfo && Array.isArray(destinationInfo.trackinfo)) {
    destinationInfo.trackinfo.forEach((item: any) => {
      events.push({
        date: item.date || item.time || '',
        description: item.details || item.description || item.track_status || '',
        location: item.location || item.details || '',
      });
    });
  }
  
  // Sort events by date (most recent first)
  events.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });
  
  return events;
}

/**
 * Creates a tracking in TrackingMore API
 */
export async function createTracking(
  trackingNumber: string,
  carrier: Carrier
): Promise<{ id: string; tracking_number: string }> {
  if (!isValidTrackingNumber(trackingNumber)) {
    throw new Error('Invalid tracking number format');
  }
  
  const carrierCode = getCarrierCode(carrier);
  
  const response = await apiRequest('/trackings/create', {
    method: 'POST',
    body: JSON.stringify({
      tracking_number: trackingNumber,
      courier_code: carrierCode,
    }),
  });
  
  console.log('[createTracking] Raw API response:', JSON.stringify(response));
  
  return {
    id: response.id || response.tracking_id || '',
    tracking_number: response.tracking_number || trackingNumber,
  };
}

/**
 * Gets tracking status from TrackingMore API
 */
export async function getTrackingStatus(
  trackingNumber: string,
  carrier: Carrier
): Promise<ShipmentTracking> {
  if (!isValidTrackingNumber(trackingNumber)) {
    throw new Error('Invalid tracking number format');
  }
  
  const carrierCode = getCarrierCode(carrier);
  const encodedTrackingNumber = encodeURIComponent(trackingNumber);
  
  const response = await apiRequest(
    `/trackings/${carrierCode}/${encodedTrackingNumber}`,
    {
      method: 'GET',
    }
  );
  
  console.log('[getTrackingStatus] Raw API response:', JSON.stringify(response));
  
  // Parse tracking events from response
  const events = parseTrackingEvents(
    response.origin_info,
    response.destination_info
  );
  
  // Determine shipping status - TrackingMore uses 'delivery_status' field
  const apiStatus = response.delivery_status || response.status || response.tracking_status || 'pending';
  console.log('TrackingMore raw status:', apiStatus, 'Full response keys:', Object.keys(response));
  const shippingStatus = normalizeStatus(apiStatus);
  console.log('Normalized status:', shippingStatus);
  
  // Get last update time
  let lastUpdate = new Date();
  if (response.updated_at) {
    lastUpdate = new Date(response.updated_at);
  } else if (response.update_time) {
    lastUpdate = new Date(response.update_time);
  } else if (events.length > 0 && events[0].date) {
    lastUpdate = new Date(events[0].date);
  }
  
  return {
    trackingNumber: response.tracking_number || trackingNumber,
    carrier,
    shippingStatus,
    estimatedDelivery: response.expected_delivery || response.estimated_delivery_date,
    lastUpdate,
    events,
    trackingMoreId: response.id || response.tracking_id,
  };
}

/**
 * Gets external tracking URL for a carrier
 */
export function getTrackingUrl(carrier: Carrier, trackingNumber: string): string {
  if (!trackingNumber || !isValidTrackingNumber(trackingNumber)) {
    return '';
  }
  
  const encoded = encodeURIComponent(trackingNumber);
  
  switch (carrier) {
    case 'yanwen':
      return `https://www.17track.net/en/track#nums=${encoded}`;
    
    default:
      return '';
  }
}

