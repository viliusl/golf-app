import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Player from '@/models/Player';
import Event from '@/models/Event';

export interface Player {
  _id: string;
  name: string;
  handicap: number;
  gender: 'Male' | 'Female';
  createdAt: string;
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      // Fetch a specific player
      const player = await Player.findById(id);
      
      if (!player) {
        return NextResponse.json(
          { error: 'Player not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(player);
    }
    
    // Fetch all free players from the Player collection
    const players = await Player.find().sort({ name: 1 });
    
    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name || body.handicap === undefined || !body.gender) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Create a new player
    const player = await Player.create({
      name: body.name,
      handicap: body.handicap,
      gender: body.gender,
      createdAt: new Date()
    });
    
    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error('Error creating player:', error);
    return NextResponse.json(
      { error: 'Failed to create player', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Build update object with only provided fields
    const updateData: Partial<{ name: string; handicap: number; gender: string }> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.handicap !== undefined) updateData.handicap = body.handicap;
    if (body.gender !== undefined) updateData.gender = body.gender;
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Update the player
    const updatedPlayer = await Player.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedPlayer) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    // If handicap was updated, also update future events
    if (updateData.handicap !== undefined) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      await Event.updateMany(
        {
          date: { $gte: today },
          'teams.members.playerId': id
        },
        {
          $set: { 'teams.$[].members.$[member].handicap': updateData.handicap }
        },
        {
          arrayFilters: [{ 'member.playerId': id }]
        }
      );
    }
    
    return NextResponse.json(updatedPlayer);
  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json(
      { error: 'Failed to update player', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Delete the player
    const result = await Player.findByIdAndDelete(id);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Error deleting player:', error);
    return NextResponse.json(
      { error: 'Failed to delete player', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 