import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Team from '@/models/Team';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    await connectDB();

    if (id) {
      // Fetch single team
      const team = await Team.findById(id);
      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      return NextResponse.json(team);
    } else {
      // Fetch all teams
      const teams = await Team.find().sort({ createdAt: -1 });
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
    const team = await Team.create({
      name: body.name,
      members: body.members || [], // Use provided members or empty array
      createdAt: new Date()
    });
    console.log('Created team:', team);
    return NextResponse.json(team, { status: 201 });
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const body = await request.json();
    console.log('Received update data:', body);

    await connectDB();
    const team = await Team.findById(id);
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    console.log(body.members);

    // Update team fields
    if (body.members !== undefined) {
      // Ensure members is an array of objects
      if (Array.isArray(body.members)) {
        team.members = body.members.map((member: {
          name: string;
          isCaptain: boolean;
          handicap: number;
          tee: 'W' | 'Y' | 'B' | 'R';
          gender: 'Male' | 'Female';
        }) => ({
          name: member.name,
          isCaptain: member.isCaptain || false,
          handicap: Number(member.handicap),
          tee: member.tee,
          gender: member.gender
        }));
      }
    }

    await team.save();
    return NextResponse.json(team);
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ 
      error: 'Failed to update team',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 