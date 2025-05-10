'use client';

import { useState, useEffect } from 'react';
import { Player } from '@/app/api/players/route';
import { Match as MatchType, MatchPlayer } from '@/app/api/matches/route';
import Link from 'next/link';
import { calculateEffectiveHandicap } from '@/lib/handicap';
import { useParams } from 'next/navigation';

interface Team {
  _id: string;
  name: string;
  members: {
    playerType: 'free' | 'team_member';
    playerId: string;
  }[];
}

interface OriginalTeam {
  _id: string;
  name: string;
  members: {
    _id: string;
    name: string;
    isCaptain: boolean;
    handicap: number;
    player_handicap?: number;
    tee: 'W' | 'Y' | 'B' | 'R';
    gender: 'Male' | 'Female';
  }[];
}

interface Event {
  _id: string;
  name: string;
  date: string;
  teams: Team[];
  createdAt: string;
  freePlayers?: {
    playerId: string;
  }[];
}

interface PlayerDetails {
  name: string;
  isCaptain: boolean;
  handicap: number;
  player_handicap?: number;
  tee: 'W' | 'Y' | 'B' | 'R';
  gender: 'Male' | 'Female';
}

interface TeamMember {
  _id: string;
  name: string;
  isCaptain: boolean;
  handicap: number;
  player_handicap?: number;
  tee: 'W' | 'Y' | 'B' | 'R';
  gender: 'Male' | 'Female';
}

