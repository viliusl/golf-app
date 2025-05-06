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

interface Match {
  _id: string;
  eventId: string;
  player1: {
    name: string;
    teamName: string;
    score: number;
    holeWins?: number;
    putts?: number;
  };
  player2: {
    name: string;
    teamName: string;
    score: number;
    holeWins?: number;
    putts?: number;
  };
  teeTime: string;
  tee: number;
  holes: HoleScore[];
  completed: boolean;
  createdAt: string;
}

export default function EditMatch({ params }: { params: { id: string; matchId: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerOptions, setPlayerOptions] = useState<PlayerOption[]>([]);
  const [holeScores, setHoleScores] = useState<HoleScore[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch both event and match data in parallel
        const [eventResponse, matchResponse] = await Promise.all([
          fetch(`/api/events?id=${params.id}`),
          fetch(`/api/matches?id=${params.matchId}`)
        ]);
        
        if (!eventResponse.ok) {
          throw new Error(`HTTP error fetching event! status: ${eventResponse.status}`);
        }
        
        if (!matchResponse.ok) {
          throw new Error(`HTTP error fetching match! status: ${matchResponse.status}`);
        }
        
        const eventData = await eventResponse.json();
        const matchData = await matchResponse.json();
        
        // Ensure the teams array exists in event data
        if (!eventData.teams) {
          eventData.teams = [];
        }
        
        setEvent(eventData);
        setMatch(matchData);
        
        // Create a flat list of all available players from all teams
        const allPlayers: PlayerOption[] = [];
        eventData.teams.forEach((team: Team) => {
          team.members.forEach((member: TeamMember) => {
            allPlayers.push({
              name: member.name,
              teamName: team.name,
              handicap: member.handicap
            });
          });
        });
        
        setPlayerOptions(allPlayers);
        
        // Set hole scores from match data
        if (matchData.holes && matchData.holes.length > 0) {
          console.log('Original match holes:', JSON.stringify(matchData.holes, null, 2));
          
          // Make sure each hole has properly defined values
          const validatedHoleScores = matchData.holes.map((hole: any) => {
            const player1ScoreVal = typeof hole.player1Score === 'string' 
              ? parseInt(hole.player1Score) || 0 
              : (hole.player1Score || 0);
              
            const player2ScoreVal = typeof hole.player2Score === 'string' 
              ? parseInt(hole.player2Score) || 0 
              : (hole.player2Score || 0);
            
            console.log(`Processing hole ${hole.hole}:`);
            console.log(`Original - player1Score: ${hole.player1Score} (${typeof hole.player1Score}), player2Score: ${hole.player2Score} (${typeof hole.player2Score})`);
            console.log(`Converted - player1Score: ${player1ScoreVal} (${typeof player1ScoreVal}), player2Score: ${player2ScoreVal} (${typeof player2ScoreVal})`);
            
            return {
              ...hole,
              player1Score: player1ScoreVal,
              player2Score: player2ScoreVal,
              player1Putt: !!hole.player1Putt,
              player2Putt: !!hole.player2Putt,
              winner: hole.winner || 'tie'
            };
          });
          
          console.log('Validated hole scores:', JSON.stringify(validatedHoleScores, null, 2));
          setHoleScores(validatedHoleScores);
          
          // Initial calculation of totals based on loaded data
          const player1Handicap = allPlayers.find(p => p.name === matchData.player1.name)?.handicap || 0;
          const player2Handicap = allPlayers.find(p => p.name === matchData.player2.name)?.handicap || 0;
          
          let player1TotalScore = 0;
          let player2TotalScore = 0;
          
          // Calculate scores for each hole and sum them up
          validatedHoleScores.forEach((hole: HoleScore) => {
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
          
          // Count hole wins
          const player1Wins = validatedHoleScores.filter((h: HoleScore) => h.winner === 'player1').length;
          const player2Wins = validatedHoleScores.filter((h: HoleScore) => h.winner === 'player2').length;
          
          // Add 32 points for the player who won more holes
          if (player1Wins > player2Wins) {
            player1TotalScore += 32;
          } else if (player2Wins > player1Wins) {
            player2TotalScore += 32;
          }
          
          // Update match with calculated values
          matchData.player1.score = player1TotalScore;
          matchData.player1.holeWins = player1Wins;
          matchData.player2.score = player2TotalScore;
          matchData.player2.holeWins = player2Wins;
        } else {
          // Default hole data if not available
          setHoleScores([
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
            { hole: 12, handicap: 14, par: 5, pace: 17, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
            { hole: 13, handicap: 18, par: 3, pace: 12, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
            { hole: 14, handicap: 4, par: 5, pace: 17, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
            { hole: 15, handicap: 8, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
            { hole: 16, handicap: 6, par: 3, pace: 12, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
            { hole: 17, handicap: 16, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
            { hole: 18, handicap: 10, par: 4, pace: 15, player1Score: 0, player2Score: 0, player1Putt: false, player2Putt: false, winner: 'tie' },
          ]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, params.matchId]);

  useEffect(() => {
    // Log the hole scores to debug
    console.log('Current hole scores in state:', holeScores);
  }, [holeScores]);

  const handleEditMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) return;
    setError(null);
    
    try {
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
        player1: {
          ...match.player1,
          putts: player1PuttCount
        },
        player2: {
          ...match.player2,
          putts: player2PuttCount
        },
        teeTime: match.teeTime,
        tee: match.tee,
        holes: validatedHoleScores,
        completed: match.completed
      };
      
      console.log('Sending match update data to API:', JSON.stringify(matchData, null, 2));
    
      const response = await fetch(`/api/matches?id=${match._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to update match');
      }
      
      // Get the updated match data
      const updatedMatch = await response.json();
      console.log('Match updated successfully:', JSON.stringify(updatedMatch, null, 2));

      // Navigate back to event details page
      router.push(`/events/${params.id}`);
    } catch (error) {
      console.error('Error updating match:', error);
      setError(error instanceof Error ? error.message : 'Failed to update match');
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    router.push(`/events/${params.id}`);
  };

  const handleHoleScoreChange = (
    holeIndex: number, 
    player: 'player1Score' | 'player2Score', 
    value: number
  ) => {
    if (!match) return;
    
    const updatedHoleScores = [...holeScores];
    updatedHoleScores[holeIndex][player] = value;
    
    // Get the hole and update its data
    const hole = updatedHoleScores[holeIndex];
    
    // Get player handicaps
    const player1Handicap = playerOptions.find(p => p.name === match.player1.name)?.handicap || 0;
    const player2Handicap = playerOptions.find(p => p.name === match.player2.name)?.handicap || 0;
    
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
    if (!match) return;
    
    const updatedHoleScores = [...holeScores];
    updatedHoleScores[holeIndex][player] = checked;
    
    // Get the hole
    const hole = updatedHoleScores[holeIndex];
    
    // If both players have scores, recalculate the winner
    if (hole.player1Score > 0 && hole.player2Score > 0) {
      // Get player handicaps
      const player1Handicap = playerOptions.find(p => p.name === match.player1.name)?.handicap || 0;
      const player2Handicap = playerOptions.find(p => p.name === match.player2.name)?.handicap || 0;
      
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
    if (!match) return;
    
    const player1Handicap = playerOptions.find(p => p.name === match.player1.name)?.handicap || 0;
    const player2Handicap = playerOptions.find(p => p.name === match.player2.name)?.handicap || 0;
    
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
    
    setMatch({
      ...match,
      player1: {
        ...match.player1,
        score: player1TotalScore,
        holeWins: player1Wins
      },
      player2: {
        ...match.player2,
        score: player2TotalScore,
        holeWins: player2Wins
      },
      holes: updatedHoleScores
    });
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

  if (!match || !event) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-black">Match or event not found</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-black">Edit Match</h1>
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

        <div className="bg-white rounded-lg shadow-sm p-8">
          <form onSubmit={handleEditMatch}>
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Player 1 info */}
              <div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-lg font-medium text-black">{match.player1.name}</h3>
                  <p className="text-sm text-gray-500">Team: {match.player1.teamName}</p>
                  <p className="text-sm text-gray-500">Handicap: {
                    playerOptions.find(p => p.name === match.player1.name)?.handicap || 0
                  }</p>
                </div>
              </div>
              
              {/* Player 2 info */}
              <div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-lg font-medium text-black">{match.player2.name}</h3>
                  <p className="text-sm text-gray-500">Team: {match.player2.teamName}</p>
                  <p className="text-sm text-gray-500">Handicap: {
                    playerOptions.find(p => p.name === match.player2.name)?.handicap || 0
                  }</p>
                </div>
              </div>
            </div>
              
            {/* Tee Time and Tee input */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Tee Time input */}
              <div>
                <label htmlFor="teeTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Tee Time
                </label>
                <input
                  type="datetime-local"
                  id="teeTime"
                  value={match.teeTime?.slice(0, 16) || ''}
                  onChange={(e) => setMatch({
                    ...match,
                    teeTime: e.target.value
                  })}
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
                  value={match.tee || 1}
                  onChange={(e) => setMatch({
                    ...match,
                    tee: parseInt(e.target.value) || 1
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
            </div>
              
            {/* Match completed checkbox */}
            <div className="mb-4">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={match.completed || false}
                  onChange={(e) => setMatch({
                    ...match,
                    completed: e.target.checked
                  })}
                  className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                Match Completed
              </label>
            </div>
            
            {/* Scoring table */}
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
                        {match.player1.name}
                      </th>
                      <th colSpan={4} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r-2 border-gray-300 bg-green-50">
                        {match.player2.name}
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
                    {holeScores.map((hole, idx) => {
                      console.log(`Rendering hole ${hole.hole} player1Score: ${hole.player1Score}, type: ${typeof hole.player1Score}`);
                      console.log(`Rendering hole ${hole.hole} player2Score: ${hole.player2Score}, type: ${typeof hole.player2Score}`);
                      
                      return (
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
                              value={Number(hole.player1Score) > 0 ? Number(hole.player1Score) : ''}
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
                              const player1Handicap = playerOptions.find(p => p.name === match.player1.name)?.handicap || 0;
                              const player2Handicap = playerOptions.find(p => p.name === match.player2.name)?.handicap || 0;
                              const [player1EffHcp, _] = calculateEffectiveHandicap(player1Handicap, player2Handicap, hole.handicap);
                              return player1EffHcp;
                            })()}
                          </td>
                          <td className={`px-3 py-1 whitespace-nowrap text-xs font-medium text-center border-r-2 border-gray-300 bg-blue-50 ${
                            hole.player1Score > 0 ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {hole.player1Score > 0 ? 
                              (() => {
                                const player1Handicap = playerOptions.find(p => p.name === match.player1.name)?.handicap || 0;
                                const player2Handicap = playerOptions.find(p => p.name === match.player2.name)?.handicap || 0;
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
                              value={Number(hole.player2Score) > 0 ? Number(hole.player2Score) : ''}
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
                              const player1Handicap = playerOptions.find(p => p.name === match.player1.name)?.handicap || 0;
                              const player2Handicap = playerOptions.find(p => p.name === match.player2.name)?.handicap || 0;
                              const [_, player2EffHcp] = calculateEffectiveHandicap(player1Handicap, player2Handicap, hole.handicap);
                              return player2EffHcp;
                            })()}
                          </td>
                          <td className={`px-3 py-1 whitespace-nowrap text-xs font-medium text-center border-r-2 border-gray-300 bg-green-50 ${
                            hole.player2Score > 0 ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {hole.player2Score > 0 ? 
                              (() => {
                                const player1Handicap = playerOptions.find(p => p.name === match.player1.name)?.handicap || 0;
                                const player2Handicap = playerOptions.find(p => p.name === match.player2.name)?.handicap || 0;
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
                            {hole.player1Score > 0 && hole.player2Score > 0 ? (
                              (() => {
                                console.log(`Rendering winner for hole ${hole.hole}: winner=${hole.winner}`);
                                if (hole.winner === 'player1') {
                                  return <span className="text-blue-600">{match.player1.name.split(' ')[0]}</span>;
                                } else if (hole.winner === 'player2') {
                                  return <span className="text-green-600">{match.player2.name.split(' ')[0]}</span>;
                                } else {
                                  return <span className="text-gray-600">Tie</span>;
                                }
                              })()
                            ) : ''}
                          </td>
                        </tr>
                      );
                    })}
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
                          const player1Handicap = playerOptions.find(p => p.name === match.player1.name)?.handicap || 0;
                          const player2Handicap = playerOptions.find(p => p.name === match.player2.name)?.handicap || 0;
                          
                          // Sum of effective handicaps for player 1 across all holes
                          return holeScores.reduce((total, hole) => {
                            const [player1EffHcp, _] = calculateEffectiveHandicap(player1Handicap, player2Handicap, hole.handicap);
                            return total + player1EffHcp;
                          }, 0);
                        })()}
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center bg-blue-50 border-r-2 border-gray-300 text-green-600">
                        {match.player1.score}
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
                          const player1Handicap = playerOptions.find(p => p.name === match.player1.name)?.handicap || 0;
                          const player2Handicap = playerOptions.find(p => p.name === match.player2.name)?.handicap || 0;
                          
                          // Sum of effective handicaps for player 2 across all holes
                          return holeScores.reduce((total, hole) => {
                            const [_, player2EffHcp] = calculateEffectiveHandicap(player1Handicap, player2Handicap, hole.handicap);
                            return total + player2EffHcp;
                          }, 0);
                        })()}
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center bg-green-50 border-r-2 border-gray-300 text-green-600">
                        {match.player2.score}
                      </td>
                      
                      {/* Overall winner */}
                      <td className="px-3 py-1 whitespace-nowrap text-xs text-center text-gray-900">
                        {match.player1.score > 0 && match.player2.score > 0 ? (
                          (() => {
                            // Determine winner by number of holes won
                            const player1Wins = holeScores.filter(h => h.winner === 'player1').length;
                            const player2Wins = holeScores.filter(h => h.winner === 'player2').length;
                            
                            if (player1Wins > player2Wins) {
                              return <span className="text-blue-600">{match.player1.name.split(' ')[0]} ({player1Wins} holes)</span>;
                            } else if (player2Wins > player1Wins) {
                              return <span className="text-green-600">{match.player2.name.split(' ')[0]} ({player2Wins} holes)</span>;
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
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
} 