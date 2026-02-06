'use client';

import { useState, useEffect } from 'react';
import { Match as MatchType } from '@/app/api/matches/route';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { calculateEffectiveHandicap } from '@/lib/handicap';
import { calculateScore } from '@/lib/scoring';

interface EventTeamMember {
  playerId: string;
  handicap?: number;
  tee?: string;
}

interface EventTeam {
  _id: string;
  name: string;
  members: EventTeamMember[];
}

interface Event {
  _id: string;
  name: string;
  date: string;
  course: {
    name: string;
    address: string;
  };
  teams?: EventTeam[];
}

interface Tournament {
  _id: string;
  name: string;
}

interface PlayerRef {
  _id: string;
  name: string;
  handicap: number;
}

export default function PublicMatchView() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;
  const eventId = params.eventId as string;
  const matchId = params.matchId as string;
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [match, setMatch] = useState<MatchType | null>(null);
  const [nameToHcp, setNameToHcp] = useState<Map<string, number>>(new Map());
  const [nameToTee, setNameToTee] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch tournament details
        const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}`);
        if (!tournamentResponse.ok) {
          throw new Error(`HTTP error! status: ${tournamentResponse.status}`);
        }
        const tournamentData = await tournamentResponse.json();
        setTournament(tournamentData);

        // Fetch event details
        const eventResponse = await fetch(`/api/events?id=${eventId}`);
        if (!eventResponse.ok) {
          throw new Error(`HTTP error! status: ${eventResponse.status}`);
        }
        const eventData = await eventResponse.json();
        setEvent(eventData);

        // Fetch match details and players
        const [matchResponse, playersResponse] = await Promise.all([
          fetch(`/api/matches?id=${matchId}`),
          fetch('/api/players')
        ]);
        if (!matchResponse.ok) {
          throw new Error(`HTTP error! status: ${matchResponse.status}`);
        }
        const matchData = await matchResponse.json();
        setMatch(matchData);

        // Build name-to-HCP and name-to-Tee maps from event teams + players
        if (playersResponse.ok) {
          const playersData: PlayerRef[] = await playersResponse.json();
          const playerById = new Map(playersData.map((p) => [p._id, p]));
          const hcpByName = new Map<string, number>();
          const teeByName = new Map<string, string>();
          eventData.teams?.forEach((team: EventTeam) => {
            team.members?.forEach((member: EventTeamMember) => {
              const player = member.playerId ? playerById.get(member.playerId) : undefined;
              if (player?.name == null) return;
              const hcp = member.handicap ?? player?.handicap;
              if (hcp != null) hcpByName.set(player.name, hcp);
              if (member.tee) teeByName.set(player.name, member.tee);
            });
          });
          setNameToHcp(hcpByName);
          setNameToTee(teeByName);
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId && eventId && matchId) {
      fetchData();
    }
  }, [tournamentId, eventId, matchId]);

  if (loading) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-brand-dark">Loading match data...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-danger-50 text-danger-700 p-4 rounded-md mb-4">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!tournament || !event || !match) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-orange-100 text-orange-800 p-4 rounded-md mb-4">
            Match not found
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a 
              href={`/scores/${tournamentId}/events/${eventId}`}
              className="px-4 py-2 bg-white text-brand-dark border border-gray-100 hover:bg-gray-50 rounded-md"
            >
              ← Back to Event
            </a>
            <h1 className="text-2xl font-semibold text-brand-dark">Match Details</h1>
          </div>
          <Image
            src="/logo.svg"
            alt="DGL.ONLINE"
            width={120}
            height={48}
            className="h-10 w-auto"
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Player 1 info */}
            <div>
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-medium text-brand-dark">{match.player1.name} <span className="font-normal text-base text-gray-500">({match.player1.handicapIndex ?? nameToHcp.get(match.player1.name) ?? '–'})</span></h3>
                {match.player1.teamName?.trim() && match.player1.teamName !== '-' && (
                  <p className="text-sm text-gray-500">Team: {match.player1.teamName}</p>
                )}
                <p className="text-sm text-gray-500">Tee: {nameToTee.get(match.player1.name) ?? '–'}</p>
                <p className="text-sm font-medium text-gray-700">Playing Handicap: {match.player1.handicap || 0}</p>
              </div>
            </div>
            
            {/* Player 2 info */}
            <div>
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-medium text-brand-dark">{match.player2.name} <span className="font-normal text-base text-gray-500">({match.player2.handicapIndex ?? nameToHcp.get(match.player2.name) ?? '–'})</span></h3>
                {match.player2.teamName?.trim() && match.player2.teamName !== '-' && (
                  <p className="text-sm text-gray-500">Team: {match.player2.teamName}</p>
                )}
                <p className="text-sm text-gray-500">Tee: {nameToTee.get(match.player2.name) ?? '–'}</p>
                <p className="text-sm font-medium text-gray-700">Playing Handicap: {match.player2.handicap || 0}</p>
              </div>
            </div>
          </div>

          {/* Match Info */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div>
              <p className="text-sm text-gray-500">Course: {event.course?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tee Time: {new Date(match.teeTime).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Starting Hole: {match.tee}</p>
            </div>
          </div>

          {/* Match Status */}
          <div className="mb-8">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              match.completed 
                ? 'bg-success-100 text-success-700' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              {match.completed ? 'Match Completed' : 'Match In Progress'}
            </span>
          </div>
            
          {/* Scoring table */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Score by Hole</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-gray-200 border border-gray-200">
                <colgroup>
                  <col className="w-12" /> {/* Hole */}
                  <col className="w-12" /> {/* Hcp */}
                  <col className="w-12" style={{borderRight: '2px solid #e5e7eb'}} /> {/* Par */}
                  <col className="w-16" /> {/* Player 1 Strokes */}
                  <col className="w-12" /> {/* Player 1 1 Putt */}
                  <col className="w-16" /> {/* Player 1 Eff Hcp */}
                  <col className="w-16" style={{borderRight: '2px solid #e5e7eb'}} /> {/* Player 1 Score */}
                  <col className="w-16" /> {/* Player 2 Strokes */}
                  <col className="w-12" /> {/* Player 2 1 Putt */}
                  <col className="w-16" /> {/* Player 2 Eff Hcp */}
                  <col className="w-16" style={{borderRight: '2px solid #e5e7eb'}} /> {/* Player 2 Score */}
                  <col className="w-16" /> {/* Winner */}
                </colgroup>
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Hole
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Hcp
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r-2 border-gray-300">
                      Par
                    </th>
                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Strokes
                    </th>
                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      1 Putt
                    </th>
                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 border-r border-gray-200">
                      Eff Hcp
                    </th>
                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 border-r-2 border-gray-300">
                      Score
                    </th>
                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Strokes
                    </th>
                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      1 Putt
                    </th>
                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 border-r border-gray-200">
                      Eff Hcp
                    </th>
                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 border-r-2 border-gray-300">
                      Score
                    </th>
                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Winner
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const p1Hcp = match.player1.handicap || 0;
                    const p2Hcp = match.player2.handicap || 0;
                    const frontNine = match.holes.slice(0, 9);
                    const backNine = match.holes.slice(9, 18);

                    const renderHoleRow = (hole: typeof match.holes[0], idx: number) => {
                      const [player1EffHcp, player2EffHcp] = calculateEffectiveHandicap(p1Hcp, p2Hcp, hole.handicap);
                      const result = calculateScore(player1EffHcp, hole.player1Score, hole.player1Putt, player2EffHcp, hole.player2Score, hole.player2Putt, hole.par);

                      return (
                        <tr key={`hole-${hole.hole}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-1 whitespace-nowrap text-xs font-medium text-gray-900 border-r border-gray-200">
                            {hole.hole}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-500 border-r border-gray-200">
                            {hole.handicap}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-500 border-r-2 border-gray-300">
                            {hole.par}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-center text-gray-600 border-r border-gray-200">
                            {hole.player1Score > 0 ? hole.player1Score : ''}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-center text-gray-600 border-r border-gray-200">
                            {hole.player1Putt ? '✓' : ''}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-600 text-center border-r border-gray-200">
                            {player1EffHcp}
                          </td>
                          <td className={`px-3 py-1 whitespace-nowrap text-xs font-medium text-center border-r-2 border-gray-300 bg-blue-50 ${
                            hole.player1Score > 0 ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {hole.player1Score > 0 ? result.player1Score : ''}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-center text-gray-600 border-r border-gray-200">
                            {hole.player2Score > 0 ? hole.player2Score : ''}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-center text-gray-600 border-r border-gray-200">
                            {hole.player2Putt ? '✓' : ''}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-600 text-center border-r border-gray-200">
                            {player2EffHcp}
                          </td>
                          <td className={`px-3 py-1 whitespace-nowrap text-xs font-medium text-center border-r-2 border-gray-300 bg-green-50 ${
                            hole.player2Score > 0 ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {hole.player2Score > 0 ? result.player2Score : ''}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-center text-gray-900">
                            {hole.player1Score > 0 && hole.player2Score > 0 ? (
                              hole.winner === 'player1' ? (
                                <span className="text-blue-600">{match.player1.name.split(' ')[0]}</span>
                              ) : hole.winner === 'player2' ? (
                                <span className="text-green-600">{match.player2.name.split(' ')[0]}</span>
                              ) : (
                                <span className="text-gray-600">Tie</span>
                              )
                            ) : ''}
                          </td>
                        </tr>
                      );
                    };

                    const renderSummaryRow = (label: string, holes: typeof match.holes) => {
                      const parSum = holes.reduce((s, h) => s + h.par, 0);
                      const p1StrokesSum = holes.reduce((s, h) => s + (h.player1Score || 0), 0);
                      const p2StrokesSum = holes.reduce((s, h) => s + (h.player2Score || 0), 0);
                      const p1PuttCount = holes.filter(h => h.player1Putt).length;
                      const p2PuttCount = holes.filter(h => h.player2Putt).length;
                      const p1EffSum = holes.reduce((s, h) => s + calculateEffectiveHandicap(p1Hcp, p2Hcp, h.handicap)[0], 0);
                      const p2EffSum = holes.reduce((s, h) => s + calculateEffectiveHandicap(p1Hcp, p2Hcp, h.handicap)[1], 0);
                      const p1ScoreSum = holes.reduce((s, h) => {
                        if (h.player1Score > 0 && h.player2Score > 0) {
                          const [e1, e2] = calculateEffectiveHandicap(p1Hcp, p2Hcp, h.handicap);
                          return s + calculateScore(e1, h.player1Score, h.player1Putt, e2, h.player2Score, h.player2Putt, h.par).player1Score;
                        }
                        return s;
                      }, 0);
                      const p2ScoreSum = holes.reduce((s, h) => {
                        if (h.player1Score > 0 && h.player2Score > 0) {
                          const [e1, e2] = calculateEffectiveHandicap(p1Hcp, p2Hcp, h.handicap);
                          return s + calculateScore(e1, h.player1Score, h.player1Putt, e2, h.player2Score, h.player2Putt, h.par).player2Score;
                        }
                        return s;
                      }, 0);
                      return (
                        <tr key={label} className="bg-gray-200 font-semibold">
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200">{label}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-500 border-r border-gray-200"></td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 border-r-2 border-gray-300">{parSum}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center border-r border-gray-200">{p1StrokesSum || ''}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center border-r border-gray-200">{p1PuttCount || ''}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center border-r border-gray-200">{p1EffSum}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-green-600 text-center border-r-2 border-gray-300">{p1ScoreSum || ''}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center border-r border-gray-200">{p2StrokesSum || ''}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center border-r border-gray-200">{p2PuttCount || ''}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center border-r border-gray-200">{p2EffSum}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-green-600 text-center border-r-2 border-gray-300">{p2ScoreSum || ''}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-center"></td>
                        </tr>
                      );
                    };

                    return (
                      <>
                        {frontNine.map((hole, idx) => renderHoleRow(hole, idx))}
                        {renderSummaryRow('Out', frontNine)}
                        {backNine.map((hole, idx) => renderHoleRow(hole, idx + 9))}
                        {renderSummaryRow('In', backNine)}
                      </>
                    );
                  })()}
                  
                  {/* Totals row */}
                  <tr className="bg-gray-200 font-bold">
                    <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 border-r border-gray-200">Total</td>
                    <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-500 border-r border-gray-200"></td>
                    <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 border-r-2 border-gray-300">
                      {match.holes.reduce((s, h) => s + h.par, 0)}
                    </td>
                    {/* Player 1 totals */}
                    <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center border-r border-gray-200">
                      {match.holes.reduce((total, hole) => total + (hole.player1Score || 0), 0)}
                    </td>
                    <td className="px-3 py-1 whitespace-nowrap text-xs text-center text-gray-900 border-r border-gray-200">
                      {match.holes.filter(h => h.player1Putt).length}
                    </td>
                    <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center border-r border-gray-200">
                      {match.holes.reduce((total, hole) => {
                        const [player1EffHcp, _] = calculateEffectiveHandicap(
                          match.player1.handicap || 0,
                          match.player2.handicap || 0,
                          hole.handicap
                        );
                        return total + player1EffHcp;
                      }, 0)}
                    </td>
                    <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center border-r-2 border-gray-300 text-green-600">
                      {match.player1.score}
                    </td>
                    
                    {/* Player 2 totals */}
                    <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center border-r border-gray-200">
                      {match.holes.reduce((total, hole) => total + (hole.player2Score || 0), 0)}
                    </td>
                    <td className="px-3 py-1 whitespace-nowrap text-xs text-center text-gray-900 border-r border-gray-200">
                      {match.holes.filter(h => h.player2Putt).length}
                    </td>
                    <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center border-r border-gray-200">
                      {match.holes.reduce((total, hole) => {
                        const [_, player2EffHcp] = calculateEffectiveHandicap(
                          match.player1.handicap || 0,
                          match.player2.handicap || 0,
                          hole.handicap
                        );
                        return total + player2EffHcp;
                      }, 0)}
                    </td>
                    <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-center border-r-2 border-gray-300 text-green-600">
                      {match.player2.score}
                    </td>
                    
                    {/* Overall winner */}
                    <td className="px-3 py-1 whitespace-nowrap text-xs text-center text-gray-900">
                      {match.player1.score > 0 && match.player2.score > 0 ? (
                        (() => {
                          const player1Wins = match.holes.filter(h => h.winner === 'player1').length;
                          const player2Wins = match.holes.filter(h => h.winner === 'player2').length;
                          
                          if (player1Wins > player2Wins) {
                            return <span className="text-blue-600">{match.player1.name.split(' ')[0]} {player1Wins - player2Wins} up</span>;
                          } else if (player2Wins > player1Wins) {
                            return <span className="text-green-600">{match.player2.name.split(' ')[0]} {player2Wins - player1Wins} up</span>;
                          } else {
                            return <span className="text-gray-600">Tie</span>;
                          }
                        })()
                      ) : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 