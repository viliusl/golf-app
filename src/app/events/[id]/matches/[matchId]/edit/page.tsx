'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface MatchPlayer {
  name: string;
  teamName: string;
  score: number;
}

interface Match {
  _id: string;
  eventId: string;
  player1: MatchPlayer;
  player2: MatchPlayer;
  completed: boolean;
  createdAt: string;
}

export default function EditMatch({ params }: { params: { id: string; matchId: string } }) {
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/matches?id=${params.matchId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMatch(data);
      } catch (error) {
        console.error('Error fetching match:', error);
        setError('Failed to load match data');
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [params.matchId]);

  const handleEditMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) return;
    setError(null);
    
    try {
      const response = await fetch(`/api/matches?id=${match._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player1: match.player1,
          player2: match.player2,
          completed: match.completed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to update match');
      }

      // Navigate back to event details page
      router.push(`/events/${params.id}`);
    } catch (error) {
      console.error('Error updating match:', error);
      setError(error instanceof Error ? error.message : 'Failed to update match');
    }
  };

  if (loading) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-black">Loading match details...</p>
        </div>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-black">Match not found</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-black">Edit Match</h1>
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

        <div className="bg-white rounded-lg shadow-sm p-8">
          <form onSubmit={handleEditMatch}>
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{match.player1.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{match.player1.teamName}</p>
                
                <div className="mb-4">
                  <label htmlFor="player1-score" className="block text-sm font-medium text-gray-700 mb-1">
                    Score
                  </label>
                  <input
                    type="number"
                    id="player1-score"
                    min="0"
                    value={match.player1.score}
                    onChange={(e) => setMatch({
                      ...match,
                      player1: {
                        ...match.player1,
                        score: parseInt(e.target.value) || 0
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{match.player2.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{match.player2.teamName}</p>
                
                <div className="mb-4">
                  <label htmlFor="player2-score" className="block text-sm font-medium text-gray-700 mb-1">
                    Score
                  </label>
                  <input
                    type="number"
                    id="player2-score"
                    min="0"
                    value={match.player2.score}
                    onChange={(e) => setMatch({
                      ...match,
                      player2: {
                        ...match.player2,
                        score: parseInt(e.target.value) || 0
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={match.completed}
                  onChange={(e) => setMatch({
                    ...match,
                    completed: e.target.checked
                  })}
                  className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                Match Completed
              </label>
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
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
} 