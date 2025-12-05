import type { TechTranslationSpec, TranslationResult } from './types.js';

/**
 * Stub translator implementation for v0
 * Returns a placeholder translation with preserved structure
 */
export class TechTranslator {
  async translate(spec: TechTranslationSpec): Promise<TranslationResult> {
    const { sourceText, sourceLanguage, targetLanguage, tone } = spec;

    // Stub implementation - just returns the original text with a note
    const translatedText = `[STUB TRANSLATION]\n\nOriginal (${sourceLanguage}):\n${sourceText}\n\nTarget language: ${targetLanguage}\nTone: ${tone}\n\nNote: This is a placeholder. Actual translation will be implemented in a future version.`;

    return {
      translatedText,
      sourceLanguage,
      targetLanguage,
      tone,
      metadata: {
        originalLength: sourceText.length,
        translatedLength: translatedText.length,
      },
    };
  }
}
