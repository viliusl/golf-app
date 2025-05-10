import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }

    const result = await mongoose.connection.db.collection('tournaments').deleteOne({
      _id: new ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json(
      { error: 'Failed to delete tournament' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }

    const tournament = await request.json();

    // Validate required fields
    if (!tournament.name) {
      return NextResponse.json(
        { error: 'Tournament name is required' },
        { status: 400 }
      );
    }

    const result = await mongoose.connection.db.collection('tournaments').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { name: tournament.name, eventIds: tournament.eventIds } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Fetch the updated document
    const updatedTournament = await mongoose.connection.db.collection('tournaments').findOne({
      _id: new ObjectId(params.id)
    });

    return NextResponse.json(updatedTournament);
  } catch (error) {
    console.error('Error updating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to update tournament' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }

    const tournament = await mongoose.connection.db.collection('tournaments').findOne({
      _id: new ObjectId(params.id),
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament' },
      { status: 500 }
    );
  }
} 