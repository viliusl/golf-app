import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true
  },
  handicap: {
    type: Number,
    required: [true, 'Handicap is required']
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

// Use the correct pattern to handle models in Next.js
export default mongoose.models.Player || mongoose.model('Player', playerSchema); 