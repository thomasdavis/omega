/**
 * ABC to MIDI Converter Tool - Converts ABC notation to MIDI files
 *
 * Features:
 * - Converts ABC musical notation to MIDI format using abcjs library
 * - Saves MIDI files to artifacts directory with shareable URLs
 * - Validates ABC notation structure before conversion
 * - Stores metadata (title, description, ABC notation)
 * - Provides detailed usage instructions for MIDI software
 * - Integrates with existing music tools (generateSheetMusic, generateSongLyrics)
 */

import { tool } from 'ai';
import { z } from 'zod';
import abcjs from 'abcjs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Get artifacts directory from environment
function getArtifactsDir(): string {
  return process.env.ARTIFACTS_DIR || '/tmp/artifacts';
}

// Get server URL from environment
function getServerUrl(): string {
  return process.env.SERVER_URL || 'http://localhost:3000';
}

/**
 * Validate ABC notation structure
 */
function validateAbcNotation(abcNotation: string): { valid: boolean; error?: string } {
  // Check for required ABC headers
  if (!abcNotation.includes('X:')) {
    return { valid: false, error: 'Missing required header: X: (reference number)' };
  }
  if (!abcNotation.includes('K:')) {
    return { valid: false, error: 'Missing required header: K: (key signature)' };
  }

  return { valid: true };
}

/**
 * Convert ABC notation to MIDI using abcjs
 */
async function convertAbcToMidi(
  abcNotation: string,
  title?: string,
  description?: string
): Promise<{
  success: boolean;
  artifactId?: string;
  downloadUrl?: string;
  error?: string;
}> {
  try {
    // Validate ABC notation
    const validation = validateAbcNotation(abcNotation);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Generate MIDI data using abcjs
    const midiData = abcjs.synth.getMidiFile(abcNotation, {
      chordsOff: false,
      program: 0, // Piano
    });

    if (!midiData) {
      return {
        success: false,
        error: 'Failed to generate MIDI data from ABC notation',
      };
    }

    // Convert MIDI data to buffer
    const midiBuffer = Buffer.from(midiData);

    // Generate unique artifact ID
    const artifactId = randomUUID();
    const artifactsDir = getArtifactsDir();
    const midiPath = join(artifactsDir, `${artifactId}.mid`);
    const metadataPath = join(artifactsDir, `${artifactId}.json`);

    // Save MIDI file
    await writeFile(midiPath, midiBuffer);

    // Save metadata
    const metadata = {
      id: artifactId,
      type: 'midi',
      title: title || 'ABC to MIDI Conversion',
      description: description || 'MIDI file generated from ABC notation',
      abcNotation,
      createdAt: new Date().toISOString(),
      fileSize: midiBuffer.length,
    };
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Generate download URL
    const serverUrl = getServerUrl();
    const downloadUrl = `${serverUrl}/artifacts/${artifactId}`;

    console.log(`✅ MIDI file created: ${artifactId}.mid (${midiBuffer.length} bytes)`);

    return {
      success: true,
      artifactId,
      downloadUrl,
    };
  } catch (error) {
    console.error('Error converting ABC to MIDI:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during conversion',
    };
  }
}

export const abcToMidiTool = tool({
  description: 'Convert ABC musical notation to MIDI files. Takes ABC notation (text-based music notation) and generates a playable MIDI file that can be used in music software, DAWs, notation programs, and MIDI players. Perfect for converting sheet music from generateSheetMusic into playable audio files. The MIDI file is saved as an artifact with a shareable download URL.',
  inputSchema: z.object({
    abcNotation: z.string().describe('ABC notation to convert to MIDI. Must include required headers like X: (reference number) and K: (key signature). Can be obtained from the generateSheetMusic tool or provided directly.'),
    title: z.string().optional().describe('Title for the MIDI file (default: "ABC to MIDI Conversion")'),
    description: z.string().optional().describe('Description of the musical piece (default: "MIDI file generated from ABC notation")'),
  }),
  execute: async ({ abcNotation, title, description }) => {
    try {
      console.log(`🎵 ABC to MIDI: Converting notation to MIDI file...`);
      if (title) {
        console.log(`   🎼 Title: ${title}`);
      }

      const result = await convertAbcToMidi(abcNotation, title, description);

      if (!result.success) {
        console.error(`   ❌ Conversion failed: ${result.error}`);
        return {
          success: false,
          error: result.error,
        };
      }

      console.log(`   ✨ MIDI file ready: ${result.artifactId}.mid`);
      console.log(`   🔗 Download: ${result.downloadUrl}`);

      // Build formatted output with usage instructions
      let formattedOutput = `**MIDI File Generated** 🎵\n\n`;
      formattedOutput += `**Title:** ${title || 'ABC to MIDI Conversion'}\n`;
      if (description) {
        formattedOutput += `**Description:** ${description}\n`;
      }
      formattedOutput += `\n**Download:** [${result.artifactId}.mid](${result.downloadUrl})\n\n`;

      formattedOutput += `**🎹 How to Use This MIDI File:**\n\n`;
      formattedOutput += `**Digital Audio Workstations (DAWs):**\n`;
      formattedOutput += `- GarageBand (Mac/iOS) - Import as MIDI track\n`;
      formattedOutput += `- FL Studio - Drag and drop into project\n`;
      formattedOutput += `- Ableton Live - Import to MIDI track\n`;
      formattedOutput += `- Logic Pro - Add to project as MIDI region\n`;
      formattedOutput += `- Pro Tools - Import MIDI file\n\n`;

      formattedOutput += `**Music Notation Software:**\n`;
      formattedOutput += `- MuseScore - Open as MIDI file, converts to notation\n`;
      formattedOutput += `- Finale - Import MIDI file\n`;
      formattedOutput += `- Sibelius - Open MIDI file\n`;
      formattedOutput += `- Dorico - Import as MIDI\n\n`;

      formattedOutput += `**MIDI Players:**\n`;
      formattedOutput += `- Windows Media Player (Windows)\n`;
      formattedOutput += `- QuickTime Player (Mac)\n`;
      formattedOutput += `- VLC Media Player (All platforms)\n`;
      formattedOutput += `- Online MIDI players (various web apps)\n\n`;

      formattedOutput += `**Tips:**\n`;
      formattedOutput += `- MIDI files don't contain audio, they contain musical instructions\n`;
      formattedOutput += `- The sound depends on your MIDI player's instrument samples\n`;
      formattedOutput += `- You can edit notes, tempo, and instruments in DAWs\n`;
      formattedOutput += `- Perfect for creating backing tracks or learning melodies\n\n`;

      formattedOutput += `—\n*Format: MIDI | Generated from ABC notation*`;

      return {
        success: true,
        artifactId: result.artifactId,
        downloadUrl: result.downloadUrl,
        title: title || 'ABC to MIDI Conversion',
        description: description || 'MIDI file generated from ABC notation',
        abcNotation,
        formattedOutput,
      };
    } catch (error) {
      console.error('Error in abcToMidi tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert ABC to MIDI',
      };
    }
  },
});
