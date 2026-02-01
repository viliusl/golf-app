'use client';

import { useState, useEffect } from 'react';
import { Match as MatchType } from '@/app/api/matches/route';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Team {
  _id: string;
  name: string;
  totalScore: number;
  matchCount: number;
}

interface Event {
  _id: string;
  name: string;
  date: string;
  teams: {
    _id: string;
    name: string;
    members: {
      name: string;
      isCaptain: boolean;
      handicap: number;
      tee: string;
      gender: string;
    }[];
  }[];
}

interface Tournament {
  _id: string;
  name: string;
  eventIds: string[];
}

interface EventWithScores extends Event {
  teamScores: Team[];
  isLoading: boolean;
  matches?: MatchType[];
}

export default function EventScorecard() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;
  const eventId = params.eventId as string;
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [event, setEvent] = useState<EventWithScores | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch tournament details
        const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}`);
        if (!tournamentResponse.ok) {
          throw new Error(`HTTP error! status: ${tournamentResponse.status}`);
        }
        const tournamentData = await tournamentResponse.json();
        setTournament(tournamentData);

        // Fetch event details
        const eventResponse = await fetch(`/api/events?id=${eventId}`);
        if (!eventResponse.ok) {
          throw new Error(`HTTP error! status: ${eventResponse.status}`);
        }
        const eventData = await eventResponse.json();
        setEvent({
          ...eventData,
          teamScores: [],
          isLoading: true
        });

        // Fetch matches for this event
        const matchesResponse = await fetch(`/api/matches?eventId=${eventId}`);
        if (!matchesResponse.ok) {
          throw new Error(`HTTP error! status: ${matchesResponse.status}`);
        }
        const matchesData = await matchesResponse.json();
        
        // Calculate team scores
        const teamScores = calculateTeamScores(matchesData, eventData.teams);
        setEvent(prev => prev ? {
          ...prev,
          teamScores,
          matches: matchesData,
          isLoading: false
        } : null);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId && eventId) {
      fetchData();
    }
  }, [tournamentId, eventId]);

  const calculateTeamScores = (matches: MatchType[], eventTeams: Event['teams']): Team[] => {
    const teamScoreMap = new Map<string, { totalScore: number; matchCount: number }>();
    
    eventTeams.forEach(team => {
      teamScoreMap.set(team.name, { totalScore: 0, matchCount: 0 });
    });
    
    matches.forEach(match => {
      if (!match.completed) return; // Skip incomplete matches

      const team1 = teamScoreMap.get(match.player1.teamName);
      if (team1) {
        team1.totalScore += match.player1.score;
        team1.matchCount += 1;
        teamScoreMap.set(match.player1.teamName, team1);
      }
      
      const team2 = teamScoreMap.get(match.player2.teamName);
      if (team2) {
        team2.totalScore += match.player2.score;
        team2.matchCount += 1;
        teamScoreMap.set(match.player2.teamName, team2);
      }
    });
    
    const teamScoresArray = Array.from(teamScoreMap).map(([name, stats]) => ({
      _id: eventTeams.find(team => team.name === name)?._id || '',
      name,
      totalScore: stats.totalScore,
      matchCount: stats.matchCount
    }));
    
    teamScoresArray.sort((a, b) => b.totalScore - a.totalScore);
    
    return teamScoresArray;
  };

  if (loading) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-black">Loading event data...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-danger-50 text-danger-700 p-4 rounded-md mb-4">
            {error}
          </div>
          <Link href={`/scorecard/${tournamentId}`} className="text-brand hover:text-brand/80">
            ← Back to Tournament
          </Link>
        </div>
      </main>
    );
  }

  if (!tournament || !event) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-100 text-yellow-700 p-4 rounded-md mb-4">
            Event not found
          </div>
          <Link href={`/scorecard/${tournamentId}`} className="text-brand hover:text-brand/80">
            ← Back to Tournament
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="w-full">
            <Link href={`/scorecard/${tournamentId}`} className="text-blue-500 hover:text-blue-700 mb-2 inline-block">
              ← Back to Tournament
            </Link>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="text-3xl font-bold text-black mb-2">Leaderboard for {event.name}</h1>
              <p className="text-gray-600">{new Date(event.date).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Team Scores */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-black">Team Standings</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matches Played
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {event.teamScores.map((team) => (
                  <tr key={team._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-black">{team.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{team.totalScore}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{team.matchCount}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Matches */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-black">Matches</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player 1
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    vs
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player 2
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {event.matches?.map((match) => (
                  <tr key={match._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-black">{match.player1.name}</div>
                      <div className="text-sm text-gray-500">{match.player1.teamName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{match.player1.score}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-500">vs</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-black">{match.player2.name}</div>
                      <div className="text-sm text-gray-500">{match.player2.teamName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{match.player2.score}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${match.completed ? 'text-success-600' : 'text-orange-600'}`}>
                        {match.completed ? 'Completed' : 'In Progress'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
} 