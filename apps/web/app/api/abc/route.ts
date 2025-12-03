import { NextResponse } from 'next/server';
import { listAbcSheetMusic, getAbcSheetMusicCount } from '@repo/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [sheetMusic, totalCount] = await Promise.all([
      listAbcSheetMusic(limit, offset),
      getAbcSheetMusicCount(),
    ]);

    // Convert BigInt to string for JSON serialization
    const serializedSheetMusic = sheetMusic.map((music) => ({
      ...music,
      createdAt: music.createdAt.toString(),
    }));

    return NextResponse.json({
      success: true,
      sheetMusic: serializedSheetMusic,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Error listing ABC sheet music:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list ABC sheet music',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
