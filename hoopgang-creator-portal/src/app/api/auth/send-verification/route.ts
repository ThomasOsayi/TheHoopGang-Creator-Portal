// src/app/api/auth/send-verification/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { VerifyEmailTemplate } from '@/lib/email/templates/verify-email';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName } = await request.json();

    if (!userId || !email || !fullName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate verification link using Firebase Admin
    const verificationLink = await adminAuth.generateEmailVerificationLink(email, {
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://thehoopgang.xyz'}/apply`,
    });

    // Render React component to HTML
    const emailHtml = await render(
      VerifyEmailTemplate({
        creatorName: fullName,
        verificationLink,
      })
    );

    // Send branded email via Resend
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'HoopGang <team@thehoopgang.xyz>',
      to: email,
      subject: 'Verify your email for HoopGang 🏀',
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Verification email error:', err);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}

