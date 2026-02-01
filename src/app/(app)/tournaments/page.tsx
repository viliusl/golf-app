'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Event {
  _id: string;
  name: string;
  date: string;
  tournamentId?: string;
}

interface Tournament {
  _id: string;
  name: string;
  type: 'Team' | 'Individual';
  eventIds: string[];
  createdAt: string;
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [newTournament, setNewTournament] = useState<Omit<Tournament, '_id' | 'createdAt'>>({
    name: '',
    type: 'Team',
    eventIds: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
    fetchTournaments();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/tournaments');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTournaments(data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setError('Failed to load tournaments');
    }
  };

  const handleAddTournament = async () => {
    if (newTournament.name) {
      try {
        const response = await fetch('/api/tournaments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newTournament),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create tournament');
        }

        const createdTournament = await response.json();
        setTournaments(prev => [...prev, createdTournament]);
        setNewTournament({ name: '', type: 'Team', eventIds: [] });
        setIsModalOpen(false);
      } catch (error) {
        console.error('Error creating tournament:', error);
        setError(error instanceof Error ? error.message : 'Failed to create tournament');
      }
    }
  };

  const handleDeleteClick = (tournament: Tournament) => {
    setTournamentToDelete(tournament);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tournamentToDelete) return;

    try {
      const response = await fetch(`/api/tournaments/${tournamentToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete tournament');
      }

      setTournaments(prev => prev.filter(t => t._id !== tournamentToDelete._id));
      setIsDeleteModalOpen(false);
      setTournamentToDelete(null);
    } catch (error) {
      console.error('Error deleting tournament:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete tournament');
    }
  };

  const getEventsForTournament = (tournamentId: string) => {
    return events.filter(event => event.tournamentId === tournamentId);
  };

  const handleEditClick = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setNewTournament({
      name: tournament.name,
      type: tournament.type || 'Team',
      eventIds: tournament.eventIds,
    });
    setIsModalOpen(true);
  };

  const handleSaveTournament = async () => {
    if (!newTournament.name) return;

    try {
      if (editingTournament) {
        // Update existing tournament
        const response = await fetch(`/api/tournaments/${editingTournament._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newTournament),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update tournament');
        }

        const updatedTournament = await response.json();
        setTournaments(prev => prev.map(t => 
          t._id === editingTournament._id ? updatedTournament : t
        ));
      } else {
        // Create new tournament
        const response = await fetch('/api/tournaments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newTournament),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create tournament');
        }

        const createdTournament = await response.json();
        setTournaments(prev => [...prev, createdTournament]);
      }

      setNewTournament({ name: '', type: 'Team', eventIds: [] });
      setEditingTournament(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving tournament:', error);
      setError(error instanceof Error ? error.message : 'Failed to save tournament');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
    setEditingTournament(null);
    setNewTournament({ name: '', type: 'Team', eventIds: [] });
  };

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-brand-dark">Tournaments</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand text-white py-2 px-4 rounded-md hover:bg-brand/90 transition-colors"
          >
            Add Tournament
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-danger-50 text-danger-700 rounded-md">
            {error}
          </div>
        )}

        {/* Tournaments Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {loading ? (
            <p className="text-brand-dark">Loading tournaments...</p>
          ) : tournaments.length === 0 ? (
            <p className="text-brand-dark">No tournaments found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Tournament Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Events
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {tournaments.map((tournament) => (
                    <tr key={tournament._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-brand hover:text-brand/80 cursor-pointer" onClick={() => handleEditClick(tournament)}>
                          {tournament.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          tournament.type === 'Individual' 
                            ? 'bg-orange-100 text-brand' 
                            : 'bg-gray-100 text-brand-dark'
                        }`}>
                          {tournament.type || 'Team'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-brand-dark">
                          {getEventsForTournament(tournament._id).map(event => event.name).join(', ') || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/scores/${tournament._id}`}
                            target="_blank"
                            className="text-success-600 hover:text-success-700"
                          >
                            Leaderboard
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(tournament)}
                            className="text-danger-700 hover:text-danger-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Tournament Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-brand-dark">
                  {editingTournament ? 'Edit Tournament' : 'Add New Tournament'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Tournament Name
                </label>
                <input
                  type="text"
                  value={newTournament.name}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-brand text-brand-dark"
                  placeholder="Enter tournament name"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Tournament Type
                </label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 ${editingTournament ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="tournamentType"
                      value="Team"
                      checked={newTournament.type === 'Team'}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, type: e.target.value as 'Team' | 'Individual' }))}
                      disabled={!!editingTournament}
                      className="h-4 w-4 text-brand focus:ring-brand border-gray-100 disabled:opacity-60"
                    />
                    <span className="text-sm text-brand-dark">Team</span>
                  </label>
                  <label className={`flex items-center gap-2 ${editingTournament ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="tournamentType"
                      value="Individual"
                      checked={newTournament.type === 'Individual'}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, type: e.target.value as 'Team' | 'Individual' }))}
                      disabled={!!editingTournament}
                      className="h-4 w-4 text-brand focus:ring-brand border-gray-100 disabled:opacity-60"
                    />
                    <span className="text-sm text-brand-dark">Individual</span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {editingTournament 
                    ? 'Tournament type cannot be changed after creation'
                    : newTournament.type === 'Team' 
                      ? 'Players compete as part of teams' 
                      : 'Players compete individually without teams'}
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-400 hover:text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTournament}
                  className="px-4 py-2 bg-brand text-white rounded hover:bg-brand/90 transition-colors"
                >
                  {editingTournament ? 'Update Tournament' : 'Save Tournament'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4 text-brand-dark">Delete Tournament</h2>
              <p className="text-gray-400 mb-6">
                Are you sure you want to delete this tournament? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-danger-600 text-white rounded hover:bg-danger-700 transition-colors"
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