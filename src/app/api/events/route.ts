import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import Team from '@/models/Team';
import { Types } from 'mongoose';

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

interface EventTeam {
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
    const body = await request.json();
    
    // If no ID is provided, we're creating a new event
    if (!id) {
      console.log('Creating new event:', body);
      const { name, date } = body;
      
      if (!name || !date) {
        return NextResponse.json(
          { error: 'Event name and date are required' },
          { status: 400 }
        );
      }
      
      const newEvent = new Event({
        name,
        date,
        teams: []
      });
      
      await newEvent.save();
      console.log('Event created successfully:', newEvent);
      return NextResponse.json(newEvent);
    }
    
    // If an ID is provided, we're adding a team to an existing event
    console.log('POST /api/events - Adding team to event');
    console.log('Event ID:', id);
    console.log('Request body:', body);
    const { teamId } = body;

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
      event.teams = new Types.DocumentArray([]);
    }

    // Check if team is already in the event
    // @ts-expect-error - Mongoose types issue
    const teamExists = event.teams.some((team) => (team as unknown as EventTeam)._id === teamId);
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
    console.error('Error processing event:', error);
    return NextResponse.json(
      { error: 'Failed to process event', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const requestBody = await request.json();
    const { name, date, teams, teamId, memberIndex, displayInScorecard } = requestBody;

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
    if (displayInScorecard !== undefined) event.displayInScorecard = displayInScorecard;
    
    // Handle removing a member from a team
    if (teamId !== undefined && memberIndex !== undefined) {
      // Find the team in the event
      // @ts-expect-error - Mongoose types issue
      const teamIndex = event.teams.findIndex((team) => (team as unknown as EventTeam)._id === teamId);
      
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
    // Handle team operations with complete team objects (including members)
    else if (teams && Array.isArray(teams) && teams.length > 0 && typeof teams[0] === 'object' && teams[0]._id) {
      console.log('Updating teams with complete team objects');
      // This is the case where we're receiving full team objects
      event.teams = new Types.DocumentArray(teams);
    }
    // Handle team operations (add/remove teams)
    else if (teams && Array.isArray(teams)) {
      // Initialize teams array if it doesn't exist
      if (!event.teams) {
        event.teams = new Types.DocumentArray([]);
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
        // @ts-expect-error - Mongoose types issue
        event.teams = new Types.DocumentArray(event.teams.filter((team) => teams.includes((team as unknown as TeamData)._id)));
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