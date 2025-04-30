import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Team from '@/models/Team';

interface TeamMember {
  name: string;
  isCaptain: boolean;
  handicap: number;
  tee: 'W' | 'Y' | 'B' | 'R';
  gender: 'Male' | 'Female';
}

export interface Player {
  name: string;
  handicap: number;
  tee: 'W' | 'Y' | 'B' | 'R';
  gender: 'Male' | 'Female';
  teamId: string;
  teamName: string;
}

export async function GET() {
  try {
    await connectDB();
    
    // Fetch all teams
    const teams = await Team.find();
    
    // Extract all players from teams
    const players: Player[] = [];
    
    teams.forEach(team => {
      if (team.members && team.members.length > 0) {
        team.members.forEach((member: TeamMember) => {
          players.push({
            name: member.name,
            handicap: member.handicap,
            tee: member.tee,
            gender: member.gender,
            teamId: team._id.toString(),
            teamName: team.name
          });
        });
      }
    });
    
    // Sort players by name
    players.sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 