import { NextResponse } from 'next/server';
import { readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { prisma } from '@repo/database';

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
  const comicsPath = join(process.cwd(), 'public/comics');
  if (!existsSync(comicsPath)) {
    mkdirSync(comicsPath, { recursive: true });
  }

  return comicsPath;
}

export async function GET() {
  try {
    // First, try to fetch comics from database (without binary imageData)
    const dbComics = await prisma.generatedImage.findMany({
      where: {
        toolName: 'generateComic',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        metadata: true,
        createdAt: true,
        bytes: true,
      },
    });

    // Transform DB comics to the expected format
    const comics = dbComics.map((comic) => {
      const metadata = comic.metadata as Record<string, unknown> | null;
      const issueNumber = metadata?.githubIssueNumber || metadata?.githubPrNumber;
      const filename = (metadata?.filename as string) || `comic_${comic.id}.png`;

      return {
        id: Number(comic.id),
        number: (issueNumber as number) || Number(comic.id),
        filename,
        // Serve from database by ID
        url: `/api/comics/${comic.id}`,
        createdAt: comic.createdAt.toISOString(),
        size: comic.bytes || 0,
      };
    });

    // If no comics in DB, fall back to filesystem
    if (comics.length === 0) {
      console.log('No comics in database, falling back to filesystem');
      const comicsDir = getComicsDir();

      if (!existsSync(comicsDir)) {
        return NextResponse.json({
          success: true,
          comics: [],
          count: 0,
          source: 'none',
        });
      }

      const files = readdirSync(comicsDir);

      const filesystemComics = files
        .filter((file) => {
          const filePath = join(comicsDir, file);
          return (
            statSync(filePath).isFile() &&
            file.endsWith('.png') &&
            file.startsWith('comic_')
          );
        })
        .map((file) => {
          const filePath = join(comicsDir, file);
          const stats = statSync(filePath);
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
        .sort((a, b) => b.number - a.number);

      return NextResponse.json({
        success: true,
        comics: filesystemComics,
        count: filesystemComics.length,
        source: 'filesystem',
      });
    }

    return NextResponse.json({
      success: true,
      comics,
      count: comics.length,
      source: 'database',
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
