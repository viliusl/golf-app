'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Team {
  _id: string;
  name: string;
  members: {
    name: string;
    isCaptain: boolean;
    handicap: number;
    tee: 'W' | 'Y' | 'B' | 'R';
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
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [teamToAddMember, setTeamToAddMember] = useState<Team | null>(null);
  const [teamToEditMember, setTeamToEditMember] = useState<Team | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<{
    name: string;
    isCaptain: boolean;
    handicap: number;
    tee: 'W' | 'Y' | 'B' | 'R';
    gender: 'Male' | 'Female';
  } | null>(null);
  const [memberIndexToEdit, setMemberIndexToEdit] = useState<number | null>(null);
  const [newTeam, setNewTeam] = useState({ name: '' });
  const [newMember, setNewMember] = useState<{
    name: string;
    isCaptain: boolean;
    handicap: number;
    tee: 'W' | 'Y' | 'B' | 'R';
    gender: 'Male' | 'Female';
  }>({
    name: '',
    isCaptain: false,
    handicap: 0,
    tee: 'W',
    gender: 'Male'
  });
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
      const updatedMembers = [...teamToAddMember.members, newMember];
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
        tee: 'W',
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
      updatedMembers[memberIndexToEdit] = memberToEdit;
      
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
                  <h2 className="text-xl font-semibold text-black">{team.name}</h2>
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
                          Handicap
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
                      {team.members.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
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
                              <div className="text-sm text-black">
                                {member.tee === 'W' ? 'White' : 
                                 member.tee === 'Y' ? 'Yellow' : 
                                 member.tee === 'B' ? 'Blue' : 'Red'}
                              </div>
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
                    Handicap
                  </label>
                  <input
                    type="number"
                    id="handicap"
                    value={newMember.handicap}
                    onChange={(e) => setNewMember({ ...newMember, handicap: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                    min="0"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="tee" className="block text-sm font-medium text-gray-700 mb-1">
                    Tee
                  </label>
                  <select
                    id="tee"
                    value={newMember.tee}
                    onChange={(e) => setNewMember({ ...newMember, tee: e.target.value as 'W' | 'Y' | 'B' | 'R' })}
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
                    Handicap
                  </label>
                  <input
                    type="number"
                    id="edit-handicap"
                    value={memberToEdit.handicap}
                    onChange={(e) => setMemberToEdit({ ...memberToEdit, handicap: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                    min="0"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="edit-tee" className="block text-sm font-medium text-gray-700 mb-1">
                    Tee
                  </label>
                  <select
                    id="edit-tee"
                    value={memberToEdit.tee}
                    onChange={(e) => setMemberToEdit({ ...memberToEdit, tee: e.target.value as 'W' | 'Y' | 'B' | 'R' })}
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
                Are you sure you want to delete the team "{teamToDelete.name}"?
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
      </div>
    </main>
  );
} 