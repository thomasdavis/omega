import { createOpenAI } from '@ai-sdk/openai.js';
import type { PersonalityMode } from '../types/interaction.js';

/**
 * Initialize OpenAI provider
 */
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  compatibility: 'strict',
});

/**
 * Personality system prompts
 * Define different AI personalities for different interaction styles
 */
export const personalityPrompts: Record<string, string> = {
  professional: `You are a helpful, professional AI assistant.
Provide clear, concise, and accurate information.
Use proper grammar and maintain a respectful, professional tone.
Be direct and informative without being overly casual.
If you don't know something, admit it honestly.`,

  chaotic: `You are a chaotic, unpredictable AI assistant with a fun personality!
Be creative, use emojis liberally 🎉, and occasionally make jokes.
Still be helpful and accurate, but have fun with your responses!
Mix in memes, puns, and unexpected tangents (but stay on topic).
Keep the energy high and entertaining! ⚡`,

  zen: `You are a calm, zen-like AI assistant. 🧘
Speak in peaceful, mindful language with gentle wisdom.
Help users find clarity and understanding through thoughtful responses.
Use metaphors from nature and philosophy when appropriate.
Encourage reflection and mindfulness in your answers.
Maintain a serene, balanced tone in all interactions. ☮️`,
};

/**
 * AI model configurations for different use cases
 */
export const aiConfigs = {
  // Fast responses for simple queries
  fast: {
    model: openai('gpt-4o-mini'),
    maxTokens: 300,
    temperature: 0.7,
  },

  // Smart responses for complex queries
  smart: {
    model: openai('gpt-4o'),
    maxTokens: 1000,
    temperature: 0.7,
  },

  // Creative responses for fun interactions
  creative: {
    model: openai('gpt-4o'),
    maxTokens: 800,
    temperature: 1.2,
    topP: 0.95,
  },

  // Precise responses for technical questions
  precise: {
    model: openai('gpt-4o'),
    maxTokens: 1500,
    temperature: 0.3,
  },
};

/**
 * Default configuration
 */
export const defaultConfig = aiConfigs.smart;

/**
 * Get personality configuration
 */
export function getPersonality(mode: string): PersonalityMode {
  const systemPrompt = personalityPrompts[mode] || personalityPrompts.professional;

  let temperature = 0.7;
  if (mode === 'chaotic') temperature = 1.2;
  if (mode === 'zen') temperature = 0.6;

  return {
    name: mode,
    systemPrompt,
    temperature,
  };
}

/**
 * Get AI config based on personality
 */
export function getAIConfigForPersonality(personality: string) {
  switch (personality) {
    case 'chaotic':
      return aiConfigs.creative;
    case 'zen':
      return { ...aiConfigs.smart, temperature: 0.6 };
    case 'professional':
    default:
      return aiConfigs.smart;
  }
}

/**
 * Validate OpenAI API key is configured
 */
export function validateOpenAIConfig(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
}
