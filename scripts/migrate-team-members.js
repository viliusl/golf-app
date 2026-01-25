/**
 * Migration Script: Convert Team Members to Player References
 * 
 * This script migrates existing team member data from the old embedded format
 * to the new reference-based format where all players are stored in the Player collection.
 * 
 * What it does:
 * 1. For each team member with embedded data (name, handicap, gender):
 *    - Check if a Player with the same name already exists
 *    - If exists, link to that Player
 *    - If not, create a new Player from the embedded data
 * 2. Update the team to use the new reference format (playerId, isCaptain)
 * 
 * Usage:
 *   node scripts/migrate-team-members.js
 * 
 * Environment:
 *   Requires MONGODB_URI to be set (via .env or environment variable)
 */

const mongoose = require('mongoose');
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is required');
  process.exit(1);
}

// Define schemas for direct database access
const playerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  handicap: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  createdAt: { type: Date, default: Date.now }
});

const oldTeamMemberSchema = new mongoose.Schema({
  _id: String,
  name: String,
  isCaptain: { type: Boolean, default: false },
  handicap: Number,
  gender: { type: String, enum: ['Male', 'Female'] }
}, { _id: false });

const oldTeamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  members: [oldTeamMemberSchema],
  createdAt: { type: Date, default: Date.now }
});

async function migrate() {
  console.log('Starting migration...\n');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get models
    const Player = mongoose.model('Player', playerSchema);
    const OldTeam = mongoose.model('Team', oldTeamSchema);

    // Fetch all teams
    const teams = await OldTeam.find({});
    console.log(`Found ${teams.length} teams to process\n`);

    let playersCreated = 0;
    let playersLinked = 0;
    let teamsUpdated = 0;

    for (const team of teams) {
      console.log(`Processing team: ${team.name}`);
      
      if (!team.members || team.members.length === 0) {
        console.log('  No members to migrate\n');
        continue;
      }

      const newMembers = [];
      let teamNeedsMigration = false;

      for (const member of team.members) {
        // Check if this is already in the new format (has playerId as ObjectId)
        if (member.playerId && mongoose.Types.ObjectId.isValid(member.playerId)) {
          console.log(`  Member already migrated: ${member.playerId}`);
          newMembers.push({
            playerId: member.playerId,
            isCaptain: member.isCaptain || false
          });
          continue;
        }

        // Old format - has name, handicap, gender embedded
        if (!member.name) {
          console.log(`  Skipping member without name`);
          continue;
        }

        teamNeedsMigration = true;

        // Check if a player with this name already exists
        let existingPlayer = await Player.findOne({ name: member.name });

        if (existingPlayer) {
          console.log(`  Linking existing player: ${member.name} -> ${existingPlayer._id}`);
          playersLinked++;
        } else {
          // Create new player
          existingPlayer = await Player.create({
            name: member.name,
            handicap: member.handicap || 0,
            gender: member.gender || 'Male',
            createdAt: new Date()
          });
          console.log(`  Created new player: ${member.name} -> ${existingPlayer._id}`);
          playersCreated++;
        }

        newMembers.push({
          playerId: existingPlayer._id,
          isCaptain: member.isCaptain || false
        });
      }

      if (teamNeedsMigration && newMembers.length > 0) {
        // Update team with new member format using raw MongoDB update
        // to bypass mongoose schema validation
        await mongoose.connection.db.collection('teams').updateOne(
          { _id: team._id },
          { $set: { members: newMembers } }
        );
        teamsUpdated++;
        console.log(`  Team updated with ${newMembers.length} members\n`);
      } else {
        console.log('  No migration needed\n');
      }
    }

    console.log('Migration complete!');
    console.log(`  Players created: ${playersCreated}`);
    console.log(`  Players linked: ${playersLinked}`);
    console.log(`  Teams updated: ${teamsUpdated}`);

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
