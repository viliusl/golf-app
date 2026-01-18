import mongoose from 'mongoose';

const holeSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: [true, 'Hole number is required'],
    min: 1
  },
  handicap: {
    type: Number,
    required: [true, 'Hole handicap is required'],
    min: 1,
    max: 18
  },
  par: {
    type: Number,
    required: [true, 'Hole par is required'],
    min: 3,
    max: 6
  }
}, { _id: false });

const teeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tee name is required'],
    trim: true
  },
  cr: {
    type: Number,
    required: [true, 'Course Rating is required'],
    get: (v: number) => v === undefined ? 0 : Number(v.toFixed(1)),
    set: (v: number) => v === undefined ? 0 : Number(v.toFixed(1))
  },
  slope: {
    type: Number,
    required: [true, 'Slope is required'],
    min: 55,
    max: 155,
    get: (v: number) => v === undefined ? 0 : Number(v.toFixed(1)),
    set: (v: number) => v === undefined ? 0 : Number(v.toFixed(1))
  }
}, { _id: false });

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Course address is required'],
    trim: true
  },
  holes: {
    type: [holeSchema],
    default: []
  },
  menTees: {
    type: [teeSchema],
    default: []
  },
  womenTees: {
    type: [teeSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enable getters
courseSchema.set('toJSON', { getters: true });
courseSchema.set('toObject', { getters: true });

// Use the correct pattern to handle models in Next.js
export default mongoose.models.Course || mongoose.model('Course', courseSchema);
