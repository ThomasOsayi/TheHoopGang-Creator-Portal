// src/lib/email/templates/shipped.tsx
import * as React from 'react';
import { EmailLayout } from '../email-layout';

interface ShippedEmailProps {
  creatorName: string;
  trackingNumber: string;
  carrier: string;
  trackingUrl: string;
}

export function ShippedEmail({ 
  creatorName, 
  trackingNumber, 
  carrier,
  trackingUrl 
}: ShippedEmailProps) {
  return (
    <EmailLayout previewText="Your TheHoopGang gear is on the way">
      {/* Heading */}
      <h1 style={{
        color: '#ffffff',
        fontSize: '28px',
        fontWeight: 700,
        margin: '0 0 8px 0',
        textAlign: 'center' as const,
      }}>
        Your Gear Has Shipped 📦
      </h1>
      
      <p style={{
        color: '#f97316',
        fontSize: '16px',
        fontWeight: 600,
        margin: '0 0 24px 0',
        textAlign: 'center' as const,
      }}>
        Track your package below
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
        Great news — your TheHoopGang gear just shipped and is on its way to you. 
        Use the tracking info below to follow your package.
      </p>

      {/* Tracking Info Box */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <table width="100%" cellPadding="0" cellSpacing="0">
          <tr>
            <td style={{ paddingBottom: '12px' }}>
              <p style={{ color: '#666666', fontSize: '12px', margin: 0 }}>CARRIER</p>
              <p style={{ color: '#ffffff', fontSize: '16px', margin: '4px 0 0 0' }}>{carrier}</p>
            </td>
          </tr>
          <tr>
            <td>
              <p style={{ color: '#666666', fontSize: '12px', margin: 0 }}>TRACKING NUMBER</p>
              <p style={{ 
                color: '#f97316', 
                fontSize: '16px', 
                fontFamily: 'monospace',
                margin: '4px 0 0 0',
                wordBreak: 'break-all' as const,
              }}>
                {trackingNumber}
              </p>
            </td>
          </tr>
        </table>
      </div>

      {/* Track Button */}
      <table width="100%" cellPadding="0" cellSpacing="0">
        <tr>
          <td align="center">
            <a href={trackingUrl}
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
              Track Your Package
            </a>
          </td>
        </tr>
      </table>

      {/* Shipping Note */}
      <div style={{
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginTop: '24px',
      }}>
        <p style={{
          color: '#eab308',
          fontSize: '14px',
          margin: 0,
          lineHeight: '1.6',
        }}>
          <strong>Note:</strong> International shipping typically takes 2-4 weeks. 
          Tracking may not update for the first few days — this is normal.
        </p>
      </div>

      {/* Sign off */}
      <p style={{
        color: '#a3a3a3',
        fontSize: '16px',
        lineHeight: '1.6',
        margin: '24px 0 0 0',
      }}>
        Thanks for your patience,<br />
        <span style={{ color: '#ffffff', fontWeight: 600 }}>The TheHoopGang Team</span>
      </p>
    </EmailLayout>
  );
}