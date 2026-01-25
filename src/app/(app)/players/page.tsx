'use client';

import { useState, useEffect } from 'react';
import { Player } from '@/app/api/players/route';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);
  const [newPlayer, setNewPlayer] = useState<{
    name: string;
    handicap: number | string;
    gender: 'Male' | 'Female';
  }>({
    name: '',
    handicap: 0,
    gender: 'Male'
  });
  const [editedPlayer, setEditedPlayer] = useState<{
    name: string;
    handicap: number | string;
    gender: 'Male' | 'Female';
  }>({
    name: '',
    handicap: 0,
    gender: 'Male'
  });
  const [isHandicapModalOpen, setIsHandicapModalOpen] = useState(false);
  const [handicapToUpdate, setHandicapToUpdate] = useState<{
    playerId: string;
    name: string;
    currentHandicap: number;
    newHandicap: string;
  } | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

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
      setError('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPlayer),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create player');
      }

      // Clear form and close modal
      setNewPlayer({
        name: '',
        handicap: 0,
        gender: 'Male'
      });
      setIsAddModalOpen(false);
      
      // Refresh players list
      fetchPlayers();
    } catch (error) {
      console.error('Error creating player:', error);
      setError(error instanceof Error ? error.message : 'Failed to create player');
    }
  };

  const handleEditClick = (player: Player) => {
    setPlayerToEdit(player);
    setEditedPlayer({
      name: player.name,
      handicap: player.handicap,
      gender: player.gender
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!playerToEdit) return;
    
    try {
      const response = await fetch(`/api/players?id=${playerToEdit._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedPlayer),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to update player');
      }

      setIsEditModalOpen(false);
      setPlayerToEdit(null);
      
      // Refresh players list
      fetchPlayers();
    } catch (error) {
      console.error('Error updating player:', error);
      setError(error instanceof Error ? error.message : 'Failed to update player');
    }
  };

  const handleDeleteClick = (player: Player) => {
    setPlayerToDelete(player);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!playerToDelete) return;

    try {
      const response = await fetch(`/api/players?id=${playerToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to delete player');
      }

      setIsDeleteModalOpen(false);
      setPlayerToDelete(null);
      fetchPlayers();
    } catch (error) {
      console.error('Error deleting player:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete player');
    }
  };

  const handleUpdateHandicapClick = (player: Player) => {
    setHandicapToUpdate({
      playerId: player._id,
      name: player.name,
      currentHandicap: player.handicap,
      newHandicap: String(player.handicap)
    });
    setIsHandicapModalOpen(true);
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

      setIsHandicapModalOpen(false);
      setHandicapToUpdate(null);
      fetchPlayers();
    } catch (error) {
      console.error('Error updating handicap:', error);
      setError(error instanceof Error ? error.message : 'Failed to update handicap');
    }
  };

  // Filter players based on search term
  const filteredPlayers = searchTerm
    ? players.filter(player => 
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : players;

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-black">Players</h1>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Player
          </button>
        </div>

        {/* Search Box */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Players Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {loading ? (
            <p className="text-black">Loading players...</p>
          ) : players.length === 0 ? (
            <p className="text-black">No players found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
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
                  {filteredPlayers.map((player) => (
                    <tr key={player._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={() => handleEditClick(player)}
                        >
                          {player.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-black">{player.handicap}</span>
                          <button
                            onClick={() => handleUpdateHandicapClick(player)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit handicap index"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-black">{player.gender}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditClick(player)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(player)}
                          className="text-red-600 hover:text-red-900 ml-4"
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

        {/* Add Player Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Add New Player</h2>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
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
                    Player Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newPlayer.name}
                    onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="handicap" className="block text-sm font-medium text-gray-700 mb-1">
                    Handicap Index
                  </label>
                  <input
                    type="text"
                    id="handicap"
                    value={newPlayer.handicap}
                    onChange={(e) => {
                      const value = e.target.value.replace(',', '.');
                      if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                        setNewPlayer({ ...newPlayer, handicap: value });
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.replace(',', '.');
                      const numValue = parseFloat(value);
                      setNewPlayer({ ...newPlayer, handicap: isNaN(numValue) ? 0 : numValue });
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
                    value={newPlayer.gender}
                    onChange={(e) => setNewPlayer({ ...newPlayer, gender: e.target.value as 'Male' | 'Female' })}
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
                      setIsAddModalOpen(false);
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
                    Add Player
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Player Modal */}
        {isEditModalOpen && playerToEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Edit Player</h2>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setPlayerToEdit(null);
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="mb-4">
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Player Name
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    value={editedPlayer.name}
                    onChange={(e) => setEditedPlayer({ ...editedPlayer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="edit-handicap" className="block text-sm font-medium text-gray-700 mb-1">
                    Handicap Index
                  </label>
                  <input
                    type="text"
                    id="edit-handicap"
                    value={editedPlayer.handicap}
                    onChange={(e) => {
                      const value = e.target.value.replace(',', '.');
                      if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                        setEditedPlayer({ ...editedPlayer, handicap: value });
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.replace(',', '.');
                      const numValue = parseFloat(value);
                      setEditedPlayer({ ...editedPlayer, handicap: isNaN(numValue) ? 0 : numValue });
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
                    value={editedPlayer.gender}
                    onChange={(e) => setEditedPlayer({ ...editedPlayer, gender: e.target.value as 'Male' | 'Female' })}
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
                      setIsEditModalOpen(false);
                      setPlayerToEdit(null);
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
        {isDeleteModalOpen && playerToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Delete Player</h2>
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setPlayerToDelete(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <p className="mb-4 text-gray-700">
                Are you sure you want to delete the player &quot;{playerToDelete.name}&quot;?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setPlayerToDelete(null);
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

        {/* Update Handicap Modal */}
        {isHandicapModalOpen && handicapToUpdate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Update Handicap Index</h2>
              <p className="text-sm text-gray-600 mb-4">
                Updating handicap for <span className="font-medium">{handicapToUpdate.name}</span>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">New Handicap Index</label>
                <input
                  type="text"
                  value={handicapToUpdate.newHandicap}
                  onChange={(e) => setHandicapToUpdate({ ...handicapToUpdate, newHandicap: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateHandicap(); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">Current: {handicapToUpdate.currentHandicap}</p>
              </div>
              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setIsHandicapModalOpen(false); setHandicapToUpdate(null); setError(null); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateHandicap}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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