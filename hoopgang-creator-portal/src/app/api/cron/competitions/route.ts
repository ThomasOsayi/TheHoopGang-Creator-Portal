// app/api/cron/competitions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { endCompetition } from '@/lib/firestore';

// Vercel Cron authentication
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (prevents unauthorized access)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find active competitions that have passed their end time
    const now = Timestamp.fromDate(new Date());
    
    const competitionsQuery = query(
      collection(db, 'competitions'),
      where('status', '==', 'active')
    );
    
    const snapshot = await getDocs(competitionsQuery);
    const expiredCompetitions: string[] = [];
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const endsAt = data.endsAt?.toDate?.() || (data.endsAt?.seconds ? new Date(data.endsAt.seconds * 1000) : null);
      
      if (endsAt && endsAt <= new Date()) {
        // Competition has expired - end it
        await endCompetition(doc.id);
        expiredCompetitions.push(doc.id);
        console.log(`Auto-ended competition: ${doc.id} (${data.name})`);
      }
    }

    return NextResponse.json({
      success: true,
      checked: snapshot.size,
      ended: expiredCompetitions.length,
      endedIds: expiredCompetitions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

