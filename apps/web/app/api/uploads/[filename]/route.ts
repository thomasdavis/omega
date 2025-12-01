import { NextResponse } from 'next/server';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { getUploadsDir } from '@repo/shared';
import { lookup } from 'mime-types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const uploadsDir = getUploadsDir();
    const filePath = join(uploadsDir, filename);

    // Security check: prevent directory traversal
    if (!filePath.startsWith(uploadsDir)) {
      return NextResponse.json(
        { success: false, error: 'Invalid filename' },
        { status: 400 }
      );
    }

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    const stats = statSync(filePath);
    if (!stats.isFile()) {
      return NextResponse.json(
        { success: false, error: 'Not a file' },
        { status: 400 }
      );
    }

    const content = readFileSync(filePath);
    const mimeType = lookup(filename) || 'application/octet-stream';

    return new NextResponse(content, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving upload:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to serve file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
