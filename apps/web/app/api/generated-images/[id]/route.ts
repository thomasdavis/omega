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

    const image = await getGeneratedImage(imageId);

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

      // Determine content type from format
      const contentType = image.format === 'jpg' || image.format === 'jpeg'
        ? 'image/jpeg'
        : image.format === 'gif'
        ? 'image/gif'
        : image.format === 'webp'
        ? 'image/webp'
        : 'image/png';

      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${image.filename}"`,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // If no image data in database, return metadata with public URL
    return NextResponse.json({
      success: true,
      image: {
        id: image.id,
        title: image.title,
        description: image.description,
        prompt: image.prompt,
        revisedPrompt: image.revisedPrompt,
        toolUsed: image.toolUsed,
        modelUsed: image.modelUsed,
        filename: image.filename,
        fileSize: image.fileSize,
        publicUrl: image.publicUrl,
        width: image.width,
        height: image.height,
        format: image.format,
        metadata: image.metadata,
        createdBy: image.createdBy,
        createdByUsername: image.createdByUsername,
        discordMessageId: image.discordMessageId,
        githubIssueNumber: image.githubIssueNumber,
        createdAt: image.createdAt.toISOString(),
      },
      message: 'Image data not stored in database. Use publicUrl or artifactPath to access the image.',
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