export default function EventDetails({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<OriginalTeam[]>([]);
  const [freePlayers, setFreePlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchType[]>([]);
  const [playerDetails, setPlayerDetails] = useState<Record<string, PlayerDetails>>({});
  const [loading, setLoading] = useState(true);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [isRenameEventModalOpen, setIsRenameEventModalOpen] = useState(false);
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [isRemoveTeamModalOpen, setIsRemoveTeamModalOpen] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isDeleteMatchModalOpen, setIsDeleteMatchModalOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
  const [matchToDeleteDetails, setMatchToDeleteDetails] = useState<MatchType | null>(null);
  const [selectedTeamForPlayer, setSelectedTeamForPlayer] = useState<Team | null>(null);
  const [teamToRemove, setTeamToRemove] = useState<Team | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ teamId: string; index: number; name: string } | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<{
    name: string;
    isCaptain: boolean;
    handicap: number;
    tee: 'W' | 'Y' | 'B' | 'R';
    gender: 'Male' | 'Female';
  } | null>(null);
  const [memberTeamIdToEdit, setMemberTeamIdToEdit] = useState<string | null>(null);
  const [memberIndexToEdit, setMemberIndexToEdit] = useState<number | null>(null);
  const [newEventName, setNewEventName] = useState('');
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Define fetch functions inside useEffect to properly capture dependencies
    const fetchEventData = async () => {
      try {
        const response = await fetch(`/api/events?id=${params.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched event data:', data);
        
        // Ensure the teams array exists
        if (!data.teams) {
          data.teams = [];
        }
        
        setEvent(data);
      } catch (error) {
        console.error('Error fetching event:', error);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    const fetchTeamsData = async () => {
      try {
        const response = await fetch('/api/teams');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTeams(data);
      } catch (error) {
        console.error('Error fetching teams:', error);
        setError('Failed to load teams');
      }
    };

    const fetchFreePlayersData = async () => {
      try {
        const response = await fetch('/api/players');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setFreePlayers(data);
      } catch (error) {
        console.error('Error fetching free players:', error);
        // Don't set global error to avoid confusing the user
      }
    };
    
    const fetchMatchesData = async () => {
      try {
        const response = await fetch(`/api/matches?eventId=${params.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Data is already sorted by teeTime on the server
        setMatches(data);
      } catch (error) {
        console.error('Error fetching matches:', error);
        // Don't set global error to avoid confusing the user
      }
    };

    fetchEventData();
    fetchTeamsData();
    fetchFreePlayersData();
    fetchMatchesData();
  }, [params.id]);

  // Keep the original fetch functions for use in other event handlers
  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events?id=${params.id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched event data:', data);
      
      // Ensure the teams array exists
      if (!data.teams) {
        data.teams = [];
      }
      
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to load teams');
    }
  };

  const fetchFreePlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFreePlayers(data);
    } catch (error) {
      console.error('Error fetching free players:', error);
      // Don't set global error to avoid confusing the user
    }
  };
  
  const fetchMatches = async () => {
    try {
      const response = await fetch(`/api/matches?eventId=${params.id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Data is already sorted by teeTime on the server
      setMatches(data);
    } catch (error) {
      console.error('Error fetching matches:', error);
      // Don't set global error to avoid confusing the user
    }
  };

  const handleDeleteMatchClick = (match: MatchType) => {
    setMatchToDelete(match._id);
    setMatchToDeleteDetails(match);
    setIsDeleteMatchModalOpen(true);
  };

  const handleDeleteMatch = async () => {
    if (!matchToDelete) return;
    setError(null);
    
    try {
      const response = await fetch(`/api/matches?id=${matchToDelete}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to delete match');
      }

      await fetchMatches();
      setIsDeleteMatchModalOpen(false);
      setMatchToDelete(null);
    } catch (error) {
      console.error('Error deleting match:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete match');
    }
  };

  const handleAddTeam = async (teamId: string) => {
    if (!event) return;
    setError(null);
    
    try {
      console.log('Adding team to event:', teamId);
      console.log('Event ID:', event._id);
      
      const response = await fetch(`/api/events?id=${event._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId
        }),
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData.details || responseData.error || 'Failed to add team');
      }

      console.log('Updated event from API:', responseData);
      setEvent(responseData);
      setIsAddTeamModalOpen(false);
    } catch (error) {
      console.error('Error adding team:', error);
      setError(error instanceof Error ? error.message : 'Failed to add team');
    }
  };

  const handleOpenAddPlayerModal = (team: Team) => {
    setSelectedTeamForPlayer(team);
    setIsAddPlayerModalOpen(true);
  };

  const handleAddPlayerToTeam = async (player: Player) => {
    if (!selectedTeamForPlayer || !event) return;
    setError(null);
    
    try {
      const teamIndex = event.teams.findIndex(team => team._id === selectedTeamForPlayer._id);
      if (teamIndex === -1) {
        throw new Error('Team not found in event');
      }

      const newMember = {
        playerType: 'free' as const,
        playerId: player._id
      };

      event.teams[teamIndex].members.push(newMember);

      const response = await fetch(`/api/events?id=${event._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teams: event.teams
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to add player to team');
      }

      await fetchEvent();
      setIsAddPlayerModalOpen(false);
      setSelectedTeamForPlayer(null);
    } catch (error) {
      console.error('Error adding player to team:', error);
      setError(error instanceof Error ? error.message : 'Failed to add player to team');
    }
  };

  const handleRemoveTeamClick = (team: Team) => {
    setTeamToRemove(team);
    setIsRemoveTeamModalOpen(true);
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!event) return;
    setError(null);
    
    try {
      const response = await fetch(`/api/events?id=${event._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teams: event.teams.filter(team => team._id !== teamId).map(team => team._id)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to remove team');
      }

      const updatedEvent = await response.json();
      setEvent(updatedEvent);
      setIsRemoveTeamModalOpen(false);
      setTeamToRemove(null);
    } catch (error) {
      console.error('Error removing team:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove team');
    }
  };

  const handleRemoveMember = async (teamId: string, memberIndex: number) => {
    if (!event) return;
    setError(null);
    
    try {
      const response = await fetch(`/api/events?id=${event._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          memberIndex
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to remove member');
      }

      const updatedEvent = await response.json();
      setEvent(updatedEvent);
      setIsRemoveMemberModalOpen(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Error removing member:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove member');
    }
  };

  const handleRemoveMemberClick = (teamId: string, index: number, name: string) => {
    setMemberToRemove({ teamId, index, name });
    setIsRemoveMemberModalOpen(true);
  };

  const handleRenameEvent = async () => {
    if (!event || !newEventName.trim()) {
      setError('Event name is required');
      return;
    }
    
    setError(null);
    
    try {
      const response = await fetch(`/api/events?id=${event._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newEventName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to rename event');
      }

      const updatedEvent = await response.json();
      setEvent(updatedEvent);
      setIsRenameEventModalOpen(false);
    } catch (error) {
      console.error('Error renaming event:', error);
      setError(error instanceof Error ? error.message : 'Failed to rename event');
    }
  };

  const handleEditMemberClick = (teamId: string, index: number, details: PlayerDetails) => {
    setMemberToEdit(details);
    setMemberTeamIdToEdit(teamId);
    setMemberIndexToEdit(index);
    setIsEditMemberModalOpen(true);
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !memberToEdit || memberTeamIdToEdit === null || memberIndexToEdit === null) return;
    setError(null);
    
    try {
      // Find the original member to get its playerType and playerId
      const team = event.teams.find(t => t._id === memberTeamIdToEdit);
      if (!team) {
        throw new Error('Team not found');
      }
      const originalMember = team.members[memberIndexToEdit];

      // Update the original source data based on playerType
      if (originalMember.playerType === 'free') {
        // Update free player
        const response = await fetch(`/api/players?id=${originalMember.playerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: memberToEdit.name,
            handicap: memberToEdit.handicap,
            tee: memberToEdit.tee,
            gender: memberToEdit.gender
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || 'Failed to update free player');
        }

        // Refresh free players list
        await fetchFreePlayers();
      } else {
        // Find the original team to get its current members
        const originalTeam = teams.find(t => t._id === team._id);
        if (!originalTeam) {
          throw new Error('Original team not found');
        }

        // Update the specific member in the team's members array
        const updatedMembers = originalTeam.members.map(member => {
          if (member._id === originalMember.playerId) {
            return {
              ...member,
              name: memberToEdit.name,
              isCaptain: memberToEdit.isCaptain,
              handicap: memberToEdit.handicap,
              tee: memberToEdit.tee,
              gender: memberToEdit.gender
            };
          }
          return member;
        });

        // Update team with the modified members array
        const response = await fetch(`/api/teams?id=${team._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            members: updatedMembers
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || 'Failed to update team member');
        }

        // Refresh teams list
        await fetchTeams();
      }

      // Update the player details in the local state
      setPlayerDetails(prev => ({
        ...prev,
        [originalMember.playerId]: memberToEdit
      }));

      setIsEditMemberModalOpen(false);
      setMemberToEdit(null);
      setMemberTeamIdToEdit(null);
      setMemberIndexToEdit(null);
    } catch (error) {
      console.error('Error updating member:', error);
      setError(error instanceof Error ? error.message : 'Failed to update member');
    }
  };

  // Add function to fetch player details
  const fetchPlayerDetails = async (playerId: string, playerType: 'free' | 'team_member') => {
    try {
      if (playerType === 'free') {
        const player = freePlayers.find(p => p._id === playerId);
        if (player) {
          setPlayerDetails(prev => ({
            ...prev,
            [playerId]: {
              name: player.name,
              isCaptain: false,
              handicap: player.handicap,
              tee: player.tee,
              gender: player.gender
            }
          }));
        }
      } else {
        // For team members, we need to find them in the original teams array
        for (const team of teams) {
          const member = team.members.find(m => m._id === playerId);
          if (member) {
            setPlayerDetails(prev => ({
              ...prev,
              [playerId]: {
                name: member.name,
                isCaptain: member.isCaptain,
                handicap: member.handicap,
                tee: member.tee as 'W' | 'Y' | 'B' | 'R',
                gender: member.gender as 'Male' | 'Female'
              }
            }));
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching player details:', error);
    }
  };

  // Update useEffect to fetch player details when teams or free players change
  useEffect(() => {
    if (event) {
      event.teams.forEach(team => {
        team.members.forEach(member => {
          fetchPlayerDetails(member.playerId, member.playerType);
        });
      });
    }
  }, [event, teams, freePlayers]);

  const handleRandomizeMatches = async () => {
    if (!event) return;
    setError(null);
    
    try {
      // Get all players from teams
      const allPlayers: { name: string; teamName: string; handicap: number; player_handicap: number }[] = [];
      
      // Add players from teams
      event.teams.forEach((eventTeam) => {
        const team = teams.find(t => t._id === eventTeam._id);
        if (team) {
          team.members.forEach((member) => {
            allPlayers.push({
              name: member.name,
              teamName: team.name,
              handicap: member.handicap,
              player_handicap: member.player_handicap || 0
            });
          });
        }
      });
      
      // Add free players
      if (event.freePlayers && Array.isArray(event.freePlayers)) {
        event.freePlayers.forEach((player) => {
          const freePlayer = freePlayers.find(p => p._id === player.playerId);
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
      
      // Shuffle players
      const shuffledPlayers = [...allPlayers].sort(() => Math.random() - 0.5);
      
      // Create matches ensuring players from same team don't play against each other
      const newMatches = [];
      const usedPlayers = new Set<string>();
      
      for (let i = 0; i < shuffledPlayers.length; i++) {
        if (usedPlayers.has(shuffledPlayers[i].name)) continue;
        
        // Find next available player from different team
        let j = i + 1;
        while (j < shuffledPlayers.length && 
               (usedPlayers.has(shuffledPlayers[j].name) || 
                shuffledPlayers[j].teamName === shuffledPlayers[i].teamName)) {
          j++;
        }
        
        // If we found a valid opponent
        if (j < shuffledPlayers.length) {
          const match = {
            eventId: params.id,
            player1: {
              name: shuffledPlayers[i].name,
              teamName: shuffledPlayers[i].teamName,
              score: 0,
              holeWins: 0,
              handicap: shuffledPlayers[i].handicap,
              player_handicap: shuffledPlayers[i].player_handicap
            },
            player2: {
              name: shuffledPlayers[j].name,
              teamName: shuffledPlayers[j].teamName,
              score: 0,
              holeWins: 0,
              handicap: shuffledPlayers[j].handicap,
              player_handicap: shuffledPlayers[j].player_handicap
            },
            teeTime: new Date().toISOString(),
            tee: 1,
            holes: Array(18).fill(null).map((_, index) => ({
              hole: index + 1,
              handicap: [13, 11, 9, 17, 1, 15, 7, 5, 3, 12, 2, 14, 18, 4, 8, 6, 16, 10][index],
              par: [5, 4, 4, 3, 4, 3, 4, 5, 3, 5, 4, 5, 3, 5, 4, 3, 4, 4][index],
              pace: [15, 15, 15, 12, 15, 12, 15, 17, 12, 17, 15, 17, 12, 17, 15, 12, 15, 15][index],
              player1Score: 0,
              player2Score: 0,
              player1Putt: false,
              player2Putt: false,
              winner: 'tie'
            })),
            completed: false
          };
          
          newMatches.push(match);
          usedPlayers.add(shuffledPlayers[i].name);
          usedPlayers.add(shuffledPlayers[j].name);
        }
      }
      
      // Delete existing matches
      for (const match of matches) {
        await fetch(`/api/matches?id=${match._id}`, {
          method: 'DELETE'
        });
      }
      
      // Create new matches
      for (const match of newMatches) {
        const response = await fetch('/api/matches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(match),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create match');
        }
      }
      
      // Refresh matches
      await fetchMatches();
      
    } catch (error) {
      console.error('Error randomizing matches:', error);
      setError(error instanceof Error ? error.message : 'Failed to randomize matches');
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

  const eventTeamIds = event.teams?.map(team => team._id) || [];
  const availableTeams = teams.filter(team => !eventTeamIds.includes(team._id));
  const eventTeams = event.teams || [];
  const totalMembers = eventTeams.reduce((sum, team) => sum + (team.members?.length || 0), 0);

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/" className="text-blue-500 hover:text-blue-700 mb-2 inline-block">
              ← Back to Events
            </Link>
            <h1 className="text-3xl font-bold text-black">{event?.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Remove scorecard toggle */}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {/* Matches Section */}
        <div className="space-y-8 mb-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-black">Matches</h2>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-black">Match List</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleRandomizeMatches}
                  className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Randomize Matches
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-purple-500 text-white py-2 px-4 rounded-md hover:bg-purple-600 transition-colors"
                >
                  Print Match Cards
                </button>
                <Link
                  href={`/events/${params.id}/matches/add`}
                  className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
                >
                  Add Match
                </Link>
              </div>
            </div>

            {matches.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No matches added yet</p>
                <Link
                  href={`/events/${params.id}/matches/add`}
                  className="mt-4 inline-block bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
                >
                  Add Match
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto relative">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player 1
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        vs
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player 2
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tee
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 shadow-md">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {matches.map((match) => (
                      <tr key={match._id} className="group hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-black">{match.player1.name}</div>
                          <div className="text-xs text-gray-500">{match.player1.teamName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm font-bold text-black">{match.player1.score}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-xs font-medium text-gray-500">vs</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm font-bold text-black">{match.player2.score}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-black">{match.player2.name}</div>
                          <div className="text-xs text-gray-500">{match.player2.teamName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-black">
                            {new Date(match.teeTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-black">{match.tee}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${match.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {match.completed ? 'Completed' : 'In Progress'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white border-l group-hover:bg-gray-50">
                          <Link
                            href={`/events/${params.id}/matches/${match._id}/edit`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteMatchClick(match)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Teams Section */}
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-black">Teams</h2>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-black">Team List</h3>
              <button
                onClick={() => setIsAddTeamModalOpen(true)}
                className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
              >
                Add Team
              </button>
            </div>

            {eventTeams.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No teams added yet</p>
                <button
                  onClick={() => setIsAddTeamModalOpen(true)}
                  className="mt-4 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
                >
                  Add Team
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {eventTeams.map((team) => (
                  <div key={team._id} className="overflow-hidden">
                    <div className="p-6 border-b bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold text-black">{team.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{team.members?.length || 0} members</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenAddPlayerModal(team)}
                            className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors text-sm"
                          >
                            Add Free Player
                          </button>
                          <button
                            onClick={() => handleRemoveTeamClick(team)}
                            className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors text-sm"
                          >
                            Remove Team
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Member Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Captain
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Playing Handicap
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tee
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Gender
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {team.members?.length ? (
                            team.members.map((member, idx) => {
                              const details = playerDetails[member.playerId];
                              if (!details) return null;
                              
                              return (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                      onClick={() => handleEditMemberClick(team._id, idx, details)}
                                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {details.name}
                                    </button>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-black">{details.isCaptain ? 'Yes' : 'No'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-black">{details.handicap}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-black">
                                      {details.tee === 'W' ? 'White' : 
                                       details.tee === 'Y' ? 'Yellow' : 
                                       details.tee === 'B' ? 'Blue' : 
                                       details.tee === 'R' ? 'Red' : details.tee}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-black">{details.gender}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => handleRemoveMemberClick(team._id, idx, details.name)}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                No members in this team
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Team Modal */}
        {isAddTeamModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Add Team to Event</h2>
                <button
                  onClick={() => {
                    setIsAddTeamModalOpen(false);
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                {availableTeams.length === 0 ? (
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-500 mb-2">All teams have been added to this event</p>
                    <a href="/teams" className="text-green-600 hover:text-green-800">
                      Create a new team
                    </a>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">Select a team to add to this event:</p>
                    {availableTeams.map((team) => (
                      <div key={team._id} className="flex justify-between items-center p-4 border rounded-md hover:bg-gray-50">
                        <div>
                          <h3 className="text-sm font-medium text-black">{team.name}</h3>
                          <p className="text-sm text-gray-500">
                            {team.members?.length || 0} members
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddTeam(team._id)}
                          className="bg-green-500 text-white py-1 px-3 rounded-md hover:bg-green-600 transition-colors text-sm"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rename Event Modal */}
        {isRenameEventModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Rename Event</h2>
                <button
                  onClick={() => {
                    setIsRenameEventModalOpen(false);
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-1">
                    Event Name
                  </label>
                  <input
                    type="text"
                    id="eventName"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    placeholder="Enter event name"
                  />
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    onClick={() => {
                      setIsRenameEventModalOpen(false);
                      setError(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRenameEvent}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remove Member Confirmation Modal */}
        {isRemoveMemberModalOpen && memberToRemove && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Remove Member</h2>
                <button
                  onClick={() => {
                    setIsRemoveMemberModalOpen(false);
                    setMemberToRemove(null);
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <p className="mb-4 text-gray-700">
                Are you sure you want to remove {memberToRemove.name} from this team?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsRemoveMemberModalOpen(false);
                    setMemberToRemove(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveMember(memberToRemove.teamId, memberToRemove.index)}
                  className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Free Player Modal */}
        {isAddPlayerModalOpen && selectedTeamForPlayer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Add Free Player to {selectedTeamForPlayer.name}</h2>
                <button
                  onClick={() => {
                    setIsAddPlayerModalOpen(false);
                    setSelectedTeamForPlayer(null);
                    setPlayerSearchTerm('');
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {/* Add search filter */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={playerSearchTerm}
                    onChange={(e) => setPlayerSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                  <svg 
                    className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <div className="space-y-4 overflow-y-auto flex-grow">
                {freePlayers.length === 0 ? (
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-500 mb-2">No free players available</p>
                    <a href="/players" className="text-blue-600 hover:text-blue-800">
                      Create a new player
                    </a>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">Select a player to add to this team:</p>
                    {freePlayers
                      .filter(player => 
                        playerSearchTerm === '' || 
                        player.name.toLowerCase().includes(playerSearchTerm.toLowerCase())
                      )
                      .map((player) => (
                        <div key={player._id} className="flex justify-between items-center p-4 border rounded-md hover:bg-gray-50">
                          <div>
                            <h3 className="text-sm font-medium text-black">{player.name}</h3>
                            <p className="text-sm text-gray-500">
                              Playing Handicap: {player.handicap} | Tee: {
                                player.tee === 'W' ? 'White' : 
                                player.tee === 'Y' ? 'Yellow' : 
                                player.tee === 'B' ? 'Blue' : 
                                player.tee === 'R' ? 'Red' : player.tee
                              } | {player.gender}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddPlayerToTeam(player)}
                            className="bg-green-500 text-white py-1 px-3 rounded-md hover:bg-green-600 transition-colors text-sm"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Remove Team Confirmation Modal */}
        {isRemoveTeamModalOpen && teamToRemove && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Remove Team</h2>
                <button
                  onClick={() => {
                    setIsRemoveTeamModalOpen(false);
                    setTeamToRemove(null);
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <p className="mb-4 text-gray-700">
                Are you sure you want to remove the team &quot;{teamToRemove.name}&quot; from this event?
                {teamToRemove.members?.length > 0 && (
                  <span className="block mt-2 text-amber-600">
                    This team has {teamToRemove.members.length} members that will also be removed from the event.
                  </span>
                )}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsRemoveTeamModalOpen(false);
                    setTeamToRemove(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveTeam(teamToRemove._id)}
                  className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Member Modal */}
        {isEditMemberModalOpen && memberToEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Edit Team Member</h2>
                <button
                  onClick={() => {
                    setIsEditMemberModalOpen(false);
                    setMemberToEdit(null);
                    setMemberTeamIdToEdit(null);
                    setMemberIndexToEdit(null);
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleEditMember}>
                <div className="mb-4">
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Member Name
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    value={memberToEdit.name}
                    onChange={(e) => setMemberToEdit({...memberToEdit, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="edit-handicap" className="block text-sm font-medium text-gray-700 mb-1">
                    Handicap
                  </label>
                  <input
                    type="number"
                    id="edit-handicap"
                    value={memberToEdit.handicap}
                    onChange={(e) => setMemberToEdit({...memberToEdit, handicap: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                    min="0"
                    max="54"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="edit-tee" className="block text-sm font-medium text-gray-700 mb-1">
                    Tee
                  </label>
                  <select
                    id="edit-tee"
                    value={memberToEdit.tee}
                    onChange={(e) => setMemberToEdit({...memberToEdit, tee: e.target.value as 'W' | 'Y' | 'B' | 'R'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  >
                    <option value="W">White</option>
                    <option value="Y">Yellow</option>
                    <option value="B">Blue</option>
                    <option value="R">Red</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="edit-gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    id="edit-gender"
                    value={memberToEdit.gender}
                    onChange={(e) => setMemberToEdit({...memberToEdit, gender: e.target.value as 'Male' | 'Female'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={memberToEdit.isCaptain}
                      onChange={(e) => setMemberToEdit({...memberToEdit, isCaptain: e.target.checked})}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    Team Captain
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMemberModalOpen(false);
                      setMemberToEdit(null);
                      setMemberTeamIdToEdit(null);
                      setMemberIndexToEdit(null);
                      setError(null);
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Match Confirmation Modal */}
        {isDeleteMatchModalOpen && matchToDeleteDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Delete Match</h2>
                <button
                  onClick={() => {
                    setIsDeleteMatchModalOpen(false);
                    setMatchToDelete(null);
                    setMatchToDeleteDetails(null);
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{matchToDeleteDetails.player1.name}</p>
                    <p className="text-sm text-gray-500">{matchToDeleteDetails.player1.teamName}</p>
                  </div>
                  <div className="text-xl font-bold">{matchToDeleteDetails.player1.score}</div>
                </div>
                
                <div className="flex justify-center items-center mb-3">
                  <span className="text-sm font-medium text-gray-500">vs</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{matchToDeleteDetails.player2.name}</p>
                    <p className="text-sm text-gray-500">{matchToDeleteDetails.player2.teamName}</p>
                  </div>
                  <div className="text-xl font-bold">{matchToDeleteDetails.player2.score}</div>
                </div>
              </div>
              
              <p className="mb-4 text-gray-700">
                Are you sure you want to delete this match? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsDeleteMatchModalOpen(false);
                    setMatchToDelete(null);
                    setMatchToDeleteDetails(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMatch}
                  className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Print styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-section, .print-section * {
              visibility: visible !important;
            }
            .print-section {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .print-section table {
              page-break-inside: avoid;
            }
            .print-section tr {
              page-break-inside: avoid;
            }
          }
        `}</style>

        {/* Print section */}
        <div className="print-section">
          <div className="p-8">
            <div className="space-y-8">
              {matches.map((match) => (
                <div key={match._id} className="border border-gray-200 rounded-lg p-6 mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">Match Card / {event.name} / {new Date(event.date).toISOString().split('T')[0]}</h2>
                      <p className="text-gray-600">Tee Time: {new Date(match.teeTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      <p className="text-gray-600 mb-4">Starting Hole: {match.tee}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 mb-6">
                    {/* Player 1 */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold mb-2">{match.player1.name}</h3>
                      <p className="text-sm text-gray-600">Team: {match.player1.teamName}</p>
                      <p className="text-sm text-gray-600">Playing Handicap: {match.player1.handicap}</p>
                      <div className="mt-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left">Hole</th>
                              <th className="text-left">Par</th>
                              <th className="text-left">Hcp</th>
                              <th className="text-left">Eff Hcp</th>
                              <th className="text-left">Score</th>
                              <th className="text-left">Putt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {match.holes.map((hole) => {
                              const [player1EffHcp, _] = calculateEffectiveHandicap(
                                match.player1.handicap,
                                match.player2.handicap,
                                hole.handicap
                              );
                              return (
                                <tr key={hole.hole}>
                                  <td>{hole.hole}</td>
                                  <td>{hole.par}</td>
                                  <td>{hole.handicap}</td>
                                  <td>{player1EffHcp}</td>
                                  <td className="border-b border-gray-200"></td>
                                  <td className="border-b border-gray-200"></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Player 2 */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold mb-2">{match.player2.name}</h3>
                      <p className="text-sm text-gray-600">Team: {match.player2.teamName}</p>
                      <p className="text-sm text-gray-600">Playing Handicap: {match.player2.handicap}</p>
                      <div className="mt-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left">Hole</th>
                              <th className="text-left">Par</th>
                              <th className="text-left">Hcp</th>
                              <th className="text-left">Eff Hcp</th>
                              <th className="text-left">Score</th>
                              <th className="text-left">Putt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {match.holes.map((hole) => {
                              const [_, player2EffHcp] = calculateEffectiveHandicap(
                                match.player1.handicap,
                                match.player2.handicap,
                                hole.handicap
                              );
                              return (
                                <tr key={hole.hole}>
                                  <td>{hole.hole}</td>
                                  <td>{hole.par}</td>
                                  <td>{hole.handicap}</td>
                                  <td>{player2EffHcp}</td>
                                  <td className="border-b border-gray-200"></td>
                                  <td className="border-b border-gray-200"></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 