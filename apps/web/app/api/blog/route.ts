import { NextResponse } from 'next/server';
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getBlogDir } from '@repo/shared';

/**
 * Parse a frontmatter value that may be double-quoted, single-quoted, or unquoted
 */
function parseFrontmatterValue(frontmatter: string, key: string): string | null {
  const regex = new RegExp(`${key}:\\s*(?:"([^"]+)"|'([^']+)'|(.+))`, 'm');
  const match = frontmatter.match(regex);
  if (!match) return null;
  return (match[1] || match[2] || match[3])?.trim() || null;
}

/**
 * Read blog posts from a directory
 */
function readPostsFromDir(dir: string): Array<{
  id: string;
  filename: string;
  title: string;
  date: string;
  createdAt: string;
  size: number;
}> {
  if (!existsSync(dir)) return [];

  try {
    const files = readdirSync(dir);
    return files
      .filter((file) => file.endsWith('.md'))
      .map((file) => {
        const filePath = join(dir, file);
        const stats = statSync(filePath);
        const content = readFileSync(filePath, 'utf-8');

        // Parse frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
        let title = file.replace('.md', '');
        let date = stats.birthtime.toISOString().split('T')[0];

        if (frontmatterMatch) {
          const frontmatter = frontmatterMatch[1];
          const parsedTitle = parseFrontmatterValue(frontmatter, 'title');
          const parsedDate = parseFrontmatterValue(frontmatter, 'date');
          if (parsedTitle) title = parsedTitle;
          if (parsedDate) date = parsedDate;
        }

        return {
          id: file.replace('.md', ''),
          filename: file,
          title,
          date,
          createdAt: stats.birthtime.toISOString(),
          size: stats.size,
        };
      });
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const blogDir = getBlogDir();

    // Read posts from the primary blog directory (persistent volume in production)
    const primaryPosts = readPostsFromDir(blogDir);

    // Also read bundled content/blog posts (shipped with the Docker image)
    // These serve as fallback content when the persistent volume is empty or missing posts
    const bundledDir = join(process.cwd(), 'content/blog');
    const bundledPosts = blogDir !== bundledDir ? readPostsFromDir(bundledDir) : [];

    // Merge: primary posts take priority (by id), then add bundled posts not already present
    const postMap = new Map<string, (typeof primaryPosts)[0]>();
    for (const post of primaryPosts) {
      postMap.set(post.id, post);
    }
    for (const post of bundledPosts) {
      if (!postMap.has(post.id)) {
        postMap.set(post.id, post);
      }
    }

    const posts = Array.from(postMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

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
