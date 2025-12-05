/**
 * Tech Translate - AI-powered technical specification generator
 *
 * Converts informal user requests into detailed, actionable technical specifications
 * following best practices across Engineering, DevOps, and Databases.
 *
 * @packageDocumentation
 */

// Core translation function
export { translateTech } from './core/translator.js';

// Types
export type {
  TranslateInput,
  TranslateOptions,
  TranslateResult,
  Provider,
  ProviderConfig,
  TechSpec,
  TechSpecSection,
  Domain,
  OutputFormat,
  StylePreset,
  DepthLevel,
  PromptTemplate,
  TemplateContext,
} from './types/index.js';

export {
  DOMAINS,
  OUTPUT_FORMATS,
  STYLE_PRESETS,
  DEPTH_LEVELS,
  PROVIDERS,
  TechSpecSchema,
  TechSpecSectionSchema,
} from './types/index.js';

// Templates and prompts
export {
  DEFAULT_PROMPT_TEMPLATES,
  DEFAULT_STYLE_PRESETS,
  DEFAULT_DEPTH_LEVELS,
  DEFAULT_DOMAIN_GUIDANCE,
  buildSystemPrompt,
  buildUserPrompt,
} from './templates/prompts.js';

// Providers
export type { LLMProvider } from './providers/base.js';
export { RateLimiter, withRetry } from './providers/base.js';
export { OpenAIProvider } from './providers/openai.js';
export type { OpenAIConfig } from './providers/openai.js';
export { AnthropicProvider } from './providers/anthropic.js';
export type { AnthropicConfig } from './providers/anthropic.js';
export { createProvider } from './providers/index.js';
