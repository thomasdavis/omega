import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getBlogDir } from '@repo/shared';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blogDir = getBlogDir();
    const filePath = join(blogDir, `${id}.md`);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blog post not found',
        },
        { status: 404 }
      );
    }

    const content = readFileSync(filePath, 'utf-8');

    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid blog post format',
        },
        { status: 500 }
      );
    }

    const [, frontmatterText, body] = frontmatterMatch;
    const frontmatter: Record<string, any> = {};

    // Parse YAML-like frontmatter
    frontmatterText.split('\n').forEach((line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        const key = line.substring(0, colonIndex).trim();
        let value: string | boolean = line.substring(colonIndex + 1).trim();

        // Remove quotes
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        // Parse booleans
        if (value === 'true') value = true;
        if (value === 'false') value = false;

        frontmatter[key] = value;
      }
    });

    return NextResponse.json({
      success: true,
      post: {
        id,
        title: frontmatter.title || id,
        date: frontmatter.date || new Date().toISOString(),
        content: body,
        tts: frontmatter.tts === true,
        ttsVoice: frontmatter.ttsVoice || 'bm_fable',
        frontmatter,
      },
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch blog post',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
