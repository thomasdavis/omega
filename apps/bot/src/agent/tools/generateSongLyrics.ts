/**
 * Generate Song Lyrics and Chords Tool - Creates songs with lyrics and chord progressions
 *
 * Features:
 * - AI-generated song lyrics with thematic coherence
 * - Musically appropriate chord progressions
 * - Multiple genre support (pop, rock, folk, jazz, blues, country)
 * - Context-aware songwriting based on conversation or theme
 * - Proper chord placement above lyrics
 * - Enabled by default with toggleable settings
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../../config/models.js';

// Available song genres
const SONG_GENRES = [
  'pop',
  'rock',
  'folk',
  'jazz',
  'blues',
  'country',
  'indie',
  'ballad',
] as const;

type SongGenre = typeof SONG_GENRES[number];

// Song structure options
const SONG_STRUCTURES = [
  'verse-chorus',
  'verse-chorus-bridge',
  'aaba',
  'aaaa',
  'custom',
] as const;

type SongStructure = typeof SONG_STRUCTURES[number];

interface SongOutput {
  title: string;
  genre: string;
  structure: string;
  key: string;
  tempo: string;
  lyrics: string;
  chords: string;
  lyricsWithChords: string;
  analysis: string;
}

/**
 * Generate song lyrics and chords using AI
 */
