// src/lib/email/templates/delivered.tsx
import * as React from 'react';
import { EmailLayout } from '../email-layout';

interface DeliveredEmailProps {
  creatorName: string;
  contentDeadline: string; // formatted date string
  daysRemaining: number;
}

export function DeliveredEmail({ 
  creatorName, 
  contentDeadline,
  daysRemaining 
}: DeliveredEmailProps) {
  return (
    <EmailLayout previewText="Your gear arrived — time to create content">
      {/* Heading */}
      <h1 style={{
        color: '#ffffff',
        fontSize: '28px',
        fontWeight: 700,
        margin: '0 0 8px 0',
        textAlign: 'center' as const,
      }}>
        Your Gear Has Arrived
      </h1>
      
      <p style={{
        color: '#22c55e',
        fontSize: '16px',
        fontWeight: 600,
        margin: '0 0 24px 0',
        textAlign: 'center' as const,
      }}>
        Time to create some great content
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
        margin: '0 0 24px 0',
      }}>
        Your HoopGang gear has been delivered. We hope you love it. Now it's time 
        for the fun part — creating content.
      </p>

      {/* Deadline Box */}
      <div style={{
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        border: '1px solid rgba(249, 115, 22, 0.3)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center' as const,
      }}>
        <p style={{
          color: '#f97316',
          fontSize: '14px',
          fontWeight: 600,
          margin: '0 0 8px 0',
        }}>
          CONTENT DEADLINE
        </p>
        <p style={{
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: 700,
          margin: '0 0 4px 0',
        }}>
          {contentDeadline}
        </p>
        <p style={{
          color: '#a3a3a3',
          fontSize: '14px',
          margin: 0,
        }}>
          {daysRemaining} days to submit 3 TikTok videos
        </p>
      </div>

      {/* Requirements */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <p style={{
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
          margin: '0 0 12px 0',
        }}>
          CONTENT REQUIREMENTS
        </p>
        <ul style={{
          color: '#a3a3a3',
          fontSize: '14px',
          lineHeight: '1.8',
          margin: 0,
          paddingLeft: '20px',
        }}>
          <li>Create <strong style={{ color: '#ffffff' }}>3 TikTok videos</strong> featuring your HoopGang gear</li>
          <li>Tag <strong style={{ color: '#f97316' }}>@thehoopgang</strong> in each video</li>
          <li>Submit your TikTok links through your creator dashboard</li>
          <li>Videos should showcase the gear in action (basketball, lifestyle, fits)</li>
        </ul>
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
              Submit Your Content
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
        Looking forward to seeing what you create,<br />
        <span style={{ color: '#ffffff', fontWeight: 600 }}>The HoopGang Team</span>
      </p>
    </EmailLayout>
  );
}