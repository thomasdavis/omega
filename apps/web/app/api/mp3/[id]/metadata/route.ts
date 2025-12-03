import { NextResponse } from 'next/server';
import { getMp3FileMetadata } from '@repo/database';

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

    const metadata = await getMp3FileMetadata(mp3Id);

    if (!metadata) {
      return NextResponse.json(
        { success: false, error: 'MP3 file not found' },
        { status: 404 }
      );
    }

    // Convert Date to ISO string for JSON serialization
    const serializedMetadata = {
      ...metadata,
      createdAt: metadata.createdAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      metadata: serializedMetadata,
    });
  } catch (error) {
    console.error('Error fetching MP3 metadata:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch MP3 metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
