import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';

export interface Hole {
  number: number;
  handicap: number;
  par: number;
}

export interface Tee {
  name: string;
  cr: number;
  slope: number;
}

export interface Course {
  _id: string;
  name: string;
  address: string;
  holes: Hole[];
  menTees: Tee[];
  womenTees: Tee[];
  createdAt: string;
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      // Fetch a specific course
      const course = await Course.findById(id);
      
      if (!course) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(course);
    }
    
    // Fetch all courses
    const courses = await Course.find().sort({ name: 1 });
    
    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name || !body.address) {
      return NextResponse.json(
        { error: 'Missing required fields (name, address)' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Create a new course
    const course = await Course.create({
      name: body.name,
      address: body.address,
      holes: body.holes || [],
      menTees: body.menTees || [],
      womenTees: body.womenTees || [],
      createdAt: new Date()
    });
    
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Failed to create course', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    if (!body.name || !body.address) {
      return NextResponse.json(
        { error: 'Missing required fields (name, address)' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Update the course
    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      {
        name: body.name,
        address: body.address,
        holes: body.holes || [],
        menTees: body.menTees || [],
        womenTees: body.womenTees || []
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Failed to update course', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Delete the course
    const result = await Course.findByIdAndDelete(id);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
