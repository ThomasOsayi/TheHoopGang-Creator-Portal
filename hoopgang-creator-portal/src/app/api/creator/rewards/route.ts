// src/app/api/creator/rewards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';

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
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    
    // Transform rewards to a consistent format for the frontend
    const rewards = snapshot.docs.map((doc) => {
      const data = convertTimestamps<any>({ id: doc.id, ...doc.data() });
      
      // Normalize the reward data to handle both old and new schemas
      return {
        id: data.id,
        name: data.name || '',
        description: data.description || '',
        
        // Category - handle new admin schema
        category: data.category || 'milestone',
        
        // Type and Value - new schema fields
        type: data.type || 'custom',
        value: data.value || '',
        icon: data.icon || '🎁',
        
        // Category-specific fields
        milestoneTier: data.milestoneTier || null,
        leaderboardRank: data.leaderboardRank || null,
        
        // Legacy fields (for backwards compatibility)
        cashValue: data.cashValue,
        storeCreditValue: data.storeCreditValue,
        productName: data.productName,
        imageUrl: data.imageUrl,
        
        // Status
        isActive: data.isActive !== false,
        
        // Metadata
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    // Return flat array (simpler for frontend to handle)
    return NextResponse.json({ rewards });
  } catch (error) {
    console.error('Error fetching creator rewards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}