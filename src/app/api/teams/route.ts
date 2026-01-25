import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Team from '@/models/Team';
import Player from '@/models/Player';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    await connectDB();
    
    // Ensure Player model is registered for populate to work
    // This is needed because the model must be registered before populate
    Player.modelName;

    if (id) {
      // Fetch single team with populated player data
      const team = await Team.findById(id).populate('members.playerId');
      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      return NextResponse.json(team);
    } else {
      // Fetch all teams with populated player data
      const teams = await Team.find().populate('members.playerId').sort({ createdAt: -1 });
      return NextResponse.json(teams);
    }
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received team data:', body);
    
    if (!body.name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    await connectDB();

    // Validate that all player IDs exist if members are provided
    if (body.members && body.members.length > 0) {
      const playerIds = body.members.map((m: { playerId: string }) => m.playerId);
      const validPlayerIds = playerIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id));
      
      if (validPlayerIds.length !== playerIds.length) {
        return NextResponse.json({ error: 'Invalid player ID format' }, { status: 400 });
      }

      const existingPlayers = await Player.find({ _id: { $in: validPlayerIds } });
      if (existingPlayers.length !== validPlayerIds.length) {
        return NextResponse.json({ error: 'One or more players not found' }, { status: 400 });
      }
    }

    const team = await Team.create({
      name: body.name,
      members: body.members || [],
      createdAt: new Date()
    });

    // Return team with populated player data
    const populatedTeam = await Team.findById(team._id).populate('members.playerId');
    console.log('Created team:', populatedTeam);
    return NextResponse.json(populatedTeam, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ 
      error: 'Failed to create team',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    await connectDB();
    const result = await Team.findByIdAndDelete(id);
    
    if (!result) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ 
      error: 'Failed to delete team',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    const { members, name } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Update team name if provided
    if (name) {
      team.name = name;
    }

    // Update members if provided
    if (members) {
      // Validate that all player IDs exist
      const playerIds = members.map((m: { playerId: string }) => m.playerId);
      const validPlayerIds = playerIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id));
      
      if (validPlayerIds.length !== playerIds.length) {
        return NextResponse.json({ error: 'Invalid player ID format' }, { status: 400 });
      }

      const existingPlayers = await Player.find({ _id: { $in: validPlayerIds } });
      if (existingPlayers.length !== validPlayerIds.length) {
        return NextResponse.json({ error: 'One or more players not found' }, { status: 400 });
      }

      team.members = members;
    }

    await team.save();

    // Return team with populated player data
    const populatedTeam = await Team.findById(id).populate('members.playerId');
    return NextResponse.json(populatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'Failed to update team', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
