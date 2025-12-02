import { NextResponse } from 'next/server';
import { readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Get the comics directory path
 * Uses /data/comics in production (Railway shared volume), otherwise local fallback
 */
function getComicsDir(): string {
  // Check for production Railway volume
  if (process.env.NODE_ENV === 'production' && existsSync('/data')) {
    const dir = '/data/comics';
    // Create the directory if it doesn't exist
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  // Local development fallback
  const fallback = join(process.cwd(), '../bot/public/comics');
  if (!existsSync(fallback)) {
    mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

export async function GET() {
  try {
    // Path to comics directory (shared volume in production)
    const comicsDir = getComicsDir();

    // Check if directory exists
    if (!existsSync(comicsDir)) {
      return NextResponse.json({
        success: false,
        error: 'Comics directory not found',
        path: comicsDir,
        env: process.env.NODE_ENV,
      }, { status: 404 });
    }

    const files = readdirSync(comicsDir);

    const comics = files
      .filter((file) => {
        const filePath = join(comicsDir, file);
        // Filter for PNG files that match comic_###.png pattern
        return (
          statSync(filePath).isFile() &&
          file.endsWith('.png') &&
          file.startsWith('comic_')
        );
      })
      .map((file) => {
        const filePath = join(comicsDir, file);
        const stats = statSync(filePath);

        // Extract comic number from filename (comic_###.png)
        const match = file.match(/comic_(\d+)\.png/);
        const number = match ? parseInt(match[1], 10) : 0;

        return {
          id: number,
          number,
          filename: file,
          url: `/api/comics/${file}`,
          createdAt: stats.birthtime.toISOString(),
          size: stats.size,
        };
      })
      // Sort by number descending (highest number = newest)
      .sort((a, b) => b.number - a.number);

    return NextResponse.json({
      success: true,
      comics,
      count: comics.length,
    });
  } catch (error) {
    console.error('Error listing comics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list comics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
