/**
 * TTS (Text-to-Speech) Library
 * Integrates with UncloseAI TTS API for high-quality voice synthesis
 */

import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getDataDir } from '../utils/storage.js';

export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
}

export interface TTSResponse {
  audioUrl?: string;
  audioBuffer?: Buffer;
  cached: boolean;
  hash: string;
}

/**
 * Available TTS voices from UncloseAI
 * bm_fable is the recommended default
 */
export const TTS_VOICES = [
  'bm_fable',
  'alloy',
  'echo',
  'shimmer',
  'onyx',
  'nova',
  // Add more voices as needed from UncloseAI's 227+ voice library
] as const;

export type TTSVoice = typeof TTS_VOICES[number];

const DEFAULT_VOICE: TTSVoice = 'bm_fable';
const MAX_TEXT_LENGTH = 4096; // Maximum characters for TTS
const TTS_API_ENDPOINT = 'https://speech.ai.unturf.com/v1/audio/speech';

/**
 * Get the TTS cache directory
 */
function getTTSCacheDir(): string {
  return getDataDir('tts-cache');
}

/**
 * Generate a hash for caching TTS audio
 */
export function generateTTSHash(text: string, voice: string): string {
  return createHash('sha256')
    .update(`${text}:${voice}`)
    .digest('hex');
}

/**
 * Validate TTS request
 */
export function validateTTSRequest(request: TTSRequest): {
  valid: boolean;
  error?: string;
} {
  const { text, voice } = request;

  // Check text length
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Text is required' };
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`,
    };
  }

  // Validate voice if provided
  if (voice && !TTS_VOICES.includes(voice as TTSVoice)) {
    return { valid: false, error: `Invalid voice: ${voice}` };
  }

  return { valid: true };
}

/**
 * Sanitize text for TTS processing
 * Removes potentially harmful characters and normalizes whitespace
 */
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/[\r\n]+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, MAX_TEXT_LENGTH);
}

/**
 * Check if TTS audio is cached
 */
export function getCachedTTS(hash: string): Buffer | null {
  const cacheDir = getTTSCacheDir();
  const cachedPath = join(cacheDir, `${hash}.mp3`);

  if (existsSync(cachedPath)) {
    try {
      return readFileSync(cachedPath);
    } catch (error) {
      console.error('Error reading cached TTS:', error);
      return null;
    }
  }

  return null;
}

/**
 * Cache TTS audio
 */
export function cacheTTS(hash: string, audioBuffer: Buffer): void {
  const cacheDir = getTTSCacheDir();
  const cachedPath = join(cacheDir, `${hash}.mp3`);

  try {
    writeFileSync(cachedPath, audioBuffer);
    console.log(`✅ Cached TTS audio: ${hash}.mp3`);
  } catch (error) {
    console.error('Error caching TTS:', error);
  }
}

/**
 * Synthesize speech using UncloseAI TTS API
 */
export async function synthesizeSpeech(
  text: string,
  voice: string = DEFAULT_VOICE
): Promise<Buffer> {
  const sanitized = sanitizeText(text);

  try {
    const response = await fetch(TTS_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // UncloseAI accepts any string as API key (no registration needed)
        'Authorization': 'Bearer uncloseai-free-service',
      },
      body: JSON.stringify({
        input: sanitized,
        voice: voice,
        model: 'tts-1', // UncloseAI model identifier
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    throw error;
  }
}

/**
 * Generate TTS audio with caching
 * Main entry point for TTS generation
 */
export async function generateTTS(request: TTSRequest): Promise<TTSResponse> {
  const { text, voice = DEFAULT_VOICE } = request;

  // Validate request
  const validation = validateTTSRequest(request);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const sanitized = sanitizeText(text);
  const hash = generateTTSHash(sanitized, voice);

  // Check cache first
  const cached = getCachedTTS(hash);
  if (cached) {
    console.log(`📦 Returning cached TTS: ${hash}`);
    return {
      audioBuffer: cached,
      cached: true,
      hash,
    };
  }

  // Generate new TTS
  console.log(`🎤 Generating TTS: ${text.substring(0, 50)}...`);
  const audioBuffer = await synthesizeSpeech(sanitized, voice);

  // Cache the result
  cacheTTS(hash, audioBuffer);

  return {
    audioBuffer,
    cached: false,
    hash,
  };
}
