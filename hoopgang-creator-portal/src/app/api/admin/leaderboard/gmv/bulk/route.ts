// src/app/api/admin/leaderboard/gmv/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  upsertLeaderboardEntry,
  getCreatorByCreatorId,
  getAllCreators,
} from '@/lib/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminId = decodedToken.uid;

    // Parse request body
    const { entries, period } = await request.json();

    if (!entries || !Array.isArray(entries) || !period) {
      return NextResponse.json(
        { error: 'entries array and period are required' },
        { status: 400 }
      );
    }

    // Get all creators for matching
    const { creators } = await getAllCreators({ limit: 500 });
    
    // Create a lookup map by handle (lowercase) and by creatorId
    const creatorByHandle = new Map<string, typeof creators[0]>();
    const creatorByDisplayId = new Map<string, typeof creators[0]>();
    
    creators.forEach(c => {
      creatorByHandle.set(c.tiktokHandle.toLowerCase().replace('@', ''), c);
      creatorByHandle.set(c.instagramHandle.toLowerCase().replace('@', ''), c);
      creatorByDisplayId.set(c.creatorId.toLowerCase(), c);
    });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each entry
    for (const entry of entries) {
      try {
        const { handle, gmvAmount } = entry;
        
        if (!handle || gmvAmount === undefined) {
          results.failed++;
          results.errors.push(`Invalid entry: ${JSON.stringify(entry)}`);
          continue;
        }

        // Try to find creator by handle or display ID
        const normalizedHandle = handle.toLowerCase().replace('@', '');
        let creator = creatorByHandle.get(normalizedHandle) || 
                      creatorByDisplayId.get(normalizedHandle);

        if (!creator) {
          results.failed++;
          results.errors.push(`Creator not found: ${handle}`);
          continue;
        }

        // Upsert entry
        await upsertLeaderboardEntry(
          {
            type: 'gmv',
            period,
            creatorId: creator.id,
            creatorName: creator.fullName,
            creatorHandle: creator.tiktokHandle,
            value: parseFloat(gmvAmount) || 0,
            rank: 0,
          },
          adminId
        );

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing ${entry.handle}: ${err}`);
      }
    }

    // Recalculate ranks
    await recalculateGMVRanks(period);

    return NextResponse.json({
      success: true,
      results,
      message: `Imported ${results.success} entries, ${results.failed} failed`,
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: 'Failed to bulk import' },
      { status: 500 }
    );
  }
}

async function recalculateGMVRanks(period: string): Promise<void> {
  const q = query(
    collection(db, 'leaderboardEntries'),
    where('type', '==', 'gmv'),
    where('period', '==', period)
  );

  const snapshot = await getDocs(q);
  
  const entries = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => b.value - a.value);

  const batch = writeBatch(db);
  entries.forEach((entry: any, index: number) => {
    batch.update(doc(db, 'leaderboardEntries', entry.id), {
      rank: index + 1,
    });
  });

  await batch.commit();
}