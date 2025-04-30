'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TeamMember {
  name: string;
  isCaptain: boolean;
  handicap: number;
  tee: 'W' | 'Y' | 'B' | 'R';
  gender: 'Male' | 'Female';
}

interface Team {
  _id: string;
  name: string;
  members: TeamMember[];
}

interface Event {
  _id: string;
  name: string;
  date: string;
  teams: Team[];
  createdAt: string;
}

export default function AddMatch({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMatch, setNewMatch] = useState<{
    player1: {
      name: string;
      teamName: string;
      score: number;
    };
    player2: {
      name: string;
      teamName: string;
      score: number;
    };
  }>({
    player1: { name: '', teamName: '', score: 0 },
    player2: { name: '', teamName: '', score: 0 }
  });

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/events?id=${params.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Ensure the teams array exists
        if (!data.teams) {
          data.teams = [];
        }
        
        setEvent(data);
      } catch (error) {
        console.error('Error fetching event:', error);
        setError('Failed to load event data');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [params.id]);

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!newMatch.player1.name || !newMatch.player1.teamName || 
          !newMatch.player2.name || !newMatch.player2.teamName) {
        setError('Please select both players for the match');
        return;
      }
      
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: params.id,
          player1: newMatch.player1,
          player2: newMatch.player2
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create match');
      }

      // Navigate back to event details page
      router.push(`/events/${params.id}`);
    } catch (error) {
      console.error('Error adding match:', error);
      setError(error instanceof Error ? error.message : 'Failed to add match');
    }
  };

  if (loading) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-black">Loading event details...</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-black">Event not found</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-black">Add New Match</h1>
          <Link 
            href={`/events/${params.id}`}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {event && event.teams.length < 2 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">You need at least two teams with members to create a match.</p>
            <div className="flex justify-center space-x-4">
              <Link
                href={`/events/${params.id}`}
                className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
              >
                Back to Event
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <form onSubmit={handleAddMatch}>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Player 1</h3>
                <div className="grid grid-cols-2 gap-4">
                  {event && event.teams.map((team) => (
                    <div key={`team-${team._id}`} className="mb-4">
                      <p className="text-sm font-semibold mb-2">{team.name}</p>
                      {team.members.map((member, idx) => (
                        <div key={`member-${idx}`} className="flex items-center mb-2">
                          <input
                            type="radio"
                            id={`player1-${team._id}-${idx}`}
                            name="player1"
                            className="mr-2"
                            onChange={() => setNewMatch({
                              ...newMatch,
                              player1: {
                                name: member.name,
                                teamName: team.name,
                                score: 0
                              }
                            })}
                            checked={newMatch.player1.name === member.name && newMatch.player1.teamName === team.name}
                          />
                          <label htmlFor={`player1-${team._id}-${idx}`} className="text-sm text-gray-700">
                            {member.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Player 2</h3>
                <div className="grid grid-cols-2 gap-4">
                  {event && event.teams.map((team) => (
                    <div key={`team-${team._id}`} className="mb-4">
                      <p className="text-sm font-semibold mb-2">{team.name}</p>
                      {team.members.map((member, idx) => (
                        <div key={`member-${idx}`} className="flex items-center mb-2">
                          <input
                            type="radio"
                            id={`player2-${team._id}-${idx}`}
                            name="player2"
                            className="mr-2"
                            onChange={() => setNewMatch({
                              ...newMatch,
                              player2: {
                                name: member.name,
                                teamName: team.name,
                                score: 0
                              }
                            })}
                            checked={newMatch.player2.name === member.name && newMatch.player2.teamName === team.name}
                            disabled={newMatch.player1.name === member.name && newMatch.player1.teamName === team.name}
                          />
                          <label htmlFor={`player2-${team._id}-${idx}`} className="text-sm text-gray-700">
                            {member.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-8">
                <Link
                  href={`/events/${params.id}`}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
                >
                  Create Match
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
} 