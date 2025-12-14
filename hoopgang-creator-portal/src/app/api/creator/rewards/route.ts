// src/app/api/creator/rewards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
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

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    // Fetch only active rewards
    const q = query(
      collection(db, REWARDS_COLLECTION),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    const allRewards = snapshot.docs.map((doc) =>
      convertTimestamps<Reward>({ id: doc.id, ...doc.data() })
    );

    // Group by category
    const grouped: Record<RewardCategory, Reward[]> = {
      milestone: [],
      volume_leaderboard: [],
      gmv_leaderboard: [],
    };

    allRewards.forEach((reward) => {
      if (grouped[reward.category]) {
        grouped[reward.category].push(reward);
      }
    });

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Error fetching creator rewards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}