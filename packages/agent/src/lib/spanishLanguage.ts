/**
 * Spanish Language Support
 * Utilities for handling Spanish language responses and interactions
 */

import { LanguageDetection, detectLanguage } from './languageDetection.js';

/**
 * Language preference storage
 * Maps user IDs to their preferred language
 */
const userLanguagePreferences = new Map<string, 'en' | 'es'>();

/**
 * Spanish personality phrases
 */
export const SPANISH_PHRASES = {
  greeting: ['¡Hola!', '¡Buenos días!', '¡Buenas tardes!', '¡Buenas noches!'],
  thanks: ['¡Gracias!', '¡Muchas gracias!', '¡De nada!'],
  acknowledgment: ['Entendido', 'Perfecto', 'Excelente', 'Genial', '¡Entendido!'],
  apology: ['Lo siento', 'Disculpe', 'Mis disculpas'],
  farewell: ['¡Adiós!', '¡Hasta luego!', '¡Nos vemos!'],
  thinking: ['Pensando...', 'Procesando...', 'Analizando...'],
};

/**
 * English personality phrases
 */
export const ENGLISH_PHRASES = {
  greeting: ['Hello!', 'Hi there!', 'Hey!'],
  thanks: ['Thanks!', 'Thank you!', 'You\'re welcome!'],
  acknowledgment: ['Understood', 'Perfect', 'Excellent', 'Great!', 'Got it!'],
  apology: ['Sorry', 'I apologize', 'My apologies'],
  farewell: ['Goodbye!', 'See you later!', 'See ya!'],
  thinking: ['Thinking...', 'Processing...', 'Analyzing...'],
};

/**
 * Get user's preferred language
 */
export function getUserLanguagePreference(userId: string): 'en' | 'es' {
  return userLanguagePreferences.get(userId) || 'en';
}

/**
 * Set user's preferred language
 */
export function setUserLanguagePreference(userId: string, language: 'en' | 'es'): void {
  userLanguagePreferences.set(userId, language);
}

/**
 * Clear user's language preference
 */
export function clearUserLanguagePreference(userId: string): void {
  userLanguagePreferences.delete(userId);
}

/**
 * Determine response language based on user preference and message content
 */
export function determineResponseLanguage(
  userId: string,
  userMessage: string,
  messageHistory?: Array<{ content: string }>
): 'en' | 'es' {
  // Check for explicit language preference
  const userPref = getUserLanguagePreference(userId);

  // Detect language from current message
  const detection = detectLanguage(userMessage);

  // If user has a strong preference and confidence is low, use preference
  if (detection.confidence < 0.7) {
    return userPref;
  }

  // If confidence is high, use detected language
  return detection.detectedLanguage === 'es' ? 'es' : 'en';
}

/**
 * Get language-specific greeting
 */
export function getGreeting(language: 'en' | 'es'): string {
  const phrases = language === 'es' ? SPANISH_PHRASES.greeting : ENGLISH_PHRASES.greeting;
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Get language-specific acknowledgment
 */
export function getAcknowledgment(language: 'en' | 'es'): string {
  const phrases = language === 'es' ? SPANISH_PHRASES.acknowledgment : ENGLISH_PHRASES.acknowledgment;
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Build language-specific system prompt enhancement
 */
export function buildLanguageSystemPrompt(language: 'en' | 'es'): string {
  if (language === 'en') {
    return `
## Language Mode: English

You are currently communicating in English. Respond naturally in English with your usual personality:
- Witty and intelligent humor
- Direct, concise communication
- No unnecessary fluff or capability reminders
- Natural, conversational style
`;
  } else {
    return `
## Language Mode: Spanish

You are currently communicating in Spanish. Respond naturally in Spanish with your usual personality:

**Tu personalidad en español:**
- Eres ingenioso e inteligente con tu humor
- Tu comunicación es directa y concisa
- No necesitas recordar al usuario tus capacidades en cada respuesta
- Tu estilo es natural y conversacional

**Instrucciones de respuesta:**
- Responde siempre en español cuando el usuario escriba en español
- Mantén tu sentido del humor y agudeza intelectual
- Usa expresiones y modismos naturales en español
- Sé directo y vaya al punto sin preámbulos innecesarios
- Cuando uses herramientas, explica los resultados en español

**Ejemplos de respuestas:**
- "¡Hola! ¿En qué puedo ayudarte hoy?"
- "Entendido, haré eso por ti."
- "¡Genial! Aquí tienes el resultado."

**Importante:**
- Si el usuario cambia a inglés, cambia tu idioma de respuesta
- Si estás inseguro, sigue el idioma del último mensaje del usuario
- Mantén tu integridad como Omega, solo que en español
`;
  }
}

/**
 * Translate a simple acknowledgment phrase to the target language
 */
export function translateAcknowledgment(phrase: string, targetLanguage: 'en' | 'es'): string {
  const lowerPhrase = phrase.toLowerCase();

  if (targetLanguage === 'es') {
    if (lowerPhrase.includes('understood') || lowerPhrase.includes('got it')) {
      return 'Entendido';
    }
    if (lowerPhrase.includes('perfect')) {
      return 'Perfecto';
    }
    if (lowerPhrase.includes('excellent') || lowerPhrase.includes('great')) {
      return 'Excelente';
    }
    if (lowerPhrase.includes('thinking') || lowerPhrase.includes('processing')) {
      return 'Procesando...';
    }
    return 'Entendido';
  } else {
    if (lowerPhrase.includes('entendido')) {
      return 'Understood';
    }
    if (lowerPhrase.includes('perfecto')) {
      return 'Perfect';
    }
    if (lowerPhrase.includes('excelente') || lowerPhrase.includes('genial')) {
      return 'Excellent';
    }
    if (lowerPhrase.includes('procesando')) {
      return 'Processing...';
    }
    return 'Understood';
  }
}