// src/lib/email/email-layout.tsx
import * as React from 'react';

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

export function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>HoopGang</title>
        {/* Preview text (hidden) */}
        <style>{`
          .preview-text {
            display: none;
            font-size: 1px;
            color: #1a1a1a;
            line-height: 1px;
            max-height: 0px;
            max-width: 0px;
            opacity: 0;
            overflow: hidden;
          }
        `}</style>
      </head>
      <body style={{
        backgroundColor: '#0a0a0a',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        margin: 0,
        padding: 0,
      }}>
        <div className="preview-text">{previewText}</div>
        
        {/* Main Container */}
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#0a0a0a' }}>
          <tr>
            <td align="center" style={{ padding: '40px 20px' }}>
              <table width="100%" cellPadding="0" cellSpacing="0" style={{ maxWidth: '600px' }}>
                
                {/* Logo Header */}
                <tr>
                  <td align="center" style={{ paddingBottom: '32px' }}>
                    <img 
                      src="http://localhost:3001/api/email/test" 
                      alt="HoopGang" 
                      width="80" 
                      height="80"
                      style={{ display: 'block' }}
                    />
                  </td>
                </tr>

                {/* Content Card */}
                <tr>
                  <td style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '40px',
                  }}>
                    {children}
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td align="center" style={{ paddingTop: '32px' }}>
                    <p style={{
                      color: '#666666',
                      fontSize: '12px',
                      margin: 0,
                    }}>
                      © {new Date().getFullYear()} HoopGang. All rights reserved.
                    </p>
                    <p style={{
                      color: '#666666',
                      fontSize: '12px',
                      margin: '8px 0 0 0',
                    }}>
                      Questions? Reply to this email or DM us on Instagram.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}