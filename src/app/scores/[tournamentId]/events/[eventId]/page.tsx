'use client';

import { useState, useEffect } from 'react';
import { Match as MatchType } from '@/app/api/matches/route';
import { useParams } from 'next/navigation';
import Image from 'next/image';

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
  course?: {
    _id: string;
    name: string;
    holes?: { number: number; handicap: number; par: number }[];
  };
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

interface Tournament {
  _id: string;
  name: string;
  eventIds: string[];
  createdAt: string;
  type: 'Team' | 'Individual';
}

// Helper function to calculate ranks with tie handling (standard competition ranking)
function calculateRanks<T>(items: T[], getScore: (item: T) => number): number[] {
  const ranks: number[] = [];
  
  items.forEach((item, index) => {
    if (index === 0) {
      ranks.push(1);
    } else if (getScore(item) === getScore(items[index - 1])) {
      ranks.push(ranks[index - 1]); // Same rank as previous
    } else {
      ranks.push(index + 1); // Skip ranks for ties
    }
  });
  
  return ranks;
}

export default function PublicEventScorecard() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;
  const eventId = params.eventId as string;
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [event, setEvent] = useState<EventWithScores | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

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

  const calculatePlayerScores = (): { name: string; teamName: string; totalScore: number; matchCount: number; totalStrokes: number; totalNetScore: number }[] => {
    if (!event?.matches) return [];

    // Calculate course PAR
    const coursePar = event.course?.holes?.reduce((sum, h) => sum + h.par, 0) || 72;

    const playerScoreMap = new Map<string, {
      name: string;
      teamName: string;
      totalScore: number;
      matchCount: number;
      totalStrokes: number;
      totalNetScore: number;
    }>();

    const completedMatches = event.matches.filter(match => match.completed);
    
    completedMatches.forEach(match => {
      // Calculate strokes for each player in this match
      const player1Strokes = match.holes?.reduce((sum, h) => sum + (h.player1Score || 0), 0) || 0;
      const player2Strokes = match.holes?.reduce((sum, h) => sum + (h.player2Score || 0), 0) || 0;
      
      // Calculate net score: PAR + Handicap - Strokes
      const player1NetScore = coursePar + (match.player1.handicap || 0) - player1Strokes;
      const player2NetScore = coursePar + (match.player2.handicap || 0) - player2Strokes;

      // Process player 1
      const player1Key = match.player1.name;
      const existingPlayer1 = playerScoreMap.get(player1Key);
      
      if (existingPlayer1) {
        existingPlayer1.totalScore += match.player1.score;
        existingPlayer1.matchCount += 1;
        existingPlayer1.totalStrokes += player1Strokes;
        existingPlayer1.totalNetScore += player1NetScore;
        playerScoreMap.set(player1Key, existingPlayer1);
      } else {
        playerScoreMap.set(player1Key, {
          name: match.player1.name,
          teamName: match.player1.teamName,
          totalScore: match.player1.score,
          matchCount: 1,
          totalStrokes: player1Strokes,
          totalNetScore: player1NetScore
        });
      }

      // Process player 2
      const player2Key = match.player2.name;
      const existingPlayer2 = playerScoreMap.get(player2Key);
      
      if (existingPlayer2) {
        existingPlayer2.totalScore += match.player2.score;
        existingPlayer2.matchCount += 1;
        existingPlayer2.totalStrokes += player2Strokes;
        existingPlayer2.totalNetScore += player2NetScore;
        playerScoreMap.set(player2Key, existingPlayer2);
      } else {
        playerScoreMap.set(player2Key, {
          name: match.player2.name,
          teamName: match.player2.teamName,
          totalScore: match.player2.score,
          matchCount: 1,
          totalStrokes: player2Strokes,
          totalNetScore: player2NetScore
        });
      }
    });

    const playerScoresArray = Array.from(playerScoreMap.values());
    playerScoresArray.sort((a, b) => 
      b.totalScore !== a.totalScore 
        ? b.totalScore - a.totalScore 
        : b.matchCount - a.matchCount
    );
    
    return playerScoresArray;
  };

  const filteredMatches = event?.matches?.filter(match => {
    if (!searchFilter) return true;
    const searchLower = searchFilter.toLowerCase();
    return (
      match.player1.name.toLowerCase().includes(searchLower) ||
      match.player2.name.toLowerCase().includes(searchLower) ||
      match.player1.teamName.toLowerCase().includes(searchLower) ||
      match.player2.teamName.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-brand-dark">Loading event data...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-danger-50 text-danger-700 p-4 rounded-md mb-4">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!tournament || !event) {
    return (
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-orange-100 text-orange-800 p-4 rounded-md mb-4">
            Event not found
          </div>
        </div>
      </main>
    );
  }

  const playerScores = calculatePlayerScores();

  return (
    <main className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <a href={`/scores/${tournamentId}`} className="text-brand hover:text-brand/80">
              ← Back to Tournament
            </a>
            <Image
              src="/logo.svg"
              alt="DGL.ONLINE"
              width={120}
              height={48}
              className="h-10 w-auto"
            />
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-3xl font-bold text-brand-dark mb-2">Leaderboard for {event.name}</h1>
            <p className="text-lg text-gray-400">
              {new Date(event.date).toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            {event.course && (
              <p className="text-lg text-gray-400">{event.course.name}</p>
            )}
          </div>
        </div>

        {/* Team Scores - only show for team tournaments */}
        {tournament.type !== 'Individual' && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-brand-dark">Team Standings</h2>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Rank
                      </th>
                      <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Team
                      </th>
                      <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Total Score
                      </th>
                      <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Matches
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {(() => {
                      const teamRanks = calculateRanks(event.teamScores, team => team.totalScore);
                      return event.teamScores.map((team, index) => (
                        <tr key={team.name} className={teamRanks[index] <= 3 ? 'bg-orange-50' : ''}>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-brand-dark">{teamRanks[index]}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-brand-dark">{team.name}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-brand-dark">{team.totalScore}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-brand-dark">{team.matchCount}</div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Player Scores */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-brand-dark">Player Standings</h2>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Rank
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Player
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Score
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Strokes
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Net
                    </th>
                    <th scope="col" className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Team
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Matches
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {(() => {
                    const playerRanks = calculateRanks(playerScores, player => player.totalScore);
                    return playerScores.map((player, index) => (
                      <tr key={player.name} className={playerRanks[index] <= 3 ? 'bg-orange-50' : ''}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-brand-dark">{playerRanks[index]}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-brand-dark">{player.name}</div>
                          <div className="sm:hidden text-xs text-gray-300">{player.teamName}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-brand-dark">{player.totalScore}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-brand-dark">{player.totalStrokes}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${player.totalNetScore >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            {player.totalNetScore >= 0 ? '+' : ''}{player.totalNetScore}
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-brand-dark">{player.teamName}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-brand-dark">{player.matchCount}</div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Matches */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold text-brand-dark">Matches</h2>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search players..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-brand-dark"
              />
            </div>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Match
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredMatches?.sort((a, b) => {
                    // Sort completed matches first
                    if (a.completed && !b.completed) return -1;
                    if (!a.completed && b.completed) return 1;
                    return 0;
                  }).map((match) => (
                    <tr key={match._id} className={match.completed ? 'bg-green-50' : 'bg-gray-50'}>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium text-brand-dark">{match.player1.name}</div>
                              <div className="text-xs text-gray-300">{match.player1.teamName}</div>
                            </div>
                            <div className="text-sm font-medium text-brand-dark">{match.player1.score}</div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium text-brand-dark">{match.player2.name}</div>
                              <div className="text-xs text-gray-300">{match.player2.teamName}</div>
                            </div>
                            <div className="text-sm font-medium text-brand-dark">{match.player2.score}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          match.completed 
                            ? 'bg-success-100 text-success-700' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {match.completed ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a 
                          href={`/scores/${tournamentId}/events/${eventId}/matches/${match._id}`}
                          className="text-brand hover:text-brand/80"
                        >
                          <span className="hidden sm:inline">View Details</span>
                          <span className="sm:hidden">Details</span>
                          <span className="ml-1">→</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 