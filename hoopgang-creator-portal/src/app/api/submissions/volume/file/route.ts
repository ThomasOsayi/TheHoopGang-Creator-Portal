// src/app/api/submissions/volume/file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { 
  createFileVolumeSubmission, 
  getCreatorByUserId, 
  getActiveCompetition,
  checkDuplicateFileHash
} from '@/lib/firestore';
import { getCurrentWeek } from '@/lib/week-utils';
import { adminAuth } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { adminApp } from '@/lib/firebase-admin';

// ============================================
// ROUTE SEGMENT CONFIG - CRITICAL FOR LARGE FILES
// ============================================
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 second timeout for large uploads

// Initialize admin storage
const adminStorage = getStorage(adminApp);

// Allowed video MIME types
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',  // .mov
  'video/webm',
  'video/x-msvideo',  // .avi
  'video/x-matroska', // .mkv
];

// Max file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    const userId = decodedToken.uid;

    // Get creator
    const creator = await getCreatorByUserId(userId);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Parse multipart form data
    let formData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error('FormData parse error:', parseError);
      return NextResponse.json({ 
        error: 'Failed to parse upload. File may be too large or upload was interrupted.' 
      }, { status: 400 });
    }
    
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed: MP4, MOV, WebM, AVI, MKV' 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 100MB' 
      }, { status: 400 });
    }

    // Convert file to buffer - wrapped in try/catch for memory issues
    let fileBuffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch (bufferError) {
      console.error('Buffer conversion error:', bufferError);
      return NextResponse.json({ 
        error: 'Failed to process file. Please try a smaller file or try again.' 
      }, { status: 500 });
    }

    // Calculate file hash to prevent duplicate uploads
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Check if this exact file has already been uploaded by this creator
    const isDuplicate = await checkDuplicateFileHash(creator.id, fileHash);
    if (isDuplicate) {
      return NextResponse.json({ 
        error: 'You have already uploaded this video file' 
      }, { status: 409 });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `videos/${creator.id}/${timestamp}-${sanitizedFileName}`;

    // Upload to Firebase Storage
    const bucket = adminStorage.bucket();
    
    const fileRef = bucket.file(filePath);
    
    try {
      await fileRef.save(fileBuffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            creatorId: creator.id,
            uploadedBy: userId,
            originalName: file.name,
            fileHash,
          },
        },
      });
    } catch (uploadError) {
      console.error('Firebase upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload to storage. Please try again.' 
      }, { status: 500 });
    }

    // Make the file publicly accessible
    await fileRef.makePublic();
    
    // Get the public URL
    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // Get current week
    const weekOf = getCurrentWeek();

    // Get active competition (if any)
    const activeCompetition = await getActiveCompetition('volume');
    const competitionId = activeCompetition?.id || null;

    // Create submission record
    const submission = await createFileVolumeSubmission(
      creator.id,
      {
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        filePath,
        mimeType: file.type,
        fileHash,
      },
      weekOf,
      competitionId
    );

    return NextResponse.json({
      success: true,
      submission,
      competitionId,
      message: 'Video uploaded successfully! It will be reviewed by an admin.',
    });
  } catch (error) {
    console.error('File upload error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('already')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes('ECONNRESET') || error.message.includes('timeout')) {
        return NextResponse.json({ 
          error: 'Upload timed out. Please try again with a stable connection.' 
        }, { status: 408 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to upload file. Please try again.' },
      { status: 500 }
    );
  }
}