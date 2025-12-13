// scripts/seed-v3-rewards.ts
// Run with: npx ts-node --project tsconfig.scripts.json scripts/seed-v3-rewards.ts
// Or: npx tsx scripts/seed-v3-rewards.ts

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');
  initializeApp({
    credential: cert(serviceAccountPath),
  });
}

const db = getFirestore();

const defaultRewards = [
  // Milestone rewards
  {
    name: '100K Views Reward',
    description: '$10 store credit for hitting 100K views on a single video',
    category: 'milestone',
    milestoneTier: '100k',
    storeCreditValue: 10,
    isActive: true,
    createdAt: Timestamp.now(),
  },
  {
    name: '500K Views Reward',
    description: '$25 cash + free product for hitting 500K views on a single video',
    category: 'milestone',
    milestoneTier: '500k',
    cashValue: 25,
    productName: 'Free Product of Choice',
    isActive: true,
    createdAt: Timestamp.now(),
  },
  {
    name: '1M Views Reward',
    description: '$50 cash + exclusive merch for hitting 1M views on a single video',
    category: 'milestone',
    milestoneTier: '1m',
    cashValue: 50,
    productName: 'Exclusive Merch Pack',
    isActive: true,
    createdAt: Timestamp.now(),
  },
  // Volume leaderboard rewards
  {
    name: 'Weekly Volume Champion',
    description: 'Top poster of the week wins $25 cash',
    category: 'volume_leaderboard',
    leaderboardRank: 1,
    cashValue: 25,
    isActive: true,
    createdAt: Timestamp.now(),
  },
  {
    name: 'Weekly Volume Runner-Up',
    description: '2nd place poster wins $15 cash',
    category: 'volume_leaderboard',
    leaderboardRank: 2,
    cashValue: 15,
    isActive: true,
    createdAt: Timestamp.now(),
  },
  {
    name: 'Weekly Volume Third Place',
    description: '3rd place poster wins $10 cash',
    category: 'volume_leaderboard',
    leaderboardRank: 3,
    cashValue: 10,
    isActive: true,
    createdAt: Timestamp.now(),
  },
];

async function seedRewards() {
  console.log('🌱 Starting rewards seed...');
  
  const batch = db.batch();
  
  for (const reward of defaultRewards) {
    const docRef = db.collection('rewards').doc();
    batch.set(docRef, reward);
    console.log(`  📦 Queued: ${reward.name}`);
  }
  
  await batch.commit();
  console.log(`\n✅ Successfully seeded ${defaultRewards.length} rewards!`);
}

seedRewards()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });

