'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { calculateEffectiveHandicap } from '@/lib/handicap';
import { calculateScore } from '@/lib/scoring';

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
  displayInScorecard: boolean;
}

interface PlayerOption {
  name: string;
  teamName: string;
  handicap: number;
  player_handicap: number;
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
  winner: string; // 'player1', 'player2', or 'tie'
}

export default function AddMatch({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerOptions, setPlayerOptions] = useState<PlayerOption[]>([]);
  const [availablePlayerOptions, setAvailablePlayerOptions] = useState<PlayerOption[]>([]);
  const [existingMatches, setExistingMatches] = useState<any[]>([]);
  
  const [newMatch, setNewMatch] = useState<{
    player1: {
      name: string;
      teamName: string;
      score: number;
      holeWins?: number;
    };
    player2: {
      name: string;
      teamName: string;
      score: number;
      holeWins?: number;
    };
    teeTime: string;
    tee?: number;
  }>({
    player1: { name: '', teamName: '', score: 0, holeWins: 0 },
    player2: { name: '', teamName: '', score: 0, holeWins: 0 },
    teeTime: new Date().toISOString().slice(0, 16),
    tee: 1
  });
  
  // Default hole data for a full 18-hole course
  const [holeScores, setHoleScores] = useState<HoleScore[]>([
    { hole: 1, handicap: 13, par: 5, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 2, handicap: 11, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 3, handicap: 9, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 4, handicap: 17, par: 3, pace: 12, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 5, handicap: 1, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 6, handicap: 15, par: 3, pace: 12, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 7, handicap: 7, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 8, handicap: 5, par: 5, pace: 17, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 9, handicap: 3, par: 3, pace: 12, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 10, handicap: 12, par: 5, pace: 17, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 11, handicap: 2, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 12, handicap: 14, par: 4, pace: 17, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 13, handicap: 18, par: 3, pace: 12, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 14, handicap: 4, par: 5, pace: 17, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 15, handicap: 8, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 16, handicap: 6, par: 3, pace: 12, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 17, handicap: 16, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
    { hole: 18, handicap: 10, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
  ]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        // Fetch event data
        const response = await fetch(`/api/events?id=${params.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setEvent(data);
        
        // Fetch teams data
        const teamsResponse = await fetch('/api/teams');
        if (!teamsResponse.ok) {
          throw new Error(`HTTP error! status: ${teamsResponse.status}`);
        }
        const teamsData = await teamsResponse.json();
        
        // Fetch free players
        const playersResponse = await fetch('/api/players');
        if (!playersResponse.ok) {
          throw new Error(`HTTP error! status: ${playersResponse.status}`);
        }
        const freePlayersData = await playersResponse.json();
        
        // Create a map of team members
        const allPlayers: PlayerOption[] = [];
        
        // Add players from teams
        data.teams.forEach((eventTeam: any) => {
          const teamData = teamsData.find((t: any) => t._id === eventTeam._id);
          if (teamData) {
            teamData.members.forEach((member: any) => {
              allPlayers.push({
                name: member.name,
                teamName: teamData.name,
                handicap: member.handicap,
                player_handicap: member.player_handicap || 0
              });
            });
          }
        });
        
        // Add free players if they exist
        if (data.freePlayers && Array.isArray(data.freePlayers)) {
          data.freePlayers.forEach((player: any) => {
            const freePlayer = freePlayersData.find((p: any) => p._id === player.playerId);
            if (freePlayer) {
              allPlayers.push({
                name: freePlayer.name,
                teamName: 'Free Player',
                handicap: freePlayer.handicap,
                player_handicap: freePlayer.player_handicap || 0
              });
            }
          });
        }
        
        console.log('All players:', allPlayers);
        setPlayerOptions(allPlayers);
        
        // Now fetch existing matches for this event
        const matchesResponse = await fetch(`/api/matches?eventId=${params.id}`);
        if (!matchesResponse.ok) {
          throw new Error(`HTTP error! status: ${matchesResponse.status}`);
        }
        const matchesData = await matchesResponse.json();
        setExistingMatches(matchesData);
        
        // Use all players for the dropdown options
        setAvailablePlayerOptions(allPlayers);
        
        // Set the default tee time to event date with current time
        if (data.date) {
          const eventDate = new Date(data.date);
          const now = new Date();
          
          // Combine event date with current time
          eventDate.setHours(now.getHours());
          eventDate.setMinutes(now.getMinutes());
          
          setNewMatch(prevMatch => ({
            ...prevMatch,
            teeTime: eventDate.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:MM
          }));
        }
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
    const selectedPlayer = availablePlayerOptions.find(player => player.name === selectedPlayerName);
    
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
    const selectedPlayer = availablePlayerOptions.find(player => player.name === selectedPlayerName);
    
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
    
    // Get the hole and update its data
    const hole = updatedHoleScores[holeIndex];
    
    // Get player handicaps
    const player1Handicap = playerOptions.find(p => p.name === newMatch.player1.name)?.handicap || 0;
    const player2Handicap = playerOptions.find(p => p.name === newMatch.player2.name)?.handicap || 0;
    
    // Get effective handicaps
    const [player1EffHcp, player2EffHcp] = calculateEffectiveHandicap(
      player1Handicap, 
      player2Handicap, 
      hole.handicap
    );
    
    // Calculate scores and determine winner
    const result = calculateScore(
      player1EffHcp, 
      hole.player1Score, 
      hole.player1Putt,
      player2EffHcp, 
      hole.player2Score, 
      hole.player2Putt,
      hole.par
    );
    
    // Update the winner
    hole.winner = result.winner;
    
    console.log(`handleHoleScoreChange - Hole ${holeIndex+1}: Set winner to ${result.winner}`);
    console.log(`P1: ${hole.player1Score} (${player1EffHcp}), P2: ${hole.player2Score} (${player2EffHcp})`);
    console.log(`Result scores - P1: ${result.player1Score}, P2: ${result.player2Score}`);
    
    setHoleScores(updatedHoleScores);
    
    calculateAndUpdateTotalScores(updatedHoleScores);
  };

  const handlePuttChange = (
    holeIndex: number,
    player: 'player1Putt' | 'player2Putt',
    checked: boolean
  ) => {
    const updatedHoleScores = [...holeScores];
    updatedHoleScores[holeIndex][player] = checked;
    
    // Get the hole
    const hole = updatedHoleScores[holeIndex];
    
    // If both players have scores, recalculate the winner
    if (hole.player1Score > 0 && hole.player2Score > 0) {
      // Get player handicaps
      const player1Handicap = playerOptions.find(p => p.name === newMatch.player1.name)?.handicap || 0;
      const player2Handicap = playerOptions.find(p => p.name === newMatch.player2.name)?.handicap || 0;
      
      // Get effective handicaps
      const [player1EffHcp, player2EffHcp] = calculateEffectiveHandicap(
        player1Handicap, 
        player2Handicap, 
        hole.handicap
      );
      
      // Calculate scores and determine winner
      const result = calculateScore(
        player1EffHcp, 
        hole.player1Score, 
        hole.player1Putt,
        player2EffHcp, 
        hole.player2Score, 
        hole.player2Putt,
        hole.par
      );
      
      // Update the winner
      hole.winner = result.winner;
      
      console.log(`handlePuttChange - Hole ${holeIndex+1}: Set winner to ${result.winner}`);
      console.log(`P1: ${hole.player1Score} (${player1EffHcp}) Putt: ${hole.player1Putt}, P2: ${hole.player2Score} (${player2EffHcp}) Putt: ${hole.player2Putt}`);
      console.log(`Result scores - P1: ${result.player1Score}, P2: ${result.player2Score}`);
    }
    
    setHoleScores(updatedHoleScores);
    
    // Recalculate total scores when putt changes
    calculateAndUpdateTotalScores(updatedHoleScores);
  };

  // Helper function to calculate and update total scores
  const calculateAndUpdateTotalScores = (updatedHoleScores: HoleScore[]) => {
    const player1Handicap = playerOptions.find(p => p.name === newMatch.player1.name)?.handicap || 0;
    const player2Handicap = playerOptions.find(p => p.name === newMatch.player2.name)?.handicap || 0;
    
    let player1TotalScore = 0;
    let player2TotalScore = 0;
    
    // Calculate scores for each hole and sum them up
    updatedHoleScores.forEach(hole => {
      if (hole.player1Score === 0 && hole.player2Score === 0) {
        return; // Skip holes where neither player has a score
      }
      
      const [player1EffHcp, player2EffHcp] = calculateEffectiveHandicap(
        player1Handicap, 
        player2Handicap, 
        hole.handicap
      );
      
      const result = calculateScore(
        player1EffHcp, 
        hole.player1Score, 
        hole.player1Putt,
        player2EffHcp, 
        hole.player2Score, 
        hole.player2Putt,
        hole.par
      );
      
      player1TotalScore += result.player1Score;
      player2TotalScore += result.player2Score;
    });
    
    // Count hole wins for each player
    const player1Wins = updatedHoleScores.filter(h => h.winner === 'player1').length;
    const player2Wins = updatedHoleScores.filter(h => h.winner === 'player2').length;
    
    // Add 32 points for the player who won more holes
    if (player1Wins > player2Wins) {
      player1TotalScore += 32;
    } else if (player2Wins > player1Wins) {
      player2TotalScore += 32;
    }
    
    console.log('--- Summary ---');
    console.log(`Player 1 wins: ${player1Wins} holes`);
    console.log(`Player 2 wins: ${player2Wins} holes`);
    console.log('Individual hole winners:');
    updatedHoleScores.forEach((hole, idx) => {
      if (hole.player1Score > 0 && hole.player2Score > 0) {
        console.log(`Hole ${idx+1}: winner=${hole.winner}`);
      }
    });
    
    setNewMatch({
      ...newMatch,
      player1: {
        ...newMatch.player1,
        score: player1TotalScore,
        holeWins: player1Wins
      },
      player2: {
        ...newMatch.player2,
        score: player2TotalScore,
        holeWins: player2Wins
      }
    });
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
      
      // Validate hole scores have numeric values 
      const validatedHoleScores = holeScores.map(hole => ({
        ...hole,
        player1Score: Number(hole.player1Score) || 0,
        player2Score: Number(hole.player2Score) || 0
      }));
      
      // Calculate putt counts
      const player1PuttCount = validatedHoleScores.filter(h => h.player1Putt).length;
      const player2PuttCount = validatedHoleScores.filter(h => h.player2Putt).length;
      
      // Prepare match data
      const matchData = {
        eventId: params.id,
        player1: {
          ...newMatch.player1,
          putts: player1PuttCount,
          handicap: playerOptions.find(p => p.name === newMatch.player1.name)?.handicap || 0,
          player_handicap: playerOptions.find(p => p.name === newMatch.player1.name)?.player_handicap || 0
        },
        player2: {
          ...newMatch.player2,
          putts: player2PuttCount,
          handicap: playerOptions.find(p => p.name === newMatch.player2.name)?.handicap || 0,
          player_handicap: playerOptions.find(p => p.name === newMatch.player2.name)?.player_handicap || 0
        },
        teeTime: newMatch.teeTime,
        tee: newMatch.tee,
        holes: validatedHoleScores
      };
      
      console.log('Sending match data to API:', JSON.stringify(matchData, null, 2));
      
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create match');
      }

      // Get the created match data
      const createdMatch = await response.json();
      console.log('Match created successfully:', JSON.stringify(createdMatch, null, 2));

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
                    {availablePlayerOptions.map((player, idx) => (
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
                    {availablePlayerOptions.map((player, idx) => (
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
                        <p className="text-sm text-gray-500">Playing Handicap: {
                          playerOptions.find(p => p.name === newMatch.player1.name)?.handicap || 0
                        }</p>
                        <p className="text-sm text-gray-500">Handicap: {
                          playerOptions.find(p => p.name === newMatch.player1.name)?.player_handicap || 0
                        }</p>
                      </div>
                    )}
                  </div>
                  <div>
                    {newMatch.player2.name && (
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="text-lg font-medium text-black">{newMatch.player2.name}</h3>
                        <p className="text-sm text-gray-500">Team: {newMatch.player2.teamName}</p>
                        <p className="text-sm text-gray-500">Playing Handicap: {
                          playerOptions.find(p => p.name === newMatch.player2.name)?.handicap || 0
                        }</p>
                        <p className="text-sm text-gray-500">Handicap: {
                          playerOptions.find(p => p.name === newMatch.player2.name)?.player_handicap || 0
                        }</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Tee Time and Tee input */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Tee Time input */}
                <div>
                  <label htmlFor="teeTime" className="block text-sm font-medium text-gray-700 mb-2">
                    Tee Time
                  </label>
                  <input
                    type="time"
                    id="teeTime"
                    value={newMatch.teeTime ? new Date(newMatch.teeTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''}
                    onChange={(e) => {
                      if (event?.date) {
                        const eventDate = new Date(event.date);
                        const [hours, minutes] = e.target.value.split(':');
                        eventDate.setHours(parseInt(hours));
                        eventDate.setMinutes(parseInt(minutes));
                        setNewMatch({
                          ...newMatch,
                          teeTime: eventDate.toISOString()
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  />
                </div>
                
                {/* Tee (starting hole) input */}
                <div>
                  <label htmlFor="tee" className="block text-sm font-medium text-gray-700 mb-2">
                    Tee
                  </label>
                  <input
                    type="number"
                    id="tee"
                    min="1"
                    max="18"
                    value={newMatch.tee || ''}
                    onChange={(e) => setNewMatch({
                      ...newMatch,
                      tee: e.target.value === '' ? undefined : parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  />
                </div>
              </div>
              
              {/* Scoring table */}
              {newMatch.player1.name && newMatch.player2.name && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Score by Hole</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs divide-y divide-gray-200 border border-gray-200">
                      <colgroup>
                        <col className="w-12" /> {/* Hole */}
                        <col className="w-12" /> {/* Hcp */}
                        <col className="w-12" style={{borderRight: '2px solid #e5e7eb'}} /> {/* Par */}
                        <col className="w-16" /> {/* Player 1 Strokes */}
                        <col className="w-12" /> {/* Player 1 1 Putt */}
                        <col className="w-16" /> {/* Player 1 Eff Hcp */}
                        <col className="w-16" style={{borderRight: '2px solid #e5e7eb'}} /> {/* Player 1 Score */}
                        <col className="w-16" /> {/* Player 2 Strokes */}
                        <col className="w-12" /> {/* Player 2 1 Putt */}
                        <col className="w-16" /> {/* Player 2 Eff Hcp */}
                        <col className="w-16" style={{borderRight: '2px solid #e5e7eb'}} /> {/* Player 2 Score */}
                        <col className="w-16" /> {/* Winner */}
                      </colgroup>
                      <thead className="bg-gray-50">
                        <tr>
                          <th colSpan={3} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r-2 border-gray-300">
                            Hole Info
                          </th>
                          <th colSpan={4} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r-2 border-gray-300 bg-blue-50">
                            {newMatch.player1.name}
                          </th>
                          <th colSpan={4} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r-2 border-gray-300 bg-green-50">
                            {newMatch.player2.name}
                          </th>
                          <th rowSpan={2} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Winner
                          </th>
                        </tr>
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                            Hole
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                            Hcp
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r-2 border-gray-300">
                            Par
                          </th>
                          <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 border-r border-gray-200">
                            Strokes
                          </th>
                          <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 border-r border-gray-200">
                            1 Putt
                          </th>
                          <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 border-r border-gray-200">
                            Eff Hcp
                          </th>
                          <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 border-r-2 border-gray-300">
                            Score
                          </th>
                          <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 border-r border-gray-200">
                            Strokes
                          </th>
                          <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 border-r border-gray-200">
                            1 Putt
                          </th>
                          <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 border-r border-gray-200">
                            Eff Hcp
                          </th>
                          <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 border-r-2 border-gray-300">
                            Score
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {holeScores.map((hole, idx) => (
                          <tr key={`hole-${hole.hole}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-1 whitespace-nowrap text-xs font-medium text-gray-900 border-r border-gray-200">
                              {hole.hole}
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-500 border-r border-gray-200">
                              {hole.handicap}
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-500 border-r-2 border-gray-300">
                              {hole.par}
                            </td>
                            {/* Player 1 columns with blue tint */}
                            <td className="px-3 py-1 whitespace-nowrap border-r border-gray-200 bg-blue-50">
                              <input
                                type="number"
                                min="0"
                                value={hole.player1Score === 0 ? '' : hole.player1Score}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  handleHoleScoreChange(idx, 'player1Score', val);
                                }}
                                className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded-md text-center text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-center border-r border-gray-200 bg-blue-50">
                              <input
                                type="checkbox"
                                checked={hole.player1Putt}
                                onChange={(e) => handlePuttChange(idx, 'player1Putt', e.target.checked)}
                                className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-600 text-center border-r border-gray-200 bg-blue-50">
                              {(() => {
                                const player1Handicap = playerOptions.find(p => p.name === newMatch.player1.name)?.handicap || 0;
                                const player2Handicap = playerOptions.find(p => p.name === newMatch.player2.name)?.handicap || 0;
                                const [player1EffHcp, _] = calculateEffectiveHandicap(player1Handicap, player2Handicap, hole.handicap);
                                return player1EffHcp;
                              })()}
                            </td>
                            <td className={`px-3 py-1 whitespace-nowrap text-xs font-medium text-center border-r-2 border-gray-300 bg-blue-50 ${
                              hole.player1Score > 0 ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {hole.player1Score > 0 ? 
                                (() => {
                                  const player1Handicap = playerOptions.find(p => p.name === newMatch.player1.name)?.handicap || 0;
                                  const player2Handicap = playerOptions.find(p => p.name === newMatch.player2.name)?.handicap || 0;
                                  const [player1EffHcp, player2EffHcp] = calculateEffectiveHandicap(player1Handicap, player2Handicap, hole.handicap);
                                  
                                  const result = calculateScore(
                                    player1EffHcp, 
                                    hole.player1Score, 
                                    hole.player1Putt,
                                    player2EffHcp, 
                                    hole.player2Score, 
                                    hole.player2Putt,
                                    hole.par
                                  );
                                  
                                  return result.player1Score;
                                })() 
                              : ''}
                            </td>
                            
                            {/* Player 2 columns with green tint */}
                            <td className="px-3 py-1 whitespace-nowrap border-r border-gray-200 bg-green-50">
                              <input
                                type="number"
                                min="0"
                                value={hole.player2Score === 0 ? '' : hole.player2Score}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  handleHoleScoreChange(idx, 'player2Score', val);
                                }}
                                className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded-md text-center text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-center border-r border-gray-200 bg-green-50">
                              <input
                                type="checkbox"
                                checked={hole.player2Putt}
                                onChange={(e) => handlePuttChange(idx, 'player2Putt', e.target.checked)}
                                className="h-3 w-3 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                            </td>
                            <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-600 text-center border-r border-gray-200 bg-green-50">
                              {(() => {
                                const player1Handicap = playerOptions.find(p => p.name === newMatch.player1.name)?.handicap || 0;
                                const player2Handicap = playerOptions.find(p => p.name === newMatch.player2.name)?.handicap || 0;
                                const [_, player2EffHcp] = calculateEffectiveHandicap(player1Handicap, player2Handicap, hole.handicap);
                                return player2EffHcp;
                              })()}
                            </td>
                            <td className={`px-3 py-1 whitespace-nowrap text-xs font-medium text-center border-r-2 border-gray-300 bg-green-50 ${
                              hole.player2Score > 0 ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {hole.player2Score > 0 ? 
                                (() => {
                                  const player1Handicap = playerOptions.find(p => p.name === newMatch.player1.name)?.handicap || 0;
                                  const player2Handicap = playerOptions.find(p => p.name === newMatch.player2.name)?.handicap || 0;
                                  const [player1EffHcp, player2EffHcp] = calculateEffectiveHandicap(player1Handicap, player2Handicap, hole.handicap);
                                  
                                  const result = calculateScore(
                                    player1EffHcp, 
                                    hole.player1Score, 
                                    hole.player1Putt,
                                    player2EffHcp, 
                                    hole.player2Score, 
                                    hole.player2Putt,
                                    hole.par
                                  );
                                  
                                  return result.player2Score;
                                })() 
                              : ''}
                            </td>
                            
                            {/* Winner column */}
                            <td className="px-3 py-1 whitespace-nowrap text-xs font-medium text-center">
                              {
                                (() => {
                                  // If either player's score is 0, show Tie
                                  if (hole.player1Score === 0 || hole.player2Score === 0) {
                                    return <span className="text-gray-600">Tie</span>;
                                  }

                                  const player1Handicap = playerOptions.find(p => p.name === newMatch.player1.name)?.handicap || 0;
                                  const player2Handicap = playerOptions.find(p => p.name === newMatch.player2.name)?.handicap || 0;
                                  const [player1EffHcp, player2EffHcp] = calculateEffectiveHandicap(player1Handicap, player2Handicap, hole.handicap);

                                  const result = calculateScore(
                                    player1EffHcp, 
                                    hole.player1Score, 
                                    hole.player1Putt,
                                    player2EffHcp, 
                                    hole.player2Score, 
                                    hole.player2Putt,
                                    hole.par
                                  );

                                  if (result.winner === 'player1') {
                                    return <span className="text-blue-600">{newMatch.player1.name.split(' ')[0]}</span>;
                                  } else if (result.winner === 'player2') {
                                    return <span className="text-green-600">{newMatch.player2.name.split(' ')[0]}</span>;
                                  } else {
                                    return <span className="text-gray-600">Tie</span>;
                                  }
                                })()}
                            </td>
                          </tr>
                        ))}
                        {/* Total row */}
                        <tr className="bg-gray-100 font-bold">
                          <td colSpan={3} className="px-3 py-1 whitespace-nowrap text-xs text-right text-gray-900 border-r-2 border-gray-300">
                            Total:
                          </td>
                          {/* Player 1 totals */}
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center bg-blue-50 border-r border-gray-200">
                            {holeScores.reduce((total, hole) => total + (hole.player1Score || 0), 0)}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-center text-gray-900 bg-blue-50 border-r border-gray-200">
                            {holeScores.filter(h => h.player1Putt).length}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center bg-blue-50 border-r border-gray-200">
                            {(() => {
                              const player1Handicap = playerOptions.find(p => p.name === newMatch.player1.name)?.handicap || 0;
                              const player2Handicap = playerOptions.find(p => p.name === newMatch.player2.name)?.handicap || 0;
                              
                              // Sum of effective handicaps for player 1 across all holes
                              return holeScores.reduce((total, hole) => {
                                const [player1EffHcp, _] = calculateEffectiveHandicap(player1Handicap, player2Handicap, hole.handicap);
                                return total + player1EffHcp;
                              }, 0);
                            })()}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center bg-blue-50 border-r-2 border-gray-300 text-green-600">
                            {newMatch.player1.score}
                          </td>
                          
                          {/* Player 2 totals */}
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center bg-green-50 border-r border-gray-200">
                            {holeScores.reduce((total, hole) => total + (hole.player2Score || 0), 0)}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-center text-gray-900 bg-green-50 border-r border-gray-200">
                            {holeScores.filter(h => h.player2Putt).length}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center bg-green-50 border-r border-gray-200">
                            {(() => {
                              const player1Handicap = playerOptions.find(p => p.name === newMatch.player1.name)?.handicap || 0;
                              const player2Handicap = playerOptions.find(p => p.name === newMatch.player2.name)?.handicap || 0;
                              
                              // Sum of effective handicaps for player 2 across all holes
                              return holeScores.reduce((total, hole) => {
                                const [_, player2EffHcp] = calculateEffectiveHandicap(player1Handicap, player2Handicap, hole.handicap);
                                return total + player2EffHcp;
                              }, 0);
                            })()}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center bg-green-50 border-r-2 border-gray-300 text-green-600">
                            {newMatch.player2.score}
                          </td>
                          
                          {/* Overall winner */}
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-center text-gray-900">
                            {newMatch.player1.score > 0 && newMatch.player2.score > 0 ? (
                              (() => {
                                // Determine winner by number of holes won
                                const player1Wins = holeScores.filter(h => h.winner === 'player1').length;
                                const player2Wins = holeScores.filter(h => h.winner === 'player2').length;
                                
                                if (player1Wins > player2Wins) {
                                  return <span className="text-blue-600">{newMatch.player1.name.split(' ')[0]} ({player1Wins} holes)</span>;
                                } else if (player2Wins > player1Wins) {
                                  return <span className="text-green-600">{newMatch.player2.name.split(' ')[0]} ({player2Wins} holes)</span>;
                                } else {
                                    return <span className="text-gray-600">Tie</span>;
                                }
                              })()
                            ) : ''}
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