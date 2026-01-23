'use client';

import { useState, useEffect } from 'react';

interface Team {
  _id: string;
  name: string;
  members: {
    name: string;
    isCaptain: boolean;
    handicap: number;
    gender: 'Male' | 'Female';
  }[];
  createdAt: string;
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isRenameTeamModalOpen, setIsRenameTeamModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [teamToAddMember, setTeamToAddMember] = useState<Team | null>(null);
  const [teamToEditMember, setTeamToEditMember] = useState<Team | null>(null);
  const [teamToRename, setTeamToRename] = useState<Team | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<{
    name: string;
    isCaptain: boolean;
    handicap: number | string;
    gender: 'Male' | 'Female';
  } | null>(null);
  const [memberIndexToEdit, setMemberIndexToEdit] = useState<number | null>(null);
  const [newTeam, setNewTeam] = useState({ name: '' });
  const [newMember, setNewMember] = useState<{
    name: string;
    isCaptain: boolean;
    handicap: number | string;
    gender: 'Male' | 'Female';
  }>({
    name: '',
    isCaptain: false,
    handicap: 0,
    gender: 'Male'
  });
  const [renamedTeamName, setRenamedTeamName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
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
    if (!teamToAddMember || !newMember.name) return;
    setError(null);
    
    try {
      const updatedMembers = [...teamToAddMember.members, {
        ...newMember,
        handicap: typeof newMember.handicap === 'string' ? parseFloat(newMember.handicap) || 0 : newMember.handicap
      }];
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

      const updatedTeam = await response.json();
      setTeams(teams.map(team => team._id === updatedTeam._id ? updatedTeam : team));

      setNewMember({
        name: '',
        isCaptain: false,
        handicap: 0,
        gender: 'Male'
      });
      setIsAddMemberModalOpen(false);
      setTeamToAddMember(null);
    } catch (error) {
      console.error('Error adding member:', error);
      setError(error instanceof Error ? error.message : 'Failed to add member');
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamToEditMember || !memberToEdit || memberIndexToEdit === null) return;
    setError(null);
    
    try {
      const updatedMembers = [...teamToEditMember.members];
      updatedMembers[memberIndexToEdit] = {
        ...memberToEdit,
        handicap: typeof memberToEdit.handicap === 'string' ? parseFloat(memberToEdit.handicap) || 0 : memberToEdit.handicap
      };
      
      const response = await fetch(`/api/teams?id=${teamToEditMember._id}`, {
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
        throw new Error(errorData.details || 'Failed to update member');
      }

      const updatedTeam = await response.json();
      setTeams(teams.map(team => team._id === updatedTeam._id ? updatedTeam : team));

      setMemberToEdit(null);
      setMemberIndexToEdit(null);
      setIsEditMemberModalOpen(false);
      setTeamToEditMember(null);
    } catch (error) {
      console.error('Error updating member:', error);
      setError(error instanceof Error ? error.message : 'Failed to update member');
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

      const updatedTeam = await response.json();
      
      // Update the teams list with the renamed team
      setTeams(prevTeams => 
        prevTeams.map(team => 
          team._id === updatedTeam._id ? updatedTeam : team
        )
      );

      // Reset and close modal
      setRenamedTeamName('');
      setTeamToRename(null);
      setIsRenameTeamModalOpen(false);
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
                              <button
                                onClick={() => {
                                  setTeamToEditMember(team);
                                  setMemberToEdit(member);
                                  setMemberIndexToEdit(index);
                                  setIsEditMemberModalOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                              >
                                {member.name}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-black">
                                {member.isCaptain ? 'Yes' : 'No'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-black">{member.handicap}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-black">{member.gender}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => {
                                  const updatedMembers = team.members.filter((_, i) => i !== index);
                                  fetch(`/api/teams?id=${team._id}`, {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      members: updatedMembers
                                    }),
                                  }).then(() => fetchTeams());
                                }}
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

        {/* Add Member Modal */}
        {isAddMemberModalOpen && teamToAddMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Add Member to {teamToAddMember.name}</h2>
                <button
                  onClick={() => {
                    setIsAddMemberModalOpen(false);
                    setTeamToAddMember(null);
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddMember}>
                <div className="mb-4">
                  <label htmlFor="member" className="block text-sm font-medium text-gray-700 mb-1">
                    Member Name
                  </label>
                  <input
                    type="text"
                    id="member"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newMember.isCaptain}
                      onChange={(e) => setNewMember({ ...newMember, isCaptain: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Team Captain</span>
                  </label>
                </div>
                <div className="mb-4">
                  <label htmlFor="handicap" className="block text-sm font-medium text-gray-700 mb-1">
                    Handicap Index
                  </label>
                  <input
                    type="text"
                    id="handicap"
                    value={newMember.handicap}
                    onChange={(e) => {
                      const value = e.target.value.replace(',', '.');
                      if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                        setNewMember({ ...newMember, handicap: value });
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.replace(',', '.');
                      const numValue = parseFloat(value);
                      setNewMember({ ...newMember, handicap: isNaN(numValue) ? 0 : numValue });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    id="gender"
                    value={newMember.gender}
                    onChange={(e) => setNewMember({ ...newMember, gender: e.target.value as 'Male' | 'Female' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMemberModalOpen(false);
                      setTeamToAddMember(null);
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
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Member Modal */}
        {isEditMemberModalOpen && teamToEditMember && memberToEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Edit Member</h2>
                <button
                  onClick={() => {
                    setIsEditMemberModalOpen(false);
                    setTeamToEditMember(null);
                    setMemberToEdit(null);
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
                  <label htmlFor="edit-member" className="block text-sm font-medium text-gray-700 mb-1">
                    Member Name
                  </label>
                  <input
                    type="text"
                    id="edit-member"
                    value={memberToEdit.name}
                    onChange={(e) => setMemberToEdit({ ...memberToEdit, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={memberToEdit.isCaptain}
                      onChange={(e) => setMemberToEdit({ ...memberToEdit, isCaptain: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Team Captain</span>
                  </label>
                </div>
                <div className="mb-4">
                  <label htmlFor="edit-handicap" className="block text-sm font-medium text-gray-700 mb-1">
                    Handicap Index
                  </label>
                  <input
                    type="text"
                    id="edit-handicap"
                    value={memberToEdit.handicap}
                    onChange={(e) => {
                      const value = e.target.value.replace(',', '.');
                      if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                        setMemberToEdit({ ...memberToEdit, handicap: value });
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.replace(',', '.');
                      const numValue = parseFloat(value);
                      setMemberToEdit({ ...memberToEdit, handicap: isNaN(numValue) ? 0 : numValue });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="edit-gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    id="edit-gender"
                    value={memberToEdit.gender}
                    onChange={(e) => setMemberToEdit({ ...memberToEdit, gender: e.target.value as 'Male' | 'Female' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMemberModalOpen(false);
                      setTeamToEditMember(null);
                      setMemberToEdit(null);
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