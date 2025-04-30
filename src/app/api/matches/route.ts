import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Match from '@/models/Match';
import Event from '@/models/Event';
import mongoose from 'mongoose';

export interface MatchPlayer {
  name: string;
  teamName: string;
  score: number;
}

export interface Match {
  _id: string;
  eventId: string;
  player1: MatchPlayer;
  player2: MatchPlayer;
  date: string;
  completed: boolean;
}

// GET /api/matches - Get all matches or matches for a specific event
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const eventId = searchParams.get('eventId');
    
    if (id) {
      // Get a specific match by ID
      const match = await Match.findById(id);
      
      if (!match) {
        return NextResponse.json(
          { error: 'Match not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(match);
    }
    
    if (eventId) {
      // Get all matches for a specific event
      const matches = await Match.find({ eventId }).sort({ date: -1 });
      return NextResponse.json(matches);
    }
    
    // Get all matches
    const matches = await Match.find().sort({ date: -1 });
    return NextResponse.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/matches - Create a new match
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { eventId, player1, player2 } = body;
    
    if (!eventId || !player1 || !player2) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate that the event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    const match = await Match.create({
      eventId,
      player1,
      player2,
      date: new Date(),
      completed: false
    });
    
    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    console.error('Error creating match:', error);
    return NextResponse.json(
      { error: 'Failed to create match', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/matches - Update a match
export async function PUT(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { player1, player2, completed } = body;
    
    const updateData: any = {};
    if (player1) updateData.player1 = player1;
    if (player2) updateData.player2 = player2;
    if (completed !== undefined) updateData.completed = completed;
    
    const match = await Match.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(match);
  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { error: 'Failed to update match', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/matches - Delete a match
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }
    
    const match = await Match.findByIdAndDelete(id);
    
    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Match deleted successfully' });
  } catch (error) {
    console.error('Error deleting match:', error);
    return NextResponse.json(
      { error: 'Failed to delete match', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 