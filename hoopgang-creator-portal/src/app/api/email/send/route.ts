// src/app/api/email/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  sendApprovedEmail, 
  sendShippedEmail, 
  sendDeliveredEmail 
} from '@/lib/email/send-email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ...params } = body;

    switch (type) {
      case 'approved':
        await sendApprovedEmail(params);
        break;
      case 'shipped':
        await sendShippedEmail(params);
        break;
      case 'delivered':
        // Convert contentDeadline from ISO string to Date if needed
        const deliveredParams = {
          ...params,
          contentDeadline: params.contentDeadline 
            ? (typeof params.contentDeadline === 'string' 
                ? new Date(params.contentDeadline) 
                : params.contentDeadline)
            : undefined,
        };
        await sendDeliveredEmail(deliveredParams);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}