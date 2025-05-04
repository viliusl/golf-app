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
}

export default function Scorecard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [matches, setMatches] = useState<MatchType[]>([]);
  const [teamScores, setTeamScores] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setEvents(data);
        
        // If there are events, select the first one by default
        if (data.length > 0) {
          setSelectedEvent(data[0]);
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

  useEffect(() => {
    if (!selectedEvent) return;
    
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/matches?eventId=${selectedEvent._id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMatches(data);
        
        // Calculate team scores
        calculateTeamScores(data, selectedEvent.teams);
        
      } catch (error) {
        console.error('Error fetching matches:', error);
        setError('Failed to load matches');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [selectedEvent]);

  const calculateTeamScores = (matches: MatchType[], eventTeams: Event['teams']) => {
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
    
    setTeamScores(teamScoresArray);
  };

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eventId = e.target.value;
    const event = events.find(event => event._id === eventId);
    setSelectedEvent(event || null);
  };

  if (loading && !selectedEvent) {
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
        
        {/* Event Selection */}
        <div className="mb-8">
          <label htmlFor="event-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Event
          </label>
          <select
            id="event-select"
            value={selectedEvent?._id || ''}
            onChange={handleEventChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
          >
            {events.length === 0 ? (
              <option value="">No events available</option>
            ) : (
              events.map(event => (
                <option key={event._id} value={event._id}>
                  {event.name} ({new Date(event.date).toLocaleDateString()})
                </option>
              ))
            )}
          </select>
        </div>
        
        {/* Team Scores Table */}
        {selectedEvent ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-black">
                {selectedEvent.name} - Team Scores
              </h2>
              <p className="text-sm text-gray-500">
                {new Date(selectedEvent.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            
            {loading ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">Loading match data...</p>
              </div>
            ) : teamScores.length === 0 ? (
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
                    {teamScores.map((team, index) => (
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
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">Please select an event to view the scorecard</p>
          </div>
        )}
      </div>
    </main>
  );
} 