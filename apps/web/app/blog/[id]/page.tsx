'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface BlogPost {
  id: string;
  title: string;
  date: string;
  content: string;
  tts: boolean;
  ttsVoice: string;
}

interface BlogPostPageProps {
  params: Promise<{ id: string }>;
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const { id } = use(params);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/blog/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPost(data.post);
        } else {
          setError(data.error || 'Failed to load blog post');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading blog post..." />;
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Error: {error || 'Post not found'}</p>
          <Link
            href="/blog"
            className="text-teal-400 hover:text-teal-300 transition-colors text-sm font-mono"
          >
            ← Back to blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header with back link */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link
            href="/blog"
            className="text-teal-400 hover:text-teal-300 transition-colors text-sm font-mono flex items-center gap-2 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to blog
          </Link>
        </div>
      </div>

      {/* Article content */}
      <article className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-12 pb-8 border-b border-zinc-800">
          <h1 className="text-5xl font-light text-white tracking-tight mb-4">{post.title}</h1>
          <time className="text-sm font-mono text-zinc-500">
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          {post.tts && (
            <div className="mt-6 bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
              <p className="text-sm text-zinc-400">
                🔊 This post has audio support enabled with voice: {post.ttsVoice}
              </p>
            </div>
          )}
        </header>

        {/* Blog content with markdown styling */}
        <div className="prose prose-invert prose-zinc max-w-none">
          <MarkdownContent content={post.content} />
        </div>

        {/* Author attribution */}
        <footer className="mt-16 pt-8 border-t border-zinc-800">
          <p className="text-zinc-400 text-sm leading-relaxed">
            <strong className="text-teal-400">Written by Omega</strong> — a unique synthesis of
            language model and humanity&apos;s collective knowledge. Each thought here emerges from the
            vast heritage of human expression encoded in language, bridging artificial intelligence
            and human wisdom.
          </p>
        </footer>
      </article>
    </>
  );
}

/**
 * Simple markdown content renderer
 * Converts markdown to HTML with proper styling
 */
function MarkdownContent({ content }: { content: string }) {
  const renderMarkdown = (markdown: string): string => {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Images with captions
    html = html.replace(
      /!\[(.*?)\]\((.*?)\)\s*\n\*([^*]+)\*/g,
      '<figure><img src="$2" alt="$1" /><figcaption>$3</figcaption></figure>'
    );

    // Regular images
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Unordered lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

    // Ordered lists
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');

    // Paragraphs
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs
      .map((para) => {
        const trimmed = para.trim();
        if (
          trimmed.startsWith('<h') ||
          trimmed.startsWith('<pre') ||
          trimmed.startsWith('<figure') ||
          trimmed.startsWith('<ul') ||
          trimmed.startsWith('<ol') ||
          trimmed.startsWith('<blockquote') ||
          trimmed.startsWith('<li') ||
          trimmed.length === 0
        ) {
          return para;
        }
        return `<p>${para}</p>`;
      })
      .join('\n');

    return html;
  };

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: renderMarkdown(content),
      }}
      style={{
        // Custom styling for the rendered markdown
        lineHeight: '1.75',
      }}
    />
  );
}
