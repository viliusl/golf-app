import mongoose from 'mongoose';

// Course snapshot schemas (embedded copy of course data)
const HoleSnapshotSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true,
    min: 1
  },
  handicap: {
    type: Number,
    required: true,
    min: 1,
    max: 18
  },
  par: {
    type: Number,
    required: true,
    min: 3,
    max: 6
  }
}, { _id: false });

const TeeSnapshotSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  cr: {
    type: Number
  },
  slope: {
    type: Number
  }
}, { _id: false });

const CourseSnapshotSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  holes: {
    type: [HoleSnapshotSchema],
    default: []
  },
  menTees: {
    type: [TeeSnapshotSchema],
    default: []
  },
  womenTees: {
    type: [TeeSnapshotSchema],
    default: []
  }
}, { _id: false });

const TeamMemberSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true
  },
  isCaptain: {
    type: Boolean,
    default: false
  },
  handicap: {
    type: Number,
    default: 0
  },
  tee: {
    type: String,
    trim: true
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
  course: {
    type: CourseSnapshotSchema,
    required: [true, 'Course is required']
  },
  handicapAllowance: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 100
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

// Delete cached model if it exists to ensure schema updates are applied
if (mongoose.models.Event) {
  delete mongoose.models.Event;
}

const Event = mongoose.model('Event', eventSchema);

export default Event; 