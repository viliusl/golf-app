import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    const tournaments = await mongoose.connection.db.collection('tournaments').find({}).toArray();
    return NextResponse.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const tournament = await request.json();

    // Validate required fields
    if (!tournament.name) {
      return NextResponse.json(
        { error: 'Tournament name is required' },
        { status: 400 }
      );
    }

    // Add created timestamp
    const tournamentWithTimestamp = {
      ...tournament,
      createdAt: new Date(),
    };

    const result = await mongoose.connection.db.collection('tournaments').insertOne(tournamentWithTimestamp);
    
    return NextResponse.json({
      ...tournamentWithTimestamp,
      _id: result.insertedId,
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    );
  }
} 