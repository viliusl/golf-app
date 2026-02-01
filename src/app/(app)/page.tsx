'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Course {
  _id: string;
  name: string;
  address: string;
}

interface Tournament {
  _id: string;
  name: string;
  type: 'Team' | 'Individual';
}

interface Event {
  _id: string;
  name: string;
  date: string;
  tournamentId?: string;
  course?: {
    _id: string;
    name: string;
  };
  handicapAllowance?: number;
  teams: {
    _id: string;
    name: string;
    members: {
      name: string;
      isCaptain: boolean;
      handicap: number;
      tee: string;
      gender: string;
    }[];
  }[];
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState({ name: '', date: '', courseId: '', tournamentId: '', handicapAllowance: 100 });
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchEvents();
    fetchCourses();
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

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      console.log('Submitting event:', newEvent);
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEvent),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create event');
      }

      const createdEvent = await response.json();
      console.log('Event created successfully:', createdEvent);
      
      setNewEvent({ name: '', date: '', courseId: '', tournamentId: '', handicapAllowance: 100 });
      setIsModalOpen(false);
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      setError(error instanceof Error ? error.message : 'Failed to create event');
    }
  };

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;

    try {
      const response = await fetch(`/api/events?id=${eventToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to delete event');
      }

      setIsDeleteModalOpen(false);
      setEventToDelete(null);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete event');
    }
  };

  const handleEventClick = (eventId: string) => {
    router.push(`/events/${eventId}`);
  };

  const getTournament = (tournamentId?: string) => {
    if (!tournamentId) return null;
    return tournaments.find(t => t._id === tournamentId);
  };

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-brand-dark">Events</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand text-white py-2 px-4 rounded-md hover:bg-brand/90 transition-colors"
          >
            Add Event
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-danger-50 text-danger-700 rounded-md">
            {error}
          </div>
        )}

        {/* Events Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {loading ? (
            <p className="text-brand-dark">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-brand-dark">No events found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Event Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Tournament
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Teams/Players
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {events.map((event) => (
                    <tr key={event._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleEventClick(event._id)}
                          className="text-brand hover:text-brand/80"
                        >
                          {event.name}
                        </button>
                        {event.course && (
                          <div className="text-xs text-gray-400 mt-1">
                            {event.course.name}
                          </div>
                        )}
                        {event.handicapAllowance !== undefined && (
                          <div className="text-xs text-gray-400">
                            HCP Allowance: {event.handicapAllowance}%
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-brand-dark">
                          {getTournament(event.tournamentId)?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-brand-dark">
                          {new Date(event.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-brand-dark">
                          {(() => {
                            const tournament = getTournament(event.tournamentId);
                            const totalPlayers = event.teams.reduce((sum, t) => sum + (t.members?.length || 0), 0);
                            if (tournament?.type === 'Individual') {
                              return `${totalPlayers} players`;
                            }
                            return `${event.teams.length} teams / ${totalPlayers} players`;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDeleteClick(event)}
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

        {/* Add Event Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-brand-dark">Add New Event</h2>
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
                    Event Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-100 rounded-md text-brand-dark focus:ring-brand focus:border-brand"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="date" className="block text-sm font-medium text-gray-400 mb-1">
                    Event Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-100 rounded-md text-brand-dark focus:ring-brand focus:border-brand"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="tournamentId" className="block text-sm font-medium text-gray-400 mb-1">
                    Tournament
                  </label>
                  <select
                    id="tournamentId"
                    value={newEvent.tournamentId}
                    onChange={(e) => setNewEvent({ ...newEvent, tournamentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-100 rounded-md text-brand-dark focus:ring-brand focus:border-brand"
                    required
                  >
                    <option value="">Select a tournament</option>
                    {tournaments.map((tournament) => (
                      <option key={tournament._id} value={tournament._id}>
                        {tournament.name} ({tournament.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="courseId" className="block text-sm font-medium text-gray-400 mb-1">
                    Course
                  </label>
                  <select
                    id="courseId"
                    value={newEvent.courseId}
                    onChange={(e) => setNewEvent({ ...newEvent, courseId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-100 rounded-md text-brand-dark focus:ring-brand focus:border-brand"
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="handicapAllowance" className="block text-sm font-medium text-gray-400 mb-1">
                    HCP Allowance (%)
                  </label>
                  <input
                    type="number"
                    id="handicapAllowance"
                    value={newEvent.handicapAllowance}
                    onChange={(e) => setNewEvent({ ...newEvent, handicapAllowance: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                    className="w-full px-3 py-2 border border-gray-100 rounded-md text-brand-dark focus:ring-brand focus:border-brand"
                    min="0"
                    max="100"
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
                    Add Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && eventToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-brand-dark">Delete Event</h2>
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setEventToDelete(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <p className="mb-4 text-gray-400">
                Are you sure you want to delete the event &quot;{eventToDelete.name}&quot;?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setEventToDelete(null);
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
      </div>
    </main>
  );
}
