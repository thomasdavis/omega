/**
 * Generate Sheet Music Tool - Creates musical notation in ABC format
 *
 * Features:
 * - AI-generated sheet music from conversation or text descriptions
 * - Supports ABC notation (standard text-based music notation)
 * - Handles notes, rhythms, durations, key signatures, time signatures
 * - Can interpret musical ideas from conversation context
 * - Output can be rendered to visual sheet music using ABC notation tools
 * - Integrates with existing music tools (generateSongLyrics)
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

// Musical keys
const MUSICAL_KEYS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
  'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm',
] as const;

type MusicalKey = typeof MUSICAL_KEYS[number];

// Time signatures
const TIME_SIGNATURES = [
  '4/4', '3/4', '2/4', '6/8', '9/8', '12/8',
  '5/4', '7/8', '2/2', '3/8',
] as const;

type TimeSignature = typeof TIME_SIGNATURES[number];

// Tempo markings
const TEMPO_MARKINGS = [
  'Largo', 'Adagio', 'Andante', 'Moderato',
  'Allegro', 'Vivace', 'Presto',
] as const;

type TempoMarking = typeof TEMPO_MARKINGS[number];

interface SheetMusicOutput {
  title: string;
  composer: string;
  key: string;
  timeSignature: string;
  tempo: string;
  abcNotation: string;
  description: string;
  musicalStructure: string;
  renderingInstructions: string;
}

/**
 * Generate sheet music in ABC notation using AI
 */
