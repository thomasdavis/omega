import { NextResponse } from 'next/server';
import { getAbcSheetMusic } from '@repo/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sheetMusic = await getAbcSheetMusic(id);

    if (!sheetMusic) {
      return NextResponse.json(
        { success: false, error: 'ABC sheet music not found' },
        { status: 404 }
      );
    }

    // Convert BigInt to string for JSON serialization
    const serializedSheetMusic = {
      ...sheetMusic,
      createdAt: sheetMusic.createdAt.toString(),
    };

    return NextResponse.json({
      success: true,
      sheetMusic: serializedSheetMusic,
    });
  } catch (error) {
    console.error('Error fetching ABC sheet music:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch ABC sheet music',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
