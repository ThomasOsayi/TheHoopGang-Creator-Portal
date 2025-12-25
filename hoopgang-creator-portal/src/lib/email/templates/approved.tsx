// src/lib/email/templates/approved.tsx
import * as React from 'react';
import { EmailLayout } from '../email-layout';

interface ApprovedEmailProps {
  creatorName: string;
  instagramHandle: string;
}

export function ApprovedEmail({ creatorName, instagramHandle }: ApprovedEmailProps) {
  return (
    <EmailLayout previewText="You're in! Welcome to the TheHoopGang Creator Program">
      {/* Heading */}
      <h1 style={{
        color: '#ffffff',
        fontSize: '28px',
        fontWeight: 700,
        margin: '0 0 8px 0',
        textAlign: 'center' as const,
      }}>
        Welcome to the Team 🏀
      </h1>
      
      <p style={{
        color: '#f97316',
        fontSize: '16px',
        fontWeight: 600,
        margin: '0 0 24px 0',
        textAlign: 'center' as const,
      }}>
        Your application has been approved
      </p>

      {/* Divider */}
      <div style={{
        height: '1px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        margin: '0 0 24px 0',
      }} />

      {/* Body */}
      <p style={{
        color: '#e5e5e5',
        fontSize: '16px',
        lineHeight: '1.6',
        margin: '0 0 16px 0',
      }}>
        Hey {creatorName},
      </p>

      <p style={{
        color: '#a3a3a3',
        fontSize: '16px',
        lineHeight: '1.6',
        margin: '0 0 16px 0',
      }}>
        We loved what we saw on <span style={{ color: '#f97316' }}>@{instagramHandle}</span> and 
        we're excited to have you join the TheHoopGang creator program.
      </p>

      <p style={{
        color: '#a3a3a3',
        fontSize: '16px',
        lineHeight: '1.6',
        margin: '0 0 24px 0',
      }}>
        We're getting your gear ready and will send you another email with tracking 
        info once it ships. Keep an eye on your inbox.
      </p>

      {/* What's Next Box */}
      <div style={{
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        border: '1px solid rgba(249, 115, 22, 0.3)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <p style={{
          color: '#f97316',
          fontSize: '14px',
          fontWeight: 600,
          margin: '0 0 12px 0',
        }}>
          WHAT'S NEXT
        </p>
        <ol style={{
          color: '#a3a3a3',
          fontSize: '14px',
          lineHeight: '1.8',
          margin: 0,
          paddingLeft: '20px',
        }}>
          <li>We ship your free TheHoopGang gear</li>
          <li>You receive it and try it on</li>
          <li>Create 1 TikTok video featuring the gear</li>
          <li>Submit links through your creator dashboard</li>
        </ol>
      </div>

      {/* CTA Button */}
      <table width="100%" cellPadding="0" cellSpacing="0">
        <tr>
          <td align="center">
            <a href="https://thehoopgang.xyz/creator/dashboard"
              style={{
                backgroundColor: '#f97316',
                borderRadius: '12px',
                color: '#ffffff',
                display: 'inline-block',
                fontSize: '16px',
                fontWeight: 600,
                padding: '14px 32px',
                textDecoration: 'none',
              }}
            >
              View Your Dashboard
            </a>
          </td>
        </tr>
      </table>

      {/* Sign off */}
      <p style={{
        color: '#a3a3a3',
        fontSize: '16px',
        lineHeight: '1.6',
        margin: '32px 0 0 0',
      }}>
        Welcome aboard,<br />
        <span style={{ color: '#ffffff', fontWeight: 600 }}>The TheHoopGang Team</span>
      </p>
    </EmailLayout>
  );
}