// src/app/api/submissions/volume/get-upload-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCreatorByUserId } from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { adminApp } from '@/lib/firebase-admin';

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

    // Parse request body
    const body = await request.json();
    const { fileName, fileType, fileSize } = body;

    // Validate required fields
    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json({ 
        error: 'Missing required fields: fileName, fileType, fileSize' 
      }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(fileType)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed: MP4, MOV, WebM, AVI, MKV' 
      }, { status: 400 });
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 100MB' 
      }, { status: 400 });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `videos/${creator.id}/${timestamp}-${sanitizedFileName}`;

    // Get bucket reference
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(filePath);

    // Generate signed URL for upload (valid for 15 minutes)
    const [signedUrl] = await fileRef.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: fileType,
    });

    // The public URL after upload
    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    return NextResponse.json({
      success: true,
      uploadUrl: signedUrl,
      filePath,
      fileUrl,
      expiresIn: 900, // 15 minutes in seconds
    });
  } catch (error) {
    console.error('Get upload URL error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}