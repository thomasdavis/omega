import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { extractLinks, sendToValTown } from './valTownBookmarks.js';

describe('valTownBookmarks', () => {
  describe('extractLinks', () => {
    it('should extract HTTP and HTTPS URLs from text', () => {
      const text = 'Check out https://example.com and http://test.org for more info';
      const links = extractLinks(text);

      expect(links).toHaveLength(2);
      expect(links).toContain('https://example.com');
      expect(links).toContain('http://test.org');
    });

    it('should extract multiple URLs from the same message', () => {
      const text = 'Links: https://a.com https://b.com https://c.com';
      const links = extractLinks(text);

      expect(links).toHaveLength(3);
    });

    it('should handle URLs with query parameters and fragments', () => {
      const text = 'Visit https://example.com/path?query=1&foo=bar#section';
      const links = extractLinks(text);

      expect(links).toHaveLength(1);
      expect(links[0]).toBe('https://example.com/path?query=1&foo=bar#section');
    });

    it('should return empty array when no URLs are present', () => {
      const text = 'This message has no links';
      const links = extractLinks(text);

      expect(links).toHaveLength(0);
    });

    it('should not extract non-HTTP(S) URLs', () => {
      const text = 'File: file:///path/to/file or ftp://server.com';
      const links = extractLinks(text);

      expect(links).toHaveLength(0);
    });

    it('should handle empty string', () => {
      const links = extractLinks('');
      expect(links).toHaveLength(0);
    });
  });

  describe('sendToValTown', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      // Mock fetch
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
      vi.clearAllMocks();
    });

    it('should send bookmark data to Val Town webhook', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const bookmarkData = {
        links: ['https://example.com'],
        userId: 'user123',
        username: 'testuser',
        channelId: 'channel123',
        channelName: 'general',
        messageContent: 'Check out https://example.com',
        timestamp: new Date('2025-12-21T09:00:00Z'),
        messageId: 'msg123',
      };

      const result = await sendToValTown(bookmarkData, 'https://test.web.val.run/webhook');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.web.val.run/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const sentData = JSON.parse(callArgs.body);

      expect(sentData.links).toEqual(['https://example.com']);
      expect(sentData.user.username).toBe('testuser');
      expect(sentData.channel.name).toBe('general');
    });

    it('should return false when no links are provided', async () => {
      const bookmarkData = {
        links: [],
        userId: 'user123',
        username: 'testuser',
        channelId: 'channel123',
        channelName: 'general',
        messageContent: 'No links here',
        timestamp: new Date(),
        messageId: 'msg123',
      };

      const result = await sendToValTown(bookmarkData, 'https://test.web.val.run/webhook');

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return false when webhook URL is empty', async () => {
      const bookmarkData = {
        links: ['https://example.com'],
        userId: 'user123',
        username: 'testuser',
        channelId: 'channel123',
        channelName: 'general',
        messageContent: 'Link',
        timestamp: new Date(),
        messageId: 'msg123',
      };

      const result = await sendToValTown(bookmarkData, '');

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle webhook errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const bookmarkData = {
        links: ['https://example.com'],
        userId: 'user123',
        username: 'testuser',
        channelId: 'channel123',
        channelName: 'general',
        messageContent: 'Link',
        timestamp: new Date(),
        messageId: 'msg123',
      };

      const result = await sendToValTown(bookmarkData, 'https://test.web.val.run/webhook');

      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const bookmarkData = {
        links: ['https://example.com'],
        userId: 'user123',
        username: 'testuser',
        channelId: 'channel123',
        channelName: 'general',
        messageContent: 'Link',
        timestamp: new Date(),
        messageId: 'msg123',
      };

      const result = await sendToValTown(bookmarkData, 'https://test.web.val.run/webhook');

      expect(result).toBe(false);
    });
  });
});
