/**
 * @omega/tech-translate
 * Convert informal user requests into detailed, actionable technical specifications
 */

// Core functionality
export { translateTech } from './core/translator.js';
export { specToMarkdown } from './core/markdown.js';

// Types
export type {
  TranslateInput,
  TranslateOptions,
  TranslateResult,
  TechnicalSpec,
  Summary,
  Assumptions,
  Requirements,
  APIInterface,
  DataModel,
  DevOps,
  SecurityPrivacy,
  TestingQA,
  Risks,
  Milestones,
  DepthLevel,
  StylePreset,
  Domain,
  OutputFormat,
  Provider,
  ProviderConfig,
  ProviderRequest,
  ProviderResponse,
} from './types/index.js';

// Provider exports
export { createProvider, OpenAIProvider, AnthropicProvider, BaseProvider } from './providers/index.js';

// Template constants
export { DEFAULT_PROMPT_TEMPLATES, DEFAULT_STYLE_PRESETS } from './templates/prompts.js';

// Re-export schemas for runtime validation
export {
  TranslateInputSchema,
  TranslateOptionsSchema,
  TranslateResultSchema,
  TechnicalSpecSchema,
  ProviderConfigSchema,
} from './types/index.js';
