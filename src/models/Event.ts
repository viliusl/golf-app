import mongoose from 'mongoose';

const TeamMemberSchema = new mongoose.Schema({
  playerType: {
    type: String,
    enum: ['free', 'team_member'],
    required: true
  },
  playerId: {
    type: String,
    required: true
  }
}, { _id: false });

const TeamSchema = new mongoose.Schema({
  _id: String,
  name: String,
  members: [TeamMemberSchema]
}, { _id: false });

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Event date is required']
  },
  teams: {
    type: [TeamSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure virtual properties are included when converting to JSON
eventSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    return ret;
  }
});

// Use this pattern to avoid model recompilation errors
const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);

export default Event; 