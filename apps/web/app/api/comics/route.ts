import { NextResponse } from 'next/server';
import { readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Get the comics directory path
 * Priority:
 * 1. /data/comics (Railway persistent volume - shared with bot service) - only if it contains files
 * 2. public/comics (Next.js public directory - fallback for built-in comics)
 */
function getComicsDir(): string {
  // Check for Railway persistent volume with actual comic files
  const dataComicsPath = '/data/comics';
  if (existsSync(dataComicsPath)) {
    try {
      const files = readdirSync(dataComicsPath);
      const hasComics = files.some(f => f.startsWith('comic_') && f.endsWith('.png'));
      if (hasComics) {
        return dataComicsPath;
      }
    } catch (error) {
      console.warn('Failed to read /data/comics, falling back to public directory:', error);
    }
  }

  // Fallback to Next.js public directory
  const comicsPath = join(process.cwd(), 'public/comics');

  // Create directory if it doesn't exist (for local dev)
  if (!existsSync(comicsPath)) {
    mkdirSync(comicsPath, { recursive: true });
  }

  return comicsPath;
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
