import mongoose from 'mongoose';

// Team member schema - references Player collection
const teamMemberSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: [true, 'Player ID is required']
  },
  isCaptain: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true
  },
  members: {
    type: [teamMemberSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enable getters
teamSchema.set('toJSON', { getters: true });
teamSchema.set('toObject', { getters: true });

// Delete cached model if it exists to ensure schema updates are applied
if (mongoose.models.Team) {
  delete mongoose.models.Team;
}

export default mongoose.model('Team', teamSchema); 