async function generateSheetMusicABC(
  description: string,
  key?: MusicalKey,
  timeSignature?: TimeSignature,
  tempo?: TempoMarking,
  conversationContext?: string,
  includeChords?: boolean
): Promise<SheetMusicOutput> {
  // Build comprehensive ABC notation guide
  const abcGuide = `
ABC Notation Format Guide:

1. Header Fields:
   - X: Reference number (always 1)
   - T: Title
   - C: Composer
   - M: Time signature (e.g., 4/4, 3/4, 6/8)
   - L: Default note length (e.g., 1/4 for quarter notes, 1/8 for eighth notes)
   - Q: Tempo (e.g., Q:1/4=120 means 120 quarter notes per minute)
   - K: Key signature (e.g., C, G, D, Am, Em)

2. Note Syntax:
   - Notes: C D E F G A B c d e f g a b (lowercase = higher octave)
   - Sharps: ^C (C sharp), ^^C (double sharp)
   - Flats: _B (B flat), __B (double flat)
   - Natural: =C
   - Octaves: C,, (2 octaves down), C, (1 octave down), C (middle), c (1 octave up), c' (2 octaves up)

3. Note Lengths:
   - C2 = half note (double length)
   - C = quarter note (default if L:1/4)
   - C/2 = eighth note (half length)
   - C/4 = sixteenth note
   - C3/2 = dotted note (1.5x length)

4. Rests:
   - z = rest (duration follows same rules as notes)
   - z2 = half rest
   - z/2 = eighth rest

5. Bars and Measures:
   - | = bar line
   - || = double bar line
   - |] = final bar line
   - [| = thick-thin double bar line
   - |: :| = repeat markers

6. Chords (if enabled):
   - "C" above notes for chord symbols
   - [CEG] = chord played simultaneously

7. Articulation and Expression:
   - . = staccato
   - ~ = roll/turn
   - H = fermata
   - u = up bow, v = down bow

Example ABC Notation:
X:1
T:Simple Melody
C:AI Composer
M:4/4
L:1/4
Q:1/4=120
K:C
"C"C D E F | "G"G2 F E | "Am"A G F E | "F"F2 E D | "C"C4 |]
`;

  // Build context analysis
  let contextGuidance = '';
  if (conversationContext) {
    contextGuidance = `\n\nConversation Context to Inspire the Music:
${conversationContext}

Use this context to:
- Extract musical ideas, themes, and emotions
- Create melodies that reflect the conversation's mood
- Make the composition contextually relevant`;
  }

  // Build key and time signature guidance
  const keyGuidance = key
    ? `\n\nRequired Key: ${key}
- Use this key signature throughout
- Ensure notes fit within the key (use appropriate sharps/flats)`
    : '\n\nKey: Choose an appropriate key based on the musical mood and description';

  const timeGuidance = timeSignature
    ? `\n\nRequired Time Signature: ${timeSignature}
- Use this time signature throughout
- Ensure measures contain the correct number of beats`
    : '\n\nTime Signature: Choose an appropriate time signature (4/4 is most common)';

  const tempoGuidance = tempo
    ? `\n\nRequired Tempo: ${tempo}
- Set tempo marking to ${tempo}
- Choose BPM that matches this tempo marking`
    : '\n\nTempo: Choose an appropriate tempo based on the musical character';

  const chordsGuidance = includeChords
    ? '\n\nChords: Include chord symbols above the staff using "ChordName" notation'
    : '\n\nChords: Not required (focus on melody only)';

  const prompt = `Generate sheet music in ABC notation format based on the following:

Description: ${description}

${abcGuide}
${contextGuidance}
${keyGuidance}
${timeGuidance}
${tempoGuidance}
${chordsGuidance}

Requirements:
1. Create a complete, valid ABC notation composition
2. Follow proper ABC notation syntax exactly
3. Include all required header fields (X, T, C, M, L, Q, K)
4. Compose a musically coherent melody with proper phrasing
5. Use appropriate note lengths and rhythmic patterns
6. Ensure bars contain the correct number of beats for the time signature
7. End with proper bar line |]
8. Make it musical, expressive, and memorable
${includeChords ? '9. Include appropriate chord progressions using "Chord" notation' : ''}

Respond in JSON format:
{
  "title": "Composition title (2-6 words)",
  "composer": "Composer credit (e.g., 'AI Composer' or contextual name)",
  "key": "Musical key (e.g., C, G, Am)",
  "timeSignature": "Time signature (e.g., 4/4, 3/4, 6/8)",
  "tempo": "Tempo marking and BPM (e.g., 'Moderato (120 BPM)')",
  "abcNotation": "Complete ABC notation starting with X:1 header through final bar line |]",
  "description": "2-3 sentence description of the musical character and themes",
  "musicalStructure": "Brief description of the form/structure (e.g., 'AABA', '16-bar melody', 'verse-chorus')"
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    // Validate that ABC notation is present and properly formatted
    if (!parsed.abcNotation || !parsed.abcNotation.includes('X:1')) {
      throw new Error('Invalid ABC notation generated');
    }

    return {
      title: parsed.title,
      composer: parsed.composer,
      key: parsed.key,
      timeSignature: parsed.timeSignature,
      tempo: parsed.tempo,
      abcNotation: parsed.abcNotation,
      description: parsed.description,
      musicalStructure: parsed.musicalStructure,
      renderingInstructions: `To render this ABC notation as visual sheet music:
1. Visit: https://editor.drawthedots.com/ or https://abcjs.net/abcjs-editor.html
2. Paste the ABC notation above
3. View the rendered sheet music
4. Export as PDF, SVG, or MIDI if needed

The ABC notation can also be rendered using libraries like abcjs in web applications.`,
    };
  } catch (error) {
    console.error('Error generating sheet music:', error);
    // Fallback composition in case of error
    const fallbackKey = key || 'C';
    const fallbackTime = timeSignature || '4/4';

    return {
      title: "Simple Melody",
      composer: "AI Composer",
      key: fallbackKey,
      timeSignature: fallbackTime,
      tempo: "Moderato (120 BPM)",
      abcNotation: `X:1
T:Simple Melody
C:AI Composer
M:${fallbackTime}
L:1/4
Q:1/4=120
K:${fallbackKey}
${includeChords ? '"C"' : ''}C D E F | ${includeChords ? '"G"' : ''}G2 F E | ${includeChords ? '"Am"' : ''}A G F E | ${includeChords ? '"F"' : ''}F2 E D | ${includeChords ? '"C"' : ''}C4 |]`,
      description: "A simple, flowing melody demonstrating basic musical structure. Perfect for beginners or as a starting point for musical exploration.",
      musicalStructure: "Single phrase with stepwise motion, ending on the tonic",
      renderingInstructions: `To render this ABC notation as visual sheet music:
