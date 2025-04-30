import mongoose from 'mongoose';

interface TeamMember {
  name: string;
  isCaptain: boolean;
  handicap: number;
  tee: 'W' | 'Y' | 'B' | 'R';
  gender: 'Male' | 'Female';
}

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true
  },
  members: {
    type: [{
      name: {
        type: String,
        required: [true, 'Member name is required']
      },
      isCaptain: {
        type: Boolean,
        default: false
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
      }
    }],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Team || mongoose.model('Team', teamSchema); 