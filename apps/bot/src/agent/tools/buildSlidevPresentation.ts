/**
 * Build Slidev Presentation Tool - Converts Slidev markdown to static HTML presentation
 * Uses @slidev/cli to build a fully self-contained HTML/CSS/JS presentation
 */

import { tool } from 'ai';
import { z } from 'zod';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getArtifactsDir } from '../../utils/storage.js';

const execAsync = promisify(exec);
const ARTIFACTS_DIR = getArtifactsDir();

// Artifact metadata interface
interface ArtifactMetadata {
  id: string;
  type: string;
  artifactType: 'file' | 'folder';
  title: string;
  description: string;
  createdAt: string;
  filename?: string;  // For file-type artifacts
  folderPath?: string; // For folder-type artifacts
  sourceArtifactId?: string; // Reference to source markdown artifact
}

/**
 * Save folder artifact metadata
 */
function saveFolderArtifact(
  folderPath: string,
  title: string,
  description: string,
  sourceArtifactId?: string
): ArtifactMetadata {
  const id = randomUUID();

  const metadata: ArtifactMetadata = {
    id,
    type: 'slidev-html',
    artifactType: 'folder',
    title,
    description,
    createdAt: new Date().toISOString(),
    folderPath,
    sourceArtifactId,
  };

  const metadataPath = join(ARTIFACTS_DIR, `${id}.json`);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return metadata;
}

/**
 * Copy directory recursively (simple implementation)
 */
function copyDir(src: string, dest: string): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      const content = readFileSync(srcPath);
      writeFileSync(destPath, content);
    }
  }
}

export const buildSlidevPresentationTool = tool({
  description: 'Build a Slidev markdown presentation into a static HTML/CSS/JS bundle that can be viewed in a browser. Takes a Slidev artifact ID or raw markdown content and outputs a self-contained presentation. Perfect for sharing presentations as standalone websites. Returns a URL to view the live presentation.',
  inputSchema: z.object({
    artifactId: z.string().uuid().optional().describe('UUID of existing Slidev markdown artifact to build'),
    markdownContent: z.string().optional().describe('Raw Slidev markdown content to build (if no artifactId provided)'),
    title: z.string().default('Slidev Presentation').describe('Title for the built presentation'),
    base: z.string().default('/').describe('Base URL for the presentation (default: /)'),
  }),
  execute: async ({ artifactId, markdownContent, title, base }) => {
    try {
      console.log('🏗️  Building Slidev presentation...');

      // Validate input
      if (!artifactId && !markdownContent) {
        return {
          success: false,
          error: 'missing_input',
          message: 'Either artifactId or markdownContent must be provided',
        };
      }

      // Get or create the Slidev markdown
      let slidevMarkdown: string;
      let sourceArtifactId: string | undefined;

      if (artifactId) {
        console.log(`📥 Loading artifact ${artifactId}...`);

        // Load the artifact metadata
        const metadataPath = join(ARTIFACTS_DIR, `${artifactId}.json`);
        if (!existsSync(metadataPath)) {
          return {
            success: false,
            error: 'artifact_not_found',
            message: `Artifact ${artifactId} not found`,
          };
        }

        const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));

        // Verify it's a Slidev artifact
        if (metadata.type !== 'slidev') {
          return {
            success: false,
            error: 'invalid_artifact_type',
            message: `Artifact ${artifactId} is type "${metadata.type}", expected "slidev"`,
          };
        }

        // Read the markdown content
        const artifactPath = join(ARTIFACTS_DIR, metadata.filename);
        if (!existsSync(artifactPath)) {
          return {
            success: false,
            error: 'artifact_file_not_found',
            message: `Artifact file not found: ${metadata.filename}`,
          };
        }

        slidevMarkdown = readFileSync(artifactPath, 'utf-8');
        sourceArtifactId = artifactId;

        // Use the artifact title if no custom title provided
        if (title === 'Slidev Presentation') {
          title = metadata.title;
        }
      } else {
        slidevMarkdown = markdownContent!;
      }

      // Create a temporary directory for building
      const tempId = randomUUID();
      const tempDir = join(ARTIFACTS_DIR, `temp-${tempId}`);
      mkdirSync(tempDir, { recursive: true });

      // Write the Slidev markdown to the temp directory
      const slidesPath = join(tempDir, 'slides.md');
      writeFileSync(slidesPath, slidevMarkdown, 'utf-8');

      console.log(`📝 Created temporary slides at ${slidesPath}`);

      // Create output directory for the build
      const outputId = randomUUID();
      const outputDir = join(ARTIFACTS_DIR, outputId);
      mkdirSync(outputDir, { recursive: true });

      console.log(`🔨 Building with Slidev CLI...`);
      console.log(`   Input: ${tempDir}`);
      console.log(`   Output: ${outputDir}`);
      console.log(`   Base: ${base}`);

      try {
        // Run slidev build
        // Note: We need to be in the directory with slides.md for slidev to work
        const buildCommand = `cd "${tempDir}" && npx slidev build --base "${base}" --out "${outputDir}"`;

        const { stdout, stderr } = await execAsync(buildCommand, {
          timeout: 120000, // 2 minute timeout
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });

        console.log('✅ Slidev build completed');
        if (stdout) console.log('   stdout:', stdout.substring(0, 500));
        if (stderr) console.log('   stderr:', stderr.substring(0, 500));

      } catch (execError: any) {
        console.error('❌ Slidev build failed:', execError);
        return {
          success: false,
          error: 'build_failed',
          message: `Slidev build failed: ${execError.message}`,
          stdout: execError.stdout?.substring(0, 1000),
          stderr: execError.stderr?.substring(0, 1000),
        };
      }

      // Verify the build output exists
      const indexPath = join(outputDir, 'index.html');
      if (!existsSync(indexPath)) {
        return {
          success: false,
          error: 'build_output_missing',
          message: 'Build completed but index.html not found in output directory',
        };
      }

      console.log('✅ Build output verified');

      // Save the folder artifact metadata
      const description = sourceArtifactId
        ? `Built HTML presentation from Slidev artifact ${sourceArtifactId}`
        : 'Built HTML presentation from markdown content';

      const metadata = saveFolderArtifact(
        outputId,
        title,
        description,
        sourceArtifactId
      );

      // Get server URL from environment
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      const artifactUrl = `${serverUrl}/artifacts/${metadata.id}`;

      console.log(`📦 Saved built presentation: ${artifactUrl}`);

      // Count files in the build output
      const countFiles = (dir: string): number => {
        let count = 0;
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            count += countFiles(join(dir, entry.name));
          } else {
            count++;
          }
        }
        return count;
      };

      const fileCount = countFiles(outputDir);

      return {
        success: true,
        message: `Successfully built Slidev presentation with ${fileCount} files`,
        artifactId: metadata.id,
        artifactUrl,
        viewUrl: artifactUrl, // Same as artifactUrl for folder artifacts
        fileCount,
        title,
        outputDirectory: outputId,
      };
    } catch (error) {
      console.error('❌ Error building Slidev presentation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Build failed',
        message: 'Failed to build Slidev presentation. Check the markdown syntax and try again.',
      };
    }
  },
});
