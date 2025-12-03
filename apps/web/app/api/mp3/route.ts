import { NextResponse } from 'next/server';
import { listMp3FilesMetadata, getMp3FileCount } from '@repo/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [mp3Files, totalCount] = await Promise.all([
      listMp3FilesMetadata(limit, offset),
      getMp3FileCount(),
    ]);

    // Convert Date to ISO string for JSON serialization
    const serializedMp3Files = mp3Files.map((file) => ({
      ...file,
      createdAt: file.createdAt.toISOString(),
      fileSize: file.fileSize,
    }));

    return NextResponse.json({
      success: true,
      mp3Files: serializedMp3Files,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Error listing MP3 files:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list MP3 files',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
