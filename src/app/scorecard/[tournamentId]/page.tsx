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
          .filter((event: Event) => tournamentData.eventIds.includes(event._id))
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

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/tournaments" className="text-blue-500 hover:text-blue-700 mb-2 inline-block">
              ← Back to Tournaments
            </Link>
            <h1 className="text-3xl font-bold text-black">{tournament.name} Scorecard</h1>
          </div>
        </div>

        {/* Tournament Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-black">Tournament Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Total Events</p>
              <p className="text-2xl font-semibold text-black">{tournament.eventIds.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Total Teams</p>
              <p className="text-2xl font-semibold text-black">{aggregateScores.length}</p>
            </div>
          </div>
        </div>

        {/* Aggregate Scores */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-black">Overall Standings</h2>
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

        {/* Event Scores */}
        {scorecardEvents.map((event) => (
          <div key={event._id} className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-black">{event.name}</h2>
            <p className="text-gray-600 mb-4">{new Date(event.date).toLocaleDateString()}</p>
            
            {event.isLoading ? (
              <p className="text-black">Loading event scores...</p>
            ) : event.teamScores.length === 0 ? (
              <p className="text-black">No scores available for this event</p>
            ) : (
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
                    {event.teamScores.map((team, index) => (
                      <tr key={team._id} className={index === 0 ? 'bg-yellow-50' : ''}>
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
            )}
          </div>
        ))}
      </div>
    </main>
  );
} 