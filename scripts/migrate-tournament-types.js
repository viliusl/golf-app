/**
 * Migration Script: Add Tournament Types and Link Events to Tournaments
 * 
 * This script:
 * 1. Adds `type: 'Team'` to all existing tournaments that don't have a type
 * 2. Creates a "Legacy" tournament for orphan events
 * 3. Assigns all events without a tournamentId to the Legacy tournament
 * 
 * Usage:
 *   node scripts/migrate-tournament-types.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is required');
  process.exit(1);
}

async function migrate() {
  console.log('Starting tournament types migration...\n');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // 1. Add type to existing tournaments that don't have it
    console.log('Step 1: Adding type to existing tournaments...');
    const tournamentsWithoutType = await db.collection('tournaments')
      .find({ type: { $exists: false } })
      .toArray();
    
    if (tournamentsWithoutType.length > 0) {
      const result = await db.collection('tournaments').updateMany(
        { type: { $exists: false } },
        { $set: { type: 'Team' } }
      );
      console.log(`  Updated ${result.modifiedCount} tournaments with type: 'Team'\n`);
    } else {
      console.log('  No tournaments without type found\n');
    }

    // 2. Find orphan events (no tournamentId)
    console.log('Step 2: Finding orphan events...');
    const orphanEvents = await db.collection('events')
      .find({ tournamentId: { $exists: false } })
      .toArray();
    
    console.log(`  Found ${orphanEvents.length} events without a tournament\n`);

    if (orphanEvents.length > 0) {
      // 3. Create Legacy tournament
      console.log('Step 3: Creating Legacy tournament...');
      const legacyTournament = await db.collection('tournaments').insertOne({
        name: 'Legacy',
        type: 'Team',
        eventIds: orphanEvents.map(e => e._id.toString()),
        createdAt: new Date()
      });
      
      const legacyId = legacyTournament.insertedId.toString();
      console.log(`  Created Legacy tournament with ID: ${legacyId}\n`);

      // 4. Update orphan events with Legacy tournament ID
      console.log('Step 4: Assigning orphan events to Legacy tournament...');
      const updateResult = await db.collection('events').updateMany(
        { tournamentId: { $exists: false } },
        { $set: { tournamentId: legacyId } }
      );
      console.log(`  Updated ${updateResult.modifiedCount} events with tournamentId\n`);

      // List the events that were assigned
      console.log('Events assigned to Legacy tournament:');
      orphanEvents.forEach(event => {
        console.log(`  - ${event.name} (${new Date(event.date).toLocaleDateString()})`);
      });
    } else {
      console.log('Step 3: Skipped - No orphan events to process\n');
    }

    // Summary
    console.log('\n=== Migration Summary ===');
    const totalTournaments = await db.collection('tournaments').countDocuments();
    const totalEvents = await db.collection('events').countDocuments();
    const eventsWithTournament = await db.collection('events').countDocuments({ tournamentId: { $exists: true } });
    
    console.log(`Total tournaments: ${totalTournaments}`);
    console.log(`Total events: ${totalEvents}`);
    console.log(`Events with tournament: ${eventsWithTournament}`);
    console.log(`Events without tournament: ${totalEvents - eventsWithTournament}`);
    
    console.log('\nMigration complete!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run migration
migrate();
