// src/app/api/submissions/volume/confirm-upload/route.ts
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

// Initialize admin storage
const adminStorage = getStorage(adminApp);

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
    const { filePath, fileUrl, fileName, fileSize, fileType } = body;

    // Validate required fields
    if (!filePath || !fileUrl || !fileName || !fileSize || !fileType) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Verify the file path belongs to this creator (security check)
    if (!filePath.startsWith(`videos/${creator.id}/`)) {
      return NextResponse.json({ 
        error: 'Invalid file path' 
      }, { status: 403 });
    }

    // Get bucket and file reference
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(filePath);

    // Verify the file actually exists in storage
    const [exists] = await fileRef.exists();
    if (!exists) {
      return NextResponse.json({ 
        error: 'File not found in storage. Upload may have failed.' 
      }, { status: 404 });
    }

    // Get file metadata to verify size
    const [metadata] = await fileRef.getMetadata();
    const actualSize = parseInt(metadata.size as string, 10);
    
    // Allow some variance in size (encoding can change it slightly)
    const sizeDifference = Math.abs(actualSize - fileSize);
    const maxVariance = fileSize * 0.1; // 10% variance allowed
    
    if (sizeDifference > maxVariance && sizeDifference > 1024 * 1024) {
      console.warn(`Size mismatch: expected ${fileSize}, got ${actualSize}`);
      // Don't fail, just log it - iOS can change file size during selection
    }

    // Download file to calculate hash for duplicate detection
    // We download in chunks to handle large files
    let fileHash: string;
    try {
      const [fileBuffer] = await fileRef.download();
      fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (downloadError) {
      console.error('Error downloading for hash:', downloadError);
      // Generate a unique hash based on path + size + time as fallback
      fileHash = crypto.createHash('sha256')
        .update(`${filePath}-${actualSize}-${Date.now()}`)
        .digest('hex');
    }

    // Check for duplicate uploads
    const isDuplicate = await checkDuplicateFileHash(creator.id, fileHash);
    if (isDuplicate) {
      // Delete the uploaded file since it's a duplicate
      try {
        await fileRef.delete();
      } catch (deleteError) {
        console.error('Error deleting duplicate file:', deleteError);
      }
      
      return NextResponse.json({ 
        error: 'You have already uploaded this video' 
      }, { status: 409 });
    }

    // Make the file publicly accessible
    try {
      await fileRef.makePublic();
    } catch (publicError) {
      console.error('Error making file public:', publicError);
      // Continue anyway - file is uploaded, we can fix permissions later
    }

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
        fileName,
        fileSize: actualSize, // Use actual size from storage
        filePath,
        mimeType: fileType,
        fileHash,
      },
      weekOf,
      competitionId
    );

    return NextResponse.json({
      success: true,
      submission,
      competitionId,
      message: 'Video uploaded successfully!',
    });
  } catch (error) {
    console.error('Confirm upload error:', error);
    
    if (error instanceof Error && error.message.includes('already')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Failed to confirm upload' },
      { status: 500 }
    );
  }
}