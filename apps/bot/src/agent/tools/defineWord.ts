/**
 * Define Word Tool - Gets word definitions, etymology, and grammatical information
 * Uses the Free Dictionary API: https://dictionaryapi.dev/
 */

import { tool } from 'ai';
import { z } from 'zod';

interface Phonetic {
  text?: string;
  audio?: string;
}

interface Definition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms?: string[];
  antonyms?: string[];
}

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: Phonetic[];
  origin?: string;
  meanings: Meaning[];
}

export const defineWordTool = tool({
  description: 'Get detailed word information including definitions, part of speech, etymology, pronunciation, usage examples, synonyms, and antonyms',
  inputSchema: z.object({
    word: z.string().describe('The word to look up, e.g., "serendipity" or "ubiquitous"'),
  }),
  execute: async ({ word }) => {
    try {
      console.log(`📖 Looking up word: ${word}`);

      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            word,
            found: false,
            error: `No definition found for "${word}". Please check the spelling or try a different word.`,
          };
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json() as DictionaryEntry[];

      if (!data || data.length === 0) {
        return {
          word,
          found: false,
          error: `No definition found for "${word}".`,
        };
      }

      const entry = data[0];

      // Format the response with all available information
      const result: any = {
        word: entry.word,
        found: true,
      };

      // Add phonetic pronunciation if available
      if (entry.phonetic || (entry.phonetics && entry.phonetics.length > 0)) {
        result.pronunciation = entry.phonetic || entry.phonetics[0]?.text;

        // Include audio pronunciation URL if available
        const audioPhonetic = entry.phonetics?.find(p => p.audio);
        if (audioPhonetic?.audio) {
          result.audioUrl = audioPhonetic.audio;
        }
      }

      // Add etymology/origin if available
      if (entry.origin) {
        result.etymology = entry.origin;
      }

      // Process meanings (definitions grouped by part of speech)
      result.meanings = entry.meanings.map(meaning => {
        const meaningData: any = {
          partOfSpeech: meaning.partOfSpeech,
          definitions: meaning.definitions.slice(0, 3).map(def => {
            const defData: any = {
              definition: def.definition,
            };

            if (def.example) {
              defData.example = def.example;
            }

            if (def.synonyms && def.synonyms.length > 0) {
              defData.synonyms = def.synonyms.slice(0, 5);
            }

            if (def.antonyms && def.antonyms.length > 0) {
              defData.antonyms = def.antonyms.slice(0, 5);
            }

            return defData;
          }),
        };

        // Add general synonyms/antonyms for the part of speech
        if (meaning.synonyms && meaning.synonyms.length > 0) {
          meaningData.synonyms = meaning.synonyms.slice(0, 5);
        }

        if (meaning.antonyms && meaning.antonyms.length > 0) {
          meaningData.antonyms = meaning.antonyms.slice(0, 5);
        }

        return meaningData;
      });

      return result;
    } catch (error) {
      console.error('Error in defineWord tool:', error);
      return {
        word,
        found: false,
        error: error instanceof Error ? error.message : 'Failed to fetch word definition',
      };
    }
  },
});
