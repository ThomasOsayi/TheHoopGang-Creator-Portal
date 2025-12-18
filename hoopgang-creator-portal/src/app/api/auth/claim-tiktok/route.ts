// src/app/api/auth/claim-tiktok/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { 
  lookupTiktokCreator, 
  getTiktokImportById, 
  claimTiktokImport,
  createCreatorFromTiktokImport,
  normalizeTiktokUsername,
} from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * POST /api/auth/claim-tiktok
 * 
 * Claims a TikTok import and creates a creator account.
 * 
 * Request body:
 * {
 *   tiktokUsername: string,  // The TikTok username being claimed
 *   importId: string,        // The import document ID (from lookup response)
 *   email: string,           // Email for the new account
 *   password: string,       // Password for the new account
 *   tiktokFollowers?: number,      // TikTok follower count (optional)
 *   instagramHandle?: string | null,  // Instagram handle (optional)
 *   instagramFollowers?: number | null // Instagram follower count (optional)
 * }
 * 
 * Response (success):
 * {
 *   success: true,
 *   creatorId: string,       // Firestore creator document ID
 *   userId: string,          // Firebase Auth user ID
 *   fullName: string,        // Creator's full name
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log received request (without password)
    console.log('TikTok claim request:', {
      tiktokUsername: body.tiktokUsername,
      importId: body.importId,
      email: body.email,
      hasPassword: !!body.password,
      hasTiktokFollowers: !!body.tiktokFollowers,
      hasInstagramHandle: !!body.instagramHandle,
    });

    const { 
      tiktokUsername, 
      importId, 
      email, 
      password,
      // Social stats (optional)
      tiktokFollowers,
      instagramHandle,
      instagramFollowers,
    } = body;

    // Validate required fields
    if (!tiktokUsername || !importId || !email || !password) {
      const missing = [];
      if (!tiktokUsername) missing.push('tiktokUsername');
      if (!importId) missing.push('importId');
      if (!email) missing.push('email');
      if (!password) missing.push('password');
      
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Normalize username
    const normalizedUsername = normalizeTiktokUsername(tiktokUsername);

    // Step 1: Verify the import exists and is available
    const importRecord = await getTiktokImportById(importId);
    
    if (!importRecord) {
      return NextResponse.json(
        { error: 'Import record not found. Please try the signup process again.' },
        { status: 404 }
      );
    }

    // Verify username matches
    if (importRecord.tiktokUsername !== normalizedUsername) {
      return NextResponse.json(
        { error: 'Username mismatch. Please try the signup process again.' },
        { status: 400 }
      );
    }

    // Check if already claimed
    if (importRecord.status === 'claimed') {
      return NextResponse.json(
        { error: 'This TikTok account has already been claimed. Please sign in instead.' },
        { status: 409 }
      );
    }

    if (importRecord.status === 'expired') {
      return NextResponse.json(
        { error: 'This import has expired. Please contact support.' },
        { status: 410 }
      );
    }

    // Step 2: Create Firebase Auth user
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.createUser({
        email,
        password,
        displayName: importRecord.fullName,
      });
      
      console.log('Firebase user created:', firebaseUser.uid);
    } catch (authError: any) {
      console.error('Firebase Auth error:', authError);
      
      // Handle specific Firebase Auth errors
      if (authError.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in or use a different email.' },
          { status: 409 }
        );
      }
      if (authError.code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: 'Please enter a valid email address.' },
          { status: 400 }
        );
      }
      if (authError.code === 'auth/weak-password') {
        return NextResponse.json(
          { error: 'Password is too weak. Please use a stronger password.' },
          { status: 400 }
        );
      }
      
      throw authError;
    }

    // Step 3: Create the creator document
    let creatorId;
    try {
      creatorId = await createCreatorFromTiktokImport(
        importRecord,
        email,
        firebaseUser.uid,
        {
          tiktokFollowers: tiktokFollowers || 0,
          instagramHandle: instagramHandle || null,
          instagramFollowers: instagramFollowers || null,
        }
      );
      
      console.log('Creator document created:', creatorId);
    } catch (creatorError) {
      // Rollback: Delete the Firebase user if creator creation fails
      console.error('Creator creation failed, rolling back Firebase user:', creatorError);
      try {
        await adminAuth.deleteUser(firebaseUser.uid);
      } catch (deleteError) {
        console.error('Failed to rollback Firebase user:', deleteError);
      }
      throw creatorError;
    }

    // Step 4: Create user document (for role tracking)
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        id: firebaseUser.uid,
        email,
        role: 'creator',
        creatorId: creatorId,
        createdAt: serverTimestamp(),
      });
      
      console.log('User document created for:', firebaseUser.uid);
    } catch (userDocError) {
      console.error('User document creation failed:', userDocError);
      // Non-critical, continue anyway
    }

    // Step 5: Claim the import
    try {
      await claimTiktokImport(importId, firebaseUser.uid);
      console.log('Import claimed:', importId);
    } catch (claimError) {
      console.error('Failed to claim import:', claimError);
      // Non-critical, the import will just remain "available" but user is created
    }

    // Success!
    // Note: Email verification is handled client-side via /api/auth/send-verification
    return NextResponse.json({
      success: true,
      creatorId,
      userId: firebaseUser.uid,
      fullName: importRecord.fullName,
      message: 'Account created successfully! Please check your email to verify your account.',
    });

  } catch (error) {
    console.error('TikTok claim error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}