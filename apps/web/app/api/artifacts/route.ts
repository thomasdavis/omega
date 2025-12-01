import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { getArtifactsDir } from '@repo/shared';

export async function GET() {
  try {
    const artifactsDir = getArtifactsDir();
    const files = readdirSync(artifactsDir);

    const artifacts = files
      .filter((file) => {
        const filePath = join(artifactsDir, file);
        return statSync(filePath).isFile();
      })
      .map((file) => {
        const filePath = join(artifactsDir, file);
        const stats = statSync(filePath);
        const ext = file.split('.').pop();

        return {
          id: file,
          filename: file,
          type: ext === 'html' ? 'HTML' : ext === 'svg' ? 'SVG' : 'Markdown',
          createdAt: stats.birthtime.toISOString(),
          size: stats.size,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      artifacts,
      count: artifacts.length,
    });
  } catch (error) {
    console.error('Error listing artifacts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list artifacts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
