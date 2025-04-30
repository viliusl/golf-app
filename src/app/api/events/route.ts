import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import Team from '@/models/Team';

interface TeamData {
  _id: string;
  name: string;
  members: {
    name: string;
    isCaptain: boolean;
    handicap: number;
    tee: string;
    gender: string;
  }[];
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Fetch single event
      const eventData = await Event.findById(id);

      if (!eventData) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      return NextResponse.json(eventData);
    }

    // Fetch all events
    const events = await Event.find({}).sort({ date: 1 });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    // Log to debug
    console.log('POST /api/events - Request received');
    console.log('Event ID:', id);
    
    const body = await request.json();
    console.log('Request body:', body);
    const { teamId } = body;

    if (!id) {
      console.log('Error: Event ID is required');
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    if (!teamId) {
      console.log('Error: Team ID is required');
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching event with ID:', id);
    const event = await Event.findById(id);
    if (!event) {
      console.log('Error: Event not found');
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    console.log('Found event:', event);

    console.log('Fetching team with ID:', teamId);
    const teamData = await Team.findById(teamId);
    if (!teamData) {
      console.log('Error: Team not found');
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    console.log('Found team:', teamData);

    // Initialize teams array if it doesn't exist
    if (!event.teams) {
      console.log('Initializing teams array');
      event.teams = [];
    }

    // Check if team is already in the event
    const teamExists = event.teams.some((team: any) => team._id === teamId);
    if (teamExists) {
      console.log('Error: Team is already in the event');
      return NextResponse.json(
        { error: 'Team is already in the event' },
        { status: 400 }
      );
    }

    // Add the team to the event
    const newTeam = {
      _id: teamData._id.toString(),
      name: teamData.name,
      members: teamData.members
    };
    console.log('Adding team to event:', newTeam);
    event.teams.push(newTeam);

    console.log('Saving event');
    await event.save();
    console.log('Event saved successfully');
    console.log('After save:', event);

    // Return the event with teams included
    const eventWithTeams = await Event.findById(id);
    console.log('Event to return:', JSON.stringify(eventWithTeams));
    
    return NextResponse.json(eventWithTeams);
  } catch (error) {
    console.error('Error adding team to event:', error);
    return NextResponse.json(
      { error: 'Failed to add team to event', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { name, date, teams, teamId, memberIndex } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (name) event.name = name;
    if (date) event.date = date;
    
    // Handle removing a member from a team
    if (teamId !== undefined && memberIndex !== undefined) {
      // Find the team in the event
      const teamIndex = event.teams.findIndex((team: any) => team._id === teamId);
      
      if (teamIndex === -1) {
        return NextResponse.json(
          { error: 'Team not found in this event' },
          { status: 404 }
        );
      }
      
      // Check if member index is valid
      if (memberIndex < 0 || memberIndex >= event.teams[teamIndex].members.length) {
        return NextResponse.json(
          { error: 'Invalid member index' },
          { status: 400 }
        );
      }
      
      // Remove the member from the team
      event.teams[teamIndex].members.splice(memberIndex, 1);
      console.log('Removed member at index', memberIndex, 'from team', teamId);
    } 
    // Handle team operations (add/remove teams)
    else if (teams) {
      // Initialize teams array if it doesn't exist
      if (!event.teams) {
        event.teams = [];
      }

      // When adding a team, fetch its full data first
      if (teams.length > event.teams.length) {
        const newTeamId = teams[teams.length - 1];
        const teamData = await Team.findById(newTeamId);
        if (teamData) {
          const newTeam = {
            _id: teamData._id.toString(),
            name: teamData.name,
            members: teamData.members
          };
          event.teams.push(newTeam);
          console.log('Adding team:', newTeam); // Debug log
        }
      } else {
        // When removing a team, just filter the array
        event.teams = event.teams.filter((team: TeamData) => teams.includes(team._id));
      }
    }

    await event.save();
    console.log('Saved event:', event); // Debug log

    // Fetch the updated event to ensure we have the latest data
    const updatedEvent = await Event.findById(id);
    if (!updatedEvent) {
      return NextResponse.json(
        { error: 'Event not found after update' },
        { status: 404 }
      );
    }

    console.log('Updated event to return:', updatedEvent); // Debug log
    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const event = await Event.findByIdAndDelete(id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 