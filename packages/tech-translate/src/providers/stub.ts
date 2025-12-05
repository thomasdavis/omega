import type { TechTranslationSpec, TranslationResult } from '../types.js';

/**
 * Stub provider for testing and development
 * Returns a simple mock translation
 */
export class StubProvider {
  async translate(spec: TechTranslationSpec): Promise<TranslationResult> {
    const mockTranslation = `[STUB TRANSLATION]
Target Language: ${spec.target.language}
Technical Level: ${spec.target.technicalLevel || 'not specified'}

Original Content:
${spec.input}

This is a stub translation. In production, this would be replaced with actual LLM-powered translation.
`;

    return {
      translatedContent: mockTranslation,
      metadata: {
        sourceLanguage: spec.sourceLanguage,
        targetLanguage: spec.target.language,
        provider: 'stub',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
