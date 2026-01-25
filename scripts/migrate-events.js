/**
 * Migration Script: Update Event Team Members to New Format
 * 
 * This script migrates existing event team member data from the old format
 * (with playerType: 'free' | 'team_member') to the new format where all
 * players are referenced directly by their Player collection ID.
 * 
 * Usage:
 *   node scripts/migrate-events.js
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
  console.log('Starting event migration...\n');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Get all players for lookup by name
    const players = await db.collection('players').find({}).toArray();
    const playersByName = {};
    players.forEach(p => {
      playersByName[p.name] = p;
    });
    console.log(`Loaded ${players.length} players for matching\n`);

    // Get all events
    const events = await db.collection('events').find({}).toArray();
    console.log(`Found ${events.length} events to process\n`);

    let eventsUpdated = 0;
    let membersUpdated = 0;

    for (const event of events) {
      if (!event.teams || event.teams.length === 0) {
        console.log(`Event "${event.name}": No teams, skipping`);
        continue;
      }

      let eventNeedsUpdate = false;
      const updatedTeams = [];

      for (const team of event.teams) {
        const updatedMembers = [];
        
        for (const member of team.members || []) {
          // Check if already in new format (no playerType)
          if (!member.playerType && member.playerId && !member.name) {
            // Already new format
            updatedMembers.push(member);
            continue;
          }

          // Check if this is embedded player data (has name directly)
          if (member.name && !member.playerType) {
            // Embedded player data - find matching player by name
            const player = playersByName[member.name];
            if (player) {
              updatedMembers.push({
                playerId: player._id.toString(),
                isCaptain: member.isCaptain || false,
                tee: member.tee
              });
              eventNeedsUpdate = true;
              membersUpdated++;
              console.log(`  Matched embedded "${member.name}" -> ${player._id}`);
            } else {
              console.log(`  WARNING: No player found for embedded "${member.name}"`);
              // Keep original if we can't match
              updatedMembers.push(member);
            }
            continue;
          }

          // Old format with playerType
          if (member.playerType === 'free') {
            // Free player - playerId should already point to Player collection
            // Verify it exists
            const player = players.find(p => p._id.toString() === member.playerId);
            if (player) {
              updatedMembers.push({
                playerId: member.playerId,
                isCaptain: member.isCaptain || false,
                tee: member.tee
              });
              eventNeedsUpdate = true;
              membersUpdated++;
              console.log(`  Converted free player "${player.name}"`);
            } else {
              console.log(`  WARNING: Free player ${member.playerId} not found, skipping`);
            }
          } else if (member.playerType === 'team_member') {
            // Team member - need to find the corresponding Player
            // The old playerId was the team member's _id, not a Player _id
            // We need to look up by the team's current members
            
            // Try to find the player by looking at the current team data
            const currentTeam = await db.collection('teams').findOne({ _id: new mongoose.Types.ObjectId(team._id) });
            if (currentTeam && currentTeam.members) {
              // Look for a member with matching playerId (ObjectId)
              const teamMember = currentTeam.members.find(m => 
                m.playerId && m.playerId.toString() === member.playerId
              );
              
              if (teamMember) {
                // Found in new team format - use the playerId
                updatedMembers.push({
                  playerId: teamMember.playerId.toString(),
                  isCaptain: member.isCaptain || teamMember.isCaptain || false,
                  tee: member.tee
                });
                eventNeedsUpdate = true;
                membersUpdated++;
                console.log(`  Converted team member ${member.playerId} -> ${teamMember.playerId}`);
              } else {
                console.log(`  WARNING: Team member ${member.playerId} not found in current team, skipping`);
              }
            } else {
              console.log(`  WARNING: Team ${team._id} not found or has no members`);
            }
          }
        }

        updatedTeams.push({
          _id: team._id,
          name: team.name,
          members: updatedMembers
        });
      }

      if (eventNeedsUpdate) {
        await db.collection('events').updateOne(
          { _id: event._id },
          { $set: { teams: updatedTeams } }
        );
        eventsUpdated++;
        console.log(`Updated event "${event.name}" with ${updatedTeams.reduce((sum, t) => sum + t.members.length, 0)} members\n`);
      } else {
        console.log(`Event "${event.name}": Already up to date\n`);
      }
    }

    console.log('Migration complete!');
    console.log(`  Events updated: ${eventsUpdated}`);
    console.log(`  Members migrated: ${membersUpdated}`);

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
