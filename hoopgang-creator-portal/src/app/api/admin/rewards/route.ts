// src/app/api/admin/rewards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, orderBy, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';
import { Reward, RewardCategory } from '@/types';

const REWARDS_COLLECTION = 'rewards';

// Helper to convert Firestore timestamps
function convertTimestamps<T>(data: any): T {
  if (data === null || data === undefined) return data;
  if (data.toDate) return data.toDate() as any;
  if (Array.isArray(data)) return data.map((item) => convertTimestamps(item)) as any;
  if (typeof data === 'object') {
    const converted: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        converted[key] = convertTimestamps(data[key]);
      }
    }
    return converted as T;
  }
  return data;
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') as RewardCategory | null;
    const status = searchParams.get('status'); // 'active' | 'inactive'

    // Build query
    let q = query(collection(db, REWARDS_COLLECTION), orderBy('createdAt', 'desc'));

    // Note: Firestore compound queries require indexes
    // For simplicity, we'll do client-side filtering
    const snapshot = await getDocs(q);

    let rewards = snapshot.docs.map((doc) =>
      convertTimestamps<Reward>({ id: doc.id, ...doc.data() })
    );

    // Apply filters
    if (category) {
      rewards = rewards.filter((r) => r.category === category);
    }
    if (status === 'active') {
      rewards = rewards.filter((r) => r.isActive);
    } else if (status === 'inactive') {
      rewards = rewards.filter((r) => !r.isActive);
    }

    return NextResponse.json({ rewards });
  } catch (error) {
    console.error('Error fetching rewards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const body = await req.json();

    // Validate required fields
    if (!body.name?.trim() || !body.description?.trim() || !body.category) {
      return NextResponse.json(
        { error: 'Name, description, and category are required' },
        { status: 400 }
      );
    }

    // Build reward data
    const rewardData: Record<string, any> = {
      name: body.name.trim(),
      description: body.description.trim(),
      category: body.category,
      isActive: body.isActive !== false, // Default to true
      createdAt: Timestamp.now(),
    };

    // Add optional fields only if provided
    if (body.milestoneTier) rewardData.milestoneTier = body.milestoneTier;
    if (body.leaderboardRank) rewardData.leaderboardRank = body.leaderboardRank;
    if (body.cashValue) rewardData.cashValue = body.cashValue;
    if (body.storeCreditValue) rewardData.storeCreditValue = body.storeCreditValue;
    if (body.productName?.trim()) rewardData.productName = body.productName.trim();
    if (body.imageUrl?.trim()) rewardData.imageUrl = body.imageUrl.trim();

    const docRef = await addDoc(collection(db, REWARDS_COLLECTION), rewardData);

    return NextResponse.json({
      success: true,
      rewardId: docRef.id,
    });
  } catch (error) {
    console.error('Error creating reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

