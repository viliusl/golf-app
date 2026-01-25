/**
 * Migration Script: Add Handicap Snapshots to Event Team Members
 * 
 * This script migrates existing event data to include handicap snapshots for each
 * team member. Previously, handicaps were only stored in the global Player collection.
 * Now, each event stores a snapshot of the player's handicap at the time of the event.
 * 
 * What it does:
 * 1. For each event team member that doesn't have a handicap set:
 *    - Look up the player's current handicap from the Player collection
 *    - Store it as member.handicap in the event
 * 
 * This ensures:
 * - Historical event data preserves the handicap used at that time
 * - Future handicap changes to global players don't affect past events
 * - Playing handicap calculations work correctly for all events
 * 
 * Usage:
 *   node scripts/migrate-event-handicap-snapshots.js
 * 
 * Options:
 *   --dry-run    Preview changes without modifying database
 * 
 * Environment:
 *   Requires MONGODB_URI to be set (via .env or .env.local)
 */

const mongoose = require('mongoose');
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DRY_RUN = process.argv.includes('--dry-run');

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is required');
  process.exit(1);
}

async function migrate() {
  console.log('='.repeat(60));
  console.log('Migration: Add Handicap Snapshots to Event Team Members');
  console.log('='.repeat(60));
  
  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***\n');
  }
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('\nConnected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Get all players for handicap lookup
    const players = await db.collection('players').find({}).toArray();
    const playersById = new Map();
    players.forEach(p => {
      playersById.set(p._id.toString(), p);
    });
    console.log(`Loaded ${players.length} players for handicap lookup\n`);

    // Get all events
    const events = await db.collection('events').find({}).toArray();
    console.log(`Found ${events.length} events to process\n`);

    let eventsUpdated = 0;
    let membersUpdated = 0;
    let membersSkipped = 0;
    let membersNotFound = 0;

    for (const event of events) {
      console.log(`\nProcessing: "${event.name}" (${new Date(event.date).toLocaleDateString()})`);
      
      if (!event.teams || event.teams.length === 0) {
        console.log('  No teams, skipping');
        continue;
      }

      let eventNeedsUpdate = false;
      const updatedTeams = [];

      for (const team of event.teams) {
        const updatedMembers = [];
        
        for (const member of team.members || []) {
          // Check if handicap is already set
          if (member.handicap !== undefined && member.handicap !== null) {
            console.log(`  ✓ ${member.playerId}: Already has handicap (${member.handicap})`);
            updatedMembers.push(member);
            membersSkipped++;
            continue;
          }

          // Look up player's current handicap
          const player = playersById.get(member.playerId);
          
          if (!player) {
            console.log(`  ⚠ ${member.playerId}: Player not found in database`);
            updatedMembers.push(member);
            membersNotFound++;
            continue;
          }

          const handicap = player.handicap || 0;
          console.log(`  → ${player.name}: Setting handicap to ${handicap}`);
          
          updatedMembers.push({
            ...member,
            handicap: handicap
          });
          eventNeedsUpdate = true;
          membersUpdated++;
        }

        updatedTeams.push({
          ...team,
          members: updatedMembers
        });
      }

      if (eventNeedsUpdate) {
        if (!DRY_RUN) {
          await db.collection('events').updateOne(
            { _id: event._id },
            { $set: { teams: updatedTeams } }
          );
        }
        eventsUpdated++;
        console.log(`  ${DRY_RUN ? '[DRY RUN] Would update' : 'Updated'} event`);
      } else {
        console.log('  No updates needed');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`  Events processed: ${events.length}`);
    console.log(`  Events updated: ${eventsUpdated}`);
    console.log(`  Members updated: ${membersUpdated}`);
    console.log(`  Members already had handicap: ${membersSkipped}`);
    console.log(`  Members with missing player: ${membersNotFound}`);
    
    if (DRY_RUN) {
      console.log('\n*** DRY RUN - No changes were made ***');
      console.log('Run without --dry-run to apply changes');
    } else {
      console.log('\n✓ Migration complete!');
    }

  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run migration
migrate();
