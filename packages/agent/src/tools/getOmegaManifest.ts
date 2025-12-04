/**
 * Get Omega Manifest Tool
 * Returns Omega's JSON Agents (PAM - Portable Agent Manifest) configuration
 * This allows users and developers to query Omega's capabilities in the standard JSON Agents format
 * Reference: https://jsonagents.org/
 */

import { tool } from 'ai';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load Omega's manifest from the manifest file
 */
async function loadOmegaManifest() {
  try {
    // Path to manifest file relative to this tool file
    // In development: tools/ -> agent/ -> src/ -> apps/bot/ -> omega-manifest.json
    // In production (dist): tools/ -> agent/ -> dist/ -> omega-manifest.json
    // We try the production path first (dist root), then fall back to dev path
    const distPath = join(__dirname, '..', '..', 'omega-manifest.json');
    const devPath = join(__dirname, '..', '..', '..', 'omega-manifest.json');

    // Try production path first (when running from dist/)
    try {
      const manifestContent = await readFile(distPath, 'utf-8');
      return JSON.parse(manifestContent);
    } catch (distError) {
      // Fall back to development path (when running from src/ with tsx)
      const manifestContent = await readFile(devPath, 'utf-8');
      return JSON.parse(manifestContent);
    }
  } catch (error) {
    throw new Error(`Failed to load Omega manifest: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Export tool for Vercel AI SDK
 */
export const getOmegaManifestTool = tool({
  description: `Fetch Omega's JSON Agents (PAM - Portable Agent Manifest) configuration.
  This returns Omega's full agent manifest in the standard JSONAgents.org format,
  including all capabilities, tools, personality configuration, and metadata.
  Useful for understanding Omega's features, integrating with other systems,
  or inspecting the agent's portable configuration.`,

  inputSchema: z.object({
    format: z.enum(['full', 'summary']).optional().default('full').describe(
      'Return format: "full" for complete manifest, "summary" for key highlights'
    ),
  }),

  execute: async (params) => {
    try {
      const manifest = await loadOmegaManifest();

      if (params.format === 'summary') {
        // Return a summary view with key information
        return {
          success: true,
          format: 'summary',
          summary: {
            name: manifest.agent.name,
            version: manifest.agent.version,
            description: manifest.agent.description,
            author: manifest.agent.author,
            homepage: manifest.agent.homepage,
            toolCount: manifest.tools?.length || 0,
            capabilityCount: manifest.capabilities?.length || 0,
            model: manifest.configuration?.model,
            personality: manifest.personality?.tone,
            platform: manifest.metadata?.platform,
            deployment: manifest.metadata?.deployment,
            supportedLanguages: languageCount,
          },
          capabilities: manifest.capabilities?.map((cap: any) => cap.name) || [],
          tools: manifest.tools?.map((tool: any) => tool.name) || [],
        };
      }

      // Return full manifest
      return {
        success: true,
        format: 'full',
        manifest,
        jsonString: JSON.stringify(manifest, null, 2),
        specificationUrl: 'https://jsonagents.org/',
        languageCount,
        languages: languageList,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});
