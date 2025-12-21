import { NextResponse } from 'next/server';
import { getVideoFile } from '@repo/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id, 10);

    if (isNaN(videoId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid video file ID' },
        { status: 400 }
      );
    }

    const videoFile = await getVideoFile(videoId);

    if (!videoFile) {
      return NextResponse.json(
        { success: false, error: 'Video file not found' },
        { status: 404 }
      );
    }

    // Return the video binary data
    // Convert Buffer to Uint8Array for NextResponse
    const videoBuffer = Buffer.isBuffer(videoFile.videoData)
      ? new Uint8Array(videoFile.videoData)
      : videoFile.videoData;

    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${videoFile.filename}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error fetching video file:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch video file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
