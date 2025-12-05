import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Get the user images directory path
 * Reads from /data/user-images in production, apps/web/public/user-images in development
 */
function getUserImagesDir(): string {
  // Check if running in production with Railway volume
  if (process.env.NODE_ENV === 'production' && existsSync('/data')) {
    return '/data/user-images';
  }
  // Development fallback - Next.js public directory
  return join(process.cwd(), 'public/user-images');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Security: Only allow PNG files with user-image- prefix
    if (!filename.endsWith('.png') || !filename.startsWith('user-image-')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid filename format',
        },
        { status: 400 }
      );
    }

    const userImagesDir = getUserImagesDir();
    const filePath = join(userImagesDir, filename);

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Image not found',
        },
        { status: 404 }
      );
    }

    // Read and serve the file
    const fileBuffer = readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Discord and other services need these headers for preview/embed
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error serving user image:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to serve image',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
