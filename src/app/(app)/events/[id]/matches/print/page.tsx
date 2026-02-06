'use client';

import { useState, useEffect } from 'react';
import { Match as MatchType } from '@/app/api/matches/route';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { calculateEffectiveHandicap } from '@/lib/handicap';

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
  course?: {
    _id: string;
    name: string;
  };
  teams?: EventTeam[];
}

interface PlayerRef {
  _id: string;
  name: string;
  handicap: number;
}

export default function PrintMatchCards() {
  const params = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [matches, setMatches] = useState<MatchType[]>([]);
  const [nameToHcp, setNameToHcp] = useState<Map<string, number>>(new Map());
  const [nameToTee, setNameToTee] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventResponse, matchesResponse, playersResponse] = await Promise.all([
          fetch(`/api/events?id=${params.id}`),
          fetch(`/api/matches?eventId=${params.id}`),
          fetch('/api/players')
        ]);

        if (!eventResponse.ok) throw new Error(`HTTP error! status: ${eventResponse.status}`);
        if (!matchesResponse.ok) throw new Error(`HTTP error! status: ${matchesResponse.status}`);
        if (!playersResponse.ok) throw new Error(`HTTP error! status: ${playersResponse.status}`);

        const eventData: Event = await eventResponse.json();
        const matchesData = await matchesResponse.json();
        const playersData: PlayerRef[] = await playersResponse.json();

        setEvent(eventData);
        setMatches(matchesData);

        const playerById = new Map(playersData.map((p) => [p._id, p]));
        const hcpByName = new Map<string, number>();
        const teeByName = new Map<string, string>();
        eventData.teams?.forEach((team) => {
          team.members?.forEach((member) => {
            const player = member.playerId ? playerById.get(member.playerId) : undefined;
            if (player?.name == null) return;
            const hcp = member.handicap ?? player?.handicap;
            if (hcp != null) hcpByName.set(player.name, hcp);
            if (member.tee) teeByName.set(player.name, member.tee);
          });
        });
        setNameToHcp(hcpByName);
        setNameToTee(teeByName);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

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

  if (!event) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-orange-100 text-orange-800 p-4 rounded-md mb-4">
            Event not found
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-brand-dark">Match Cards - {event.name}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="bg-brand text-white py-2 px-4 rounded-md hover:bg-brand/90 transition-colors"
            >
              Print Cards
            </button>
            <Link
              href={`/events/${params.id}`}
              className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
            >
              Back to Event
            </Link>
          </div>
        </div>

        <div className="print-section">
          <div className="space-y-1.5">
            {matches.map((match, index) => (
              <div key={match._id} className="bg-white rounded-lg shadow-sm p-1.5 border border-gray-200">
                <div className="flex justify-between items-start mb-0.5">
                  <div>
                    <h2 className="text-sm font-semibold text-black leading-snug">Match Card / {event.name} / {new Date(event.date).toISOString().split('T')[0]}</h2>
                    <p className="text-xs text-black leading-snug">
                      {event.course && <>{event.course.name} | </>}
                      Tee Time: {new Date(match.teeTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} | Starting Hole: {match.tee}
                    </p>
                  </div>
                  <Image
                    src="/logo.svg"
                    alt="DGL.ONLINE"
                    width={80}
                    height={32}
                    className="h-6 w-auto print-logo"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                  {/* Player 1 */}
                  <div className="border border-gray-200 rounded-lg p-1">
                    <h3 className="font-semibold text-xs text-black leading-snug">{match.player1.name} <span className="font-normal">({match.player1.handicapIndex ?? nameToHcp.get(match.player1.name) ?? '–'})</span></h3>
                    <p className="text-xs text-black leading-snug">
                      {match.player1.teamName?.trim() && match.player1.teamName !== '-' && <>Team: {match.player1.teamName} | </>}
                      Tee: {nameToTee.get(match.player1.name) ?? '–'} | P_HCP: {match.player1.handicap}
                    </p>
                    <div className="mt-0.5">
                      <table className="w-full text-xs border-collapse border border-gray-300">
                        <thead>
                          <tr>
                            <th className="text-left text-black py-px px-0.5 border border-gray-300">HOLE</th>
                            <th className="text-left text-black py-px px-0.5 border border-gray-300">PAR</th>
                            <th className="text-left text-black py-px px-0.5 border border-gray-300">HCP</th>
                            <th className="text-left text-black py-px px-0.5 border border-gray-300">Ad. Strokes</th>
                            <th className="text-left text-black py-px px-0.5 border border-gray-300 bg-green-50 text-green-800">Score</th>
                            <th className="text-left text-black py-px px-0.5 border border-gray-300 bg-green-50 text-green-800">1 Putt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const frontNine = match.holes.slice(0, 9);
                            const backNine = match.holes.slice(9, 18);
                            const getP1Eff = (hole: typeof match.holes[0]) => calculateEffectiveHandicap(match.player1.handicap, match.player2.handicap, hole.handicap)[0];
                            const frontPar = frontNine.reduce((s, h) => s + h.par, 0);
                            const backPar = backNine.reduce((s, h) => s + h.par, 0);
                            const frontStrokes = frontNine.reduce((s, h) => s + getP1Eff(h), 0);
                            const backStrokes = backNine.reduce((s, h) => s + getP1Eff(h), 0);
                            const summaryRow = (label: string, par: number, strokes: number) => (
                              <tr key={label} className="h-3 bg-gray-100 font-semibold">
                                <td className="text-black py-px px-0.5 border border-gray-300">{label}</td>
                                <td className="text-black py-px px-0.5 border border-gray-300">{par}</td>
                                <td className="text-black py-px px-0.5 border border-gray-300"></td>
                                <td className="text-black py-px px-0.5 border border-gray-300">{strokes}</td>
                                <td className="py-px px-0.5 border border-gray-300 bg-green-50"></td>
                                <td className="py-px px-0.5 border border-gray-300 bg-green-50"></td>
                              </tr>
                            );
                            const holeRow = (hole: typeof match.holes[0]) => (
                              <tr key={hole.hole} className="h-3">
                                <td className="text-black py-px px-0.5 border border-gray-300">{hole.hole}</td>
                                <td className="text-black py-px px-0.5 border border-gray-300">{hole.par}</td>
                                <td className="text-black py-px px-0.5 border border-gray-300">{hole.handicap}</td>
                                <td className="text-black py-px px-0.5 border border-gray-300">{getP1Eff(hole)}</td>
                                <td className="py-px px-0.5 border border-gray-300 bg-green-50"></td>
                                <td className="py-px px-0.5 border border-gray-300 bg-green-50"></td>
                              </tr>
                            );
                            return (
                              <>
                                {frontNine.map(holeRow)}
                                {summaryRow('Out', frontPar, frontStrokes)}
                                {backNine.map(holeRow)}
                                {summaryRow('In', backPar, backStrokes)}
                                {summaryRow('TOT', frontPar + backPar, frontStrokes + backStrokes)}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Player 2 */}
                  <div className="border border-gray-200 rounded-lg p-1">
                    <h3 className="font-semibold text-xs text-black leading-snug">{match.player2.name} <span className="font-normal">({match.player2.handicapIndex ?? nameToHcp.get(match.player2.name) ?? '–'})</span></h3>
                    <p className="text-xs text-black leading-snug">
                      {match.player2.teamName?.trim() && match.player2.teamName !== '-' && <>Team: {match.player2.teamName} | </>}
                      Tee: {nameToTee.get(match.player2.name) ?? '–'} | P_HCP: {match.player2.handicap}
                    </p>
                    <div className="mt-0.5">
                      <table className="w-full text-xs border-collapse border border-gray-300">
                        <thead>
                          <tr>
                            <th className="text-left text-black py-px px-0.5 border border-gray-300">HOLE</th>
                            <th className="text-left text-black py-px px-0.5 border border-gray-300">PAR</th>
                            <th className="text-left text-black py-px px-0.5 border border-gray-300">HCP</th>
                            <th className="text-left text-black py-px px-0.5 border border-gray-300">Ad. Strokes</th>
                            <th className="text-left text-black py-px px-0.5 border border-gray-300 bg-green-50 text-green-800">Score</th>
                            <th className="text-left text-black py-px px-0.5 border border-gray-300 bg-green-50 text-green-800">1 Putt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const frontNine = match.holes.slice(0, 9);
                            const backNine = match.holes.slice(9, 18);
                            const getP2Eff = (hole: typeof match.holes[0]) => calculateEffectiveHandicap(match.player1.handicap, match.player2.handicap, hole.handicap)[1];
                            const frontPar = frontNine.reduce((s, h) => s + h.par, 0);
                            const backPar = backNine.reduce((s, h) => s + h.par, 0);
                            const frontStrokes = frontNine.reduce((s, h) => s + getP2Eff(h), 0);
                            const backStrokes = backNine.reduce((s, h) => s + getP2Eff(h), 0);
                            const summaryRow = (label: string, par: number, strokes: number) => (
                              <tr key={label} className="h-3 bg-gray-100 font-semibold">
                                <td className="text-black py-px px-0.5 border border-gray-300">{label}</td>
                                <td className="text-black py-px px-0.5 border border-gray-300">{par}</td>
                                <td className="text-black py-px px-0.5 border border-gray-300"></td>
                                <td className="text-black py-px px-0.5 border border-gray-300">{strokes}</td>
                                <td className="py-px px-0.5 border border-gray-300 bg-green-50"></td>
                                <td className="py-px px-0.5 border border-gray-300 bg-green-50"></td>
                              </tr>
                            );
                            const holeRow = (hole: typeof match.holes[0]) => (
                              <tr key={hole.hole} className="h-3">
                                <td className="text-black py-px px-0.5 border border-gray-300">{hole.hole}</td>
                                <td className="text-black py-px px-0.5 border border-gray-300">{hole.par}</td>
                                <td className="text-black py-px px-0.5 border border-gray-300">{hole.handicap}</td>
                                <td className="text-black py-px px-0.5 border border-gray-300">{getP2Eff(hole)}</td>
                                <td className="py-px px-0.5 border border-gray-300 bg-green-50"></td>
                                <td className="py-px px-0.5 border border-gray-300 bg-green-50"></td>
                              </tr>
                            );
                            return (
                              <>
                                {frontNine.map(holeRow)}
                                {summaryRow('Out', frontPar, frontStrokes)}
                                {backNine.map(holeRow)}
                                {summaryRow('In', backPar, backStrokes)}
                                {summaryRow('TOT', frontPar + backPar, frontStrokes + backStrokes)}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Print styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-section, .print-section * {
              visibility: visible !important;
            }
            .print-section {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .print-section > div {
              display: flex;
              flex-direction: column;
              gap: 0.5rem;
            }
            .print-section > div > div:nth-child(2n) {
              page-break-after: always;
            }
            .print-section > div > div:last-child {
              page-break-after: avoid;
            }
            .print-section table {
              page-break-inside: avoid;
            }
            .print-section tr {
              page-break-inside: avoid;
            }
            .print-logo {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            @page {
              size: A4;
              margin: 0.75cm;
            }
          }
        `}</style>
      </div>
    </main>
  );
} 