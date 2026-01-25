'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
          <h1 className="text-3xl font-bold text-black">Teams</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Team
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Teams List */}
        <div className="space-y-6">
          {loading ? (
            <p className="text-black">Loading teams...</p>
          ) : teams.length === 0 ? (
            <p className="text-black">No teams found</p>
          ) : (
            teams.map((team) => (
              <div key={team._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-black">{team.name}</h2>
                    <button
                      onClick={() => openRenameTeamModal(team)}
                      className="text-blue-500 hover:text-blue-700"
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
                      className="bg-green-500 text-white py-1 px-3 rounded-md hover:bg-green-600 transition-colors text-sm"
                    >
                      Add Member
                    </button>
                    <button
                      onClick={() => handleDeleteClick(team)}
                      className="bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600 transition-colors text-sm"
                    >
                      Delete Team
                    </button>
                  </div>
                </div>

                {/* Members Table */}
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
                          Handicap Index
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
                      {team.members.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            No members yet
                          </td>
                        </tr>
                      ) : (
                        team.members.map((member, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">
                                {member.playerId?.name || 'Unknown Player'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleToggleCaptain(team, index)}
                                className={`text-sm ${member.isCaptain ? 'text-green-600 font-medium' : 'text-gray-500'} hover:underline`}
                                title={member.isCaptain ? 'Click to remove captain' : 'Click to make captain'}
                              >
                                {member.isCaptain ? 'Yes' : 'No'}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-black">{member.playerId?.handicap ?? '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-black">{member.playerId?.gender || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveMember(team, index)}
                                className="text-red-600 hover:text-red-900"
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
                <h2 className="text-xl font-semibold text-black">Add New Team</h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
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
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
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
                <h2 className="text-xl font-semibold text-black">Add Member to {teamToAddMember.name}</h2>
                <button
                  onClick={() => {
                    setIsAddMemberModalOpen(false);
                    setTeamToAddMember(null);
                    setSelectedPlayerId('');
                    setNewMemberIsCaptain(false);
                    setPlayerSearchTerm('');
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
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

              <form onSubmit={handleAddMember} className="flex flex-col flex-grow">
                <div className="mb-4 flex-grow overflow-y-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select a Player
                  </label>
                  {filteredPlayers.length === 0 ? (
                    <div className="text-center p-4">
                      <p className="text-sm text-gray-500 mb-2">
                        {players.length === 0 
                          ? 'No players available' 
                          : getAvailablePlayers(teamToAddMember).length === 0
                            ? 'All players are already in this team'
                            : 'No players match your search'}
                      </p>
                      <Link href="/players" className="text-blue-600 hover:text-blue-800">
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
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
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
                            <div className="text-sm font-medium text-black">{player.name}</div>
                            <div className="text-xs text-gray-500">
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
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Team Captain</span>
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
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedPlayerId}
                    className={`py-2 px-4 rounded-md transition-colors ${
                      selectedPlayerId
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
                <h2 className="text-xl font-semibold text-black">Delete Team</h2>
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setTeamToDelete(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <p className="mb-4 text-gray-700">
                Are you sure you want to delete the team &quot;{teamToDelete.name}&quot;?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setTeamToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
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
                <h2 className="text-xl font-semibold text-black">Rename Team</h2>
                <button
                  onClick={() => {
                    setIsRenameTeamModalOpen(false);
                    setTeamToRename(null);
                    setRenamedTeamName('');
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    id="teamName"
                    value={renamedTeamName}
                    onChange={(e) => setRenamedTeamName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
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
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRenameTeam}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
