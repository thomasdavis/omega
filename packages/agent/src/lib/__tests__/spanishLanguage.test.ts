/**
 * Spanish Language Support Tests
 * Tests for language detection, Spanish responses, and language preference
 */

import { describe, it, expect } from 'vitest';
import {
  detectLanguage,
  isLikelySpanish,
  isLikelyEnglish,
  getLanguageName,
} from '../src/lib/languageDetection.js';
import {
  determineResponseLanguage,
  setUserLanguagePreference,
  getUserLanguagePreference,
  buildLanguageSystemPrompt,
  getGreeting,
  getAcknowledgment,
} from '../src/lib/spanishLanguage.js';

describe('Language Detection', () => {
  describe('detectLanguage', () => {
    it('should detect Spanish from common Spanish words', () => {
      const result = detectLanguage('hola, ¿cómo estás?');
      expect(result.detectedLanguage).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect English from common English words', () => {
      const result = detectLanguage('hello, how are you?');
      expect(result.detectedLanguage).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect explicit Spanish request', () => {
      const result = detectLanguage('can you speak in spanish please?');
      expect(result.detectedLanguage).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.reason).toContain('Explicit request');
    });

    it('should detect explicit English request', () => {
      const result = detectLanguage('¿puedes hablar en inglés?');
      expect(result.detectedLanguage).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.reason).toContain('Explicit request');
    });

    it('should detect Spanish from accented characters', () => {
      const result = detectLanguage('Me gustaría saber más sobre la tecnología');
      expect(result.detectedLanguage).toBe('es');
    });

    it('should handle empty or very short text', () => {
      const result = detectLanguage('');
      expect(result.detectedLanguage).toBe('en');
      expect(result.confidence).toBeLessThanOrEqual(0.6);
    });

    it('should handle ambiguous text with low confidence', () => {
      const result = detectLanguage('the technology is great');
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should detect Spanish question words', () => {
      const result = detectLanguage('¿qué es esto? ¿cómo funciona? ¿dónde está?');
      expect(result.detectedLanguage).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect Spanish pronouns and articles', () => {
      const result = detectLanguage('yo tengo el libro y ella tiene la mesa');
      expect(result.detectedLanguage).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect Spanish verbs', () => {
      const result = detectLanguage('quiero hacer esto, puedo ayudarte, necesito información');
      expect(result.detectedLanguage).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('isLikelySpanish', () => {
    it('should return true for clear Spanish text', () => {
      expect(isLikelySpanish('hola, ¿cómo estás?')).toBe(true);
    });

    it('should return false for clear English text', () => {
      expect(isLikelySpanish('hello, how are you?')).toBe(false);
    });

    it('should return false for ambiguous text', () => {
      expect(isLikelySpanish('technology is great')).toBe(false);
    });
  });

  describe('isLikelyEnglish', () => {
    it('should return true for clear English text', () => {
      expect(isLikelyEnglish('hello, how are you?')).toBe(true);
    });

    it('should return false for clear Spanish text', () => {
      expect(isLikelyEnglish('hola, ¿cómo estás?')).toBe(false);
    });

    it('should return false for ambiguous text', () => {
      expect(isLikelyEnglish('la tecnología es genial')).toBe(false);
    });
  });

  describe('getLanguageName', () => {
    it('should return "Spanish" for "es"', () => {
      expect(getLanguageName('es')).toBe('Spanish');
    });

    it('should return "English" for "en"', () => {
      expect(getLanguageName('en')).toBe('English');
    });
  });
});

describe('Spanish Language Support', () => {
  describe('Language Preference', () => {
    it('should set and get user language preference', () => {
      const userId = 'test-user-123';

      setUserLanguagePreference(userId, 'es');
      expect(getUserLanguagePreference(userId)).toBe('es');

      setUserLanguagePreference(userId, 'en');
      expect(getUserLanguagePreference(userId)).toBe('en');
    });

    it('should return English as default for unknown users', () => {
      const result = getUserLanguagePreference('unknown-user');
      expect(result).toBe('en');
    });
  });

  describe('determineResponseLanguage', () => {
    it('should use detected language when confidence is high', () => {
      const userId = 'test-user-456';
      const userMessage = 'hola, ¿cómo estás?';

      const language = determineResponseLanguage(userId, userMessage);
      expect(language).toBe('es');
    });

    it('should use user preference when confidence is low', () => {
      const userId = 'test-user-789';
      setUserLanguagePreference(userId, 'es');

      const language = determineResponseLanguage(userId, 'the technology is great');
      expect(language).toBe('es');
    });

    it('should detect language from message content', () => {
      const userId = 'test-user-abc';
      const language = determineResponseLanguage(userId, 'hello, how are you?');
      expect(language).toBe('en');
    });
  });

  describe('buildLanguageSystemPrompt', () => {
    it('should build English system prompt', () => {
      const prompt = buildLanguageSystemPrompt('en');
      expect(prompt).toContain('English');
      expect(prompt).toContain('Witty and intelligent humor');
      expect(prompt).not.toContain('Tu personalidad en español');
    });

    it('should build Spanish system prompt', () => {
      const prompt = buildLanguageSystemPrompt('es');
      expect(prompt).toContain('Spanish');
      expect(prompt).toContain('Tu personalidad en español');
      expect(prompt).toContain('ingenioso e inteligente');
      expect(prompt).not.toContain('Witty and intelligent humor');
    });
  });

  describe('getGreeting', () => {
    it('should return Spanish greetings', () => {
      const greeting = getGreeting('es');
      expect(['¡Hola!', '¡Buenos días!', '¡Buenas tardes!', '¡Buenas noches!']).toContain(greeting);
    });

    it('should return English greetings', () => {
      const greeting = getGreeting('en');
      expect(['Hello!', 'Hi there!', 'Hey!']).toContain(greeting);
    });
  });

  describe('getAcknowledgment', () => {
    it('should return Spanish acknowledgments', () => {
      const ack = getAcknowledgment('es');
      expect(['Entendido', 'Perfecto', 'Excelente', 'Genial', '¡Entendido!']).toContain(ack);
    });

    it('should return English acknowledgments', () => {
      const ack = getAcknowledgment('en');
      expect(['Understood', 'Perfect', 'Excellent', 'Great!', 'Got it!']).toContain(ack);
    });
  });
});

describe('Spanish Language Integration Tests', () => {
  describe('Full Conversation Flow', () => {
    it('should handle Spanish conversation start', () => {
      const userId = 'user-spanish-1';
      const message = 'hola, ¿puedes ayudarme con algo?';

      const language = determineResponseLanguage(userId, message);
      expect(language).toBe('es');

      const systemPrompt = buildLanguageSystemPrompt(language);
      expect(systemPrompt).toContain('español');
    });

    it('should switch from English to Spanish', () => {
      const userId = 'user-switch-1';
      setUserLanguagePreference(userId, 'en');

      const message1 = 'hello, how are you?';
      const lang1 = determineResponseLanguage(userId, message1);
      expect(lang1).toBe('en');

      const message2 = '¿puedes cambiar a español ahora?';
      const lang2 = determineResponseLanguage(userId, message2);
      expect(lang2).toBe('es');
    });

    it('should maintain Spanish in multi-turn conversation', () => {
      const userId = 'user-conversation-1';
      const history = [
        { content: 'hola' },
        { content: '¿cómo estás?' },
        { content: 'bien, gracias' },
      ];

      const language = determineResponseLanguage(userId, '¿y tú?', history);
      expect(language).toBe('es');
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed language text', () => {
      const result = detectLanguage('hello, ¿cómo estás?');
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should handle code or technical terms', () => {
      const result = detectLanguage('const variable = "hola";');
      expect(result.detectedLanguage).toBe('es');
    });

    it('should handle very short Spanish text', () => {
      const result = detectLanguage('sí');
      expect(result.detectedLanguage).toBe('es');
    });

    it('should handle very short English text', () => {
      const result = detectLanguage('yes');
      expect(result.detectedLanguage).toBe('en');
    });

    it('should handle emojis with text', () => {
      const result = detectLanguage('👋 hola, ¿qué tal? 🎉');
      expect(result.detectedLanguage).toBe('es');
    });
  });
});