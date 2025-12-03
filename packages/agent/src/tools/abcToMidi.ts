/**
 * ABC to MIDI Converter Tool - Converts ABC notation to MIDI files
 *
 * Features:
 * - Converts ABC musical notation to MIDI format using abcjs library
 * - Validates ABC notation structure
 * - Saves MIDI files to artifacts directory with shareable URLs
 * - Stores metadata (title, description, ABC notation)
 * - Integrates with existing music tools (generateSheetMusic)
 */

import { tool } from 'ai';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import abcjs from 'abcjs';
import { saveMidiFile } from '@repo/database';

interface MidiMetadata {
  id: string;
  type: 'midi';
  title: string;
  description: string;
  abcNotation: string;
  createdAt: string;
  filename: string;
}

/**
 * Convert ABC notation to MIDI and save to database
 */
async function convertAndSaveMidi(
  abcNotation: string,
  title: string,
  description: string,
  abcSheetMusicId?: string
): Promise<MidiMetadata> {
  // Validate ABC notation has required headers
  if (!abcNotation.includes('X:') || !abcNotation.includes('K:')) {
    throw new Error('Invalid ABC notation: missing required headers (X: and K:)');
  }

  try {
    // Convert ABC notation to MIDI using abcjs
    const midiData = abcjs.synth.getMidiFile(abcNotation, {
      chordsOff: false,
      program: 0, // Piano
    });

    if (!midiData || midiData.length === 0) {
      throw new Error('Failed to generate MIDI data from ABC notation');
    }

    // Convert Uint8Array to Buffer
    const midiBuffer = Buffer.from(midiData);

    // Save to database only (no filesystem artifacts)
    const savedRecord = await saveMidiFile({
      title,
      description,
      midiData: midiBuffer,
      abcNotation,
      abcSheetMusicId,
      filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mid`,
      metadata: {
        type: 'midi',
      },
    });

    console.log(`   💾 Saved MIDI to database: ${savedRecord.id}`);

    // Return metadata
    const metadata: MidiMetadata = {
      id: savedRecord.id,
      type: 'midi',
      title,
      description,
      abcNotation,
      createdAt: new Date(Number(savedRecord.createdAt) * 1000).toISOString(),
      filename: savedRecord.filename,
    };

    return metadata;
  } catch (error) {
    throw new Error(`MIDI conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const abcToMidiTool = tool({
  description: 'Convert ABC musical notation to MIDI format and upload as an artifact. Takes ABC notation (text-based music notation) and generates a playable MIDI file that can be downloaded and used in DAWs, music notation software, MIDI players, and other music applications. Perfect for converting sheet music from generateSheetMusic into playable audio files.',
  inputSchema: z.object({
    abcNotation: z.string().describe('ABC notation to convert to MIDI. Should include all required headers (X:, T:, M:, L:, K:) and note data. Can be obtained from generateSheetMusic tool.'),
    title: z.string().optional().describe('Title for the MIDI file (defaults to extracting from ABC notation T: header)'),
    description: z.string().optional().describe('Description of the MIDI file'),
    abcSheetMusicId: z.string().optional().describe('Optional ID of the ABC sheet music record this MIDI is generated from'),
  }),
  execute: async ({ abcNotation, title, description, abcSheetMusicId }) => {
    try {
      console.log('🎵 ABC to MIDI: Converting ABC notation to MIDI...');

      // Extract title from ABC notation if not provided
      let midiTitle = title;
      if (!midiTitle) {
        const titleMatch = abcNotation.match(/^T:\s*(.+)$/m);
        midiTitle = titleMatch ? titleMatch[1].trim() : 'Untitled Composition';
      }

      // Generate description if not provided
      const midiDescription = description || `MIDI file generated from ABC notation: ${midiTitle}`;

      console.log(`   🎼 Title: ${midiTitle}`);
      console.log(`   📝 ABC notation length: ${abcNotation.length} chars`);

      // Convert and save
      const metadata = await convertAndSaveMidi(abcNotation, midiTitle, midiDescription, abcSheetMusicId);

      // Get server URL from environment or use default
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      const downloadUrl = `${serverUrl}/artifacts/${metadata.id}`;

      console.log(`   ✅ MIDI file created: ${metadata.filename}`);
      console.log(`   🔗 Download URL: ${downloadUrl}`);

      // Build usage instructions
      const usageInstructions = `**🎹 MIDI File Ready!**

**Download:** ${downloadUrl}

**How to Use Your MIDI File:**

**Digital Audio Workstations (DAWs):**
- GarageBand, FL Studio, Ableton Live, Logic Pro, Pro Tools, Cubase
- Import the MIDI file to edit, arrange, and produce music

**Music Notation Software:**
- MuseScore, Finale, Sibelius, Dorico
- Open MIDI file to view/edit sheet music

**MIDI Players:**
- Windows Media Player, VLC, QuickTime
- Web browsers (many support MIDI playback natively)
- Online MIDI players (search "online MIDI player")

**Other Uses:**
- Game development (background music)
- Educational purposes (music theory, composition)
- Karaoke software
- Virtual instruments and synthesizers

**File Details:**
- Format: Standard MIDI File (.mid)
- Title: ${midiTitle}
- Created: ${new Date(metadata.createdAt).toLocaleString()}
- Size: ~${Math.round(abcNotation.length / 10)} bytes (estimated)

—
*Format: MIDI | Generated from ABC notation*`;

      return {
        success: true,
        artifactId: metadata.id,
        type: 'midi',
        title: midiTitle,
        description: midiDescription,
        downloadUrl,
        filename: metadata.filename,
        usageInstructions,
        message: `✅ MIDI file created successfully! Download at: ${downloadUrl}`,
      };
    } catch (error) {
      console.error('❌ Error converting ABC to MIDI:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert ABC notation to MIDI',
      };
    }
  },
});
