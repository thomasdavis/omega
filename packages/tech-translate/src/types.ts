import { z } from 'zod';

/**
 * tpmjs Tool Schema - Technical Translation Specification
 *
 * Defines the input/output contract for translating technical requirements
 * into actionable implementation specs.
 */

// Concern areas that can be included in translation
export const ConcernAreaSchema = z.enum(['db', 'devops', 'security', 'testing']);
export type ConcernArea = z.infer<typeof ConcernAreaSchema>;

// Translation detail level
export const LevelSchema = z.enum(['mvp', 'prod']);
export type Level = z.infer<typeof LevelSchema>;

// Output format
export const FormatSchema = z.enum(['md', 'json']);
export type Format = z.infer<typeof FormatSchema>;

// Translation options
export const TranslationOptionsSchema = z.object({
  format: FormatSchema.default('md'),
  level: LevelSchema.default('prod'),
  include: z.array(ConcernAreaSchema).optional(),
});
export type TranslationOptions = z.infer<typeof TranslationOptionsSchema>;

// Input specification
export const TechTranslationSpecSchema = z.object({
  input: z.string().min(1, 'Input text is required'),
  options: TranslationOptionsSchema.optional(),
});
export type TechTranslationSpec = z.infer<typeof TechTranslationSpecSchema>;

// Metadata about the translation
export const TranslationMetadataSchema = z.object({
  timestamp: z.string().datetime(),
  version: z.string(),
  level: LevelSchema,
  format: FormatSchema,
  concerns: z.array(ConcernAreaSchema).optional(),
});
export type TranslationMetadata = z.infer<typeof TranslationMetadataSchema>;

// Translation result (JSON mode)
export const TranslationResultSchema = z.object({
  metadata: TranslationMetadataSchema,
  specification: z.object({
    summary: z.string(),
    requirements: z.array(z.string()),
    technicalDetails: z.record(z.string(), z.unknown()).optional(),
    database: z.object({
      tables: z.array(z.string()),
      migrations: z.array(z.string()),
    }).optional(),
    devops: z.object({
      deploymentSteps: z.array(z.string()),
      infrastructure: z.array(z.string()),
    }).optional(),
    security: z.object({
      considerations: z.array(z.string()),
      authentication: z.string().optional(),
    }).optional(),
    testing: z.object({
      testCases: z.array(z.string()),
      coverage: z.string().optional(),
    }).optional(),
  }),
});
export type TranslationResult = z.infer<typeof TranslationResultSchema>;
