'use client';

import { useState, useEffect } from 'react';
import { Player } from '@/app/api/players/route';
import { Match as MatchType } from '@/app/api/matches/route';
import Link from 'next/link';
import { calculatePlayingHandicap } from '@/lib/handicap';
import CourseView from '@/components/CourseView';

// Event team member - references Player collection with handicap snapshot
interface EventTeamMember {
  playerId: string;
  isCaptain: boolean;
  handicap?: number;
  tee?: string;
}

interface EventTeam {
  _id: string;
  name: string;
  members: EventTeamMember[];
}

interface CourseSnapshot {
  _id: string;
  name: string;
  address: string;
  holes?: {
    number: number;
    handicap: number;
    par: number;
  }[];
  menTees?: {
    name: string;
    cr: number;
    slope: number;
  }[];
  womenTees?: {
    name: string;
    cr: number;
    slope: number;
  }[];
}

interface Event {
  _id: string;
  name: string;
  date: string;
  course?: CourseSnapshot;
  handicapAllowance?: number;
  teams: EventTeam[];
  createdAt: string;
}

// Team from Teams collection (with populated player data)
interface PopulatedTeamMember {
  playerId: {
    _id: string;
    name: string;
    handicap: number;
    gender: 'Male' | 'Female';
  } | null;
  isCaptain: boolean;
}

