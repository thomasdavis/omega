/**
 * Unit tests for HTML Metadata Extractor
 */

import { describe, it, expect } from 'vitest';
import { extractHtmlMetadata, truncateMetadata } from './htmlMetadata.js';

describe('HTML Metadata Extractor', () => {
  describe('extractHtmlMetadata', () => {
    it('should extract title from HTML', () => {
      const html = `
        <html>
          <head>
            <title>Test Page Title</title>
          </head>
        </html>
      `;
      const metadata = extractHtmlMetadata(html);
      expect(metadata.title).toBe('Test Page Title');
    });

    it('should extract meta description', () => {
      const html = `
        <html>
          <head>
            <meta name="description" content="This is a test description">
          </head>
        </html>
      `;
      const metadata = extractHtmlMetadata(html);
      expect(metadata.description).toBe('This is a test description');
    });

    it('should extract canonical URL', () => {
      const html = `
        <html>
          <head>
            <link rel="canonical" href="https://example.com/canonical-page">
          </head>
        </html>
      `;
      const metadata = extractHtmlMetadata(html);
      expect(metadata.canonicalUrl).toBe('https://example.com/canonical-page');
    });

    it('should extract charset', () => {
      const html = `
        <html>
          <head>
            <meta charset="utf-8">
          </head>
        </html>
      `;
      const metadata = extractHtmlMetadata(html);
      expect(metadata.charset).toBe('utf-8');
    });

    it('should extract OpenGraph metadata', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="OG Title">
            <meta property="og:description" content="OG Description">
            <meta property="og:image" content="https://example.com/image.jpg">
            <meta property="og:url" content="https://example.com/page">
            <meta property="og:type" content="article">
            <meta property="og:site_name" content="Example Site">
          </head>
        </html>
      `;
      const metadata = extractHtmlMetadata(html);
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.openGraph?.title).toBe('OG Title');
      expect(metadata.openGraph?.description).toBe('OG Description');
      expect(metadata.openGraph?.image).toBe('https://example.com/image.jpg');
      expect(metadata.openGraph?.url).toBe('https://example.com/page');
      expect(metadata.openGraph?.type).toBe('article');
      expect(metadata.openGraph?.siteName).toBe('Example Site');
    });

    it('should extract Twitter Card metadata', () => {
      const html = `
        <html>
          <head>
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="Twitter Title">
            <meta name="twitter:description" content="Twitter Description">
            <meta name="twitter:image" content="https://example.com/twitter-image.jpg">
            <meta name="twitter:site" content="@example">
            <meta name="twitter:creator" content="@author">
          </head>
        </html>
      `;
      const metadata = extractHtmlMetadata(html);
      expect(metadata.twitterCard).toBeDefined();
      expect(metadata.twitterCard?.card).toBe('summary_large_image');
      expect(metadata.twitterCard?.title).toBe('Twitter Title');
      expect(metadata.twitterCard?.description).toBe('Twitter Description');
      expect(metadata.twitterCard?.image).toBe('https://example.com/twitter-image.jpg');
      expect(metadata.twitterCard?.site).toBe('@example');
      expect(metadata.twitterCard?.creator).toBe('@author');
    });

    it('should handle HTML entities in text', () => {
      const html = `
        <html>
          <head>
            <title>Test &amp; Title</title>
            <meta name="description" content="Description with &quot;quotes&quot; and &lt;tags&gt;">
          </head>
        </html>
      `;
      const metadata = extractHtmlMetadata(html);
      expect(metadata.title).toBe('Test & Title');
      expect(metadata.description).toBe('Description with "quotes" and <tags>');
    });

    it('should return empty object for non-HTML content', () => {
      const html = 'Just plain text, no HTML';
      const metadata = extractHtmlMetadata(html);
      expect(metadata.title).toBeUndefined();
      expect(metadata.description).toBeUndefined();
    });

    it('should handle partial metadata', () => {
      const html = `
        <html>
          <head>
            <title>Only Title</title>
          </head>
        </html>
      `;
      const metadata = extractHtmlMetadata(html);
      expect(metadata.title).toBe('Only Title');
      expect(metadata.description).toBeUndefined();
      expect(metadata.openGraph).toBeUndefined();
    });
  });

  describe('truncateMetadata', () => {
    it('should truncate long title', () => {
      const longTitle = 'A'.repeat(600);
      const metadata = { title: longTitle };
      const truncated = truncateMetadata(metadata, 500);
      expect(truncated.title).toHaveLength(503); // 500 + '...'
      expect(truncated.title?.endsWith('...')).toBe(true);
    });

    it('should truncate long description', () => {
      const longDescription = 'B'.repeat(600);
      const metadata = { description: longDescription };
      const truncated = truncateMetadata(metadata, 500);
      expect(truncated.description).toHaveLength(503);
      expect(truncated.description?.endsWith('...')).toBe(true);
    });

    it('should truncate OpenGraph fields', () => {
      const metadata = {
        openGraph: {
          title: 'A'.repeat(600),
          description: 'B'.repeat(600),
        },
      };
      const truncated = truncateMetadata(metadata, 500);
      expect(truncated.openGraph?.title).toHaveLength(503);
      expect(truncated.openGraph?.description).toHaveLength(503);
    });

    it('should truncate Twitter Card fields', () => {
      const metadata = {
        twitterCard: {
          title: 'A'.repeat(600),
          description: 'B'.repeat(600),
        },
      };
      const truncated = truncateMetadata(metadata, 500);
      expect(truncated.twitterCard?.title).toHaveLength(503);
      expect(truncated.twitterCard?.description).toHaveLength(503);
    });

    it('should not truncate short fields', () => {
      const metadata = {
        title: 'Short Title',
        description: 'Short Description',
      };
      const truncated = truncateMetadata(metadata);
      expect(truncated.title).toBe('Short Title');
      expect(truncated.description).toBe('Short Description');
    });

    it('should handle undefined fields', () => {
      const metadata = {};
      const truncated = truncateMetadata(metadata);
      expect(truncated.title).toBeUndefined();
      expect(truncated.description).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed HTML', () => {
      const html = '<title>Broken <title> Tag';
      const metadata = extractHtmlMetadata(html);
      // Should still extract the first title
      expect(metadata.title).toBeDefined();
    });

    it('should handle case-insensitive meta tags', () => {
      const html = `
        <html>
          <head>
            <META NAME="DESCRIPTION" CONTENT="Upper case meta">
            <META PROPERTY="OG:TITLE" CONTENT="Upper case OG">
          </head>
        </html>
      `;
      const metadata = extractHtmlMetadata(html);
      expect(metadata.description).toBe('Upper case meta');
      expect(metadata.openGraph?.title).toBe('Upper case OG');
    });

    it('should handle single quotes in attributes', () => {
      const html = `
        <html>
          <head>
            <meta name='description' content='Single quotes'>
            <meta property='og:title' content='OG with single quotes'>
          </head>
        </html>
      `;
      const metadata = extractHtmlMetadata(html);
      expect(metadata.description).toBe('Single quotes');
      expect(metadata.openGraph?.title).toBe('OG with single quotes');
    });
  });
});
