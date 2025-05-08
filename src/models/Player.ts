import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true
  },
  handicap: {
    type: Number,
    required: [true, 'Handicap is required'],
    get: (v: number) => v === undefined ? 0 : Number(v.toFixed(1)),
    set: (v: number) => v === undefined ? 0 : Number(v.toFixed(1))
  },
  player_handicap: {
    type: Number,
    required: [true, 'Player handicap is required'],
    get: (v: number) => v === undefined ? 0 : Number(v.toFixed(1)),
    set: (v: number) => v === undefined ? 0 : Number(v.toFixed(1))
  },
  tee: {
    type: String,
    enum: ['W', 'Y', 'B', 'R'],
    required: [true, 'Tee selection is required']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: [true, 'Gender is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enable getters
playerSchema.set('toJSON', { getters: true });
playerSchema.set('toObject', { getters: true });

// Use the correct pattern to handle models in Next.js
export default mongoose.models.Player || mongoose.model('Player', playerSchema); 