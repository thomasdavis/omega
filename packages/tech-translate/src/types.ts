import { z } from 'zod';

/**
 * Tone options for technical content translation
 */
export const ToneSchema = z.enum([
  'formal',
  'casual',
  'technical',
  'friendly',
  'professional',
]);

export type Tone = z.infer<typeof ToneSchema>;

/**
 * Output format options
 */
export const OutputFormatSchema = z.enum(['markdown', 'json']);

export type OutputFormat = z.infer<typeof OutputFormatSchema>;

/**
 * Technical translation specification
 */
export const TechTranslationSpecSchema = z.object({
  sourceText: z.string().min(1, 'Source text cannot be empty'),
  sourceLanguage: z.string().default('en'),
  targetLanguage: z.string().min(1, 'Target language is required'),
  tone: ToneSchema.default('professional'),
  preserveCodeBlocks: z.boolean().default(true),
  preserveUrls: z.boolean().default(true),
  outputFormat: OutputFormatSchema.default('markdown'),
});

export type TechTranslationSpec = z.infer<typeof TechTranslationSpecSchema>;

/**
 * Translation result
 */
export const TranslationResultSchema = z.object({
  translatedText: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  tone: ToneSchema,
  metadata: z
    .object({
      originalLength: z.number(),
      translatedLength: z.number(),
      codeBlocksPreserved: z.number().optional(),
      urlsPreserved: z.number().optional(),
    })
    .optional(),
});

export type TranslationResult = z.infer<typeof TranslationResultSchema>;
