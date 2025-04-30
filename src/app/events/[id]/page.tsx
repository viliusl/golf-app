'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

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
}

interface Event {
  _id: string;
  name: string;
  date: string;
  teams: Team[];
  createdAt: string;
}

export default function EventDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [isRenameEventModalOpen, setIsRenameEventModalOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchEvent();
    fetchTeams();
  }, [resolvedParams.id]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events?id=${resolvedParams.id}`);
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
    } catch (error) {
      console.error('Error removing team:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove team');
    }
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
        {/* Event Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-black mb-2">{event.name}</h1>
                <button
                  onClick={() => {
                    setNewEventName(event.name);
                    setIsRenameEventModalOpen(true);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                  </svg>
                </button>
              </div>
              <p className="text-lg text-gray-600">
                {new Date(event.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>
            <button
              onClick={() => setIsAddTeamModalOpen(true)}
              className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            >
              Add Team
            </button>
          </div>

          {/* Event Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Total Teams</p>
              <p className="text-2xl font-semibold text-black">{eventTeams.length}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Total Members</p>
              <p className="text-2xl font-semibold text-black">{totalMembers}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Teams Section */}
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-black">Teams</h2>
          </div>

          {eventTeams.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <p className="text-gray-500">No teams added yet</p>
              <button
                onClick={() => setIsAddTeamModalOpen(true)}
                className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
              >
                Add Team
              </button>
            </div>
          ) : (
            eventTeams.map((team) => (
              <div key={team._id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-black">{team.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{team.members?.length || 0} members</p>
                    </div>
                    <button
                      onClick={() => handleRemoveTeam(team._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove Team
                    </button>
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
                          Handicap
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tee
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gender
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {team.members?.length ? (
                        team.members.map((member, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-black">{member.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-black">{member.isCaptain ? 'Yes' : 'No'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-black">{member.handicap}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-black">
                                {member.tee === 'W' ? 'White' : 
                                 member.tee === 'Y' ? 'Yellow' : 
                                 member.tee === 'B' ? 'Blue' : 
                                 member.tee === 'R' ? 'Red' : member.tee}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-black">{member.gender}</div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            No members in this team
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
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
                    <a href="/teams" className="text-blue-600 hover:text-blue-800">
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
                          className="bg-blue-500 text-white py-1 px-3 rounded-md hover:bg-blue-600 transition-colors text-sm"
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
      </div>
    </main>
  );
} 