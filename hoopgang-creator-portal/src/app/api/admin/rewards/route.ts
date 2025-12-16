// src/app/api/admin/rewards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, orderBy, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';

const REWARDS_COLLECTION = 'rewards';

// Reward types for the new simplified model
type RewardType = 'cash' | 'credit' | 'product' | 'custom';

interface RewardDocument {
  id: string;
  name: string;
  description: string;
  type: RewardType;
  value: string;
  icon: string;
  isActive: boolean;
  timesAwarded: number;
  timesRedeemed: number;
  createdAt: Date;
  updatedAt?: Date;
}

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

// Helper to get default icon for type
function getDefaultIcon(type: RewardType): string {
  switch (type) {
    case 'cash': return '💵';
    case 'credit': return '🎁';
    case 'product': return '👕';
    case 'custom': return '✨';
    default: return '🎁';
  }
}

// Helper to migrate legacy reward data to new format
function migrateReward(data: any): Partial<RewardDocument> {
  // If already has new format fields, return as-is
  if (data.type && data.value) {
    return data;
  }

  // Migrate from legacy format
  let type: RewardType = 'custom';
  let value = '';
  let icon = data.icon || '🎁';

  if (data.cashValue) {
    type = 'cash';
    value = `$${data.cashValue.toFixed(2)}`;
    icon = icon || '💵';
  } else if (data.storeCreditValue) {
    type = 'credit';
    value = `$${data.storeCreditValue.toFixed(2)}`;
    icon = icon || '🎁';
  } else if (data.productName) {
    type = 'product';
    value = data.productName;
    icon = icon || '👕';
  }

  return {
    ...data,
    type,
    value,
    icon,
  };
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
    const typeFilter = searchParams.get('type') as RewardType | null;
    const status = searchParams.get('status'); // 'active' | 'inactive'

    // Build query
    const q = query(collection(db, REWARDS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    let rewards = snapshot.docs.map((doc) => {
      const rawData = convertTimestamps<any>({ id: doc.id, ...doc.data() });
      // Migrate legacy data to new format
      const migratedData = migrateReward(rawData);
      return {
        id: doc.id,
        name: migratedData.name || '',
        description: migratedData.description || '',
        type: migratedData.type || 'custom',
        value: migratedData.value || '',
        icon: migratedData.icon || getDefaultIcon(migratedData.type || 'custom'),
        isActive: migratedData.isActive !== false,
        timesAwarded: migratedData.timesAwarded || 0,
        timesRedeemed: migratedData.timesRedeemed || 0,
        createdAt: rawData.createdAt,
        updatedAt: rawData.updatedAt,
      } as RewardDocument;
    });

    // Apply filters
    if (typeFilter) {
      rewards = rewards.filter((r) => r.type === typeFilter);
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

    // Validate required fields (new format)
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!body.value?.trim()) {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 });
    }

    // Validate type
    const validTypes: RewardType[] = ['cash', 'credit', 'product', 'custom'];
    const type: RewardType = validTypes.includes(body.type) ? body.type : 'custom';

    // Build reward data with new format
    const rewardData: Record<string, any> = {
      name: body.name.trim(),
      description: body.description?.trim() || '',
      type: type,
      value: body.value.trim(),
      icon: body.icon || getDefaultIcon(type),
      isActive: body.isActive !== false, // Default to true
      timesAwarded: 0,
      timesRedeemed: 0,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, REWARDS_COLLECTION), rewardData);

    return NextResponse.json({
      success: true,
      rewardId: docRef.id,
      reward: {
        id: docRef.id,
        ...rewardData,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error creating reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}