// src/lib/firebase-admin.ts

import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function getServiceAccount(): ServiceAccount {
  // Option 1: Base64 encoded service account (recommended for Vercel)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
    return JSON.parse(decoded) as ServiceAccount;
  }

  // Option 2: Individual environment variables (fallback)
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  } as ServiceAccount;
}

const adminApp = getApps().length === 0
  ? initializeApp({
      credential: cert(getServiceAccount()),
    })
  : getApps()[0];

export const adminAuth = getAuth(adminApp);