async function generateSong(
  genre: SongGenre,
  structure: SongStructure,
  theme?: string,
  conversationContext?: string,
  mood?: string,
  enableChords: boolean = true
): Promise<SongOutput> {
  // Build genre-specific guidance
  const genreGuidance: Record<SongGenre, string> = {
    pop: `Pop song characteristics:
- Catchy, memorable melodies and hooks
- Simple, relatable lyrics about love, relationships, life
- Common chords: I, IV, V, vi (e.g., C, F, G, Am in C major)
- Upbeat or emotionally accessible
- Verse-chorus structure with repetition`,

    rock: `Rock song characteristics:
- Powerful, energetic delivery
- Guitar-driven with strong rhythm
- Lyrics about rebellion, freedom, passion, or storytelling
- Common chords: power chords, I, IV, V, bVII (e.g., A, D, E, G in A major)
- Dynamic contrasts between verses and choruses`,

    folk: `Folk song characteristics:
- Storytelling and narrative lyrics
- Acoustic, natural sound
- Themes of life, nature, social issues, personal reflection
- Common chords: I, IV, V, ii, vi (e.g., G, C, D, Am, Em in G major)
- Simple, honest, authentic expression`,

    jazz: `Jazz song characteristics:
- Sophisticated, complex harmonies
- Smooth, soulful lyrics often about love or life
- Common chords: ii-V-I progressions, 7th chords, extended harmonies (e.g., Dm7, G7, Cmaj7)
- Swing or syncopated rhythms
- Improvisational feel`,

    blues: `Blues song characteristics:
- 12-bar blues progression
- Lyrics about hardship, emotion, life struggles
- Common chords: I7, IV7, V7 (e.g., E7, A7, B7 in E blues)
- Call-and-response patterns
- Soulful, expressive delivery`,

    country: `Country song characteristics:
- Storytelling with down-to-earth themes
- Lyrics about life, love, heartbreak, home
- Common chords: I, IV, V, ii, vi (e.g., G, C, D, Am, Em in G major)
- Twangy, heartfelt delivery
- Often includes narrative details`,

    indie: `Indie song characteristics:
- Unique, personal artistic expression
- Unconventional or poetic lyrics
- Common chords: experimental progressions, modal harmony
- Atmospheric or intimate sound
- Emotional authenticity`,

    ballad: `Ballad characteristics:
- Slow tempo, emotional depth
- Romantic or deeply personal lyrics
- Common chords: I, IV, V, vi, ii (e.g., C, F, G, Am, Dm in C major)
- Building emotional intensity
- Focus on melody and lyrical content`,
  };

  // Build structure guidance
  const structureGuidance: Record<SongStructure, string> = {
    'verse-chorus': `Verse-Chorus structure:
- Verse 1 (introduce story/theme)
- Chorus (main hook, repeated message)
- Verse 2 (develop story/theme)
- Chorus (repeat)
- Optional: Final Chorus or Outro`,

    'verse-chorus-bridge': `Verse-Chorus-Bridge structure:
- Verse 1 (introduce story/theme)
- Chorus (main hook)
- Verse 2 (develop story)
- Chorus (repeat)
- Bridge (new perspective, musical contrast)
- Chorus (final repeat, possibly modified)`,

    'aaba': `AABA (32-bar standard) structure:
- A section (8 bars, main melody/theme)
- A section (repeat with slight variation)
- B section (bridge, contrasting section)
- A section (return to main theme)`,

    'aaaa': `AAAA (verse-only) structure:
- Verse 1
- Verse 2
- Verse 3
- Verse 4 (optional)
- Each verse has same melody but different lyrics (storytelling style)`,

    'custom': `Custom structure:
- Creative freedom to experiment
- Can mix different sections as needed
- Should still have clear sections and flow`,
  };

  // Build context analysis
  let contextGuidance = '';
  if (conversationContext) {
    contextGuidance = `\n\nConversation Context to Inspire the Song:
${conversationContext}

Use this context to:
- Extract themes, emotions, and topics for the song
- Make the lyrics relevant to the conversation
- Create meaningful connections to what was discussed`;
  }

  // Add theme if provided
  let themeGuidance = '';
  if (theme) {
    themeGuidance = `\n\nSong Theme: ${theme}
- Center the song around this theme
- Weave it naturally throughout the lyrics`;
  }

  // Add mood guidance
  let moodGuidance = '';
  if (mood) {
    moodGuidance = `\n\nDesired Mood: ${mood}
- Maintain this emotional mood throughout
- Choose chords and lyrics that support this feeling`;
  }

  const chordsInstruction = enableChords
    ? `\n\nChord Progression Requirements:
- Provide musically appropriate chords for the ${genre} genre
- Use standard chord notation (e.g., C, Am, F, G7, Dmaj7)
- Ensure chord progressions are realistic and playable
- Place chords at appropriate positions above the lyrics
- Consider the key and make harmonic sense`
    : '\n\nNote: Chords are disabled for this generation. Focus only on lyrics.';

  const prompt = `Generate a ${genre} song with the following specifications:

Genre: ${genre}
${genreGuidance[genre]}

Structure: ${structure}
${structureGuidance[structure]}
${contextGuidance}${themeGuidance}${moodGuidance}
${chordsInstruction}

Requirements:
- Create meaningful, well-crafted lyrics with thematic coherence
- Use vivid imagery and emotional resonance
- Ensure lyrics fit the chosen genre and structure
- Make it memorable and singable
${enableChords ? '- Provide accurate chord progressions that fit the genre and key' : ''}
${enableChords ? '- Format with chords placed above the corresponding lyrics' : ''}
- Choose an appropriate musical key (e.g., C major, G major, E minor)
- Suggest a tempo/feel (e.g., "Moderate 4/4", "Slow ballad", "Upbeat")

Respond in JSON format:
{
  "title": "Song title (2-6 words)",
  "key": "Musical key (e.g., C major, G major, A minor)",
  "tempo": "Tempo and feel (e.g., Moderate 4/4, Slow ballad)",
  "lyrics": "Complete song lyrics with section labels (e.g., [Verse 1], [Chorus])",
  ${enableChords ? '"chords": "Chord progression for the song (list the main chords used)",' : ''}
  ${enableChords ? '"lyricsWithChords": "Lyrics with chords placed above the syllables where changes occur (use proper spacing)",' : ''}
  "analysis": "Brief 2-3 sentence explanation of the song's theme and musical approach"
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      title: parsed.title,
      genre,
      structure,
      key: parsed.key,
      tempo: parsed.tempo,
      lyrics: parsed.lyrics,
      chords: enableChords ? (parsed.chords || 'N/A') : 'Disabled',
      lyricsWithChords: enableChords ? (parsed.lyricsWithChords || parsed.lyrics) : 'Disabled',
      analysis: parsed.analysis,
    };
  } catch (error) {
    console.error('Error generating song:', error);
    // Fallback song in case of error
    return {
      title: "Default Song",
      genre,
      structure,
      key: "C major",
      tempo: "Moderate 4/4",
      lyrics: `[Verse 1]
When the code compiles without a hitch
And the tests are passing green
I feel like I've found that perfect switch
The best result I've ever seen

[Chorus]
Oh, debugging blues, you fade away
When solutions come to light
Every error fixed, another day
Of code that works just right`,
      chords: enableChords ? "C, G, Am, F" : "Disabled",
      lyricsWithChords: enableChords ? `    C              G
[Verse 1]
         Am           F
When the code compiles without a hitch
        C              G
And the tests are passing green
      Am              F
I feel like I've found that perfect switch
    C                 G
The best result I've ever seen

        F         C
[Chorus]
              G            Am
Oh, debugging blues, you fade away
     F           C
When solutions come to light
      G              Am
Every error fixed, another day
   F              G
Of code that works just right` : "Disabled",
      analysis: "A lighthearted song about the joys of programming and debugging, with a simple chord progression typical of the genre.",
    };
  }
}

export const generateSongLyricsTool = tool({
  description: 'Generate creative song lyrics with chord progressions. Creates complete songs with proper structure, musically appropriate chords, and thematic lyrics. Supports multiple genres (pop, rock, folk, jazz, blues, country, indie, ballad) and structures. Can incorporate conversation context or specific themes. Chords are enabled by default but can be disabled. Perfect for songwriting, musical creativity, and artistic expression.',
  inputSchema: z.object({
    genre: z.enum(['pop', 'rock', 'folk', 'jazz', 'blues', 'country', 'indie', 'ballad']).optional().describe('Musical genre (default: pop). Determines style, chord choices, and lyrical approach.'),
    structure: z.enum(['verse-chorus', 'verse-chorus-bridge', 'aaba', 'aaaa', 'custom']).optional().describe('Song structure (default: verse-chorus-bridge). Determines how sections are arranged.'),
    theme: z.string().optional().describe('Theme or subject for the song (e.g., "love", "adventure", "nostalgia", "freedom"). If not provided, will be creative or derived from context.'),
    conversationContext: z.string().optional().describe('Recent conversation context to inspire the song. The AI will analyze this to create contextually relevant lyrics.'),
    mood: z.enum(['happy', 'sad', 'energetic', 'mellow', 'romantic', 'rebellious', 'reflective', 'hopeful']).optional().describe('Emotional mood of the song (default: based on genre)'),
    enableChords: z.boolean().optional().describe('Generate chord progressions (default: true). Set to false to generate lyrics only without chords.'),
  }),
  execute: async ({
    genre = 'pop',
    structure = 'verse-chorus-bridge',
    theme,
    conversationContext,
    mood,
    enableChords = true
  }) => {
    try {
      console.log(`🎵 Generate Song: Creating a ${genre} song...`);
      console.log(`   🎸 Structure: ${structure}`);
      if (theme) {
        console.log(`   🎯 Theme: ${theme}`);
      }
      if (conversationContext) {
        console.log(`   💬 Using conversation context (${conversationContext.length} chars)`);
      }
      if (mood) {
        console.log(`   🎭 Mood: ${mood}`);
      }
      console.log(`   🎼 Chords: ${enableChords ? 'enabled' : 'disabled'}`);

      const songData = await generateSong(
        genre,
        structure,
        theme,
        conversationContext,
        mood,
        enableChords
      );

      console.log(`   ✨ Generated: "${songData.title}"`);

      // Build formatted output
      let formattedOutput = `**${songData.title}**\n`;
      formattedOutput += `*${songData.genre.charAt(0).toUpperCase() + songData.genre.slice(1)} | ${songData.key} | ${songData.tempo}*\n\n`;

      if (enableChords) {
        formattedOutput += `**Chords:** ${songData.chords}\n\n`;
        formattedOutput += `${songData.lyricsWithChords}\n\n`;
      } else {
        formattedOutput += `${songData.lyrics}\n\n`;
      }

      formattedOutput += `*${songData.analysis}*\n\n`;
      formattedOutput += `—\n*Genre: ${songData.genre} | Structure: ${songData.structure}${mood ? ` | Mood: ${mood}` : ''}*`;

      return {
        success: true,
        title: songData.title,
        genre: songData.genre,
        structure: songData.structure,
        key: songData.key,
        tempo: songData.tempo,
        lyrics: songData.lyrics,
        chords: songData.chords,
        lyricsWithChords: songData.lyricsWithChords,
        analysis: songData.analysis,
        chordsEnabled: enableChords,
        mood: mood || 'genre-default',
        themeUsed: theme || 'creative/contextual',
        contextUsed: !!conversationContext,
        availableGenres: Array.from(SONG_GENRES),
        availableStructures: Array.from(SONG_STRUCTURES),
        formattedOutput,
      };
    } catch (error) {
      console.error('Error generating song lyrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate song lyrics',
      };
    }
  },
});
