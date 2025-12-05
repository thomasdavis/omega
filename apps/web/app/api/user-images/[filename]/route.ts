import { NextResponse } from 'next/server';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { lookup } from 'mime-types';

/**
 * Get the user-images directory path
 * Reads from bot app's public/user-images directory
 */
function getUserImagesDir(): string {
  // Bot's public/user-images directory
  return join(process.cwd(), 'apps/bot/public/user-images');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const userImagesDir = getUserImagesDir();
    const filePath = join(userImagesDir, filename);

    // Security check: prevent directory traversal
    if (!filePath.startsWith(userImagesDir)) {
      console.error(`⚠️ Security violation: Attempted directory traversal with filename: ${filename}`);
      return NextResponse.json(
        { success: false, error: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Security: Only allow image files with user-image prefix
    if (!filename.startsWith('user-image-')) {
      console.error(`⚠️ Invalid filename format: ${filename} (must start with 'user-image-')`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid filename format',
        },
        { status: 400 }
      );
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      console.error(`❌ User image not found: ${filePath}`);
      console.error(`   Requested filename: ${filename}`);
      console.error(`   User images directory: ${userImagesDir}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Image not found',
        },
        { status: 404 }
      );
    }

    const stats = statSync(filePath);
    if (!stats.isFile()) {
      console.error(`⚠️ Path is not a file: ${filePath}`);
      return NextResponse.json(
        { success: false, error: 'Not a file' },
        { status: 400 }
      );
    }

    // Read and serve the file
    const content = readFileSync(filePath);
    const mimeType = lookup(filename) || 'application/octet-stream';

    console.log(`✅ Serving user image: ${filename} (${stats.size} bytes, ${mimeType})`);

    return new NextResponse(content, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('❌ Error serving user image:', error);
    console.error(`   Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.error(`   Stack trace: ${error.stack}`);
    }
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
