/**
 * Language Detection Utility
 * Detects user language preference and determines appropriate response language
 */

/**
 * Language detection result
 */
export interface LanguageDetection {
  detectedLanguage: 'en' | 'es' | 'unknown';
  confidence: number;
  reason: string;
}

/**
 * Spanish language patterns and indicators
 */
const SPANISH_PATTERNS = [
  // Common Spanish words
  /\b(hola|buenos|buenas|gracias|por favor|de nada|adiós|hasta luego)\b/i,
  // Spanish pronouns and articles
  /\b(yo|tú|él|ella|nosotros|vosotros|ellos|ellas|el|la|los|las|un|una|unos|unas)\b/i,
  // Spanish verbs (present tense)
  /\b(quiero|necesito|tengo|soy|estoy|puedo|voy|hago|digo|veo|sé)\b/i,
  // Common question words
  /\b(qué|cómo|cuándo|dónde|por qué|quién|cuál|cuánto)\b/i,
  // Character patterns (ñ, accented vowels)
  /[áéíóúüñ]/i,
];

/**
 * English language patterns and indicators
 */
const ENGLISH_PATTERNS = [
  // Common English words
  /\b(hello|hi|hey|thanks|thank you|please|goodbye|bye|see you)\b/i,
  // English pronouns and articles
  /\b(i|you|he|she|we|they|the|a|an|some|this|that)\b/i,
  // English verbs (present tense)
  /\b(want|need|have|am|is|are|can|will|do|say|see|know)\b/i,
  // Common question words
  /\b(what|how|when|where|why|who|which|how much)\b/i,
];

/**
 * Detect the language of user input
 * @param text - User's message text
 * @returns Language detection result
 */
export function detectLanguage(text: string): LanguageDetection {
  const normalizedText = text.toLowerCase().trim();

  // Empty or very short text
  if (normalizedText.length < 2) {
    return {
      detectedLanguage: 'en',
      confidence: 0.5,
      reason: 'Insufficient text for detection, defaulting to English',
    };
  }

  // Explicit language requests
  const explicitSpanishRequest = /\b(en español|in spanish|habla español|speak spanish)\b/i.test(text);
  const explicitEnglishRequest = /\b(in english|en inglés|habla inglés|speak english)\b/i.test(text);

  if (explicitSpanishRequest) {
    return {
      detectedLanguage: 'es',
      confidence: 0.95,
      reason: 'Explicit request for Spanish',
    };
  }

  if (explicitEnglishRequest) {
    return {
      detectedLanguage: 'en',
      confidence: 0.95,
      reason: 'Explicit request for English',
    };
  }

  // Count pattern matches
  let spanishMatches = 0;
  let englishMatches = 0;

  for (const pattern of SPANISH_PATTERNS) {
    const matches = normalizedText.match(pattern);
    if (matches) {
      spanishMatches += matches.length;
    }
  }

  for (const pattern of ENGLISH_PATTERNS) {
    const matches = normalizedText.match(pattern);
    if (matches) {
      englishMatches += matches.length;
    }
  }

  // Calculate confidence based on pattern matches
  const totalMatches = spanishMatches + englishMatches;

  if (totalMatches === 0) {
    // No clear patterns detected - check for Spanish characters
    const hasSpanishChars = /[áéíóúüñ]/i.test(text);
    if (hasSpanishChars) {
      return {
        detectedLanguage: 'es',
        confidence: 0.6,
        reason: 'Spanish characters detected',
      };
    }
    return {
      detectedLanguage: 'en',
      confidence: 0.5,
      reason: 'No clear language patterns, defaulting to English',
    };
  }

  const spanishRatio = spanishMatches / totalMatches;
  const englishRatio = englishMatches / totalMatches;

  // Determine language with confidence
  if (spanishRatio > englishRatio && spanishRatio > 0.6) {
    return {
      detectedLanguage: 'es',
      confidence: Math.min(0.9, 0.5 + spanishRatio * 0.4),
      reason: `Spanish patterns detected (${spanishMatches} vs ${englishMatches})`,
    };
  } else if (englishRatio > spanishRatio && englishRatio > 0.6) {
    return {
      detectedLanguage: 'en',
      confidence: Math.min(0.9, 0.5 + englishRatio * 0.4),
      reason: `English patterns detected (${englishMatches} vs ${spanishMatches})`,
    };
  } else {
    // Ambiguous - default to English
    return {
      detectedLanguage: 'en',
      confidence: 0.5,
      reason: 'Language ambiguous, defaulting to English',
    };
  }
}

/**
 * Get language name from code
 */
export function getLanguageName(lang: 'en' | 'es'): string {
  return lang === 'es' ? 'Spanish' : 'English';
}

/**
 * Check if text is likely Spanish
 */
export function isLikelySpanish(text: string): boolean {
  const detection = detectLanguage(text);
  return detection.detectedLanguage === 'es' && detection.confidence > 0.6;
}

/**
 * Check if text is likely English
 */
export function isLikelyEnglish(text: string): boolean {
  const detection = detectLanguage(text);
  return detection.detectedLanguage === 'en' && detection.confidence > 0.6;
}