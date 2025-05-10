'use client';

import { useState, useEffect } from 'react';
import { Match as MatchType } from '@/app/api/matches/route';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { calculateEffectiveHandicap } from '@/lib/handicap';

interface Event {
  _id: string;
  name: string;
  date: string;
}

export default function PrintMatchCards() {
  const params = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [matches, setMatches] = useState<MatchType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch event data
        const eventResponse = await fetch(`/api/events?id=${params.id}`);
        if (!eventResponse.ok) {
          throw new Error(`HTTP error! status: ${eventResponse.status}`);
        }
        const eventData = await eventResponse.json();
        setEvent(eventData);

        // Fetch matches data
        const matchesResponse = await fetch(`/api/matches?eventId=${params.id}`);
        if (!matchesResponse.ok) {
          throw new Error(`HTTP error! status: ${matchesResponse.status}`);
        }
        const matchesData = await matchesResponse.json();
        setMatches(matchesData);
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
          <p className="text-black">Loading match data...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
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
          <div className="bg-yellow-100 text-yellow-700 p-4 rounded-md mb-4">
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
          <h1 className="text-2xl font-semibold text-black">Match Cards - {event.name}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
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
          <div className="space-y-2">
            {matches.map((match, index) => (
              <div key={match._id} className="bg-white rounded-lg shadow-sm p-2 border border-gray-200">
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <h2 className="text-base font-semibold text-black leading-snug">Match Card / {event.name} / {new Date(event.date).toISOString().split('T')[0]}</h2>
                    <p className="text-xs text-black leading-snug">Tee Time: {new Date(match.teeTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} | Starting Hole: {match.tee}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {/* Player 1 */}
                  <div className="border border-gray-200 rounded-lg p-1.5">
                    <h3 className="font-semibold text-xs text-black leading-snug">{match.player1.name}</h3>
                    <p className="text-xs text-black leading-snug">Team: {match.player1.teamName} | Hcp: {match.player1.handicap}</p>
                    <div className="mt-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            <th className="text-left text-black py-0.5">Hole</th>
                            <th className="text-left text-black py-0.5">Par</th>
                            <th className="text-left text-black py-0.5">Hcp</th>
                            <th className="text-left text-black py-0.5">Eff Hcp</th>
                            <th className="text-left text-black py-0.5">Score</th>
                            <th className="text-left text-black py-0.5">Putt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {match.holes.map((hole) => {
                            const [player1EffHcp, _] = calculateEffectiveHandicap(
                              match.player1.handicap,
                              match.player2.handicap,
                              hole.handicap
                            );
                            return (
                              <tr key={hole.hole} className="h-4">
                                <td className="text-black py-0.5">{hole.hole}</td>
                                <td className="text-black py-0.5">{hole.par}</td>
                                <td className="text-black py-0.5">{hole.handicap}</td>
                                <td className="text-black py-0.5">{player1EffHcp}</td>
                                <td className="border-b border-gray-200 py-0.5"></td>
                                <td className="border-b border-gray-200 py-0.5"></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Player 2 */}
                  <div className="border border-gray-200 rounded-lg p-1.5">
                    <h3 className="font-semibold text-xs text-black leading-snug">{match.player2.name}</h3>
                    <p className="text-xs text-black leading-snug">Team: {match.player2.teamName} | Hcp: {match.player2.handicap}</p>
                    <div className="mt-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            <th className="text-left text-black py-0.5">Hole</th>
                            <th className="text-left text-black py-0.5">Par</th>
                            <th className="text-left text-black py-0.5">Hcp</th>
                            <th className="text-left text-black py-0.5">Eff Hcp</th>
                            <th className="text-left text-black py-0.5">Score</th>
                            <th className="text-left text-black py-0.5">Putt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {match.holes.map((hole) => {
                            const [_, player2EffHcp] = calculateEffectiveHandicap(
                              match.player1.handicap,
                              match.player2.handicap,
                              hole.handicap
                            );
                            return (
                              <tr key={hole.hole} className="h-4">
                                <td className="text-black py-0.5">{hole.hole}</td>
                                <td className="text-black py-0.5">{hole.par}</td>
                                <td className="text-black py-0.5">{hole.handicap}</td>
                                <td className="text-black py-0.5">{player2EffHcp}</td>
                                <td className="border-b border-gray-200 py-0.5"></td>
                                <td className="border-b border-gray-200 py-0.5"></td>
                              </tr>
                            );
                          })}
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
              gap: 0.75rem;
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
            @page {
              size: A4;
              margin: 1cm;
            }
          }
        `}</style>
      </div>
    </main>
  );
} 