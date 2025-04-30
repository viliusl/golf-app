import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';

export async function GET() {
  try {
    await connectDB();
    const events = await Event.find().sort({ date: 1 });
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received event data:', body);
    
    // Validate date format
    if (!body.date || isNaN(new Date(body.date).getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    await connectDB();
    const event = await Event.create({
      name: body.name,
      date: new Date(body.date) // Ensure date is properly formatted
    });
    console.log('Created event:', event);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ 
      error: 'Failed to create event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 