/**
 * Unsandbox Languages Utility
 * Fetches and caches the list of supported programming languages from the Unsandbox API
 * Issue #219: Use https://api.unsandbox.com/languages as source of truth
 */

import { createUnsandboxClient } from './client.js';
import type { LanguagesResponse } from './types.js';

/**
 * Cached languages list (in-memory)
 */
let cachedLanguages: LanguagesResponse | null = null;

/**
 * Timestamp of when languages were cached
 */
let cacheTimestamp: number | null = null;

/**
 * Cache TTL in milliseconds (24 hours)
 */
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Fetch supported languages from Unsandbox API
 * Uses in-memory caching with 24-hour TTL
 *
 * @param forceRefresh - If true, bypass cache and fetch fresh data
 * @returns List of supported programming languages
 *
 * @example
 * ```typescript
 * const languages = await getUnsandboxLanguages();
 * console.log(`Supported: ${languages.map(l => l.id || l).join(', ')}`);
 * ```
 */
export async function getUnsandboxLanguages(forceRefresh = false): Promise<LanguagesResponse> {
  const now = Date.now();

  // Return cached data if valid
  if (!forceRefresh && cachedLanguages && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    console.log(`\n📦 [${new Date().toISOString()}] Using Cached Languages`);
    console.log(`   Cache Age: ${Math.round((now - cacheTimestamp) / 1000 / 60)} minutes`);
    console.log(`   Languages: ${cachedLanguages.length}`);
    return cachedLanguages;
  }

  // Fetch fresh data
  console.log(`\n🔄 [${new Date().toISOString()}] Fetching Fresh Languages List`);
  console.log(`   Reason: ${forceRefresh ? 'Force refresh' : cachedLanguages ? 'Cache expired' : 'No cache'}`);

  const client = createUnsandboxClient({
    apiKey: process.env.UNSANDBOX_API_KEY,
  });
  const languages = await client.getLanguages();

  // Update cache
  cachedLanguages = languages;
  cacheTimestamp = now;

  console.log(`\n✅ [${new Date().toISOString()}] Languages Cached`);
  console.log(`   Total Languages: ${languages.length}`);

  return languages;
}

/**
 * Get the list of language identifiers only (for display/validation)
 *
 * @param forceRefresh - If true, bypass cache and fetch fresh data
 * @returns Array of language identifiers (e.g., ['python', 'javascript', 'typescript', ...])
 *
 * @example
 * ```typescript
 * const ids = await getUnsandboxLanguageIds();
 * console.log(`Supported: ${ids.join(', ')}`);
 * ```
 */
export async function getUnsandboxLanguageIds(forceRefresh = false): Promise<string[]> {
  const languages = await getUnsandboxLanguages(forceRefresh);

  // Handle both array of objects with 'id' field and array of strings
  return languages.map(lang => {
    if (typeof lang === 'string') {
      return lang;
    }
    return lang.id || lang.name || String(lang);
  });
}

/**
 * Get the count of supported languages
 *
 * @param forceRefresh - If true, bypass cache and fetch fresh data
 * @returns Number of supported languages
 *
 * @example
 * ```typescript
 * const count = await getUnsandboxLanguageCount();
 * console.log(`Omega supports ${count} programming languages`);
 * ```
 */
export async function getUnsandboxLanguageCount(forceRefresh = false): Promise<number> {
  const languages = await getUnsandboxLanguages(forceRefresh);
  return languages.length;
}

/**
 * Format the languages list as a human-readable string
 *
 * @param forceRefresh - If true, bypass cache and fetch fresh data
 * @returns Formatted string of language names
 *
 * @example
 * ```typescript
 * const formatted = await formatUnsandboxLanguages();
 * console.log(formatted); // "python, javascript, typescript, ruby, go, rust, ..."
 * ```
 */
export async function formatUnsandboxLanguages(forceRefresh = false): Promise<string> {
  const ids = await getUnsandboxLanguageIds(forceRefresh);
  return ids.join(', ');
}

/**
 * Clear the languages cache
 * Useful for testing or when you need to force a refresh on next call
 */
export function clearLanguagesCache(): void {
  console.log(`\n🗑️ [${new Date().toISOString()}] Clearing Languages Cache`);
  cachedLanguages = null;
  cacheTimestamp = null;
}
