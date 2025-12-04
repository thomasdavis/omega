import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Get the comics directory path
 * Reads from web app's public/comics directory
 */
function getComicsDir(): string {
  // Next.js public directory
  return join(process.cwd(), 'public/comics');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Security: Only allow PNG files with comic_ prefix
    if (!filename.endsWith('.png') || !filename.startsWith('comic_')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid filename format',
        },
        { status: 400 }
      );
    }

    const comicsDir = getComicsDir();
    const filePath = join(comicsDir, filename);

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Comic not found',
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
      },
    });
  } catch (error) {
    console.error('Error serving comic:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to serve comic',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
