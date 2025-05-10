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

        <div className="print-section space-y-8">
          {matches.map((match) => (
            <div key={match._id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-black">Match Card / {event.name} / {new Date(event.date).toISOString().split('T')[0]}</h2>
                  <p className="text-black">Tee Time: {new Date(match.teeTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  <p className="text-black mb-4">Starting Hole: {match.tee}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-6">
                {/* Player 1 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-black">{match.player1.name}</h3>
                  <p className="text-sm text-black">Team: {match.player1.teamName}</p>
                  <p className="text-sm text-black">Playing Handicap: {match.player1.handicap}</p>
                  <div className="mt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left text-black">Hole</th>
                          <th className="text-left text-black">Par</th>
                          <th className="text-left text-black">Hcp</th>
                          <th className="text-left text-black">Eff Hcp</th>
                          <th className="text-left text-black">Score</th>
                          <th className="text-left text-black">Putt</th>
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
                            <tr key={hole.hole}>
                              <td className="text-black">{hole.hole}</td>
                              <td className="text-black">{hole.par}</td>
                              <td className="text-black">{hole.handicap}</td>
                              <td className="text-black">{player1EffHcp}</td>
                              <td className="border-b border-gray-200"></td>
                              <td className="border-b border-gray-200"></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Player 2 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-black">{match.player2.name}</h3>
                  <p className="text-sm text-black">Team: {match.player2.teamName}</p>
                  <p className="text-sm text-black">Playing Handicap: {match.player2.handicap}</p>
                  <div className="mt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left text-black">Hole</th>
                          <th className="text-left text-black">Par</th>
                          <th className="text-left text-black">Hcp</th>
                          <th className="text-left text-black">Eff Hcp</th>
                          <th className="text-left text-black">Score</th>
                          <th className="text-left text-black">Putt</th>
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
                            <tr key={hole.hole}>
                              <td className="text-black">{hole.hole}</td>
                              <td className="text-black">{hole.par}</td>
                              <td className="text-black">{hole.handicap}</td>
                              <td className="text-black">{player2EffHcp}</td>
                              <td className="border-b border-gray-200"></td>
                              <td className="border-b border-gray-200"></td>
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
              page-break-after: always;
            }
            .print-section > div:last-child {
              page-break-after: avoid;
            }
            .print-section table {
              page-break-inside: avoid;
            }
            .print-section tr {
              page-break-inside: avoid;
            }
          }
        `}</style>
      </div>
    </main>
  );
} 