/**
 * TTS (Text-to-Speech) Library
 * Integrates with UncloseAI TTS API for high-quality voice synthesis
 *
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
 * Available TTS voices - dynamically fetched from UncloseAI
 * This will be populated from the API
 */
let CACHED_VOICES: string[] = [];
const VOICES_CACHE_FILE = 'tts-voices-cache.json';
const VOICES_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export type TTSVoice = string;

const DEFAULT_VOICE = 'bm_fable';
const MAX_TEXT_LENGTH = 4096; // Maximum characters for TTS
const TTS_API_ENDPOINT = 'https://speech.ai.unturf.com/v1/audio/speech';
const TTS_VOICES_ENDPOINT = 'https://speech.ai.unturf.com/v1/voices';

interface VoiceModel {
  id: string;
  voices: string[];
}

interface VoicesApiResponse {
  data: VoiceModel[];
}

/**
 * Get the TTS cache directory
 */
function getTTSCacheDir(): string {
  return getDataDir('tts-cache');
}

/**
 * Get cached voices from file system
 */
function getCachedVoicesFromFile(): { voices: string[]; timestamp: number } | null {
  const cacheDir = getTTSCacheDir();
  const cachePath = join(cacheDir, VOICES_CACHE_FILE);

  if (existsSync(cachePath)) {
    try {
      const data = readFileSync(cachePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading cached voices:', error);
      return null;
    }
  }

  return null;
}

/**
 * Save voices to file system cache
 */
function saveVoicesToCache(voices: string[]): void {
  const cacheDir = getTTSCacheDir();
  const cachePath = join(cacheDir, VOICES_CACHE_FILE);

  try {
    const data = {
      voices,
      timestamp: Date.now(),
    };
    writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ Cached ${voices.length} TTS voices`);
  } catch (error) {
    console.error('Error caching voices:', error);
  }
}

/**
 * Fetch available voices from UncloseAI API with timeout
 */
async function fetchVoicesFromApi(): Promise<string[]> {
  try {
    console.log('🎤 Fetching TTS voices from API...');

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(TTS_VOICES_ENDPOINT, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as VoicesApiResponse;

      // Validate response structure
      if (!data || !data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from voices API');
      }

      // Flatten all voices from all models
      const allVoices = data.data.flatMap((model) => model.voices);

      // Remove duplicates and sort
      const uniqueVoices = [...new Set(allVoices)].sort();

      console.log(`✅ Fetched ${uniqueVoices.length} unique voices from ${data.data.length} models`);

      return uniqueVoices;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Voice API fetch timed out after 5 seconds');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching voices from API:', error);
    throw error;
  }
}

/**
 * Get available TTS voices (with caching)
 * This function fetches voices from the API and caches them for 24 hours
 * Stale cache is always kept in memory as fallback if upstream is down
 */
export async function getAvailableVoices(): Promise<string[]> {
  // Return in-memory cached voices if available and fresh
  if (CACHED_VOICES.length > 0) {
    return CACHED_VOICES;
  }

  // Check file cache
  const cachedData = getCachedVoicesFromFile();
  if (cachedData) {
    const age = Date.now() - cachedData.timestamp;

    // Load stale cache into memory immediately as fallback
    if (cachedData.voices.length > 0) {
      CACHED_VOICES = cachedData.voices;
    }

    if (age < VOICES_CACHE_DURATION) {
      console.log(`📦 Using cached voices (age: ${Math.round(age / 1000 / 60)} minutes)`);
      return CACHED_VOICES;
    }

    // Cache is stale, try to refresh but keep stale data as fallback
    console.log('⏰ Voice cache is stale, refreshing...');
  }

  // Fetch fresh voices from API (stale cache already in memory as fallback)
  try {
    const voices = await fetchVoicesFromApi();
    CACHED_VOICES = voices; // Only update on success
    saveVoicesToCache(voices);
    return voices;
  } catch (error) {
    // If API fetch fails and we have stale cache in memory, use it
    if (CACHED_VOICES.length > 0) {
      console.warn('⚠️ API fetch failed, using stale cache from memory as fallback');
      return CACHED_VOICES;
    }
    // No fallback available
    console.error('❌ Failed to fetch voices and no cached fallback available');
    throw error;
  }
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
 * Note: Voice validation is now lenient since we fetch voices dynamically
 */
export async function validateTTSRequest(request: TTSRequest): Promise<{
  valid: boolean;
  error?: string;
}> {
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

  // Validate voice if provided (check against dynamic list)
  if (voice) {
    try {
      const availableVoices = await getAvailableVoices();
      if (!availableVoices.includes(voice)) {
        return { valid: false, error: `Invalid voice: ${voice}. Use getAvailableVoices() to see available voices.` };
      }
    } catch (error) {
      // If we can't fetch voices, allow any voice (lenient mode)
      console.warn('⚠️ Could not validate voice against API, allowing voice:', voice);
    }
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

  console.log('🎤 [TTS] === STARTING TTS REQUEST ===');
  console.log('🎤 [TTS] Input text length:', text.length);
  console.log('🎤 [TTS] Sanitized text length:', sanitized.length);
  console.log('🎤 [TTS] Text preview:', sanitized.substring(0, 100) + '...');
  console.log('🎤 [TTS] Voice:', voice);
  console.log('🎤 [TTS] Voice type:', typeof voice);

  const requestBody = {
    input: sanitized,
    voice: voice,
    model: 'tts-1',
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  console.log('🎤 [TTS] Request URL:', TTS_API_ENDPOINT);
  console.log('🎤 [TTS] Request method:', 'POST');
  console.log('🎤 [TTS] Request headers:', JSON.stringify(headers, null, 2));
  console.log('🎤 [TTS] Request body:', JSON.stringify(requestBody, null, 2));

  try {
    console.log('🎤 [TTS] Sending fetch request...');

    const response = await fetch(TTS_API_ENDPOINT, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    console.log('📥 [TTS] Response received!');
    console.log('📥 [TTS] Response status:', response.status);
    console.log('📥 [TTS] Response statusText:', response.statusText);
    console.log('📥 [TTS] Response ok:', response.ok);
    console.log('📥 [TTS] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    if (!response.ok) {
      // Try to read the error response body
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error('❌ [TTS] Error response body:', errorBody);
      } catch (e) {
        console.error('❌ [TTS] Could not read error response body:', e);
      }

      throw new Error(`TTS API error: ${response.status} ${response.statusText}${errorBody ? ' - ' + errorBody : ''}`);
    }

    console.log('✅ [TTS] Response OK, reading audio data...');
    const arrayBuffer = await response.arrayBuffer();
    console.log('✅ [TTS] Audio data received, size:', arrayBuffer.byteLength, 'bytes');

    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('❌ [TTS] Error synthesizing speech:', error);
    console.error('❌ [TTS] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ [TTS] Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('❌ [TTS] Error stack:', error.stack);
    }
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
  const validation = await validateTTSRequest(request);
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
