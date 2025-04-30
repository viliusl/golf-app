import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Event name is required'],
  },
  date: {
    type: Date,
    required: [true, 'Event date is required'],
  },
});

export default mongoose.models.Event || mongoose.model('Event', eventSchema); 