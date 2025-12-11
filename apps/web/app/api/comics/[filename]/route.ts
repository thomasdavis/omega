import { NextResponse } from 'next/server';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Check if running in production with persistent volume
 */
function isProductionWithVolume(): boolean {
  return process.env.NODE_ENV === 'production' && existsSync('/data');
}

/**
 * Get the comics directory path
 * Returns persistent volume path in production, local path otherwise
 */
function getComicsDir(): string {
  if (isProductionWithVolume()) {
    const dir = '/data/comics';
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  // Local development: use public/comics directory
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
