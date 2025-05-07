'use client';

import { useState, useEffect } from 'react';
import { Match as MatchType } from '@/app/api/matches/route';

// More robust client-only wrapper that completely skips hydration
function ClientOnly({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Date formatting components
function FormattedDate() {
  const [dateString, setDateString] = useState('');
  
  useEffect(() => {
    setDateString(`${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
  }, []);
  
  return <span>{dateString}</span>;
}

function EventDateDisplay({ date }: { date: string }) {
  const [formattedDate, setFormattedDate] = useState('');
  
  useEffect(() => {
    setFormattedDate(new Date(date).toLocaleDateString());
  }, [date]);
  
  return <span>{formattedDate}</span>;
}

// Type definitions
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

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="bg-white p-8 rounded-lg shadow-sm text-center">
      <p className="text-gray-500">Loading scorecard...</p>
    </div>
  );
}

// Main scorecard component
export default function Scores() {
  // Store state for events data
  const [scorecardEvents, setScorecardEvents] = useState<EventWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Fetch events data
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Filter events to only show those marked for scorecard display
        const filteredEvents = data
          .filter((event: Event) => event.displayInScorecard)
          .map((event: Event) => ({
            ...event,
            teamScores: [],
            isLoading: true
          }));
        
        setScorecardEvents(filteredEvents);
        
        // If there are events, fetch matches for each one
        if (filteredEvents.length > 0) {
          filteredEvents.forEach((event: EventWithScores) => {
            fetchMatchesForEvent(event._id);
          });
        }
        
      } catch (error) {
        console.error('Error fetching events:', error);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const fetchMatchesForEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/matches?eventId=${eventId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Update the event with match data
      setScorecardEvents(prevEvents => {
        return prevEvents.map(event => {
          if (event._id === eventId) {
            // Calculate team scores for this event
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
      
      // Mark the event as not loading, even if there was an error
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
    // Initialize team scores
    const teamScoreMap = new Map<string, { totalScore: number; matchCount: number }>();
    
    // Initialize all teams from the event
    eventTeams.forEach(team => {
      teamScoreMap.set(team.name, { totalScore: 0, matchCount: 0 });
    });
    
    // Calculate scores from matches
    matches.forEach(match => {
      // Add player 1 score to their team
      const team1 = teamScoreMap.get(match.player1.teamName);
      if (team1) {
        team1.totalScore += match.player1.score;
        team1.matchCount += 1;
        teamScoreMap.set(match.player1.teamName, team1);
      }
      
      // Add player 2 score to their team
      const team2 = teamScoreMap.get(match.player2.teamName);
      if (team2) {
        team2.totalScore += match.player2.score;
        team2.matchCount += 1;
        teamScoreMap.set(match.player2.teamName, team2);
      }
    });
    
    // Convert map to array and sort by score (descending)
    const teamScoresArray = Array.from(teamScoreMap).map(([name, stats]) => ({
      _id: eventTeams.find(team => team.name === name)?._id || '',
      name,
      totalScore: stats.totalScore,
      matchCount: stats.matchCount
    }));
    
    // Sort by total score (highest first)
    teamScoresArray.sort((a, b) => b.totalScore - a.totalScore);
    
    return teamScoresArray;
  };

  const calculateAggregateScores = (): AggregateTeam[] => {
    // Skip if events are still loading
    if (scorecardEvents.some(event => event.isLoading)) {
      return [];
    }

    // Create a map to track aggregate scores
    const aggregateScoreMap = new Map<string, AggregateTeam>();

    // Iterate through all events and collect team scores
    scorecardEvents.forEach(event => {
      // Skip if event has no scores
      if (event.teamScores.length === 0) return;

      event.teamScores.forEach(team => {
        const existingTeam = aggregateScoreMap.get(team.name);
        if (existingTeam) {
          // Update existing team entry
          existingTeam.totalScore += team.totalScore;
          existingTeam.matchCount += team.matchCount;
          existingTeam.eventCount += 1;
          aggregateScoreMap.set(team.name, existingTeam);
        } else {
          // Create new team entry
          aggregateScoreMap.set(team.name, {
            name: team.name,
            totalScore: team.totalScore,
            matchCount: team.matchCount,
            eventCount: 1
          });
        }
      });
    });

    // Convert map to array and sort by score (descending)
    const aggregateScoresArray = Array.from(aggregateScoreMap.values());
    aggregateScoresArray.sort((a, b) => b.totalScore - a.totalScore);
    
    return aggregateScoresArray;
  };

  const calculatePlayerScores = (): AggregatePlayer[] => {
    // Skip if events are still loading
    if (scorecardEvents.some(event => event.isLoading)) {
      return [];
    }

    // Create a map to track player scores across all events
    const playerScoreMap = new Map<string, {
      name: string;
      teamName: string;
      totalScore: number;
      matchCount: number;
      eventIds: Set<string>;
    }>();

    // Iterate through all events and collect player data from matches
    scorecardEvents.forEach(event => {
      if (!event.matches) return;

      // Process only completed matches
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

    // Convert map to array and calculate averages
    const playerScoresArray = Array.from(playerScoreMap.values()).map(player => ({
      name: player.name,
      teamName: player.teamName,
      totalScore: player.totalScore,
      matchCount: player.matchCount,
      eventCount: player.eventIds.size
    }));

    // Sort by total score (highest first), then by match count (highest first for tiebreaker)
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

    // Count total players across all events
    let totalPlayers = 0;
    scorecardEvents.forEach(event => {
      event.teams.forEach(team => {
        totalPlayers += team.members.length;
      });
    });

    // Calculate the total possible matches (total players divided by 2)
    const totalPossibleMatches = Math.floor(totalPlayers / 2);

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

    // Calculate percentage based on total possible matches
    const percentComplete = totalPossibleMatches > 0 
      ? Math.min(100, Math.round((completedMatches / totalPossibleMatches) * 100))
      : 0;

    return {
      completed: completedMatches,
      total: totalPossibleMatches,
      percent: percentComplete,
      registered: registeredMatches
    };
  };

  // Calculate scores and progress
  const aggregateScores = calculateAggregateScores();
  const playerScores = calculatePlayerScores();
  const allEventsLoaded = !scorecardEvents.some(event => event.isLoading);
  const matchProgress = calculateMatchProgress();
  
  if (loading && scorecardEvents.length === 0) {
    return (
      <main className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">Loading events...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {scorecardEvents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-8 text-center">
            <p className="text-gray-500">No events are currently marked for display in scorecard</p>
          </div>
        ) : (
          <>
            <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-medium text-black mb-2">Scores for Events</h2>
              <div className="flex flex-wrap gap-2">
                {scorecardEvents.map(event => (
                  <span key={event._id} className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {event.name} (<EventDateDisplay date={event.date} />)
                  </span>
                ))}
              </div>
            </div>
            
            {/* Match Progress Section */}
            {allEventsLoaded && (
              <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm p-3 sm:p-4">
                <h2 className="text-base sm:text-lg font-medium text-black mb-2">Match Progress</h2>
                <div className="mt-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm text-gray-600 mb-1">
                    <span className="mb-1 sm:mb-0">Completed: {matchProgress.completed} of {matchProgress.total} possible matches ({matchProgress.registered} registered)</span>
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
            
            {/* Aggregate Scores Section */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6 sm:mb-8">
              <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                <h2 className="text-lg sm:text-xl font-semibold text-black">
                  Team Scores
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  Aggregate scores across all displayed events
                </p>
              </div>
              
              {!allEventsLoaded ? (
                <div className="p-4 sm:p-6 text-center">
                  <p className="text-gray-500">Loading data from all events...</p>
                </div>
              ) : aggregateScores.length === 0 ? (
                <div className="p-4 sm:p-6 text-center">
                  <p className="text-gray-500">No match data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Team
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Events
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Matches
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {aggregateScores.map((team, index) => (
                        <tr key={team.name} className={index === 0 ? "bg-gradient-to-r from-yellow-50 to-orange-50" : "hover:bg-gray-50"}>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-black">{index + 1}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-black">{team.name}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                            <div className={`text-sm font-bold ${index === 0 ? "text-orange-600" : "text-gray-900"}`}>
                              {team.totalScore}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">{team.eventCount}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">{team.matchCount}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Player Scores Section */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6 sm:mb-8">
              <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
                <h2 className="text-lg sm:text-xl font-semibold text-black">
                  Individual Player Scores
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  Aggregate scores for all players across displayed events
                </p>
              </div>
              
              {!allEventsLoaded ? (
                <div className="p-4 sm:p-6 text-center">
                  <p className="text-gray-500">Loading data from all events...</p>
                </div>
              ) : playerScores.length === 0 ? (
                <div className="p-4 sm:p-6 text-center">
                  <p className="text-gray-500">No player data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Player
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Team
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Events
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Matches
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {playerScores.map((player, index) => (
                        <tr key={player.name} className={index === 0 ? "bg-gradient-to-r from-green-50 to-blue-50" : "hover:bg-gray-50"}>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-black">{index + 1}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-black">{player.name}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                            <div className={`text-sm font-bold ${index === 0 ? "text-blue-600" : "text-gray-900"}`}>
                              {player.totalScore}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{player.teamName}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">{player.eventCount}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">{player.matchCount}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <footer className="text-center text-xs sm:text-sm text-gray-500 mt-6 sm:mt-8 mb-0">
              <p>Updated: <FormattedDate /></p>
            </footer>
          </>
        )}
      </div>
    </main>
  );
} 