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
      tee: 'W' | 'Y' | 'B' | 'R';
      gender: 'Male' | 'Female';
    }[];
  }[];
  createdAt: string;
  displayInScorecard: boolean;
}

interface EventWithScores extends Event {
  teamScores: Team[];
  isLoading: boolean;
  matches?: MatchType[];
}

interface AggregateTeam {
  name: string;
  totalScore: number;
  matchCount: number;
  eventCount: number;
}

interface AggregatePlayer {
  name: string;
  teamName: string;
  totalScore: number;
  matchCount: number;
  eventCount: number;
}

interface Tournament {
  _id: string;
  name: string;
  eventIds: string[];
  createdAt: string;
}

export default function TournamentScorecard() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [scorecardEvents, setScorecardEvents] = useState<EventWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournamentAndEvents = async () => {
      try {
        setLoading(true);
        
        // Fetch tournament details
        const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}`);
        if (!tournamentResponse.ok) {
          throw new Error(`HTTP error! status: ${tournamentResponse.status}`);
        }
        const tournamentData = await tournamentResponse.json();
        setTournament(tournamentData);

        // Fetch events for this tournament
        const eventsResponse = await fetch('/api/events');
        if (!eventsResponse.ok) {
          throw new Error(`HTTP error! status: ${eventsResponse.status}`);
        }
        const allEvents = await eventsResponse.json();
        
        // Filter events to only show those in this tournament
        const tournamentEvents = allEvents
          .filter((event: Event) => tournamentData.eventIds?.includes(event._id))
          .map((event: Event) => ({
            ...event,
            teamScores: [],
            isLoading: true
          }));
        
        setScorecardEvents(tournamentEvents);
        
        // Fetch matches for each event
        if (tournamentEvents.length > 0) {
          tournamentEvents.forEach((event: EventWithScores) => {
            fetchMatchesForEvent(event._id);
          });
        }
        
      } catch (error) {
        console.error('Error fetching tournament data:', error);
        setError('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchTournamentAndEvents();
    }
  }, [tournamentId]);

  const fetchMatchesForEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/matches?eventId=${eventId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      setScorecardEvents(prevEvents => {
        return prevEvents.map(event => {
          if (event._id === eventId) {
            const teamScores = calculateTeamScores(data, event.teams);
            return {
              ...event,
              teamScores,
              matches: data,
              isLoading: false
            };
          }
          return event;
        });
      });
      
    } catch (error) {
      console.error(`Error fetching matches for event ${eventId}:`, error);
      setScorecardEvents(prevEvents => {
        return prevEvents.map(event => {
          if (event._id === eventId) {
            return {
              ...event,
              isLoading: false
            };
          }
          return event;
        });
      });
    }
  };

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

  const calculateAggregateScores = (): AggregateTeam[] => {
    if (scorecardEvents.some(event => event.isLoading)) {
      return [];
    }

    const aggregateScoreMap = new Map<string, AggregateTeam>();

    scorecardEvents.forEach(event => {
      if (event.teamScores.length === 0) return;

      event.teamScores.forEach(team => {
        const existingTeam = aggregateScoreMap.get(team.name);
        if (existingTeam) {
          existingTeam.totalScore += team.totalScore;
          existingTeam.matchCount += team.matchCount;
          existingTeam.eventCount += 1;
          aggregateScoreMap.set(team.name, existingTeam);
        } else {
          aggregateScoreMap.set(team.name, {
            name: team.name,
            totalScore: team.totalScore,
            matchCount: team.matchCount,
            eventCount: 1
          });
        }
      });
    });

    const aggregateScoresArray = Array.from(aggregateScoreMap.values());
    aggregateScoresArray.sort((a, b) => b.totalScore - a.totalScore);
    
    return aggregateScoresArray;
  };

  const calculatePlayerScores = (): AggregatePlayer[] => {
    if (scorecardEvents.some(event => event.isLoading)) {
      return [];
    }

    const playerScoreMap = new Map<string, {
      name: string;
      teamName: string;
      totalScore: number;
      matchCount: number;
      eventIds: Set<string>;
    }>();

    scorecardEvents.forEach(event => {
      if (!event.matches) return;

      const completedMatches = event.matches.filter(match => match.completed);
      
      completedMatches.forEach(match => {
        // Process player 1
        const player1Key = match.player1.name;
        const existingPlayer1 = playerScoreMap.get(player1Key);
        
        if (existingPlayer1) {
          existingPlayer1.totalScore += match.player1.score;
          existingPlayer1.matchCount += 1;
          existingPlayer1.eventIds.add(event._id);
          playerScoreMap.set(player1Key, existingPlayer1);
        } else {
          playerScoreMap.set(player1Key, {
            name: match.player1.name,
            teamName: match.player1.teamName,
            totalScore: match.player1.score,
            matchCount: 1,
            eventIds: new Set([event._id])
          });
        }

        // Process player 2
        const player2Key = match.player2.name;
        const existingPlayer2 = playerScoreMap.get(player2Key);
        
        if (existingPlayer2) {
          existingPlayer2.totalScore += match.player2.score;
          existingPlayer2.matchCount += 1;
          existingPlayer2.eventIds.add(event._id);
          playerScoreMap.set(player2Key, existingPlayer2);
        } else {
          playerScoreMap.set(player2Key, {
            name: match.player2.name,
            teamName: match.player2.teamName,
            totalScore: match.player2.score,
            matchCount: 1,
            eventIds: new Set([event._id])
          });
        }
      });
    });

    const playerScoresArray = Array.from(playerScoreMap.values()).map(player => ({
      name: player.name,
      teamName: player.teamName,
      totalScore: player.totalScore,
      matchCount: player.matchCount,
      eventCount: player.eventIds.size
    }));

    playerScoresArray.sort((a, b) => 
      b.totalScore !== a.totalScore 
        ? b.totalScore - a.totalScore 
        : b.matchCount - a.matchCount
    );
    
    return playerScoresArray;
  };

  const calculateMatchProgress = () => {
    if (scorecardEvents.some(event => event.isLoading)) {
      return { completed: 0, total: 0, percent: 0, registered: 0 };
    }

    // Count registered and completed matches
    let registeredMatches = 0;
    let completedMatches = 0;
    
    scorecardEvents.forEach(event => {
      if (event.matches) {
        // Count all matches that exist
        registeredMatches += event.matches.length;
        
        // Count only completed matches
        completedMatches += event.matches.filter(match => match.completed).length;
      }
    });

    // Calculate percentage based on registered matches
    const percentComplete = registeredMatches > 0 
      ? Math.min(100, Math.round((completedMatches / registeredMatches) * 100))
      : 0;

    return {
      completed: completedMatches,
      total: registeredMatches,
      percent: percentComplete,
      registered: registeredMatches
    };
  };

  if (loading) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-black">Loading tournament data...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
            {error}
          </div>
          <Link href="/tournaments" className="text-blue-500 hover:text-blue-700">
            ← Back to Tournaments
          </Link>
        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-100 text-yellow-700 p-4 rounded-md mb-4">
            Tournament not found
          </div>
          <Link href="/tournaments" className="text-blue-500 hover:text-blue-700">
            ← Back to Tournaments
          </Link>
        </div>
      </main>
    );
  }

  const aggregateScores = calculateAggregateScores();
  const playerScores = calculatePlayerScores();
  const allEventsLoaded = !scorecardEvents.some(event => event.isLoading);
  const matchProgress = calculateMatchProgress();

  return (
    <main className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="w-full">
            <div className="flex justify-between items-center">
              <Link href="/tournaments" className="text-blue-500 hover:text-blue-700 mb-2 inline-block">
                ← Back to Tournaments
              </Link>
              <Link
                href={`/scores/${tournamentId}`}
                target="_blank"
                className="text-blue-500 hover:text-blue-700 mb-2 inline-block"
              >
                Open Public Scorecard ↗
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-black">Leaderboard for {tournament.name}</h1>
          </div>
        </div>

        {/* Tournament Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-black">Leaderboard for {tournament.name}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 mb-2">Events</p>
              <div className="space-y-1">
                {scorecardEvents.map(event => (
                  <Link
                    key={event._id}
                    href={`/scorecard/${tournament._id}/event/${event._id}`}
                    className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {event.name} ({new Date(event.date).toLocaleDateString()})
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-gray-600">Total Teams</p>
              <p className="text-2xl font-semibold text-black">{aggregateScores.length}</p>
            </div>
          </div>
        </div>

        {/* Match Progress Section */}
        {allEventsLoaded && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Match Progress</h2>
            <div className="mt-1">
              <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                <span>Completed: {matchProgress.completed} of {matchProgress.total} possible matches ({matchProgress.registered} registered)</span>
                <span>{matchProgress.percent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${matchProgress.percent}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Events
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {aggregateScores.map((team, index) => (
                  <tr key={team.name} className={index === 0 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-black">{team.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{team.totalScore}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{team.matchCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{team.eventCount}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Player Scores */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-black">Player Standings</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matches Played
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Events
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {playerScores.map((player, index) => (
                  <tr key={player.name} className={index === 0 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-black">{player.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{player.totalScore}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{player.teamName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{player.matchCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{player.eventCount}</div>
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