/**
 * TTS Library Tests
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  generateTTSHash,
  validateTTSRequest,
  type TTSRequest,
} from './tts.js';

describe('TTS Library', () => {
  describe('sanitizeText', () => {
    it('should trim whitespace', () => {
      expect(sanitizeText('  hello  ')).toBe('hello');
    });

    it('should normalize newlines to spaces', () => {
      expect(sanitizeText('hello\nworld')).toBe('hello world');
      expect(sanitizeText('hello\r\nworld')).toBe('hello world');
    });

    it('should remove angle brackets', () => {
      expect(sanitizeText('hello <script>alert(1)</script>')).toBe('hello scriptalert(1)/script');
    });

    it('should normalize multiple spaces', () => {
      expect(sanitizeText('hello    world')).toBe('hello world');
    });

    it('should truncate to max length', () => {
      const longText = 'a'.repeat(5000);
      const result = sanitizeText(longText);
      expect(result.length).toBeLessThanOrEqual(4096);
    });
  });

  describe('generateTTSHash', () => {
    it('should generate consistent hashes', () => {
      const hash1 = generateTTSHash('hello', 'bm_fable');
      const hash2 = generateTTSHash('hello', 'bm_fable');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different text', () => {
      const hash1 = generateTTSHash('hello', 'bm_fable');
      const hash2 = generateTTSHash('world', 'bm_fable');
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different voices', () => {
      const hash1 = generateTTSHash('hello', 'bm_fable');
      const hash2 = generateTTSHash('hello', 'alloy');
      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex hash', () => {
      const hash = generateTTSHash('hello', 'bm_fable');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('validateTTSRequest', () => {
    it('should accept valid request', async () => {
      const request: TTSRequest = {
        text: 'Hello world',
        voice: 'bm_fable',
      };
      const result = await validateTTSRequest(request);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty text', async () => {
      const request: TTSRequest = {
        text: '',
      };
      const result = await validateTTSRequest(request);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject whitespace-only text', async () => {
      const request: TTSRequest = {
        text: '   ',
      };
      const result = await validateTTSRequest(request);
      expect(result.valid).toBe(false);
    });

    it('should reject text that is too long', async () => {
      const request: TTSRequest = {
        text: 'a'.repeat(5000),
      };
      const result = await validateTTSRequest(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum length');
    });

    it('should reject invalid voice', async () => {
      const request: TTSRequest = {
        text: 'Hello',
        voice: 'invalid_voice_that_does_not_exist_in_api',
      };
      const result = await validateTTSRequest(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid voice');
    });

    it('should accept request without voice (uses default)', async () => {
      const request: TTSRequest = {
        text: 'Hello world',
      };
      const result = await validateTTSRequest(request);
      expect(result.valid).toBe(true);
    });

    it('should accept valid alternative voices', async () => {
      const voices = ['alloy', 'echo', 'shimmer', 'onyx', 'nova'];
      for (const voice of voices) {
        const request: TTSRequest = {
          text: 'Hello',
          voice,
        };
        const result = await validateTTSRequest(request);
        expect(result.valid).toBe(true);
      }
    });
  });
});
