// src/app/api/auth/send-verification/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import * as React from 'react';
import { VerifyEmailTemplate } from '@/lib/email/templates/verify-email';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Received verification request:', {
      userId: body.userId,
      email: body.email,
      fullName: body.fullName,
      source: body.source,
      hasUserId: !!body.userId,
      hasEmail: !!body.email,
      hasFullName: !!body.fullName,
    });

    const { userId, email, fullName, source } = body;

    if (!userId || !email || !fullName) {
      console.log('Missing fields:', { userId: !!userId, email: !!email, fullName: !!fullName });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Determine redirect URL based on source
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://thehoopgang.xyz';
    let redirectUrl: string;
    
    if (source === 'tiktok') {
      // TikTok users go to dashboard (their application is already complete)
      redirectUrl = `${baseUrl}/creator/dashboard`;
    } else {
      // Instagram/other users go back to their application flow
      redirectUrl = `${baseUrl}/apply/instagram`;
    }

    // Generate verification link using Firebase Admin
    const verificationLink = await adminAuth.generateEmailVerificationLink(email, {
      url: redirectUrl,
      handleCodeInApp: true,
    });

    // Render React component to HTML
    const emailHtml = await render(
      React.createElement(VerifyEmailTemplate, {
        creatorName: fullName,
        verificationLink,
      })
    );

    // Send branded email via Resend
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'TheHoopGang <team@thehoopgang.xyz>',
      to: email,
      subject: 'Verify your email for TheHoopGang',
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