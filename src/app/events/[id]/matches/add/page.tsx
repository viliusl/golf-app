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

interface PlayerOption {
  name: string;
  teamName: string;
  handicap: number;
}

interface HoleScore {
  hole: number;
  handicap: number; // Hole handicap (difficulty)
  par: number;
  pace: number; // Expected time to complete
  player1Score: number;
  player2Score: number;
  player1Putt: boolean;
  player2Putt: boolean;
}

export default function AddMatch({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerOptions, setPlayerOptions] = useState<PlayerOption[]>([]);
  
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
  
  // Default hole data - normally this would come from a course database
  const [holeScores, setHoleScores] = useState<HoleScore[]>([
    { hole: 1, handicap: 7, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false },
    { hole: 2, handicap: 3, par: 5, pace: 18, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false },
    { hole: 3, handicap: 15, par: 3, pace: 12, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false },
    { hole: 4, handicap: 11, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false },
    { hole: 5, handicap: 5, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false },
    { hole: 6, handicap: 9, par: 3, pace: 12, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false },
    { hole: 7, handicap: 1, par: 5, pace: 17, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false },
    { hole: 8, handicap: 13, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false },
    { hole: 9, handicap: 17, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false },
  ]);

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
        
        // Create a flat list of all available players from all teams
        const allPlayers: PlayerOption[] = [];
        data.teams.forEach((team: Team) => {
          team.members.forEach((member: TeamMember) => {
            allPlayers.push({
              name: member.name,
              teamName: team.name,
              handicap: member.handicap
            });
          });
        });
        
        setPlayerOptions(allPlayers);
      } catch (error) {
        console.error('Error fetching event:', error);
        setError('Failed to load event data');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [params.id]);

  const handlePlayer1Change = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPlayerName = event.target.value;
    const selectedPlayer = playerOptions.find(player => player.name === selectedPlayerName);
    
    if (selectedPlayer) {
      setNewMatch({
        ...newMatch,
        player1: {
          name: selectedPlayer.name,
          teamName: selectedPlayer.teamName,
          score: 0
        }
      });
    }
  };

  const handlePlayer2Change = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPlayerName = event.target.value;
    const selectedPlayer = playerOptions.find(player => player.name === selectedPlayerName);
    
    if (selectedPlayer) {
      setNewMatch({
        ...newMatch,
        player2: {
          name: selectedPlayer.name,
          teamName: selectedPlayer.teamName,
          score: 0
        }
      });
    }
  };
  
  const handleHoleScoreChange = (
    holeIndex: number, 
    player: 'player1Score' | 'player2Score', 
    value: number
  ) => {
    const updatedHoleScores = [...holeScores];
    updatedHoleScores[holeIndex][player] = value;
    setHoleScores(updatedHoleScores);
    
    // Update total scores
    if (player === 'player1Score') {
      const totalScore = updatedHoleScores.reduce((sum, hole) => sum + hole.player1Score, 0);
      setNewMatch({
        ...newMatch,
        player1: {
          ...newMatch.player1,
          score: totalScore
        }
      });
    } else {
      const totalScore = updatedHoleScores.reduce((sum, hole) => sum + hole.player2Score, 0);
      setNewMatch({
        ...newMatch,
        player2: {
          ...newMatch.player2,
          score: totalScore
        }
      });
    }
  };

  const handlePuttChange = (
    holeIndex: number,
    player: 'player1Putt' | 'player2Putt',
    checked: boolean
  ) => {
    const updatedHoleScores = [...holeScores];
    updatedHoleScores[holeIndex][player] = checked;
    setHoleScores(updatedHoleScores);
  };

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!newMatch.player1.name || !newMatch.player1.teamName || 
          !newMatch.player2.name || !newMatch.player2.teamName) {
        setError('Please select both players for the match');
        return;
      }
      
      if (newMatch.player1.name === newMatch.player2.name) {
        setError('Please select different players');
        return;
      }
      
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: params.id,
          player1: {
            ...newMatch.player1,
            putts: holeScores.filter(h => h.player1Putt).length
          },
          player2: {
            ...newMatch.player2,
            putts: holeScores.filter(h => h.player2Putt).length
          },
          holes: holeScores
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

  // Handle cancel button click
  const handleCancel = () => {
    router.push(`/events/${params.id}`);
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
          <button 
            onClick={handleCancel}
            className="px-4 py-2 bg-white text-black border border-gray-300 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
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
              <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Player 1 dropdown */}
                <div>
                  <label htmlFor="player1" className="block text-sm font-medium text-gray-700 mb-2">
                    Player 1
                  </label>
                  <select
                    id="player1"
                    value={newMatch.player1.name}
                    onChange={handlePlayer1Change}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  >
                    <option value="">Select Player 1</option>
                    {playerOptions.map((player, idx) => (
                      <option 
                        key={`p1-${idx}`} 
                        value={player.name}
                        disabled={player.name === newMatch.player2.name}
                      >
                        {player.name} ({player.teamName})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Player 2 dropdown */}
                <div>
                  <label htmlFor="player2" className="block text-sm font-medium text-gray-700 mb-2">
                    Player 2
                  </label>
                  <select
                    id="player2"
                    value={newMatch.player2.name}
                    onChange={handlePlayer2Change}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  >
                    <option value="">Select Player 2</option>
                    {playerOptions.map((player, idx) => (
                      <option 
                        key={`p2-${idx}`} 
                        value={player.name}
                        disabled={player.name === newMatch.player1.name}
                      >
                        {player.name} ({player.teamName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Display player information if selected */}
              {(newMatch.player1.name || newMatch.player2.name) && (
                <div className="mb-8 grid grid-cols-2 gap-6">
                  <div>
                    {newMatch.player1.name && (
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="text-lg font-medium text-black">{newMatch.player1.name}</h3>
                        <p className="text-sm text-gray-500">Team: {newMatch.player1.teamName}</p>
                        <p className="text-sm text-gray-500">Handicap: {
                          playerOptions.find(p => p.name === newMatch.player1.name)?.handicap || 0
                        }</p>
                      </div>
                    )}
                  </div>
                  <div>
                    {newMatch.player2.name && (
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="text-lg font-medium text-black">{newMatch.player2.name}</h3>
                        <p className="text-sm text-gray-500">Team: {newMatch.player2.teamName}</p>
                        <p className="text-sm text-gray-500">Handicap: {
                          playerOptions.find(p => p.name === newMatch.player2.name)?.handicap || 0
                        }</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Scoring table */}
              {newMatch.player1.name && newMatch.player2.name && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Score by Hole</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hole
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Par
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {newMatch.player1.name}
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            1 Putt
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {newMatch.player2.name}
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            1 Putt
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {holeScores.map((hole, idx) => (
                          <tr key={`hole-${hole.hole}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {hole.hole}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {hole.par}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="number"
                                min="0"
                                value={hole.player1Score}
                                onChange={(e) => handleHoleScoreChange(idx, 'player1Score', parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={hole.player1Putt}
                                onChange={(e) => handlePuttChange(idx, 'player1Putt', e.target.checked)}
                                className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="number"
                                min="0"
                                value={hole.player2Score}
                                onChange={(e) => handleHoleScoreChange(idx, 'player2Score', parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={hole.player2Putt}
                                onChange={(e) => handlePuttChange(idx, 'player2Putt', e.target.checked)}
                                className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                            </td>
                          </tr>
                        ))}
                        {/* Total row */}
                        <tr className="bg-gray-100 font-bold">
                          <td colSpan={2} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                            Total:
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {newMatch.player1.score}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900">
                            {holeScores.filter(h => h.player1Putt).length}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {newMatch.player2.score}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900">
                            {holeScores.filter(h => h.player2Putt).length}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-8">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 border border-gray-300 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
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