/**
 * Audio Converter Utility - MIDI to MP3 Conversion
 *
 * Uses FluidSynth + SoundFont for high-quality piano audio rendering
 * Then encodes to MP3 using lamejs
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

// Use createRequire for CommonJS module compatibility
const require = createRequire(import.meta.url);
const lamejs = require('lamejs');

const execAsync = promisify(exec);

/**
 * Path to SoundFont file
 * In production (Railway), this should be an absolute path
 * For now, using a default that can be overridden via environment variable
 */
const SOUNDFONT_PATH = process.env.SOUNDFONT_PATH || '/app/assets/soundfonts/grand_piano.sf2';

/**
 * Convert MIDI buffer to MP3 buffer using FluidSynth + SoundFont + lamejs
 *
 * Process:
 * 1. Save MIDI data to temp file
 * 2. Use FluidSynth to render MIDI → WAV with SoundFont
 * 3. Parse WAV headers and extract PCM data
 * 4. Encode PCM → MP3 using lamejs
 * 5. Clean up temp files
 *
 * @param midiBuffer - Buffer containing MIDI data
 * @returns Buffer containing MP3 data
 */
export async function midiToMp3Buffer(midiBuffer: Buffer): Promise<Buffer> {
  const tempId = randomUUID();
  const tempDir = tmpdir();
  const midiPath = join(tempDir, `temp_${tempId}.mid`);
  const wavPath = join(tempDir, `temp_${tempId}.wav`);

  try {
    // Step 1: Write MIDI to temp file
    await writeFile(midiPath, midiBuffer);

    // Step 2: Check if FluidSynth is available
    try {
      await execAsync('which fluidsynth');
    } catch (error) {
      throw new Error('FluidSynth is not installed. Install with: apt-get install fluidsynth (Linux) or brew install fluidsynth (macOS)');
    }

    // Step 3: Render MIDI to WAV using FluidSynth with SoundFont
    const fluidsynthCommand = `fluidsynth -F "${wavPath}" "${SOUNDFONT_PATH}" "${midiPath}"`;

    try {
      const { stdout, stderr } = await execAsync(fluidsynthCommand, {
        timeout: 30000, // 30 second timeout
      });

      // FluidSynth outputs to stderr even on success, so check for actual errors
      if (stderr && stderr.includes('error') && !stderr.includes('Error opening file')) {
        console.warn('FluidSynth stderr:', stderr);
      }

      console.log('   🎹 FluidSynth rendered WAV successfully');
    } catch (error) {
      throw new Error(`FluidSynth rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure SoundFont exists at ${SOUNDFONT_PATH}`);
    }

    // Step 4: Read WAV file
    const fs = await import('fs/promises');
    const wavBuffer = await fs.readFile(wavPath);

    // Step 5: Parse WAV headers and extract PCM data
    const wavData = parseWavBuffer(wavBuffer);

    // Step 6: Encode PCM to MP3 using lamejs
    const mp3Buffer = encodePcmToMp3(
      wavData.pcmData,
      wavData.sampleRate,
      wavData.numChannels,
      wavData.bitsPerSample
    );

    console.log(`   ✅ MP3 encoding complete (${mp3Buffer.length} bytes)`);

    return mp3Buffer;
  } catch (error) {
    throw new Error(`MIDI to MP3 conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Step 7: Clean up temp files
    try {
      await Promise.all([
        unlink(midiPath).catch(() => {}),
        unlink(wavPath).catch(() => {}),
      ]);
    } catch (error) {
      console.warn('Failed to clean up temp files:', error);
    }
  }
}

/**
 * Parse WAV file buffer and extract PCM data
 *
 * WAV file structure:
 * - RIFF header (12 bytes): "RIFF", file size, "WAVE"
 * - fmt chunk (24 bytes): format info (sample rate, channels, bits per sample)
 * - data chunk (8+ bytes): "data", data size, PCM samples
 */
function parseWavBuffer(wavBuffer: Buffer): {
  pcmData: Int16Array;
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
} {
  // Validate RIFF header
  if (wavBuffer.toString('utf8', 0, 4) !== 'RIFF') {
    throw new Error('Invalid WAV file: missing RIFF header');
  }
  if (wavBuffer.toString('utf8', 8, 12) !== 'WAVE') {
    throw new Error('Invalid WAV file: missing WAVE format');
  }

  // Find fmt chunk
  let offset = 12;
  while (offset < wavBuffer.length) {
    const chunkId = wavBuffer.toString('utf8', offset, offset + 4);
    const chunkSize = wavBuffer.readUInt32LE(offset + 4);

    if (chunkId === 'fmt ') {
      // Parse format chunk
      const numChannels = wavBuffer.readUInt16LE(offset + 10);
      const sampleRate = wavBuffer.readUInt32LE(offset + 12);
      const bitsPerSample = wavBuffer.readUInt16LE(offset + 22);

      // Find data chunk
      let dataOffset = offset + 8 + chunkSize;
      while (dataOffset < wavBuffer.length) {
        const dataChunkId = wavBuffer.toString('utf8', dataOffset, dataOffset + 4);
        const dataChunkSize = wavBuffer.readUInt32LE(dataOffset + 4);

        if (dataChunkId === 'data') {
          // Extract PCM data
          const pcmStart = dataOffset + 8;
          const pcmEnd = pcmStart + dataChunkSize;
          const pcmBuffer = wavBuffer.subarray(pcmStart, pcmEnd);

          // Convert to Int16Array (assuming 16-bit PCM)
          const pcmData = new Int16Array(
            pcmBuffer.buffer,
            pcmBuffer.byteOffset,
            pcmBuffer.length / 2
          );

          return {
            pcmData,
            sampleRate,
            numChannels,
            bitsPerSample,
          };
        }

        dataOffset += 8 + dataChunkSize;
      }

      throw new Error('Invalid WAV file: missing data chunk');
    }

    offset += 8 + chunkSize;
  }

  throw new Error('Invalid WAV file: missing fmt chunk');
}

/**
 * Encode PCM data to MP3 using lamejs
 *
 * @param pcmData - PCM samples as Int16Array
 * @param sampleRate - Sample rate (e.g., 44100)
 * @param numChannels - Number of channels (1 = mono, 2 = stereo)
 * @param bitsPerSample - Bits per sample (usually 16)
 * @returns Buffer containing MP3 data
 */
function encodePcmToMp3(
  pcmData: Int16Array,
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number
): Buffer {
  const kbps = 128; // MP3 bitrate
  const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps);

  const mp3Data: Int8Array[] = [];
  const samplesPerFrame = 1152; // Standard MP3 frame size

  // Split PCM into channels
  if (numChannels === 1) {
    // Mono
    for (let i = 0; i < pcmData.length; i += samplesPerFrame) {
      const mono = pcmData.subarray(i, i + samplesPerFrame);
      const mp3buf = mp3encoder.encodeBuffer(mono);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
  } else if (numChannels === 2) {
    // Stereo - deinterleave left and right channels
    const left: number[] = [];
    const right: number[] = [];

    for (let i = 0; i < pcmData.length; i += 2) {
      left.push(pcmData[i]);
      right.push(pcmData[i + 1]);
    }

    // Encode in frames
    for (let i = 0; i < left.length; i += samplesPerFrame) {
      const leftChunk = left.slice(i, i + samplesPerFrame);
      const rightChunk = right.slice(i, i + samplesPerFrame);

      // Convert to Int16Array
      const leftBuf = new Int16Array(leftChunk);
      const rightBuf = new Int16Array(rightChunk);

      const mp3buf = mp3encoder.encodeBuffer(leftBuf, rightBuf);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
  } else {
    throw new Error(`Unsupported number of channels: ${numChannels}`);
  }

  // Flush remaining data
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  // Concatenate all MP3 chunks
  const totalLength = mp3Data.reduce((acc, chunk) => acc + chunk.length, 0);
  const mp3Buffer = Buffer.alloc(totalLength);
  let offset = 0;

  for (const chunk of mp3Data) {
    mp3Buffer.set(chunk, offset);
    offset += chunk.length;
  }

  return mp3Buffer;
}
