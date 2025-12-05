export {
  TechTranslationSpecSchema,
  OutputFormatSchema,
  ProviderConfigSchema,
  TranslationTargetSchema,
  type TechTranslationSpec,
  type OutputFormat,
  type ProviderConfig,
  type TranslationTarget,
  type TranslationResult,
} from './types.js';

export { TechTranslator } from './translator.js';
export { StubProvider } from './providers/stub.js';
export { program as cli } from './cli.js';
