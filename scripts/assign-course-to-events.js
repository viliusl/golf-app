// Script to assign a course to all existing events
// Run with: node scripts/assign-course-to-events.js

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const COURSE_ID = '696cfdba1ec0cb79699e62bc';

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set');
  console.error('Make sure .env.local exists with MONGODB_URI or pass it as: MONGODB_URI=... node scripts/assign-course-to-events.js');
  process.exit(1);
}

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the course data
    const course = await mongoose.connection.db.collection('courses').findOne({
      _id: new mongoose.Types.ObjectId(COURSE_ID)
    });

    if (!course) {
      console.error(`Course with ID ${COURSE_ID} not found`);
      process.exit(1);
    }

    console.log(`Found course: ${course.name}`);

    // Create course snapshot
    const courseSnapshot = {
      _id: course._id.toString(),
      name: course.name,
      address: course.address,
      holes: course.holes || [],
      menTees: course.menTees || [],
      womenTees: course.womenTees || []
    };

    // Update all events that don't have a course
    const result = await mongoose.connection.db.collection('events').updateMany(
      { course: { $exists: false } },
      { $set: { course: courseSnapshot, handicapAllowance: 100 } }
    );

    console.log(`Updated ${result.modifiedCount} events with course "${course.name}"`);

    // Also update events that have null course
    const result2 = await mongoose.connection.db.collection('events').updateMany(
      { course: null },
      { $set: { course: courseSnapshot, handicapAllowance: 100 } }
    );

    console.log(`Updated ${result2.modifiedCount} additional events with null course`);

    // Set handicapAllowance for events that don't have it
    const result3 = await mongoose.connection.db.collection('events').updateMany(
      { handicapAllowance: { $exists: false } },
      { $set: { handicapAllowance: 100 } }
    );

    console.log(`Updated ${result3.modifiedCount} events with default handicapAllowance`);

    console.log('Migration complete!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();
