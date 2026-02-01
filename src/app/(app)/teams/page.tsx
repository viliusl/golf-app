'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { calculatePlayingHandicap } from '@/lib/handicap';

interface Player {
  _id: string;
  name: string;
  handicap: number;
  gender: 'Male' | 'Female';
}

interface TeamMember {
  playerId: Player | null;
  isCaptain: boolean;
}

interface Team {
  _id: string;
  name: string;
  members: TeamMember[];
  createdAt: string;
}

interface FutureEvent {
  _id: string;
  name: string;
  date: string;
  teamId: string;
  teamName: string;
  memberIndex: number;
  currentHandicap: number;
  currentPlayingHcp: number | null;
  tee: string | null;
  // Data needed for recalculation
  slope: number | null;
  cr: number | null;
  par: number;
  handicapAllowance: number;
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isRenameTeamModalOpen, setIsRenameTeamModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [teamToAddMember, setTeamToAddMember] = useState<Team | null>(null);
  const [teamToRename, setTeamToRename] = useState<Team | null>(null);
  const [newTeam, setNewTeam] = useState({ name: '' });
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [newMemberIsCaptain, setNewMemberIsCaptain] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [renamedTeamName, setRenamedTeamName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isHandicapModalOpen, setIsHandicapModalOpen] = useState(false);
  const [handicapToUpdate, setHandicapToUpdate] = useState<{
    playerId: string;
    name: string;
    currentHandicap: number;
    newHandicap: string;
  } | null>(null);
  const [futureEvents, setFutureEvents] = useState<FutureEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    fetchTeams();
    fetchPlayers();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTeam.name,
          members: []
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create team');
      }

      setNewTeam({ name: '' });
      setIsModalOpen(false);
      fetchTeams();
    } catch (error) {
      console.error('Error creating team:', error);
      setError(error instanceof Error ? error.message : 'Failed to create team');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamToAddMember || !selectedPlayerId) return;
    setError(null);
    
    try {
      // Check if player is already in the team
      const isAlreadyMember = teamToAddMember.members.some(
        member => member.playerId?._id === selectedPlayerId
      );
      
      if (isAlreadyMember) {
        setError('This player is already a member of this team');
        return;
      }

      const updatedMembers = [
        ...teamToAddMember.members.map(m => ({
          playerId: m.playerId?._id,
          isCaptain: m.isCaptain
        })),
        {
          playerId: selectedPlayerId,
          isCaptain: newMemberIsCaptain
        }
      ];
      
      const response = await fetch(`/api/teams?id=${teamToAddMember._id}`, {
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
        throw new Error(errorData.details || 'Failed to add member');
      }

      setSelectedPlayerId('');
      setNewMemberIsCaptain(false);
      setPlayerSearchTerm('');
      setIsAddMemberModalOpen(false);
      setTeamToAddMember(null);
      fetchTeams();
    } catch (error) {
      console.error('Error adding member:', error);
      setError(error instanceof Error ? error.message : 'Failed to add member');
    }
  };

  const handleRemoveMember = async (team: Team, index: number) => {
    try {
      const updatedMembers = team.members
        .filter((_, i) => i !== index)
        .map(m => ({
          playerId: m.playerId?._id,
          isCaptain: m.isCaptain
        }));
      
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
        throw new Error('Failed to remove member');
      }

      fetchTeams();
    } catch (error) {
      console.error('Error removing member:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove member');
    }
  };

  const handleToggleCaptain = async (team: Team, memberIndex: number) => {
    try {
      const currentMember = team.members[memberIndex];
      const newCaptainStatus = !currentMember.isCaptain;
      
      // Update members: if setting as captain, remove captain from others
      const updatedMembers = team.members.map((m, idx) => ({
        playerId: m.playerId?._id,
        isCaptain: idx === memberIndex ? newCaptainStatus : (newCaptainStatus ? false : m.isCaptain)
      }));
      
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
        throw new Error('Failed to update captain');
      }

      fetchTeams();
    } catch (error) {
      console.error('Error updating captain:', error);
      setError(error instanceof Error ? error.message : 'Failed to update captain');
    }
  };

  const handleUpdateHandicapClick = async (member: TeamMember) => {
    if (!member.playerId) return;
    const playerId = member.playerId._id;
    const playerHandicap = member.playerId.handicap;
    
    setHandicapToUpdate({
      playerId: playerId,
      name: member.playerId.name,
      currentHandicap: playerHandicap,
      newHandicap: String(playerHandicap)
    });
    setFutureEvents([]);
    setSelectedEventIds(new Set());
    setLoadingEvents(true);
    setIsHandicapModalOpen(true);

    // Fetch future events containing this player
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const events = await response.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        interface EventMember {
          playerId: string;
          handicap?: number;
          tee?: string;
        }
        interface EventTeam {
          _id: string;
          name: string;
          members: EventMember[];
        }
        interface CourseHole {
          par: number;
        }
        interface CourseTee {
          name: string;
          cr: number;
          slope: number;
        }
        interface EventData {
          _id: string;
          name: string;
          date: string;
          handicapAllowance?: number;
          course?: {
            holes?: CourseHole[];
            menTees?: CourseTee[];
            womenTees?: CourseTee[];
          };
          teams: EventTeam[];
        }

        const playerFutureEvents: FutureEvent[] = [];
        events.forEach((event: EventData) => {
          const eventDate = new Date(event.date);
          if (eventDate >= today) {
            event.teams?.forEach((team: EventTeam) => {
              team.members?.forEach((m: EventMember, memberIndex: number) => {
                if (m.playerId === playerId) {
                  // Get course data for playing handicap calculation
                  const coursePar = event.course?.holes?.reduce((sum, h) => sum + h.par, 0) || 72;
                  const handicapAllowance = event.handicapAllowance || 100;
                  const allTees = [...(event.course?.menTees || []), ...(event.course?.womenTees || [])];
                  const selectedTee = m.tee ? allTees.find(t => t.name === m.tee) : null;
                  
                  const currentHcp = m.handicap ?? playerHandicap;
                  let currentPlayingHcp: number | null = null;
                  
                  if (selectedTee) {
                    currentPlayingHcp = calculatePlayingHandicap(
                      currentHcp,
                      selectedTee.slope,
                      selectedTee.cr,
                      coursePar,
                      handicapAllowance
                    );
                  }

                  playerFutureEvents.push({
                    _id: event._id,
                    name: event.name,
                    date: event.date,
                    teamId: team._id,
                    teamName: team.name,
                    memberIndex,
                    currentHandicap: currentHcp,
                    currentPlayingHcp,
                    tee: m.tee || null,
                    slope: selectedTee?.slope || null,
                    cr: selectedTee?.cr || null,
                    par: coursePar,
                    handicapAllowance
                  });
                }
              });
            });
          }
        });

        setFutureEvents(playerFutureEvents);
        // Pre-select all future events
        setSelectedEventIds(new Set(playerFutureEvents.map(e => `${e._id}-${e.teamId}-${e.memberIndex}`)));
      }
    } catch (err) {
      console.error('Error fetching future events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleUpdateHandicap = async () => {
    if (!handicapToUpdate) return;
    setError(null);

    const newHandicapValue = parseFloat(handicapToUpdate.newHandicap.replace(',', '.'));
    if (isNaN(newHandicapValue)) {
      setError('Please enter a valid number');
      return;
    }

    try {
      // Update global player handicap
      const response = await fetch(`/api/players?id=${handicapToUpdate.playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ handicap: newHandicapValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to update handicap');
      }

      // Update selected future events
      for (const futureEvent of futureEvents) {
        const eventKey = `${futureEvent._id}-${futureEvent.teamId}-${futureEvent.memberIndex}`;
        if (selectedEventIds.has(eventKey)) {
          // Fetch current event data
          const eventResponse = await fetch(`/api/events?id=${futureEvent._id}`);
          if (eventResponse.ok) {
            const eventData = await eventResponse.json();
            
            // Update the specific member's handicap
            const updatedTeams = eventData.teams.map((team: { _id: string; members: { handicap?: number }[] }) => {
              if (team._id === futureEvent.teamId) {
                return {
                  ...team,
                  members: team.members.map((m: { handicap?: number }, idx: number) => {
                    if (idx === futureEvent.memberIndex) {
                      return { ...m, handicap: newHandicapValue };
                    }
                    return m;
                  })
                };
              }
              return team;
            });

            // Save updated event
            await fetch(`/api/events?id=${futureEvent._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ teams: updatedTeams }),
            });
          }
        }
      }

      setIsHandicapModalOpen(false);
      setHandicapToUpdate(null);
      setFutureEvents([]);
      setSelectedEventIds(new Set());
      fetchTeams();
    } catch (err) {
      console.error('Error updating handicap:', err);
      setError(err instanceof Error ? err.message : 'Failed to update handicap');
    }
  };

  const toggleEventSelection = (eventKey: string) => {
    setSelectedEventIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventKey)) {
        newSet.delete(eventKey);
      } else {
        newSet.add(eventKey);
      }
      return newSet;
    });
  };

  const handleDeleteClick = (team: Team) => {
    setTeamToDelete(team);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;

    try {
      const response = await fetch(`/api/teams?id=${teamToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to delete team');
      }

      setIsDeleteModalOpen(false);
      setTeamToDelete(null);
      fetchTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete team');
    }
  };

  const handleRenameTeam = async () => {
    if (!teamToRename) return;
    setError(null);

    if (!renamedTeamName.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      const response = await fetch(`/api/teams?id=${teamToRename._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: renamedTeamName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename team');
      }

      // Reset and close modal
      setRenamedTeamName('');
      setTeamToRename(null);
      setIsRenameTeamModalOpen(false);
      fetchTeams();
    } catch (error) {
      console.error('Error renaming team:', error);
      setError(error instanceof Error ? error.message : 'Failed to rename team');
    }
  };

  const openRenameTeamModal = (team: Team) => {
    setTeamToRename(team);
    setRenamedTeamName(team.name);
    setIsRenameTeamModalOpen(true);
  };

  // Get players that are not already in the team
  const getAvailablePlayers = (team: Team) => {
    const teamPlayerIds = team.members
      .map(m => m.playerId?._id)
      .filter(Boolean);
    return players.filter(p => !teamPlayerIds.includes(p._id));
  };

  // Filter players based on search term
  const filteredPlayers = teamToAddMember 
    ? getAvailablePlayers(teamToAddMember).filter(player =>
        playerSearchTerm === '' || 
        player.name.toLowerCase().includes(playerSearchTerm.toLowerCase())
      )
    : [];

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-brand-dark">Teams</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand text-white py-2 px-4 rounded-md hover:bg-brand/90 transition-colors"
          >
            Add Team
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-danger-50 text-danger-700 rounded-md">
            {error}
          </div>
        )}

        {/* Teams List */}
        <div className="space-y-6">
          {loading ? (
            <p className="text-brand-dark">Loading teams...</p>
          ) : teams.length === 0 ? (
            <p className="text-brand-dark">No teams found</p>
          ) : (
            teams.map((team) => (
              <div key={team._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-brand-dark">{team.name}</h2>
                    <button
                      onClick={() => openRenameTeamModal(team)}
                      className="text-brand hover:text-brand/80"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                      </svg>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTeamToAddMember(team);
                        setIsAddMemberModalOpen(true);
                      }}
                      className="bg-success-600 text-white py-1 px-3 rounded-md hover:bg-success-700 transition-colors text-sm"
                    >
                      Add Member
                    </button>
                    <button
                      onClick={() => handleDeleteClick(team)}
                      className="bg-danger-600 text-white py-1 px-3 rounded-md hover:bg-danger-700 transition-colors text-sm"
                    >
                      Delete Team
                    </button>
                  </div>
                </div>

                {/* Members Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Member Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Captain
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Handicap Index
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Gender
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {team.members.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-400">
                            No members yet
                          </td>
                        </tr>
                      ) : (
                        team.members.map((member, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-brand-dark">
                                {member.playerId?.name || 'Unknown Player'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleToggleCaptain(team, index)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors ${
                                  member.isCaptain 
                                    ? 'bg-success-50 text-success-700 hover:bg-success-100' 
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                                title={member.isCaptain ? 'Click to remove captain' : 'Click to make captain'}
                              >
                                {member.isCaptain ? (
                                  <>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Captain
                                  </>
                                ) : (
                                  'Set Captain'
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-brand-dark">{member.playerId?.handicap ?? '-'}</span>
                                {member.playerId && (
                                  <button
                                    onClick={() => handleUpdateHandicapClick(member)}
                                    className="text-gray-400 hover:text-brand transition-colors"
                                    title="Edit handicap index"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-brand-dark">{member.playerId?.gender || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveMember(team, index)}
                                className="text-danger-700 hover:text-danger-600"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Team Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-brand-dark">Add New Team</h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-100 rounded-md text-brand-dark focus:ring-brand focus:border-brand"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setError(null);
                    }}
                    className="px-4 py-2 text-gray-400 hover:bg-gray-50 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-brand text-white py-2 px-4 rounded-md hover:bg-brand/90 transition-colors"
                  >
                    Add Team
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Member Modal - Now with player selection */}
        {isAddMemberModalOpen && teamToAddMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-brand-dark">Add Member to {teamToAddMember.name}</h2>
                <button
                  onClick={() => {
                    setIsAddMemberModalOpen(false);
                    setTeamToAddMember(null);
                    setSelectedPlayerId('');
                    setNewMemberIsCaptain(false);
                    setPlayerSearchTerm('');
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              
              {/* Search Box */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={playerSearchTerm}
                    onChange={(e) => setPlayerSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-brand text-brand-dark"
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

              <form onSubmit={handleAddMember} className="flex flex-col flex-grow">
                <div className="mb-4 flex-grow overflow-y-auto">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Select a Player
                  </label>
                  {filteredPlayers.length === 0 ? (
                    <div className="text-center p-4">
                      <p className="text-sm text-gray-400 mb-2">
                        {players.length === 0 
                          ? 'No players available' 
                          : getAvailablePlayers(teamToAddMember).length === 0
                            ? 'All players are already in this team'
                            : 'No players match your search'}
                      </p>
                      <Link href="/players" className="text-brand hover:text-brand/80">
                        Go to Players page to add new players
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {filteredPlayers.map((player) => (
                        <label
                          key={player._id}
                          className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${
                            selectedPlayerId === player._id
                              ? 'border-brand bg-orange-50'
                              : 'border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="player"
                            value={player._id}
                            checked={selectedPlayerId === player._id}
                            onChange={(e) => setSelectedPlayerId(e.target.value)}
                            className="mr-3"
                          />
                          <div className="flex-grow">
                            <div className="text-sm font-medium text-brand-dark">{player.name}</div>
                            <div className="text-xs text-gray-400">
                              HCP: {player.handicap} | {player.gender}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newMemberIsCaptain}
                      onChange={(e) => setNewMemberIsCaptain(e.target.checked)}
                      className="rounded border-gray-100 text-brand focus:ring-brand"
                    />
                    <span className="text-sm font-medium text-gray-400">Team Captain</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMemberModalOpen(false);
                      setTeamToAddMember(null);
                      setSelectedPlayerId('');
                      setNewMemberIsCaptain(false);
                      setPlayerSearchTerm('');
                      setError(null);
                    }}
                    className="px-4 py-2 text-gray-400 hover:bg-gray-50 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedPlayerId}
                    className={`py-2 px-4 rounded-md transition-colors ${
                      selectedPlayerId
                        ? 'bg-brand text-white hover:bg-brand/90'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && teamToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-brand-dark">Delete Team</h2>
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setTeamToDelete(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <p className="mb-4 text-gray-400">
                Are you sure you want to delete the team &quot;{teamToDelete.name}&quot;?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setTeamToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:bg-gray-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="bg-danger-600 text-white py-2 px-4 rounded-md hover:bg-danger-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rename Team Modal */}
        {isRenameTeamModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-brand-dark">Rename Team</h2>
                <button
                  onClick={() => {
                    setIsRenameTeamModalOpen(false);
                    setTeamToRename(null);
                    setRenamedTeamName('');
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="teamName" className="block text-sm font-medium text-gray-400 mb-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    id="teamName"
                    value={renamedTeamName}
                    onChange={(e) => setRenamedTeamName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-100 rounded-md text-brand-dark focus:ring-brand focus:border-brand"
                    placeholder="Enter team name"
                  />
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    onClick={() => {
                      setIsRenameTeamModalOpen(false);
                      setTeamToRename(null);
                      setRenamedTeamName('');
                      setError(null);
                    }}
                    className="px-4 py-2 border border-gray-100 rounded-md text-gray-400 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRenameTeam}
                    className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand/90"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Update Handicap Modal */}
        {isHandicapModalOpen && handicapToUpdate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold text-brand-dark mb-4">Update Handicap Index</h2>
              <p className="text-sm text-gray-400 mb-4">
                Updating handicap for <span className="font-medium">{handicapToUpdate.name}</span>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">New Handicap Index</label>
                <input
                  type="text"
                  value={handicapToUpdate.newHandicap}
                  onChange={(e) => setHandicapToUpdate({ ...handicapToUpdate, newHandicap: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !loadingEvents) handleUpdateHandicap(); }}
                  className="w-full px-3 py-2 border border-gray-100 rounded-md text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-400">Current: {handicapToUpdate.currentHandicap}</p>
              </div>

              {/* Future Events Section */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Update handicap in future events
                </label>
                {loadingEvents ? (
                  <p className="text-sm text-gray-400">Loading events...</p>
                ) : futureEvents.length === 0 ? (
                  <p className="text-sm text-gray-400">No future events found for this player</p>
                ) : (
                  <div className="border border-gray-100 rounded-md max-h-60 overflow-y-auto">
                    {futureEvents.map((event) => {
                      const eventKey = `${event._id}-${event.teamId}-${event.memberIndex}`;
                      const newHcpValue = handicapToUpdate ? parseFloat(handicapToUpdate.newHandicap.replace(',', '.')) : NaN;
                      const newPlayingHcp = event.slope && event.cr && !isNaN(newHcpValue)
                        ? calculatePlayingHandicap(newHcpValue, event.slope, event.cr, event.par, event.handicapAllowance)
                        : null;
                      return (
                        <label
                          key={eventKey}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEventIds.has(eventKey)}
                            onChange={() => toggleEventSelection(eventKey)}
                            className="h-4 w-4 text-brand border-gray-100 rounded focus:ring-brand"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-brand-dark">{event.name}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(event.date).toLocaleDateString()} • Team: {event.teamName}
                            </div>
                            {event.tee ? (
                              <div className="text-xs text-gray-400 mt-1">
                                Playing HCP: {event.currentPlayingHcp}
                                {newPlayingHcp !== null && newPlayingHcp !== event.currentPlayingHcp && (
                                  <span className="text-brand font-medium"> → {newPlayingHcp}</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-brand mt-1">No tee selected</div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                {futureEvents.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedEventIds(new Set(futureEvents.map(e => `${e._id}-${e.teamId}-${e.memberIndex}`)))}
                      className="text-xs text-brand hover:text-brand/80"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedEventIds(new Set())}
                      className="text-xs text-brand hover:text-brand/80"
                    >
                      Deselect all
                    </button>
                  </div>
                )}
              </div>

              {error && <div className="mb-4 p-3 bg-danger-50 text-danger-700 rounded-md text-sm">{error}</div>}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setIsHandicapModalOpen(false); setHandicapToUpdate(null); setFutureEvents([]); setSelectedEventIds(new Set()); setError(null); }}
                  className="px-4 py-2 bg-gray-50 text-gray-400 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateHandicap}
                  disabled={loadingEvents}
                  className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand/90 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
