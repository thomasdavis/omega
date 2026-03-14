import { NextResponse } from 'next/server';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { getBlogDir } from '@repo/shared';

export async function GET() {
  try {
    const blogDir = getBlogDir();
    const files = readdirSync(blogDir);

    const posts = files
      .filter((file) => file.endsWith('.md'))
      .map((file) => {
        const filePath = join(blogDir, file);
        const stats = statSync(filePath);
        const content = readFileSync(filePath, 'utf-8');

        // Parse frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
        let title = file.replace('.md', '');
        let date = stats.birthtime.toISOString().split('T')[0];

        if (frontmatterMatch) {
          const frontmatter = frontmatterMatch[1];
          // Match title with double quotes, single quotes, or unquoted
          const titleMatch = frontmatter.match(/title:\s*(?:"([^"]+)"|'([^']+)'|(.+))/);
          const dateMatch = frontmatter.match(/date:\s*(?:"([^"]+)"|'([^']+)'|(\S+))/);
          if (titleMatch) title = (titleMatch[1] || titleMatch[2] || titleMatch[3]).trim();
          if (dateMatch) date = (dateMatch[1] || dateMatch[2] || dateMatch[3]).trim();
        }

        return {
          id: file.replace('.md', ''),
          filename: file,
          title,
          date,
          createdAt: stats.birthtime.toISOString(),
          size: stats.size,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length,
    });
  } catch (error) {
    console.error('Error listing blog posts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list blog posts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
