import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    
    const tournaments = await mongoose.connection.db.collection('tournaments').find({}).toArray();
    return NextResponse.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournaments', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name || !body.eventIds) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();
    
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    
    // Create a new tournament
    const tournament = await mongoose.connection.db.collection('tournaments').insertOne({
      name: body.name,
      eventIds: body.eventIds,
      createdAt: new Date()
    });
    
    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to create tournament', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 