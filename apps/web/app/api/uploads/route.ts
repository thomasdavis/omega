import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { getUploadsDir } from '@repo/shared';

export async function GET() {
  try {
    const uploadsDir = getUploadsDir();
    const files = readdirSync(uploadsDir);

    const uploads = files
      .filter((file) => {
        const filePath = join(uploadsDir, file);
        return statSync(filePath).isFile() && !file.endsWith('.json');
      })
      .map((file) => {
        const filePath = join(uploadsDir, file);
        const stats = statSync(filePath);

        return {
          filename: file,
          url: `/api/uploads/${file}`,
          uploadedAt: stats.birthtime.toISOString(),
          size: stats.size,
        };
      })
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json({
      success: true,
      uploads,
      count: uploads.length,
    });
  } catch (error) {
    console.error('Error listing uploads:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list uploads',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
