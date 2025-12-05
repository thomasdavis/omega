import { z } from 'zod';

/**
 * Output format for the translation
 */
export const OutputFormatSchema = z.enum(['markdown', 'json']);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

/**
 * LLM Provider configuration
 */
export const ProviderConfigSchema = z.object({
  name: z.string(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

/**
 * Translation target specification
 */
export const TranslationTargetSchema = z.object({
  language: z.string().describe('Target language for translation'),
  technicalLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  audience: z.string().optional().describe('Target audience description'),
});
export type TranslationTarget = z.infer<typeof TranslationTargetSchema>;

/**
 * Main specification for technical content translation
 */
export const TechTranslationSpecSchema = z.object({
  input: z.string().describe('Source content to translate'),
  sourceLanguage: z.string().optional().describe('Source language (auto-detect if not provided)'),
  target: TranslationTargetSchema,
  outputFormat: OutputFormatSchema.default('markdown'),
  provider: ProviderConfigSchema.optional(),
  preserveCodeBlocks: z.boolean().default(true),
  preserveLinks: z.boolean().default(true),
  preserveFormatting: z.boolean().default(true),
});

export type TechTranslationSpec = z.infer<typeof TechTranslationSpecSchema>;

/**
 * Translation result
 */
export interface TranslationResult {
  translatedContent: string;
  metadata: {
    sourceLanguage?: string;
    targetLanguage: string;
    provider: string;
    model?: string;
    timestamp: string;
  };
}
