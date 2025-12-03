import { NextResponse } from 'next/server';
import { getMidiFileMetadata } from '@repo/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const metadata = await getMidiFileMetadata(id);

    if (!metadata) {
      return NextResponse.json(
        { success: false, error: 'MIDI file not found' },
        { status: 404 }
      );
    }

    // Convert BigInt to string for JSON serialization
    const serializedMetadata = {
      ...metadata,
      createdAt: metadata.createdAt.toString(),
    };

    return NextResponse.json({
      success: true,
      metadata: serializedMetadata,
    });
  } catch (error) {
    console.error('Error fetching MIDI metadata:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch MIDI metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