1. Visit: https://editor.drawthedots.com/ or https://abcjs.net/abcjs-editor.html
2. Paste the ABC notation above
3. View the rendered sheet music
4. Export as PDF, SVG, or MIDI if needed`,
    };
  }
}

export const generateSheetMusicTool = tool({
  description: 'Generate sheet music notation from text descriptions or conversation context. Creates music in ABC notation format (standard text-based musical notation) that can be rendered as visual sheet music. Supports notes, rhythms, durations, key signatures, time signatures, tempo markings, and optional chord symbols. Perfect for composers, musicians, music educators, or anyone wanting to translate musical ideas into formal notation. The output can be rendered to visual sheet music using online ABC notation tools.',
  inputSchema: z.object({
    description: z.string().describe('Description of the music to generate (e.g., "a cheerful waltz", "somber piano piece", "upbeat jazz melody", "Celtic folk tune"). Can include mood, style, instruments, or any musical characteristics.'),
    key: z.enum(['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm'] as [MusicalKey, ...MusicalKey[]]).optional().describe('Musical key (e.g., "C", "G", "Am", "Em"). If not specified, the AI will choose an appropriate key.'),
    timeSignature: z.enum(['4/4', '3/4', '2/4', '6/8', '9/8', '12/8', '5/4', '7/8', '2/2', '3/8'] as [TimeSignature, ...TimeSignature[]]).optional().describe('Time signature (e.g., "4/4" for common time, "3/4" for waltz, "6/8" for compound meter). If not specified, will be chosen based on musical style.'),
    tempo: z.enum(['Largo', 'Adagio', 'Andante', 'Moderato', 'Allegro', 'Vivace', 'Presto'] as [TempoMarking, ...TempoMarking[]]).optional().describe('Tempo marking (Largo=very slow, Adagio=slow, Andante=walking pace, Moderato=moderate, Allegro=fast, Vivace=lively, Presto=very fast). If not specified, will match the musical style.'),
    conversationContext: z.string().optional().describe('Recent conversation context to inspire the music. The AI will analyze this to create contextually relevant melodies and themes.'),
    includeChords: z.boolean().optional().describe('Include chord symbols in the sheet music (default: false). Useful for accompaniment or harmonic guidance.'),
  }),
  execute: async ({
    description,
    key,
    timeSignature,
    tempo,
    conversationContext,
    includeChords = false,
  }) => {
    try {
      console.log(`🎼 Generate Sheet Music: Creating notation for "${description}"...`);
      if (key) {
        console.log(`   🎹 Key: ${key}`);
      }
      if (timeSignature) {
        console.log(`   ⏱️  Time: ${timeSignature}`);
      }
      if (tempo) {
        console.log(`   🎵 Tempo: ${tempo}`);
      }
      if (conversationContext) {
        console.log(`   💬 Using conversation context (${conversationContext.length} chars)`);
      }
      console.log(`   🎸 Chords: ${includeChords ? 'enabled' : 'disabled'}`);

      const sheetMusic = await generateSheetMusicABC(
        description,
        key,
        timeSignature,
        tempo,
        conversationContext,
        includeChords
      );

      console.log(`   ✨ Generated: "${sheetMusic.title}"`);

      // Build formatted output
      let formattedOutput = `**${sheetMusic.title}**\n`;
      formattedOutput += `*${sheetMusic.composer} | ${sheetMusic.key} ${sheetMusic.timeSignature} | ${sheetMusic.tempo}*\n\n`;
      formattedOutput += `**ABC Notation:**\n\`\`\`abc\n${sheetMusic.abcNotation}\n\`\`\`\n\n`;
      formattedOutput += `**Description:** ${sheetMusic.description}\n\n`;
      formattedOutput += `**Musical Structure:** ${sheetMusic.musicalStructure}\n\n`;
      formattedOutput += `**📝 Rendering Instructions:**\n${sheetMusic.renderingInstructions}\n\n`;
      formattedOutput += `—\n*Format: ABC Notation | Key: ${sheetMusic.key} | Time: ${sheetMusic.timeSignature}${tempo ? ` | Tempo: ${tempo}` : ''}*`;

      return {
        success: true,
        title: sheetMusic.title,
        composer: sheetMusic.composer,
        key: sheetMusic.key,
        timeSignature: sheetMusic.timeSignature,
        tempo: sheetMusic.tempo,
        abcNotation: sheetMusic.abcNotation,
        description: sheetMusic.description,
        musicalStructure: sheetMusic.musicalStructure,
        renderingInstructions: sheetMusic.renderingInstructions,
        includeChords,
        contextUsed: !!conversationContext,
        formattedOutput,
        availableKeys: Array.from(MUSICAL_KEYS),
        availableTimeSignatures: Array.from(TIME_SIGNATURES),
        availableTempos: Array.from(TEMPO_MARKINGS),
      };
    } catch (error) {
      console.error('Error generating sheet music:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate sheet music',
      };
    }
  },
});
