export { TechTranslationSpecSchema, type TechTranslationSpec, type TranslationOptions, type LLMProvider } from './types.js';
export { StubProvider, getDefaultProvider } from './provider.js';
export { formatAsMarkdown, formatAsJson } from './formatter.js';

import type { TranslationOptions, TechTranslationSpec, LLMProvider } from './types.js';
import { getDefaultProvider } from './provider.js';
import { formatAsMarkdown, formatAsJson } from './formatter.js';

/**
 * Translate a user request into a technical specification
 *
 * @param request - The user's freeform request
 * @param options - Translation options (format, level, include sections)
 * @param provider - Optional LLM provider (defaults to stub provider)
 * @returns Formatted specification as string or TechTranslationSpec object
 *
 * @example
 * ```typescript
 * // Get markdown output (default)
 * const markdown = await translateTech('add live status page');
 *
 * // Get JSON output
 * const spec = await translateTech('add live status page', { format: 'json' });
 *
 * // MVP level with specific sections
 * const mvp = await translateTech('add user auth', {
 *   level: 'mvp',
 *   include: { db: true, security: true, devops: false, testing: false }
 * });
 * ```
 */
export async function translateTech(
  request: string,
  options: TranslationOptions = {},
  provider?: LLMProvider
): Promise<string | TechTranslationSpec> {
  const {
    format = 'markdown',
    level = 'prod',
    include = { db: true, devops: true, security: true, testing: true },
  } = options;

  const llmProvider = provider || getDefaultProvider();

  const spec = await llmProvider.translate(request, {
    format,
    level,
    include,
  });

  if (format === 'json') {
    // Return the object for JSON format so consumers can work with it directly
    return spec;
  }

  return formatAsMarkdown(spec);
}
