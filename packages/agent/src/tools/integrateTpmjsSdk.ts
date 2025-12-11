/**
 * TPMJS SDK Integration Tool
 * Fetches and integrates tools from the TPMJS SDK into Omega
 */

import { tool } from 'ai';
import { z } from 'zod';

export const integrateTpmjsSdkTool = tool({
  description: 'Fetch and integrate tools from the TPMJS SDK (https://tpmjs.com/sdk). This tool reads the SDK documentation, parses available tools, and prepares them for integration into Omega\'s tool system.',
  inputSchema: z.object({
    sdkUrl: z.string().url().default('https://tpmjs.com/sdk').describe('The TPMJS SDK documentation URL'),
    mode: z.enum(['fetch', 'analyze', 'integrate']).default('fetch').describe('Mode: "fetch" retrieves SDK docs, "analyze" parses tool definitions, "integrate" adds tools to Omega'),
  }),
  execute: async ({ sdkUrl, mode }) => {
    console.log(`🔧 TPMJS SDK Integration - Mode: ${mode}`);
    console.log(`📡 SDK URL: ${sdkUrl}`);

    try {
      if (mode === 'fetch') {
        // Fetch the SDK documentation
        console.log(`🌐 Fetching TPMJS SDK documentation...`);

        const response = await fetch(sdkUrl, {
          headers: {
            'User-Agent': 'OmegaBot/1.0 (TPMJS SDK Integration)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(15000), // 15 second timeout
        });

        if (!response.ok) {
          return {
            success: false,
            error: 'fetch_failed',
            message: `Failed to fetch SDK documentation: ${response.status} ${response.statusText}`,
            statusCode: response.status,
          };
        }

        const contentType = response.headers.get('content-type') || '';
        const content = await response.text();

        console.log(`✅ Successfully fetched SDK documentation (${content.length} characters)`);

        return {
          success: true,
          mode: 'fetch',
          content,
          contentType,
          contentLength: content.length,
          url: sdkUrl,
          message: 'Successfully fetched TPMJS SDK documentation. Use mode "analyze" to parse available tools.',
        };
      }

      if (mode === 'analyze') {
        // Fetch and analyze the SDK documentation
        console.log(`🔍 Analyzing TPMJS SDK documentation...`);

        const response = await fetch(sdkUrl, {
          headers: {
            'User-Agent': 'OmegaBot/1.0 (TPMJS SDK Integration)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          return {
            success: false,
            error: 'fetch_failed',
            message: `Failed to fetch SDK documentation: ${response.status} ${response.statusText}`,
          };
        }

        const content = await response.text();

        // Parse the content to extract tool information
        // This is a basic parser - will be enhanced based on actual SDK structure
        const tools = parseToolsFromContent(content);

        console.log(`✅ Parsed ${tools.length} tools from SDK documentation`);

        return {
          success: true,
          mode: 'analyze',
          toolCount: tools.length,
          tools,
          url: sdkUrl,
          message: `Successfully analyzed TPMJS SDK. Found ${tools.length} tool(s). Use mode "integrate" to add them to Omega.`,
        };
      }

      if (mode === 'integrate') {
        // Fetch, analyze, and prepare integration
        console.log(`🔗 Integrating TPMJS SDK tools into Omega...`);

        const response = await fetch(sdkUrl, {
          headers: {
            'User-Agent': 'OmegaBot/1.0 (TPMJS SDK Integration)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          return {
            success: false,
            error: 'fetch_failed',
            message: `Failed to fetch SDK documentation: ${response.status} ${response.statusText}`,
          };
        }

        const content = await response.text();
        const tools = parseToolsFromContent(content);

        // Store tool metadata in database for autonomous tool system
        const integrationPlan = generateIntegrationPlan(tools);

        console.log(`✅ Generated integration plan for ${tools.length} tools`);

        return {
          success: true,
          mode: 'integrate',
          toolCount: tools.length,
          tools,
          integrationPlan,
          url: sdkUrl,
          message: `Integration plan generated for ${tools.length} TPMJS SDK tool(s). Ready for implementation.`,
          nextSteps: [
            'Review the integration plan',
            'Create tool implementations in packages/agent/src/tools/tpmjs/',
            'Register tools in toolLoader.ts',
            'Add metadata to toolRegistry/metadata.ts',
            'Test tool functionality',
          ],
        };
      }

      return {
        success: false,
        error: 'invalid_mode',
        message: `Invalid mode: ${mode}. Use "fetch", "analyze", or "integrate".`,
      };

    } catch (error) {
      console.error(`❌ Error in TPMJS SDK integration:`, error);
      return {
        success: false,
        error: 'exception',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url: sdkUrl,
      };
    }
  },
});

/**
 * Parse tools from SDK documentation content
 * This is a basic implementation that will be enhanced based on actual SDK structure
 */
function parseToolsFromContent(content: string): Array<{
  name: string;
  description: string;
  category?: string;
  parameters?: Array<{ name: string; type: string; description: string }>;
  examples?: string[];
}> {
  const tools: Array<{
    name: string;
    description: string;
    category?: string;
    parameters?: Array<{ name: string; type: string; description: string }>;
    examples?: string[];
  }> = [];

  // Basic parsing logic - will be enhanced based on actual SDK structure
  // This looks for common patterns in SDK documentation

  // Pattern 1: Look for tool sections in HTML
  const toolSectionRegex = /<(?:div|section)[^>]*(?:class|id)="tool[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/gi;
  const toolMatches = content.matchAll(toolSectionRegex);

  for (const match of toolMatches) {
    const sectionContent = match[1];

    // Extract tool name
    const nameMatch = sectionContent.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown Tool';

    // Extract description
    const descMatch = sectionContent.match(/<p[^>]*>(.*?)<\/p>/i);
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : 'No description available';

    tools.push({
      name,
      description,
      category: 'tpmjs',
    });
  }

  // Pattern 2: Look for JSON-LD structured data
  const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  const jsonMatches = content.matchAll(jsonLdRegex);

  for (const match of jsonMatches) {
    try {
      const jsonData = JSON.parse(match[1]);
      if (jsonData.tools && Array.isArray(jsonData.tools)) {
        tools.push(...jsonData.tools.map((tool: any) => ({
          name: tool.name || 'Unknown Tool',
          description: tool.description || 'No description',
          category: tool.category || 'tpmjs',
          parameters: tool.parameters,
          examples: tool.examples,
        })));
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  // Pattern 3: Look for code blocks with tool definitions
  const codeBlockRegex = /```(?:json|javascript|typescript)?\s*([\s\S]*?)```/gi;
  const codeMatches = content.matchAll(codeBlockRegex);

  for (const match of codeMatches) {
    try {
      const code = match[1].trim();
      // Try to parse as JSON
      if (code.startsWith('{') || code.startsWith('[')) {
        const jsonData = JSON.parse(code);
        if (jsonData.name && jsonData.description) {
          tools.push({
            name: jsonData.name,
            description: jsonData.description,
            category: jsonData.category || 'tpmjs',
            parameters: jsonData.parameters,
            examples: jsonData.examples,
          });
        }
      }
    } catch (e) {
      // Not valid JSON, skip
    }
  }

  // If no tools found, extract the full content for manual review
  if (tools.length === 0) {
    // Return the raw content summary
    const summary = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000);

    tools.push({
      name: 'TPMJS SDK Content',
      description: `Raw content from SDK (requires manual parsing): ${summary}${summary.length >= 2000 ? '...' : ''}`,
      category: 'tpmjs-raw',
    });
  }

  return tools;
}

/**
 * Generate integration plan for parsed tools
 */
function generateIntegrationPlan(tools: Array<{
  name: string;
  description: string;
  category?: string;
  parameters?: Array<{ name: string; type: string; description: string }>;
  examples?: string[];
}>) {
  return {
    steps: [
      {
        step: 1,
        action: 'Create tool directory',
        path: 'packages/agent/src/tools/tpmjs/',
        description: 'Create a dedicated directory for TPMJS SDK tools',
      },
      {
        step: 2,
        action: 'Implement tool files',
        files: tools.map(tool => ({
          name: tool.name,
          path: `packages/agent/src/tools/tpmjs/${toCamelCase(tool.name)}.ts`,
          description: tool.description,
          parameters: tool.parameters || [],
        })),
        description: `Create ${tools.length} tool implementation files`,
      },
      {
        step: 3,
        action: 'Register in toolLoader.ts',
        path: 'packages/agent/src/toolLoader.ts',
        description: 'Add tool entries to TOOL_IMPORT_MAP',
        entries: tools.map(tool => ({
          id: toCamelCase(tool.name),
          path: `./tools/tpmjs/${toCamelCase(tool.name)}.js`,
          exportName: `${toCamelCase(tool.name)}Tool`,
        })),
      },
      {
        step: 4,
        action: 'Add metadata to registry',
        path: 'packages/agent/src/toolRegistry/metadata.ts',
        description: 'Add tool metadata for BM25 search',
        entries: tools.map(tool => ({
          id: toCamelCase(tool.name),
          name: tool.name,
          description: tool.description,
          category: tool.category || 'tpmjs',
          keywords: extractKeywords(tool.description),
          tags: ['tpmjs', 'sdk', tool.category || 'specialized'],
          examples: tool.examples || [],
          isCore: false,
        })),
      },
      {
        step: 5,
        action: 'Create database schema',
        path: 'packages/database/scripts/create-tpmjs-integration-table.sh',
        description: 'Create table to track TPMJS SDK tool usage and metadata',
        sql: `
CREATE TABLE IF NOT EXISTS tpmjs_sdk_tools (
  id TEXT PRIMARY KEY,
  tool_name TEXT NOT NULL,
  tool_description TEXT,
  sdk_version TEXT,
  parameters JSONB,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tpmjs_sdk_tools_enabled ON tpmjs_sdk_tools(is_enabled);
CREATE INDEX IF NOT EXISTS idx_tpmjs_sdk_tools_usage ON tpmjs_sdk_tools(usage_count DESC);
        `.trim(),
      },
    ],
    summary: `Integration plan for ${tools.length} TPMJS SDK tools`,
    estimatedFiles: tools.length + 3, // tool files + loader + metadata + migration
  };
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, chr => chr.toLowerCase());
}

/**
 * Extract keywords from description
 */
function extractKeywords(description: string): string[] {
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);

  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word))
    .slice(0, 10);
}
