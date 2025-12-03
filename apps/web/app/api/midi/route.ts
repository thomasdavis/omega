import { NextResponse } from 'next/server';
import { listMidiFilesMetadata, getMidiFileCount } from '@repo/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [midiFiles, totalCount] = await Promise.all([
      listMidiFilesMetadata(limit, offset),
      getMidiFileCount(),
    ]);

    // Convert BigInt to string for JSON serialization
    const serializedMidiFiles = midiFiles.map((file) => ({
      ...file,
      createdAt: file.createdAt.toString(),
      fileSize: file.fileSize,
    }));

    return NextResponse.json({
      success: true,
      midiFiles: serializedMidiFiles,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Error listing MIDI files:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list MIDI files',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
