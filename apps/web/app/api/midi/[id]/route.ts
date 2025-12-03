import { NextResponse } from 'next/server';
import { getMidiFile } from '@repo/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const midiFile = await getMidiFile(id);

    if (!midiFile) {
      return NextResponse.json(
        { success: false, error: 'MIDI file not found' },
        { status: 404 }
      );
    }

    // Return the MIDI binary data
    // Convert Buffer to Uint8Array for NextResponse
    const midiBuffer = Buffer.isBuffer(midiFile.midiData)
      ? new Uint8Array(midiFile.midiData)
      : midiFile.midiData;

    return new NextResponse(midiBuffer, {
      headers: {
        'Content-Type': 'audio/midi',
        'Content-Disposition': `attachment; filename="${midiFile.filename}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error fetching MIDI file:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch MIDI file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