interface PopulatedTeam {
  _id: string;
  name: string;
  members: PopulatedTeamMember[];
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

export default function EventDetails({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<PopulatedTeam[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [isRenameEventModalOpen, setIsRenameEventModalOpen] = useState(false);
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [isRemoveTeamModalOpen, setIsRemoveTeamModalOpen] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isDeleteMatchModalOpen, setIsDeleteMatchModalOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
  const [matchToDeleteDetails, setMatchToDeleteDetails] = useState<MatchType | null>(null);
  const [selectedTeamForPlayer, setSelectedTeamForPlayer] = useState<EventTeam | null>(null);
  const [teamToRemove, setTeamToRemove] = useState<EventTeam | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ teamId: string; index: number; name: string } | null>(null);
  const [newEventName, setNewEventName] = useState('');
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [isDeleteAllMatchesModalOpen, setIsDeleteAllMatchesModalOpen] = useState(false);
  const [isMatchMenuOpen, setIsMatchMenuOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isUpdateHandicapModalOpen, setIsUpdateHandicapModalOpen] = useState(false);
  const [handicapToUpdate, setHandicapToUpdate] = useState<{
    playerId: string;
    name: string;
    currentHandicap: number;
    newHandicap: string;
    gender: 'Male' | 'Female';
    teamId: string;
    memberIndex: number;
  } | null>(null);
  const [futureEvents, setFutureEvents] = useState<FutureEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [isUpdateTeeModalOpen, setIsUpdateTeeModalOpen] = useState(false);
  const [teeToUpdate, setTeeToUpdate] = useState<{
    teamId: string;
    memberIndex: number;
    name: string;
    currentTee: string;
    newTee: string;
    availableTees: Array<{ name: string; cr: number; slope: number }>;
  } | null>(null);

  useEffect(() => {
    fetchEventData();
    fetchTeamsData();
    fetchPlayersData();
    fetchMatchesData();
  }, [params.id]);

  const fetchEventData = async () => {
    try {
      const response = await fetch(`/api/events?id=${params.id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
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
    }
  };

  const fetchPlayersData = async () => {
    try {
      const response = await fetch('/api/players');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAllPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };
  
  const fetchMatchesData = async () => {
    try {
      const response = await fetch(`/api/matches?eventId=${params.id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMatches(data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  // Get player details from the allPlayers array
  const getPlayerDetails = (playerId: string): Player | undefined => {
    return allPlayers.find(p => p._id === playerId);
  };

  // Get isCaptain status from event team member
  const getMemberIsCaptain = (eventTeam: EventTeam, playerId: string): boolean => {
    const member = eventTeam.members.find(m => m.playerId === playerId);
    return member?.isCaptain || false;
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

      await fetchMatchesData();
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
      const response = await fetch(`/api/events?id=${event._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.details || responseData.error || 'Failed to add team');
      }

      setEvent(responseData);
      setIsAddTeamModalOpen(false);
    } catch (error) {
      console.error('Error adding team:', error);
      setError(error instanceof Error ? error.message : 'Failed to add team');
    }
  };

  const handleOpenAddPlayerModal = (team: EventTeam) => {
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

      const newMember: EventTeamMember = {
        playerId: player._id,
        isCaptain: false
      };

      const updatedTeams = [...event.teams];
      updatedTeams[teamIndex] = {
        ...updatedTeams[teamIndex],
        members: [...updatedTeams[teamIndex].members, newMember]
      };

      const response = await fetch(`/api/events?id=${event._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teams: updatedTeams }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to add player to team');
      }

      await fetchEventData();
      setIsAddPlayerModalOpen(false);
      setSelectedTeamForPlayer(null);
    } catch (error) {
      console.error('Error adding player to team:', error);
      setError(error instanceof Error ? error.message : 'Failed to add player to team');
    }
  };

  const handleRemoveTeamClick = (team: EventTeam) => {
    setTeamToRemove(team);
    setIsRemoveTeamModalOpen(true);
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!event) return;
    setError(null);
    
    try {
      const updatedTeams = event.teams.filter(team => team._id !== teamId);

      const response = await fetch(`/api/events?id=${event._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teams: updatedTeams }),
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
        body: JSON.stringify({ teamId, memberIndex }),
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
        body: JSON.stringify({ name: newEventName }),
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

  const handleUpdateHandicapClick = async (
    playerId: string,
    name: string,
    currentHandicap: number,
    gender: 'Male' | 'Female',
    teamId: string,
    memberIndex: number
  ) => {
    setHandicapToUpdate({
      playerId,
      name,
      currentHandicap,
      newHandicap: currentHandicap.toString(),
      gender,
      teamId,
      memberIndex
    });
    setFutureEvents([]);
    setSelectedEventIds(new Set());
    setLoadingEvents(true);
    setIsUpdateHandicapModalOpen(true);

    // Fetch future events containing this player (excluding current event)
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
        events.forEach((evt: EventData) => {
          // Skip current event
          if (evt._id === params.id) return;
          
          const eventDate = new Date(evt.date);
          if (eventDate >= today) {
            evt.teams?.forEach((team: EventTeam) => {
              team.members?.forEach((member: EventMember, idx: number) => {
                if (member.playerId === playerId) {
                  // Get course data for playing handicap calculation
                  const coursePar = evt.course?.holes?.reduce((sum, h) => sum + h.par, 0) || 72;
                  const handicapAllowance = evt.handicapAllowance || 100;
                  const allTees = [...(evt.course?.menTees || []), ...(evt.course?.womenTees || [])];
                  const selectedTee = member.tee ? allTees.find(t => t.name === member.tee) : null;
                  
                  const currentHcp = member.handicap ?? currentHandicap;
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
                    _id: evt._id,
                    name: evt.name,
                    date: evt.date,
                    teamId: team._id,
                    teamName: team.name,
                    memberIndex: idx,
                    currentHandicap: currentHcp,
                    currentPlayingHcp,
                    tee: member.tee || null,
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

  const handleUpdateHandicap = async () => {
    if (!handicapToUpdate || !event) return;
    setError(null);

    const newHandicapValue = parseFloat(handicapToUpdate.newHandicap.replace(',', '.'));
    if (isNaN(newHandicapValue)) {
      setError('Please enter a valid handicap value');
      return;
    }

    try {
      // Update global player handicap
      const playerResponse = await fetch(`/api/players?id=${handicapToUpdate.playerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: handicapToUpdate.name,
          handicap: newHandicapValue,
          gender: handicapToUpdate.gender
        }),
      });

      if (!playerResponse.ok) {
        throw new Error('Failed to update player handicap');
      }

      // Update current event member handicap
      const updatedTeams = event.teams.map(team => {
        if (team._id === handicapToUpdate.teamId) {
          return {
            ...team,
            members: team.members.map((member, idx) => {
              if (idx === handicapToUpdate.memberIndex) {
                return { ...member, handicap: newHandicapValue };
              }
              return member;
            })
          };
        }
        return team;
      });

      const eventResponse = await fetch(`/api/events?id=${event._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: updatedTeams }),
      });

      if (!eventResponse.ok) {
        throw new Error('Failed to update event handicap');
      }

      // Update selected future events
      for (const futureEvent of futureEvents) {
        const eventKey = `${futureEvent._id}-${futureEvent.teamId}-${futureEvent.memberIndex}`;
        if (selectedEventIds.has(eventKey)) {
          // Fetch current event data
          const futureEventResponse = await fetch(`/api/events?id=${futureEvent._id}`);
          if (futureEventResponse.ok) {
            const futureEventData = await futureEventResponse.json();
            
            // Update the specific member's handicap
            const futureUpdatedTeams = futureEventData.teams.map((team: { _id: string; members: { handicap?: number }[] }) => {
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
              body: JSON.stringify({ teams: futureUpdatedTeams }),
            });
          }
        }
      }

      await fetchPlayersData();
      await fetchEventData();
      setIsUpdateHandicapModalOpen(false);
      setHandicapToUpdate(null);
      setFutureEvents([]);
      setSelectedEventIds(new Set());
    } catch (error) {
      console.error('Error updating handicap:', error);
      setError(error instanceof Error ? error.message : 'Failed to update handicap');
    }
  };

  const handleUpdateTeeClick = (
    teamId: string,
    memberIndex: number,
    name: string,
    currentTee: string,
    availableTees: Array<{ name: string; cr: number; slope: number }>
  ) => {
    setTeeToUpdate({
      teamId,
      memberIndex,
      name,
      currentTee,
      newTee: currentTee,
      availableTees
    });
    setIsUpdateTeeModalOpen(true);
  };

  const handleUpdateTee = async () => {
    if (!teeToUpdate || !event) return;
    setError(null);

    try {
      const updatedTeams = event.teams.map(t => {
        if (t._id === teeToUpdate.teamId) {
          const updatedMembers = [...t.members];
          updatedMembers[teeToUpdate.memberIndex] = { 
            ...updatedMembers[teeToUpdate.memberIndex], 
            tee: teeToUpdate.newTee 
          };
          return { ...t, members: updatedMembers };
        }
        return t;
      });

      const response = await fetch(`/api/events?id=${event._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: updatedTeams }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tee');
      }

      await fetchEventData();
      setIsUpdateTeeModalOpen(false);
      setTeeToUpdate(null);
    } catch (error) {
      console.error('Error updating tee:', error);
      setError(error instanceof Error ? error.message : 'Failed to update tee');
    }
  };

  const handleRandomizeMatches = async () => {
    if (!event) return;
    setError(null);
    setIsRandomizing(true);
    
    try {
      // Get all players from event teams
      const playersForMatches: { name: string; teamName: string; handicap: number }[] = [];
      
      event.teams.forEach((eventTeam) => {
        eventTeam.members.forEach((member) => {
          const player = getPlayerDetails(member.playerId);
          if (player) {
            playersForMatches.push({
              name: player.name,
              teamName: eventTeam.name,
              handicap: player.handicap
            });
          }
        });
      });
      
      // Shuffle players
      const shuffledPlayers = [...playersForMatches].sort(() => Math.random() - 0.5);
      
      // Create matches ensuring players from same team don't play against each other
      const newMatches = [];
      const usedPlayers = new Set<string>();
      
      for (let i = 0; i < shuffledPlayers.length; i++) {
        if (usedPlayers.has(shuffledPlayers[i].name)) continue;
        
        let j = i + 1;
        while (j < shuffledPlayers.length && 
               (shuffledPlayers[j].teamName === shuffledPlayers[i].teamName || 
                usedPlayers.has(shuffledPlayers[j].name))) {
          j++;
        }
        
        if (j < shuffledPlayers.length) {
          const match = {
            eventId: params.id,
            player1: {
              name: shuffledPlayers[i].name,
              teamName: shuffledPlayers[i].teamName,
              score: 0,
              holeWins: 0,
              handicap: shuffledPlayers[i].handicap
            },
            player2: {
              name: shuffledPlayers[j].name,
              teamName: shuffledPlayers[j].teamName,
              score: 0,
              holeWins: 0,
              handicap: shuffledPlayers[j].handicap
            },
            teeTime: new Date().toISOString(),
            tee: 1,
            holes: Array(18).fill(null).map((_, index) => ({
              hole: index + 1,
              handicap: [13, 11, 9, 17, 1, 15, 7, 5, 3, 12, 2, 14, 18, 4, 8, 6, 16, 10][index],
              par: [5, 4, 4, 3, 4, 3, 4, 5, 3, 5, 4, 4, 3, 5, 4, 3, 4, 4][index],
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
      
      for (const match of newMatches) {
        const response = await fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(match),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create match');
        }
      }
      
      await fetchMatchesData();
    } catch (error) {
      console.error('Error randomizing matches:', error);
      setError(error instanceof Error ? error.message : 'Failed to randomize matches');
    } finally {
      setIsRandomizing(false);
    }
  };

  const handleDeleteAllMatches = async () => {
    if (!event) return;
    setError(null);
    
    try {
      for (const match of matches) {
        const response = await fetch(`/api/matches?id=${match._id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete match');
        }
      }

      await fetchMatchesData();
      setIsDeleteAllMatchesModalOpen(false);
    } catch (error) {
      console.error('Error deleting all matches:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete all matches');
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
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-black">{event?.name}</h1>
              <p className="text-lg text-gray-600 mt-2">
                {event?.date && new Date(event.date).toLocaleDateString(undefined, { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                {event?.course && (
                  <>
                    {' · '}
                    <button
                      onClick={() => setIsCourseModalOpen(true)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {event.course.name}
                    </button>
                  </>
                )}
                {event?.handicapAllowance !== undefined && (
                  <> · Allowance: {event.handicapAllowance}%</>
                )}
              </p>
            </div>
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
                <div className="relative">
                  <button
                    onClick={() => setIsMatchMenuOpen(!isMatchMenuOpen)}
                    className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <span>Match Actions</span>
                    <svg 
                      className={`w-4 h-4 transition-transform ${isMatchMenuOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isMatchMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <div className="py-1" role="menu">
                        <button
                          onClick={() => {
                            handleRandomizeMatches();
                            setIsMatchMenuOpen(false);
                          }}
                          disabled={isRandomizing}
                          className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 ${
                            isRandomizing ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isRandomizing ? 'Generating Matches...' : 'Generate Random Matches'}
                        </button>
                        
                        <button
                          onClick={() => {
                            setIsDeleteAllMatchesModalOpen(true);
                            setIsMatchMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Delete All Matches
                        </button>
                        
                        <Link
                          href={`/events/${params.id}/matches/print`}
                          onClick={() => setIsMatchMenuOpen(false)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Print Match Cards
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                
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
              </div>
            ) : (
              <div className="space-y-8">
                {/* In Progress Matches */}
                <div>
                  <h4 className="px-6 py-3 text-sm font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    In Progress Matches
                  </h4>
                  <div className="overflow-x-auto relative">
                    <table className="min-w-full divide-y divide-gray-200 table-fixed">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Player 1</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">vs</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Player 2</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Time</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Tee</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {matches
                          .filter(match => !match.completed)
                          .sort((a, b) => {
                            const timeA = new Date(a.teeTime).getHours() * 60 + new Date(a.teeTime).getMinutes();
                            const timeB = new Date(b.teeTime).getHours() * 60 + new Date(b.teeTime).getMinutes();
                            return timeA - timeB;
                          })
                          .map((match) => (
                            <tr key={match._id} className="group hover:bg-gray-50">
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="text-sm font-medium text-black">{match.player1.name}</div>
                                <div className="text-xs text-gray-500">{match.player1.teamName}</div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="text-sm font-bold text-black">{match.player1.score}</div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="text-xs font-medium text-gray-500">vs</div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="text-sm font-bold text-black">{match.player2.score}</div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="text-sm font-medium text-black">{match.player2.name}</div>
                                <div className="text-xs text-gray-500">{match.player2.teamName}</div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="text-sm text-black">
                                  {new Date(match.teeTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="text-sm text-black">{match.tee}</div>
                              </td>
                              <td className="px-3 py-2 text-right text-sm font-medium sticky right-0 bg-white border-l group-hover:bg-gray-50">
                                <Link href={`/events/${params.id}/matches/${match._id}/edit`} className="text-blue-600 hover:text-blue-900 mr-3">Edit</Link>
                                <button onClick={() => handleDeleteMatchClick(match)} className="text-red-600 hover:text-red-900">Delete</button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Completed Matches */}
                <div>
                  <h4 className="px-6 py-3 text-sm font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Completed Matches
                  </h4>
                  <div className="overflow-x-auto relative">
                    <table className="min-w-full divide-y divide-gray-200 table-fixed">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Player 1</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">vs</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Player 2</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Time</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Tee</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {matches
                          .filter(match => match.completed)
                          .sort((a, b) => {
                            const timeA = new Date(a.teeTime).getHours() * 60 + new Date(a.teeTime).getMinutes();
                            const timeB = new Date(b.teeTime).getHours() * 60 + new Date(b.teeTime).getMinutes();
                            return timeA - timeB;
                          })
                          .map((match) => (
                            <tr key={match._id} className="group hover:bg-gray-50 bg-green-50">
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="text-sm font-medium text-black">{match.player1.name}</div>
                                <div className="text-xs text-gray-500">{match.player1.teamName}</div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="text-sm font-bold text-black">{match.player1.score}</div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="text-xs font-medium text-gray-500">vs</div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="text-sm font-bold text-black">{match.player2.score}</div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="text-sm font-medium text-black">{match.player2.name}</div>
                                <div className="text-xs text-gray-500">{match.player2.teamName}</div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="text-sm text-black">
                                  {new Date(match.teeTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="text-sm text-black">{match.tee}</div>
                              </td>
                              <td className="px-3 py-2 text-right text-sm font-medium sticky right-0 bg-green-50 border-l group-hover:bg-gray-50">
                                <Link href={`/events/${params.id}/matches/${match._id}/edit`} className="text-blue-600 hover:text-blue-900 mr-3">Edit</Link>
                                <button onClick={() => handleDeleteMatchClick(match)} className="text-red-600 hover:text-red-900">Delete</button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
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
                            Add Player
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Captain</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HCP</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P_HCP</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {team.members?.length ? (
                            team.members.map((member, idx) => {
                              const playerDetails = getPlayerDetails(member.playerId);
                              if (!playerDetails) return null;
                              
                              const availableTees = playerDetails.gender === 'Female' 
                                ? event?.course?.womenTees || []
                                : event?.course?.menTees || [];
                              
                              return (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm font-medium text-gray-900">
                                      {playerDetails.name}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-black">{member.isCaptain ? 'Yes' : 'No'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-black">{member.handicap ?? playerDetails.handicap}</span>
                                      <button
                                        onClick={() => handleUpdateHandicapClick(
                                          member.playerId,
                                          playerDetails.name,
                                          member.handicap ?? playerDetails.handicap,
                                          playerDetails.gender,
                                          team._id,
                                          idx
                                        )}
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
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-black">{member.tee || 'Not set'}</span>
                                      <button
                                        onClick={() => handleUpdateTeeClick(
                                          team._id,
                                          idx,
                                          playerDetails.name,
                                          member.tee || '',
                                          availableTees
                                        )}
                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                        title="Edit tee"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {(() => {
                                      const selectedTee = availableTees.find(t => t.name === member.tee);
                                      const coursePar = event?.course?.holes?.reduce((sum, hole) => sum + hole.par, 0) || 0;
                                      const memberHandicap = member.handicap ?? playerDetails.handicap;
                                      if (!selectedTee || !coursePar || !event?.handicapAllowance) {
                                        return <span className="text-sm text-gray-400">-</span>;
                                      }
                                      const playingHcp = calculatePlayingHandicap(
                                        memberHandicap,
                                        selectedTee.slope,
                                        selectedTee.cr,
                                        coursePar,
                                        event.handicapAllowance
                                      );
                                      return <span className="text-sm font-medium text-black">{playingHcp}</span>;
                                    })()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-black">{playerDetails.gender}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => handleRemoveMemberClick(team._id, idx, playerDetails.name)}
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
                              <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Add Team to Event</h2>
                <button onClick={() => setIsAddTeamModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="space-y-4">
                {availableTeams.length === 0 ? (
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-500 mb-2">All teams have been added to this event</p>
                    <Link href="/teams" className="text-green-600 hover:text-green-800">Create a new team</Link>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">Select a team to add to this event:</p>
                    {availableTeams.map((team) => (
                      <div key={team._id} className="flex justify-between items-center p-4 border rounded-md hover:bg-gray-50">
                        <div>
                          <h3 className="text-sm font-medium text-black">{team.name}</h3>
                          <p className="text-sm text-gray-500">{team.members?.length || 0} members</p>
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

        {/* Add Player Modal */}
        {isAddPlayerModalOpen && selectedTeamForPlayer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Add Player to {selectedTeamForPlayer.name}</h2>
                <button
                  onClick={() => {
                    setIsAddPlayerModalOpen(false);
                    setSelectedTeamForPlayer(null);
                    setPlayerSearchTerm('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search players..."
                  value={playerSearchTerm}
                  onChange={(e) => setPlayerSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                />
              </div>
              
              <div className="space-y-4 overflow-y-auto flex-grow">
                {allPlayers.length === 0 ? (
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-500 mb-2">No players available</p>
                    <Link href="/players" className="text-blue-600 hover:text-blue-800">Create a new player</Link>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">Select a player to add to this team:</p>
                    {allPlayers
                      .filter(player => 
                        playerSearchTerm === '' || 
                        player.name.toLowerCase().includes(playerSearchTerm.toLowerCase())
                      )
                      .map((player) => (
                        <div key={player._id} className="flex justify-between items-center p-4 border rounded-md hover:bg-gray-50">
                          <div>
                            <h3 className="text-sm font-medium text-black">{player.name}</h3>
                            <p className="text-sm text-gray-500">HCP Index: {player.handicap} | {player.gender}</p>
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

        {/* Remove Member Modal */}
        {isRemoveMemberModalOpen && memberToRemove && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Remove Member</h2>
                <button onClick={() => { setIsRemoveMemberModalOpen(false); setMemberToRemove(null); }} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <p className="mb-4 text-gray-700">Are you sure you want to remove {memberToRemove.name} from this team?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setIsRemoveMemberModalOpen(false); setMemberToRemove(null); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                <button onClick={() => handleRemoveMember(memberToRemove.teamId, memberToRemove.index)} className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600">Remove</button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Team Modal */}
        {isRemoveTeamModalOpen && teamToRemove && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Remove Team</h2>
                <button onClick={() => { setIsRemoveTeamModalOpen(false); setTeamToRemove(null); }} className="text-gray-500 hover:text-gray-700">✕</button>
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
                <button onClick={() => { setIsRemoveTeamModalOpen(false); setTeamToRemove(null); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                <button onClick={() => handleRemoveTeam(teamToRemove._id)} className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600">Remove</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Match Modal */}
        {isDeleteMatchModalOpen && matchToDeleteDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Delete Match</h2>
                <button onClick={() => { setIsDeleteMatchModalOpen(false); setMatchToDelete(null); setMatchToDeleteDetails(null); }} className="text-gray-500 hover:text-gray-700">✕</button>
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
              <p className="mb-4 text-gray-700">Are you sure you want to delete this match? This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setIsDeleteMatchModalOpen(false); setMatchToDelete(null); setMatchToDeleteDetails(null); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                <button onClick={handleDeleteMatch} className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete All Matches Modal */}
        {isDeleteAllMatchesModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Delete All Matches</h2>
                <button onClick={() => setIsDeleteAllMatchesModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                <p className="text-gray-700">You are about to delete all {matches.length} matches from this event. This action cannot be undone.</p>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsDeleteAllMatchesModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                <button onClick={handleDeleteAllMatches} className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600">Delete All Matches</button>
              </div>
            </div>
          </div>
        )}

        {/* Course Modal */}
        {isCourseModalOpen && event?.course && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <CourseView
                course={event.course}
                title="Event Course (Snapshot)"
                onClose={() => setIsCourseModalOpen(false)}
              />
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                <button onClick={() => setIsCourseModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Update Handicap Modal */}
        {isUpdateHandicapModalOpen && handicapToUpdate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Update Handicap Index</h2>
              <p className="text-sm text-gray-600 mb-4">Updating handicap for <span className="font-medium">{handicapToUpdate.name}</span></p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Handicap Index</label>
                <input
                  type="text"
                  value={handicapToUpdate.newHandicap}
                  onChange={(e) => setHandicapToUpdate({ ...handicapToUpdate, newHandicap: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !loadingEvents) handleUpdateHandicap(); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">Current: {handicapToUpdate.currentHandicap}</p>
              </div>

              {/* Future Events Section */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Also update handicap in other future events
                </label>
                {loadingEvents ? (
                  <p className="text-sm text-gray-500">Loading events...</p>
                ) : futureEvents.length === 0 ? (
                  <p className="text-sm text-gray-500">No other future events found for this player</p>
                ) : (
                  <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                    {futureEvents.map((futureEvent) => {
                      const eventKey = `${futureEvent._id}-${futureEvent.teamId}-${futureEvent.memberIndex}`;
                      const newHcpValue = handicapToUpdate ? parseFloat(handicapToUpdate.newHandicap.replace(',', '.')) : NaN;
                      const newPlayingHcp = futureEvent.slope && futureEvent.cr && !isNaN(newHcpValue)
                        ? calculatePlayingHandicap(newHcpValue, futureEvent.slope, futureEvent.cr, futureEvent.par, futureEvent.handicapAllowance)
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
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{futureEvent.name}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(futureEvent.date).toLocaleDateString()} • Team: {futureEvent.teamName}
                            </div>
                            {futureEvent.tee ? (
                              <div className="text-xs text-gray-600 mt-1">
                                Playing HCP: {futureEvent.currentPlayingHcp}
                                {newPlayingHcp !== null && newPlayingHcp !== futureEvent.currentPlayingHcp && (
                                  <span className="text-blue-600 font-medium"> → {newPlayingHcp}</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-orange-500 mt-1">No tee selected</div>
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
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedEventIds(new Set())}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Deselect all
                    </button>
                  </div>
                )}
              </div>

              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
              <div className="flex justify-end gap-3">
                <button onClick={() => { setIsUpdateHandicapModalOpen(false); setHandicapToUpdate(null); setFutureEvents([]); setSelectedEventIds(new Set()); setError(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cancel</button>
                <button onClick={handleUpdateHandicap} disabled={loadingEvents} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Update Tee Modal */}
        {isUpdateTeeModalOpen && teeToUpdate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Update Tee</h2>
              <p className="text-sm text-gray-600 mb-4">Updating tee for <span className="font-medium">{teeToUpdate.name}</span></p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tee</label>
                <select
                  value={teeToUpdate.newTee}
                  onChange={(e) => setTeeToUpdate({ ...teeToUpdate, newTee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Select Tee</option>
                  {teeToUpdate.availableTees.map((tee) => (
                    <option key={tee.name} value={tee.name}>{tee.name}</option>
                  ))}
                </select>
                {teeToUpdate.currentTee && <p className="mt-1 text-xs text-gray-500">Current: {teeToUpdate.currentTee}</p>}
              </div>
              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
              <div className="flex justify-end gap-3">
                <button onClick={() => { setIsUpdateTeeModalOpen(false); setTeeToUpdate(null); setError(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cancel</button>
                <button onClick={handleUpdateTee} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
