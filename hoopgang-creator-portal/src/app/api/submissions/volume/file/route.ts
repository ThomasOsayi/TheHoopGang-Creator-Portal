// src/app/api/submissions/volume/file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { 
  createFileVolumeSubmission, 
  getCreatorByUserId, 
  recalculateVolumeLeaderboard, 
  getActiveCompetition, 
  recalculateCompetitionLeaderboard,
  checkDuplicateFileHash
} from '@/lib/firestore';
import { getCurrentWeek } from '@/lib/week-utils';
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
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get creator
    const creator = await getCreatorByUserId(userId);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
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

    // Calculate file hash to prevent duplicate uploads
    const fileBuffer = Buffer.from(await file.arrayBuffer());
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

    // Make the file publicly accessible (or use signed URLs)
    await fileRef.makePublic();
    
    // Get the public URL
    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // Get current week
    const weekOf = getCurrentWeek();

    // Get active competition (if any)
    const activeCompetition = await getActiveCompetition('volume');
    const competitionId = activeCompetition?.id || null;

    // Create submission record (now includes fileHash)
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

    // Recalculate leaderboard after successful submission
    await recalculateVolumeLeaderboard(weekOf);

    // Recalculate competition leaderboard if there's an active competition
    if (competitionId) {
      await recalculateCompetitionLeaderboard(competitionId);
    }

    return NextResponse.json({
      success: true,
      submission,
      competitionId,
    });
  } catch (error) {
    console.error('File upload error:', error);
    
    // Handle duplicate file error
    if (error instanceof Error && error.message.includes('already')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}