import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { getArtifactsDir } from '@repo/shared';

export async function GET() {
  try {
    const artifactsDir = getArtifactsDir();
    const files = readdirSync(artifactsDir);

    const comics = files
      .filter((file) => {
        const filePath = join(artifactsDir, file);
        // Filter for HTML files that contain "comic" in the filename
        return (
          statSync(filePath).isFile() &&
          file.endsWith('.html') &&
          file.toLowerCase().includes('comic')
        );
      })
      .map((file) => {
        const filePath = join(artifactsDir, file);
        const stats = statSync(filePath);

        return {
          id: file,
          filename: file,
          createdAt: stats.birthtime.toISOString(),
          size: stats.size,
        };
      })
      // Sort by newest first
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
