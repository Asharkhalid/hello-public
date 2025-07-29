import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const meetingId = resolvedParams.id;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' }, 
        { status: 400 }
      );
    }

    // Check if database is available
    if (!db.query) {
      console.error('Database not available in API route');
      return NextResponse.json(
        { error: 'Database connection error' }, 
        { status: 503 }
      );
    }

    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, meetingId),
      columns: {
        id: true,
        status: true,
        error: true,
        processingStartedAt: true,
        startedAt: true,
        endedAt: true,
      }
    });

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: meeting.id,
      status: meeting.status,
      error: meeting.error,
      processingStartedAt: meeting.processingStartedAt,
      startedAt: meeting.startedAt,
      endedAt: meeting.endedAt,
    });

  } catch (error) {
    console.error('Error fetching meeting status:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}