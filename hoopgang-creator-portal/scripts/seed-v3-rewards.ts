// scripts/seed-v3-rewards.ts
// Run with: npx ts-node scripts/seed-v3-rewards.ts

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin (you'll need service account)
// Update path to service account file as needed
const app = initializeApp({
  credential: cert('../firebase-service-account.json'),
});
const db = getFirestore(app);

const defaultRewards = [
  // Milestone rewards
  {
    name: '100K Views Reward',
    description: '$10 store credit for hitting 100K views',
    category: 'milestone',
    milestoneTier: '100k',
    storeCreditValue: 10,
    isActive: true,
    createdAt: Timestamp.now(),
  },
  {
    name: '500K Views Reward',
    description: '$25 cash + free product for hitting 500K views',
    category: 'milestone',
    milestoneTier: '500k',
    cashValue: 25,
    productName: 'Free Product of Choice',
    isActive: true,
    createdAt: Timestamp.now(),
  },
  {
    name: '1M Views Reward',
    description: '$50 cash + exclusive merch for hitting 1M views',
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
    description: 'Top poster of the week gets $25',
    category: 'volume_leaderboard',
    leaderboardRank: 1,
    cashValue: 25,
    isActive: true,
    createdAt: Timestamp.now(),
  },
  {
    name: 'Weekly Volume Runner-Up',
    description: '2nd place poster gets $15',
    category: 'volume_leaderboard',
    leaderboardRank: 2,
    cashValue: 15,
    isActive: true,
    createdAt: Timestamp.now(),
  },
  {
    name: 'Weekly Volume Third Place',
    description: '3rd place poster gets $10',
    category: 'volume_leaderboard',
    leaderboardRank: 3,
    cashValue: 10,
    isActive: true,
    createdAt: Timestamp.now(),
  },
];

async function seedRewards() {
  const batch = db.batch();
  
  for (const reward of defaultRewards) {
    const docRef = db.collection('rewards').doc();
    batch.set(docRef, reward);
  }
  
  await batch.commit();
  console.log(`✅ Seeded ${defaultRewards.length} rewards`);
}

seedRewards().then(() => process.exit(0));

