import { NextResponse } from 'next/server';
import { listGeneratedImagesMetadata, getGeneratedImageCount } from '@repo/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [images, totalCount] = await Promise.all([
      listGeneratedImagesMetadata(limit, offset),
      getGeneratedImageCount(),
    ]);

    // Convert Date objects to ISO strings for JSON serialization
    const serializedImages = images.map((image) => ({
      ...image,
      createdAt: image.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      images: serializedImages,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Error listing generated images:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list generated images',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
