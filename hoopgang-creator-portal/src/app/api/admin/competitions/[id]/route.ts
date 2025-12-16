// src/app/api/admin/competitions/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const { id: competitionId } = await params;
    const { name, prizes } = await request.json();

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name) {
      updateData.name = name;
    }

    if (prizes) {
      updateData.prizes = prizes;
    }

    await adminDb.collection('competitions').doc(competitionId).update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Competition updated',
    });
  } catch (error) {
    console.error('Update competition error:', error);
    return NextResponse.json(
      { error: 'Failed to update competition' },
      { status: 500 }
    );
  }
}