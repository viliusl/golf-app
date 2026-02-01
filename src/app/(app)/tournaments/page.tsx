'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Event {
  _id: string;
  name: string;
  date: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventsCount, setSelectedEventsCount] = useState(0);

  useEffect(() => {
    fetchEvents();
    fetchTournaments();
  }, []);

  useEffect(() => {
    setSelectedEventsCount(newTournament.eventIds.length);
  }, [newTournament.eventIds]);

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
        setSearchQuery('');
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

  const toggleEventSelection = (eventId: string) => {
    setNewTournament(prev => ({
      ...prev,
      eventIds: prev.eventIds.includes(eventId)
        ? prev.eventIds.filter(id => id !== eventId)
        : [...prev.eventIds, eventId],
    }));
  };

  const getSelectedEvents = (tournament: Tournament) => {
    return events.filter(event => tournament.eventIds?.includes(event._id));
  };

  const filteredEvents = events
    .filter(event => 
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.date.includes(searchQuery)
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSelectAll = () => {
    if (newTournament.eventIds.length === filteredEvents.length) {
      setNewTournament(prev => ({
        ...prev,
        eventIds: prev.eventIds.filter(id => !filteredEvents.some(event => event._id === id))
      }));
    } else {
      setNewTournament(prev => ({
        ...prev,
        eventIds: [...new Set([...prev.eventIds, ...filteredEvents.map(event => event._id)])]
      }));
    }
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
      setSearchQuery('');
    } catch (error) {
      console.error('Error saving tournament:', error);
      setError(error instanceof Error ? error.message : 'Failed to save tournament');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
    setSearchQuery('');
    setEditingTournament(null);
    setNewTournament({ name: '', type: 'Team', eventIds: [] });
  };

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-black">Tournaments</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Tournament
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Tournaments Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {loading ? (
            <p className="text-black">Loading tournaments...</p>
          ) : tournaments.length === 0 ? (
            <p className="text-black">No tournaments found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tournament Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Events
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tournaments.map((tournament) => (
                    <tr key={tournament._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600 hover:text-blue-900 cursor-pointer" onClick={() => handleEditClick(tournament)}>
                          {tournament.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          tournament.type === 'Individual' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {tournament.type || 'Team'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-black">
                          {getSelectedEvents(tournament).map(event => event.name).join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/scores/${tournament._id}`}
                            target="_blank"
                            className="text-green-600 hover:text-green-900"
                          >
                            Leaderboard
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(tournament)}
                            className="text-red-600 hover:text-red-900"
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
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">
                  {editingTournament ? 'Edit Tournament' : 'Add New Tournament'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tournament Name
                </label>
                <input
                  type="text"
                  value={newTournament.name}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
                  placeholder="Enter tournament name"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tournamentType"
                      value="Team"
                      checked={newTournament.type === 'Team'}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, type: e.target.value as 'Team' | 'Individual' }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm text-black">Team</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tournamentType"
                      value="Individual"
                      checked={newTournament.type === 'Individual'}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, type: e.target.value as 'Team' | 'Individual' }))}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="text-sm text-black">Individual</span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {newTournament.type === 'Team' 
                    ? 'Players compete as part of teams' 
                    : 'Players compete individually without teams'}
                </p>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-black">Select Events</h3>
                  <div className="text-sm text-gray-500">
                    {selectedEventsCount} events selected
                  </div>
                </div>

                {loading ? (
                  <p className="text-black">Loading events...</p>
                ) : events.length === 0 ? (
                  <p className="text-black">No events available</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search events by name or date..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
                      />
                      <button
                        onClick={handleSelectAll}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        {newTournament.eventIds.length === filteredEvents.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-md">
                      <div className="max-h-96 overflow-y-auto">
                        {filteredEvents.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            No events match your search
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-200">
                            {filteredEvents.map((event) => (
                              <label
                                key={event._id}
                                className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={newTournament.eventIds.includes(event._id)}
                                  onChange={() => toggleEventSelection(event._id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-black truncate">
                                    {event.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {new Date(event.date).toISOString().split('T')[0]}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTournament}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
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
              <h2 className="text-xl font-semibold mb-4 text-black">Delete Tournament</h2>
              <p className="text-black mb-6">
                Are you sure you want to delete this tournament? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
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