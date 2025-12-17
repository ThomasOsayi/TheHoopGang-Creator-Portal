// src/app/api/auth/lookup-tiktok/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { lookupTiktokCreator, normalizeTiktokUsername } from '@/lib/firestore';

// Simple in-memory rate limiting
// In production, consider using Redis or a proper rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10; // Max requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * POST /api/auth/lookup-tiktok
 * 
 * Looks up a TikTok username in the imports database.
 * Returns masked personal data for identity confirmation.
 * 
 * Request body:
 * {
 *   tiktokUsername: string  // The TikTok username to look up (with or without @)
 * }
 * 
 * Response (found):
 * {
 *   found: true,
 *   importId: string,       // ID to use when claiming
 *   maskedName: string,     // "K**** L*****"
 *   maskedAddress: string,  // "1983 G****** DR"
 *   maskedCity: string,     // "Atlanta, GA 30341"
 *   sizeOrdered: string,    // "L", "M", "XL", etc.
 *   alreadyClaimed: false
 * }
 * 
 * Response (already claimed):
 * {
 *   found: true,
 *   alreadyClaimed: true
 * }
 * 
 * Response (not found):
 * {
 *   found: false
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { tiktokUsername } = body;

    // Validate input
    if (!tiktokUsername || typeof tiktokUsername !== 'string') {
      return NextResponse.json(
        { error: 'TikTok username is required' },
        { status: 400 }
      );
    }

    // Normalize and validate username format
    const normalized = normalizeTiktokUsername(tiktokUsername);
    
    if (normalized.length < 2) {
      return NextResponse.json(
        { error: 'Please enter a valid TikTok username' },
        { status: 400 }
      );
    }

    if (normalized.length > 24) {
      return NextResponse.json(
        { error: 'TikTok username is too long' },
        { status: 400 }
      );
    }

    // Look up the username in imports
    const result = await lookupTiktokCreator(normalized);

    // Log lookup for debugging (without sensitive data)
    console.log('TikTok lookup:', {
      username: normalized,
      found: result.found,
      alreadyClaimed: result.alreadyClaimed || false,
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('TikTok lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to look up username. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/lookup-tiktok
 * 
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'TikTok lookup API is running'
  });
}