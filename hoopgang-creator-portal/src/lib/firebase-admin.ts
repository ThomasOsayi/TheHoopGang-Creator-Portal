// src/lib/firebase-admin.ts

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

const adminApp = getApps().length === 0 
  ? initializeApp({
      credential: cert(serviceAccount),
    })
  : getApps()[0];

export const adminAuth = getAuth(adminApp);

