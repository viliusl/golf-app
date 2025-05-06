'use client';

import { useState, useEffect } from 'react';
import { Match as MatchType } from '@/app/api/matches/route';

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
}

export default function Scorecard() {
  const [scorecardEvents, setScorecardEvents] = useState<EventWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  if (loading && scorecardEvents.length === 0) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-black">Loading events...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-black mb-6">Scorecard</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {scorecardEvents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">No events are currently marked for display in scorecard</p>
            <p className="text-gray-500 mt-2 text-sm">
              To display an event here, go to an event page and toggle "Display in Scorecard"
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-medium text-black mb-2">Events Displayed</h2>
              <div className="flex flex-wrap gap-2">
                {scorecardEvents.map(event => (
                  <span key={event._id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {event.name} ({new Date(event.date).toLocaleDateString()})
                  </span>
                ))}
              </div>
            </div>
            
            {scorecardEvents.map(event => (
              <div key={event._id} className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold text-black">
                    {event.name} - Team Scores
                  </h2>
                  <p className="text-sm text-gray-500">
                    {new Date(event.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                
                {event.isLoading ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">Loading match data...</p>
                  </div>
                ) : event.teamScores.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">No matches recorded for this event yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rank
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Match Count
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Score
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {event.teamScores.map((team, index) => (
                          <tr key={team._id} className={index === 0 ? "bg-yellow-50" : "hover:bg-gray-50"}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-black">{index + 1}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-black">{team.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm text-gray-900">{team.matchCount}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className={`text-sm font-bold ${index === 0 ? "text-yellow-600" : "text-gray-900"}`}>
                                {team.totalScore}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  );
} 