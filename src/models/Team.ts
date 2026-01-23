import mongoose from 'mongoose';

// Used in type definitions elsewhere
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface TeamMember {
  name: string;
  isCaptain: boolean;
  handicap: number;
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
      _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
      },
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
        required: [true, 'Handicap is required'],
        get: (v: number) => v === undefined ? 0 : Number(v.toFixed(1)),
        set: (v: number) => v === undefined ? 0 : Number(v.toFixed(1))
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

// Enable getters
teamSchema.set('toJSON', { getters: true });
teamSchema.set('toObject', { getters: true });

export default mongoose.models.Team || mongoose.model('Team', teamSchema); 