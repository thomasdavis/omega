import { NextResponse } from 'next/server';
import { getGeneratedImage } from '@repo/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const imageId = parseInt(id, 10);

    if (isNaN(imageId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid image ID' },
        { status: 400 }
      );
    }

    const image = await getGeneratedImage(BigInt(imageId));

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    // If image data is stored in database, serve it
    if (image.imageData) {
      const imageBuffer = Buffer.isBuffer(image.imageData)
        ? new Uint8Array(image.imageData)
        : image.imageData;

      // Determine content type from mimeType, fallback to image/png
      const contentType = image.mimeType || 'image/png';

      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="image-${image.id}.${contentType.split('/')[1] || 'png'}"`,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // If no image data in database, return metadata with storage URL
    return NextResponse.json({
      success: true,
      image: {
        id: image.id.toString(),
        requestId: image.requestId,
        userId: image.userId,
        username: image.username,
        toolName: image.toolName,
        prompt: image.prompt,
        model: image.model,
        size: image.size,
        quality: image.quality,
        style: image.style,
        n: image.n,
        storageUrl: image.storageUrl,
        storageProvider: image.storageProvider,
        mimeType: image.mimeType,
        bytes: image.bytes,
        sha256: image.sha256,
        tags: image.tags,
        status: image.status,
        error: image.error,
        metadata: image.metadata,
        messageId: image.messageId,
        createdAt: image.createdAt.toISOString(),
      },
      message: 'Image data not stored in database. Use storageUrl to access the image.',
    });
  } catch (error) {
    console.error('Error fetching generated image:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch generated image',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
