// scripts/migrate-to-collaborations.ts

/**
 * Migration script to move from single-collaboration-per-creator to multi-collaboration model
 * 
 * Migration steps:
 * 1. For each creator document:
 *    a. Extract collaboration fields
 *    b. Create collaborations/{id} subcollection doc
 *    c. Update creator doc (remove collab fields, add V2 fields)
 * 
 * 2. Rollback plan: Keep original fields for 30 days
 * 
 * Usage:
 *   npx tsx scripts/migrate-to-collaborations.ts
 *   or
 *   ts-node scripts/migrate-to-collaborations.ts
 */

import { initializeApp, cert, ServiceAccount, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CreatorStatus } from '../src/types';

// Initialize Firebase Admin
function getServiceAccount(): ServiceAccount {
  // Option 1: Base64 encoded service account (recommended for Vercel)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
    return JSON.parse(decoded) as ServiceAccount;
  }

  // Option 2: Individual environment variables (fallback)
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  } as ServiceAccount;
}

const adminApp = getApps().length === 0
  ? initializeApp({
      credential: cert(getServiceAccount()),
    })
  : getApps()[0];

const db = getFirestore(adminApp);
const CREATORS_COLLECTION = 'creators';

/**
 * Converts Firestore Timestamp to JavaScript Date
 */
function convertTimestamp(timestamp: Timestamp | Date | undefined): Date | undefined {
  if (!timestamp) return undefined;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return undefined;
}

/**
 * Migrates a single creator document
 */
async function migrateCreator(creatorDoc: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = creatorDoc.data();
  const creatorId = creatorDoc.id;
  
  console.log(`Migrating creator: ${creatorId} (${data.creatorId || 'no display ID'})`);
  
  // Skip if already migrated
  if (data._migratedAt) {
    console.log(`  ⏭️  Already migrated, skipping...`);
    return;
  }
  
  // Extract collab fields
  const collabData: Record<string, unknown> = {
    creatorId: creatorId,
    collabNumber: 1,
    collabDisplayId: `${data.creatorId || creatorId}-01`,
    product: data.product || '',
    size: data.size || 'M',
    status: data.status || 'pending',
    statusHistory: data.statusHistory || [],
    contentSubmissions: data.contentSubmissions || [],
    createdAt: data.createdAt || Timestamp.now(),
    updatedAt: data.updatedAt || Timestamp.now(),
  };
  
  // Add optional fields if they exist
  if (data.trackingNumber) collabData.trackingNumber = data.trackingNumber;
  if (data.carrier) collabData.carrier = data.carrier;
  if (data.shippedAt) collabData.shippedAt = data.shippedAt;
  if (data.deliveredAt) collabData.deliveredAt = data.deliveredAt;
  if (data.shipment) collabData.shipment = data.shipment;
  if (data.contentDeadline) collabData.contentDeadline = data.contentDeadline;
  if (data.rating !== undefined) collabData.rating = data.rating;
  if (data.internalNotes) collabData.internalNotes = data.internalNotes;
  
  try {
    // Create collab in subcollection
    const collabRef = await db
      .collection(CREATORS_COLLECTION)
      .doc(creatorId)
      .collection('collaborations')
      .add(collabData);
    
    console.log(`  ✅ Created collaboration: ${collabRef.id}`);
    
    // Determine if this is an active collaboration
    const isActive = ['pending', 'approved', 'shipped', 'delivered'].includes(data.status);
    
    // Update creator with V2 fields
    const updateData: Record<string, unknown> = {
      isBlocked: data.status === 'ghosted',
      activeCollaborationId: isActive ? collabRef.id : null,
      totalCollaborations: 1,
      // Keep old fields for rollback (remove after 30 days)
      _migratedAt: Timestamp.now(),
    };
    
    await db.collection(CREATORS_COLLECTION).doc(creatorId).update(updateData);
    
    console.log(`  ✅ Updated creator with V2 fields`);
    console.log(`  📊 Status: ${data.status}, Active: ${isActive ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error(`  ❌ Error migrating creator ${creatorId}:`, error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting migration to collaborations model...\n');
  
  try {
    // Get all creator documents
    const creatorsSnapshot = await db.collection(CREATORS_COLLECTION).get();
    
    if (creatorsSnapshot.empty) {
      console.log('No creators found to migrate.');
      return;
    }
    
    console.log(`Found ${creatorsSnapshot.size} creators to migrate.\n`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ id: string; error: string }> = [];
    
    // Migrate each creator
    for (const creatorDoc of creatorsSnapshot.docs) {
      try {
        await migrateCreator(creatorDoc);
        successCount++;
        console.log(''); // Empty line for readability
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ id: creatorDoc.id, error: errorMessage });
        console.error(`  ❌ Failed to migrate ${creatorDoc.id}: ${errorMessage}\n`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`  ✅ Successfully migrated: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);
    console.log('='.repeat(50));
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(({ id, error }) => {
        console.log(`  - ${id}: ${error}`);
      });
    }
    
    console.log('\n✨ Migration complete!');
    console.log('⚠️  Remember: Original fields are kept for 30 days rollback period.');
    
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run migration when script is executed
// This script should be run explicitly: npm run migrate:collaborations
runMigration()
  .then(() => {
    console.log('\n✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

export { runMigration, migrateCreator };

