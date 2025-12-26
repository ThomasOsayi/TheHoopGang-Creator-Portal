// src/app/api/creator/redemptions/[id]/claim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getCreatorByUserId, 
  getRedemptionById,
  claimRedemption,
} from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { CashMethod, ShippingAddress } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: redemptionId } = await params;
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get creator
    const creator = await getCreatorByUserId(userId);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Get redemption
    const redemption = await getRedemptionById(redemptionId);
    if (!redemption) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }

    // Verify ownership
    if (redemption.creatorId !== creator.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify status
    if (redemption.status !== 'awaiting_claim') {
      return NextResponse.json({ 
        error: 'This reward has already been claimed or is not available for claiming' 
      }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { cashMethod, cashHandle, shippingAddress } = body as {
      cashMethod?: CashMethod;
      cashHandle?: string;
      shippingAddress?: ShippingAddress;
    };

    // Validate cash method if this is a cash reward
    if (redemption.fulfillmentType === 'cash' || redemption.cashValue) {
      if (!cashMethod) {
        return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
      }
      if (!cashHandle) {
        return NextResponse.json({ error: 'Payment handle is required' }, { status: 400 });
      }
      
      const validMethods: CashMethod[] = ['paypal', 'venmo', 'cashapp', 'zelle'];
      if (!validMethods.includes(cashMethod)) {
        return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
      }
    }

    // Claim the redemption
    const claimedRedemption = await claimRedemption(redemptionId, {
      cashMethod,
      cashHandle,
      shippingAddress: shippingAddress || creator.shippingAddress, // Use creator's address as default
    });

    return NextResponse.json({
      success: true,
      redemption: claimedRedemption,
      message: 'Reward claimed successfully',
    });
  } catch (error) {
    console.error('Claim redemption error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to claim reward' },
      { status: 500 }
    );
  }
}