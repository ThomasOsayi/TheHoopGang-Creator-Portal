// src/lib/email/templates/verify-email.tsx

import * as React from 'react';
import { EmailLayout } from '../email-layout';

interface VerifyEmailProps {
  creatorName: string;
  verificationLink: string;
}

export const VerifyEmailTemplate: React.FC<VerifyEmailProps> = ({
  creatorName,
  verificationLink,
}) => {
  const firstName = creatorName.split(' ')[0];

  return (
    <EmailLayout previewText="Verify your email to join the HoopGang Creator Program">
      {/* Header */}
      <h1 style={{ 
        color: '#ffffff', 
        fontSize: '28px', 
        fontWeight: 'bold', 
        margin: '0 0 24px 0',
        lineHeight: '1.3'
      }}>
        Verify Your Email
      </h1>

      {/* Greeting */}
      <p style={{ 
        color: '#ffffff', 
        fontSize: '16px', 
        margin: '0 0 16px 0',
        lineHeight: '1.6'
      }}>
        Hey {firstName},
      </p>

      {/* Message */}
      <p style={{ 
        color: 'rgba(255,255,255,0.7)', 
        fontSize: '16px', 
        margin: '0 0 24px 0',
        lineHeight: '1.6'
      }}>
        Thanks for starting your application to join the HoopGang Creator Program. 
        Click the button below to verify your email and continue with your application.
      </p>

      {/* CTA Button */}
      <table role="presentation" cellSpacing="0" cellPadding="0" style={{ margin: '0 auto 24px auto', width: '100%' }}>
        <tr>
          <td align="center">
            <a
              href={verificationLink}
              style={{
                display: 'inline-block',
                padding: '16px 32px',
                backgroundColor: '#f97316',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              Verify My Email
            </a>
          </td>
        </tr>
      </table>

      {/* Expiry Note */}
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ 
          color: 'rgba(255,255,255,0.6)', 
          fontSize: '14px', 
          margin: '0',
          lineHeight: '1.5'
        }}>
          This link expires in 24 hours. If you didn't request this, you can safely ignore this email.
        </p>
      </div>

      {/* Fallback Link */}
      <p style={{ 
        color: 'rgba(255,255,255,0.5)', 
        fontSize: '12px', 
        margin: '0',
        lineHeight: '1.5'
      }}>
        If the button doesn't work, copy and paste this link into your browser:
        <br />
        <a href={verificationLink} style={{ color: '#f97316', wordBreak: 'break-all' }}>
          {verificationLink}
        </a>
      </p>
    </EmailLayout>
  );
};

