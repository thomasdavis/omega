import { NextResponse } from 'next/server';
import { getMp3File } from '@repo/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mp3Id = parseInt(id, 10);

    if (isNaN(mp3Id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid MP3 file ID' },
        { status: 400 }
      );
    }

    const mp3File = await getMp3File(mp3Id);

    if (!mp3File) {
      return NextResponse.json(
        { success: false, error: 'MP3 file not found' },
        { status: 404 }
      );
    }

    // Return the MP3 binary data
    // Convert Buffer to Uint8Array for NextResponse
    const mp3Buffer = Buffer.isBuffer(mp3File.mp3Data)
      ? new Uint8Array(mp3File.mp3Data)
      : mp3File.mp3Data;

    return new NextResponse(mp3Buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${mp3File.filename}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error fetching MP3 file:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch MP3 file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
