/**
 * Tell a Spanish Joke Tool - Generates jokes directly in Spanish using AI
 *
 * Features:
 * - AI-generated jokes natively in Spanish for authenticity
 * - Supports various categories (tecnología, clásico, juegos de palabras, papá, programación, frases cortas)
 * - Context-aware and culturally appropriate humor
 * - Fresh, varied jokes every time
 * - Natural Spanish expressions and wordplay
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../config/models.js';

// Available joke categories in Spanish
const SPANISH_JOKE_CATEGORIES = [
  'tecnologia',      // technology
  'clasico',         // classic
  'juegosdepalabras', // puns/wordplay
  'papa',            // dad jokes
  'programacion',    // programming
  'frasescortas',    // one-liners
] as const;

type SpanishJokeCategory = typeof SPANISH_JOKE_CATEGORIES[number];

/**
 * Generate a joke in Spanish using AI based on category and optional context
 */
async function generateSpanishJoke(
  category?: string,
  channelName?: string,
  recentTopics?: string
): Promise<{
  setup: string;
  punchline: string;
  category: string;
}> {
  // Select category
  const selectedCategory =
    category && SPANISH_JOKE_CATEGORIES.includes(category as SpanishJokeCategory)
      ? category
      : SPANISH_JOKE_CATEGORIES[Math.floor(Math.random() * SPANISH_JOKE_CATEGORIES.length)];

  // Build category-specific guidance in Spanish
  const categoryGuidance: Record<string, string> = {
    tecnologia: 'Crea un chiste sobre tecnología, computadoras, software, hardware o cultura tecnológica. Hazlo inteligente y relevante para la tecnología moderna.',
    clasico: 'Crea un chiste clásico con atractivo universal. Piensa en humor atemporal, apto para toda la familia, con una configuración clara y un remate.',
    juegosdepalabras: 'Crea un chiste basado en juegos de palabras. Usa juegos de palabras, dobles sentidos o giros lingüísticos ingeniosos. Hazlo gracioso en el mejor sentido.',
    papa: 'Crea un chiste de papá - sano, con juegos de palabras y deliciosamente cursi. Del tipo que hace que la gente ponga los ojos en blanco mientras sonríe.',
    programacion: 'Crea un chiste de programación. Haz referencia a conceptos de codificación, lenguajes, algoritmos o cultura de desarrolladores. Hazlo inteligente para programadores.',
    frasescortas: 'Crea un chiste de una línea o una observación ingeniosa. No necesita configuración, solo una declaración inteligente y contundente. Puede estar relacionado con tecnología.',
  };

  // Build context-aware guidance
  let contextGuidance = '';
  if (channelName || recentTopics) {
    contextGuidance = '\n\nContexto para hacer el chiste más relevante:';
    if (channelName) {
      contextGuidance += `\n- Canal: #${channelName}`;
    }
    if (recentTopics) {
      contextGuidance += `\n- Temas recientes de conversación: ${recentTopics}`;
      contextGuidance += '\n- INTENTA incorporar o hacer referencia a estos temas si hace que el chiste sea más divertido y contextualmente relevante. Sin embargo, si forzar el contexto empeora el chiste, prioriza el humor sobre el contexto.';
    }
  }

  const prompt = `Genera un chiste en español siguiendo estas pautas:

${categoryGuidance[selectedCategory]}${contextGuidance}

Requisitos:
- Sé original y creativo (evita chistes muy usados)
- Mantenlo apropiado e inclusivo
- Hazlo genuinamente divertido, no forzado
- Para chistes de configuración-remate: crea una separación clara
- Para frases cortas: hazlo contundente y autónomo
- Longitud: la configuración debe tener 5-20 palabras, el remate 5-15 palabras (o vacío para frases cortas)
- Si se proporciona contexto, úsalo para hacer el chiste más relevante, pero solo si mejora el humor
- USA ESPAÑOL NATURAL: el chiste debe sonar natural para hablantes nativos de español
- USA EXPRESIONES ESPAÑOLAS: incorpora modismos, dichos y expresiones culturalmente apropiadas cuando sea relevante

Responde en formato JSON:
{
  "setup": "La configuración del chiste o la frase corta completa",
  "punchline": "El remate, o cadena vacía para frases cortas"
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      setup: parsed.setup,
      punchline: parsed.punchline || '',
      category: selectedCategory,
    };
  } catch (error) {
    console.error('Error generating Spanish joke:', error);
    // Fallback joke in case of error
    return {
      setup: "¿Por qué la IA no quiso contar un chiste?",
      punchline: "¡Tenía miedo de obtener una mala respuesta!",
      category: selectedCategory,
    };
  }
}

/**
 * Format joke for display
 */
function formatJoke(setup: string, punchline: string): string {
  if (!punchline) {
    // One-liner format
    return setup;
  }
  return `${setup}\n\n${punchline}`;
}

export const tellSpanishJokeTool = tool({
  description: 'Generate and tell an AI-powered joke directly in Spanish from various categories (tecnologia, clasico, juegosdepalabras, papa, programacion, frasescortas). Each joke is uniquely generated in native Spanish for authenticity and cultural appropriateness. Can incorporate context from the current conversation to make jokes more relevant and engaging. Use this when users want to hear a joke in Spanish or need Spanish-language humor.',
  inputSchema: z.object({
    category: z.string().optional().describe('Optional category: tecnologia, clasico, juegosdepalabras, papa, programacion, or frasescortas. If not specified, a random category will be chosen.'),
    channelName: z.string().optional().describe('Optional name of the current channel/room. Helps contextualize the joke.'),
    recentTopics: z.string().optional().describe('Optional brief summary of recent conversation topics. Helps make the joke contextually relevant.'),
  }),
  execute: async ({ category, channelName, recentTopics }) => {
    try {
      console.log('😄 Tell Spanish Joke: Generating an AI-powered joke in Spanish...');
      if (channelName) {
        console.log(`   📍 Channel: #${channelName}`);
      }
      if (recentTopics) {
        console.log(`   💬 Context: ${recentTopics}`);
      }

      const jokeData = await generateSpanishJoke(category, channelName, recentTopics);
      const formattedJoke = formatJoke(jokeData.setup, jokeData.punchline);

      console.log(`   📂 Category: ${jokeData.category}`);
      console.log(`   ✨ Generated: ${jokeData.setup}`);

      return {
        joke: formattedJoke,
        category: jokeData.category,
        setup: jokeData.setup,
        punchline: jokeData.punchline || null,
        contextUsed: !!(channelName || recentTopics),
        availableCategories: Array.from(SPANISH_JOKE_CATEGORIES),
        success: true,
      };
    } catch (error) {
      console.error('Error generating Spanish joke:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to generate Spanish joke',
        success: false,
      };
    }
  },
});
