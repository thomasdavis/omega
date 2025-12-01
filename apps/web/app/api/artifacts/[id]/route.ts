import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getArtifactsDir } from '@repo/shared';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const artifactsDir = getArtifactsDir();
    const filePath = join(artifactsDir, id);

    // Security check: prevent directory traversal
    if (!filePath.startsWith(artifactsDir)) {
      return NextResponse.json(
        { success: false, error: 'Invalid artifact ID' },
        { status: 400 }
      );
    }

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Artifact not found' },
        { status: 404 }
      );
    }

    const content = readFileSync(filePath, 'utf-8');
    const ext = id.split('.').pop();

    // Determine content type
    let contentType = 'text/plain';
    if (ext === 'html') contentType = 'text/html';
    else if (ext === 'svg') contentType = 'image/svg+xml';
    else if (ext === 'md') contentType = 'text/markdown';

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching artifact:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch artifact',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
