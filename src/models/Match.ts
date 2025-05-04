import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required']
  },
  teamName: {
    type: String,
    required: [true, 'Team name is required']
  },
  score: {
    type: Number,
    default: 0
  }
}, { _id: false });

const matchSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required']
  },
  player1: {
    type: playerSchema,
    required: [true, 'Player 1 is required']
  },
  player2: {
    type: playerSchema,
    required: [true, 'Player 2 is required']
  },
  date: {
    type: Date,
    default: Date.now
  },
  teeTime: {
    type: Date,
    default: Date.now
  },
  tee: {
    type: Number,
    default: 1,
    min: [1, 'Tee number must be at least 1']
  },
  completed: {
    type: Boolean,
    default: false
  }
});

// Ensure virtual properties are included when converting to JSON
matchSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    return ret;
  }
});

export default mongoose.models.Match || mongoose.model('Match', matchSchema); 