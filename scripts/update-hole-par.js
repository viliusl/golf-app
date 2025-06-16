require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/lib/mongodb');

async function updateHolePar() {
  try {
    await connectDB();
    
    // Get the Match model
    const Match = mongoose.model('Match', new mongoose.Schema({
      holes: [{
        hole: Number,
        handicap: Number,
        par: Number,
        pace: Number,
        player1Score: Number,
        player2Score: Number,
        player1Putt: Boolean,
        player2Putt: Boolean,
        winner: String
      }]
    }));

    // Find all matches that have hole 12
    const matches = await Match.find({ 'holes.hole': 12 });
    console.log(`Found ${matches.length} matches with hole 12`);

    let updatedCount = 0;
    for (const match of matches) {
      const hole12 = match.holes.find(h => h.hole === 12);
      if (hole12 && hole12.par === 5) {
        hole12.par = 4;
        await match.save();
        updatedCount++;
        console.log(`Updated match ${match._id}`);
      }
    }

    console.log(`Successfully updated ${updatedCount} matches`);
  } catch (error) {
    console.error('Error updating matches:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateHolePar(); 