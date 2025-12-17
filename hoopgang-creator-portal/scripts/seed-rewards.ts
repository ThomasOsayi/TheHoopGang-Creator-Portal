// scripts/seed-rewards.ts
// Run with: npx ts-node --skip-project scripts/seed-rewards.ts
// Or: npx tsx scripts/seed-rewards.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as admin from 'firebase-admin';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

if (!admin.apps.length) {
  try {
    // Try to load service account from file
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized with service account file');
  } catch (error) {
    // Fallback to environment variables
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString()
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized with base64 env var');
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      console.log('✅ Firebase Admin initialized with individual env vars');
    } else {
      console.error('❌ No Firebase credentials found');
      process.exit(1);
    }
  }
}

const db = admin.firestore();
const REWARDS_COLLECTION = 'rewards';

// Sample rewards data with new schema
const SEED_REWARDS = [
  // ========== MILESTONE REWARDS ==========
  {
    name: '100K Views Reward',
    description: 'Hit 100K views on a single TikTok video',
    category: 'milestone',
    type: 'credit',
    value: '$10 Store Credit',
    icon: '🔥',
    milestoneTier: '100k',
    isActive: true,
  },
  {
    name: '500K Views Reward',
    description: 'Hit 500K views on a single TikTok - you\'re going viral!',
    category: 'milestone',
    type: 'cash',
    value: '$25 Cash + Free Product',
    icon: '⚡',
    milestoneTier: '500k',
    isActive: true,
  },
  {
    name: '1M Views Reward',
    description: 'Hit 1 MILLION views - you\'re a viral sensation!',
    category: 'milestone',
    type: 'cash',
    value: '$50 Cash + Exclusive Merch',
    icon: '👑',
    milestoneTier: '1m',
    isActive: true,
  },

  // ========== VOLUME LEADERBOARD REWARDS ==========
  {
    name: 'Weekly Volume Champion',
    description: 'Top poster of the week wins $50 cash',
    category: 'volume_leaderboard',
    type: 'cash',
    value: '$50 Cash',
    icon: '🥇',
    leaderboardRank: 1,
    isActive: true,
  },
  {
    name: 'Weekly Volume Runner-Up',
    description: '2nd place poster wins $25 cash',
    category: 'volume_leaderboard',
    type: 'cash',
    value: '$25 Cash',
    icon: '🥈',
    leaderboardRank: 2,
    isActive: true,
  },
  {
    name: 'Weekly Volume Third Place',
    description: '3rd place poster wins $10 cash',
    category: 'volume_leaderboard',
    type: 'cash',
    value: '$10 Cash',
    icon: '🥉',
    leaderboardRank: 3,
    isActive: true,
  },

  // ========== GMV LEADERBOARD REWARDS ==========
  {
    name: 'Monthly GMV Champion',
    description: 'Highest sales generator of the month',
    category: 'gmv_leaderboard',
    type: 'cash',
    value: '$100 Cash + VIP Status',
    icon: '💰',
    leaderboardRank: 1,
    isActive: true,
  },
  {
    name: 'Monthly GMV Runner-Up',
    description: '2nd highest sales of the month',
    category: 'gmv_leaderboard',
    type: 'cash',
    value: '$50 Cash',
    icon: '💵',
    leaderboardRank: 2,
    isActive: true,
  },
  {
    name: 'Monthly GMV Third Place',
    description: '3rd highest sales of the month',
    category: 'gmv_leaderboard',
    type: 'cash',
    value: '$25 Cash',
    icon: '💸',
    leaderboardRank: 3,
    isActive: true,
  },
];

async function seedRewards() {
  console.log('\n🌱 Starting rewards seed...\n');

  const batch = db.batch();
  let count = 0;

  for (const reward of SEED_REWARDS) {
    const docRef = db.collection(REWARDS_COLLECTION).doc();
    
    batch.set(docRef, {
      ...reward,
      timesAwarded: 0,
      timesRedeemed: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`  📦 Queued: ${reward.name} (${reward.category})`);
    count++;
  }

  console.log('\n⏳ Committing batch write...');
  await batch.commit();

  console.log(`\n✅ Successfully seeded ${count} rewards!\n`);
  console.log('Breakdown:');
  console.log(`  🔥 Milestone rewards: ${SEED_REWARDS.filter(r => r.category === 'milestone').length}`);
  console.log(`  🏆 Volume leaderboard rewards: ${SEED_REWARDS.filter(r => r.category === 'volume_leaderboard').length}`);
  console.log(`  💰 GMV leaderboard rewards: ${SEED_REWARDS.filter(r => r.category === 'gmv_leaderboard').length}`);
}

async function clearExistingRewards() {
  console.log('\n🗑️  Clearing existing rewards...');
  
  const snapshot = await db.collection(REWARDS_COLLECTION).get();
  
  if (snapshot.empty) {
    console.log('  No existing rewards to clear.');
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`  Deleted ${snapshot.size} existing rewards.`);
}

async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear') || args.includes('-c');

  try {
    if (shouldClear) {
      await clearExistingRewards();
    }

    await seedRewards();

    console.log('\n🎉 Seed complete! Check your Firestore console or refresh the rewards page.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding rewards:', error);
    process.exit(1);
  }
}

main();