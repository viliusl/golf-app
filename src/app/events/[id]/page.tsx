'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

interface Event {
  _id: string;
  name: string;
  date: string;
}

export default function EventDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events?id=${resolvedParams.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setEvent(data);
      } catch (error) {
        console.error('Error fetching event:', error);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-black">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-black">Event not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-500 hover:text-blue-700 mb-4"
          >
            ← Back to Events
          </button>
          <h1 className="text-3xl font-bold text-black">{event.name}</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h2 className="text-sm font-medium text-gray-500">Event Name</h2>
              <p className="mt-1 text-lg text-black">{event.name}</p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-500">Date</h2>
              <p className="mt-1 text-lg text-black">
                {new Date(event.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 