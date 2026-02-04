import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import Team from '@/models/Team';
import Course from '@/models/Course';
import Player from '@/models/Player';
import { Types } from 'mongoose';

interface TeamData {
  _id: string;
  name: string;
  members: {
    playerId: string;
    isCaptain: boolean;
    handicap?: number;
    tee?: string;
  }[];
}

interface EventTeam {
  _id: string;
  name: string;
  members: {
    playerId: string;
    isCaptain: boolean;
    handicap?: number;
    tee?: string;
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
    const events = await Event.find({}).sort({ date: -1 });

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
      const { name, date, courseId, tournamentId, handicapAllowance = 100 } = body;
      
      if (!name || !date || !courseId || !tournamentId) {
        return NextResponse.json(
          { error: 'Event name, date, course, and tournament are required' },
          { status: 400 }
        );
      }
      
      // Fetch the course to create a snapshot
      const courseDoc = await Course.findById(courseId);
      if (!courseDoc) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }
      
      // Convert to plain object to ensure all nested data is included
      const courseData = courseDoc.toObject();
      
      // Create course snapshot
      const courseSnapshot = {
        _id: courseData._id.toString(),
        name: courseData.name,
        address: courseData.address,
        holes: courseData.holes || [],
        menTees: courseData.menTees || [],
        womenTees: courseData.womenTees || []
      };
      
      const handicapValue = typeof handicapAllowance === 'number' 
        ? handicapAllowance 
        : parseInt(handicapAllowance) || 100;
      
      const newEvent = new Event({
        name,
        date,
        tournamentId,
        course: courseSnapshot,
        handicapAllowance: Math.min(100, Math.max(0, handicapValue)),
        teams: []
      });
      
      await newEvent.save();
      console.log('Event created successfully:', newEvent._id);
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
    const teamExists = event.teams.some((team) => (team as unknown as EventTeam)._id === teamId);
    if (teamExists) {
      console.log('Error: Team is already in the event');
      return NextResponse.json(
        { error: 'Team is already in the event' },
        { status: 400 }
      );
    }

    // Fetch player handicaps for all team members
    const playerIds = teamData.members.map((m: { playerId: Types.ObjectId }) => m.playerId);
    const players = await Player.find({ _id: { $in: playerIds } });
    const playerHandicapMap = new Map(players.map(p => [p._id.toString(), p.handicap]));

    // Add the team to the event - store handicap snapshot for each member
    const newTeam = {
      _id: teamData._id.toString(),
      name: teamData.name,
      members: teamData.members.map((member: { playerId: Types.ObjectId; isCaptain: boolean }) => ({
        playerId: member.playerId.toString(),
        isCaptain: member.isCaptain || false,
        handicap: playerHandicapMap.get(member.playerId.toString()) || 0
      }))
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
    const { name, date, teams, teamId, memberIndex } = requestBody;

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
      
      // Check for handicap changes and sync to Player documents and other future events
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (const newTeam of teams) {
        const oldTeam = event.teams.find((t: { _id: string }) => t._id === newTeam._id);
        if (oldTeam) {
          for (const newMember of newTeam.members) {
            const oldMember = oldTeam.members.find((m: { playerId: string }) => m.playerId === newMember.playerId);
            if (oldMember && oldMember.handicap !== newMember.handicap) {
              // Update the Player document
              await Player.findByIdAndUpdate(newMember.playerId, { handicap: newMember.handicap });
              
              // Update other future events (excluding current event)
              await Event.updateMany(
                {
                  _id: { $ne: id },
                  date: { $gte: today },
                  'teams.members.playerId': newMember.playerId
                },
                {
                  $set: { 'teams.$[].members.$[member].handicap': newMember.handicap }
                },
                {
                  arrayFilters: [{ 'member.playerId': newMember.playerId }]
                }
              );
              
              console.log(`Synced handicap ${newMember.handicap} for player ${newMember.playerId}`);
            }
          }
        }
      }
      
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
          // Fetch player handicaps for all team members
          const playerIds = teamData.members.map((m: { playerId: Types.ObjectId }) => m.playerId);
          const players = await Player.find({ _id: { $in: playerIds } });
          const playerHandicapMap = new Map(players.map(p => [p._id.toString(), p.handicap]));

          const newTeam = {
            _id: teamData._id.toString(),
            name: teamData.name,
            members: teamData.members.map((member: { playerId: Types.ObjectId; isCaptain: boolean }) => ({
              playerId: member.playerId.toString(),
              isCaptain: member.isCaptain || false,
              handicap: playerHandicapMap.get(member.playerId.toString()) || 0
            }))
          };
          event.teams.push(newTeam);
          console.log('Adding team:', newTeam);
        }
      } else {
        // When removing a team, just filter the array
        event.teams = new Types.DocumentArray(event.teams.filter((team) => teams.includes((team as unknown as TeamData)._id)));
      }
    }

    await event.save();
    console.log('Saved event:', event);

    // Fetch the updated event to ensure we have the latest data
    const updatedEvent = await Event.findById(id);
    if (!updatedEvent) {
      return NextResponse.json(
        { error: 'Event not found after update' },
        { status: 404 }
      );
    }

    console.log('Updated event to return:', updatedEvent);
    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
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
