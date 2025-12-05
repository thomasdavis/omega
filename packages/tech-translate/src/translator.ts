import { TechTranslationSpecSchema, type TechTranslationSpec, type TranslationResult } from './types.js';
import { StubProvider } from './providers/stub.js';

export class TechTranslator {
  private provider: StubProvider;

  constructor() {
    this.provider = new StubProvider();
  }

  /**
   * Translate technical content according to specification
   */
  async translate(spec: TechTranslationSpec): Promise<TranslationResult> {
    // Validate input against schema
    const validatedSpec = TechTranslationSpecSchema.parse(spec);

    // Use stub provider for v0
    const result = await this.provider.translate(validatedSpec);

    // Format output based on outputFormat
    if (validatedSpec.outputFormat === 'json') {
      result.translatedContent = JSON.stringify({
        content: result.translatedContent,
        metadata: result.metadata,
      }, null, 2);
    }

    return result;
  }

  /**
   * Validate a translation specification without executing
   */
  validateSpec(spec: unknown): { valid: boolean; errors?: string[] } {
    try {
      TechTranslationSpecSchema.parse(spec);
      return { valid: true };
    } catch (error) {
      if (error instanceof Error) {
        return {
          valid: false,
          errors: [error.message],
        };
      }
      return {
        valid: false,
        errors: ['Unknown validation error'],
      };
    }
  }
}
