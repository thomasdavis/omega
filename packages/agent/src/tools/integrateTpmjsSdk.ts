/**
 * TPMJS SDK Integration Tool
 * Fetches and integrates tools from the TPMJS registry into Omega.
 * Uses the TPMJS API with proper authentication and llms.txt spec parsing.
 *
 * API Reference: https://tpmjs.com/llms.txt
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  fetchTpmjsSpec,
  searchTpmjsRegistry,
  validateTpmjsApiKey,
  hasTpmjsApiKey,
  listTpmjsCategories,
} from './tpmjsApiClient.js';
import type { TpmjsToolMetadata } from './tpmjsApiClient.js';

export const integrateTpmjsSdkTool = tool({
  description:
    'Fetch and integrate tools from the TPMJS SDK (https://tpmjs.com). This tool reads the llms.txt specification, discovers available tools via the TPMJS API, and prepares them for integration into Omega\'s tool system. Supports modes: "fetch" retrieves the spec, "analyze" discovers tools, "integrate" generates an integration plan, "validate" checks API key.',
  inputSchema: z.object({
    sdkUrl: z
      .string()
      .url()
      .default('https://tpmjs.com/llms.txt')
      .describe('The TPMJS SDK documentation URL (default: https://tpmjs.com/llms.txt)'),
    mode: z
      .enum(['fetch', 'analyze', 'integrate', 'validate'])
      .default('fetch')
      .describe(
        'Mode: "fetch" retrieves llms.txt spec, "analyze" discovers tools via API, "integrate" generates integration plan, "validate" checks API key'
      ),
    category: z
      .string()
      .optional()
      .describe('Optional category to filter tools when analyzing'),
    searchQuery: z
      .string()
      .optional()
      .describe('Optional search query to find specific tools when analyzing'),
  }),
  execute: async ({
    sdkUrl,
    mode,
    category,
    searchQuery,
  }: {
    sdkUrl: string;
    mode: string;
    category?: string;
    searchQuery?: string;
  }) => {
    console.log(`🔧 TPMJS SDK Integration - Mode: ${mode}`);
    const hasApiKey = hasTpmjsApiKey();

    try {
      if (mode === 'validate') {
        console.log('🔑 Validating TPMJS API key...');
        const validation = await validateTpmjsApiKey();
        return {
          success: validation.valid,
          mode: 'validate',
          authenticated: hasApiKey,
          ...validation,
        };
      }

      if (mode === 'fetch') {
        console.log(`🌐 Fetching TPMJS spec from ${sdkUrl}...`);

        const specResult = await fetchTpmjsSpec();

        if (specResult.error && !specResult.rawContent) {
          // Fallback: try fetching the URL directly
          console.log('⚠️  API client failed, trying direct fetch...');
          try {
            const response = await fetch(sdkUrl, {
              headers: {
                'User-Agent': 'OmegaBot/1.0 (TPMJS SDK Integration)',
                Accept: 'text/plain,text/html,application/json,*/*',
                ...(hasApiKey
                  ? {
                      Authorization: `Bearer ${process.env.TPMJS_API_KEY}`,
                      'X-API-Key': process.env.TPMJS_API_KEY!,
                    }
                  : {}),
              },
              signal: AbortSignal.timeout(15000),
            });

            if (!response.ok) {
              return {
                success: false,
                mode: 'fetch',
                authenticated: hasApiKey,
                error: 'fetch_failed',
                message: `Failed to fetch SDK documentation: ${response.status} ${response.statusText}`,
                statusCode: response.status,
              };
            }

            const content = await response.text();
            console.log(`✅ Fetched SDK documentation (${content.length} characters)`);

            return {
              success: true,
              mode: 'fetch',
              authenticated: hasApiKey,
              content,
              contentLength: content.length,
              url: sdkUrl,
              message:
                'Successfully fetched TPMJS SDK documentation. Use mode "analyze" to discover available tools.',
            };
          } catch (fetchError) {
            return {
              success: false,
              mode: 'fetch',
              authenticated: hasApiKey,
              error: 'fetch_failed',
              message: `Failed to fetch SDK documentation: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
            };
          }
        }

        console.log(`✅ Fetched TPMJS spec`);
        return {
          success: true,
          mode: 'fetch',
          authenticated: hasApiKey,
          spec: specResult.spec,
          rawContentLength: specResult.rawContent?.length || 0,
          url: sdkUrl,
          message:
            'Successfully fetched TPMJS specification. Use mode "analyze" to discover available tools.',
        };
      }

      if (mode === 'analyze') {
        console.log('🔍 Analyzing TPMJS registry for available tools...');

        const tools: TpmjsToolMetadata[] = [];

        // Search via API
        const query = searchQuery || category || 'tool';
        const searchResult = await searchTpmjsRegistry(query, {
          category,
          limit: 50,
        });

        if (searchResult.results.length > 0) {
          tools.push(
            ...searchResult.results.map(r => ({
              toolId: r.toolId || `${r.package}::${r.exportName}`,
              name: r.name,
              description: r.description,
              package: r.package,
              exportName: r.exportName,
              version: r.version || '',
              category: r.category,
              keywords: r.keywords,
            }))
          );
        }

        // Also try to parse llms.txt for additional info
        const specResult = await fetchTpmjsSpec();
        if (specResult.spec && specResult.spec.tools.length > 0) {
          for (const specTool of specResult.spec.tools) {
            if (!tools.find(t => t.toolId === specTool.toolId)) {
              tools.push(specTool);
            }
          }
        }

        // Get available categories
        const categoriesResult = await listTpmjsCategories();

        console.log(`✅ Discovered ${tools.length} tools`);

        return {
          success: true,
          mode: 'analyze',
          authenticated: hasApiKey,
          toolCount: tools.length,
          tools: tools.map(t => ({
            toolId: t.toolId,
            name: t.name,
            description: t.description,
            package: t.package,
            exportName: t.exportName,
            category: t.category,
            keywords: t.keywords,
          })),
          categories: categoriesResult.categories,
          searchQuery: searchQuery || null,
          categoryFilter: category || null,
          url: sdkUrl,
          message: `Discovered ${tools.length} tool(s) from TPMJS registry. Use mode "integrate" to generate an integration plan.`,
        };
      }

      if (mode === 'integrate') {
        console.log('🔗 Generating integration plan for TPMJS tools...');

        // Discover tools first
        const query = searchQuery || category || 'tool';
        const searchResult = await searchTpmjsRegistry(query, {
          category,
          limit: 50,
        });

        const tools = searchResult.results.map(r => ({
          toolId: r.toolId || `${r.package}::${r.exportName}`,
          name: r.name,
          description: r.description,
          package: r.package,
          exportName: r.exportName,
          category: r.category,
          keywords: r.keywords,
          parameters: r.parameters,
        }));

        const integrationPlan = generateIntegrationPlan(tools);

        console.log(`✅ Generated integration plan for ${tools.length} tools`);

        return {
          success: true,
          mode: 'integrate',
          authenticated: hasApiKey,
          toolCount: tools.length,
          tools: tools.map(t => ({
            toolId: t.toolId,
            name: t.name,
            description: t.description,
            category: t.category,
          })),
          integrationPlan,
          url: sdkUrl,
          message: `Integration plan generated for ${tools.length} TPMJS tool(s). Review and implement the plan.`,
          nextSteps: [
            'Review the integration plan',
            'Tools can be executed directly via tpmjsRegistryExecute without integration',
            'For permanent integration, create tool implementations in packages/agent/src/tools/',
            'Register tools in toolLoader.ts and add metadata to toolRegistry/metadata.ts',
          ],
        };
      }

      return {
        success: false,
        error: 'invalid_mode',
        message: `Invalid mode: ${mode}. Use "fetch", "analyze", "integrate", or "validate".`,
      };
    } catch (error) {
      console.error('❌ Error in TPMJS SDK integration:', error);
      return {
        success: false,
        authenticated: hasApiKey,
        error: 'exception',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url: sdkUrl,
      };
    }
  },
});

/**
 * Generate an integration plan for discovered tools
 */
function generateIntegrationPlan(
  tools: Array<{
    toolId: string;
    name: string;
    description: string;
    package?: string;
    exportName?: string;
    category?: string;
    keywords?: string[];
    parameters?: Array<{ name: string; type: string; description: string }>;
  }>
) {
  return {
    steps: [
      {
        step: 1,
        action: 'Direct execution (no integration needed)',
        description:
          'All discovered tools can be executed immediately via tpmjsRegistryExecute without any code changes',
        example: {
          tool: 'tpmjsRegistryExecute',
          args: {
            toolId: tools[0]?.toolId || 'package::exportName',
            params: {},
          },
        },
      },
      {
        step: 2,
        action: 'Optional: Register as native tools',
        description: `Create ${tools.length} tool wrapper files for direct access without tpmjsRegistryExecute`,
        files: tools.slice(0, 10).map(t => ({
          name: t.name,
          toolId: t.toolId,
          path: `packages/agent/src/tools/tpmjs/${toCamelCase(t.name)}.ts`,
          description: t.description,
        })),
      },
      {
        step: 3,
        action: 'Optional: Add to toolLoader.ts',
        description: 'Register tool entries in TOOL_IMPORT_MAP for the tool loader',
        entries: tools.slice(0, 10).map(t => ({
          id: toCamelCase(t.name),
          path: `./tools/tpmjs/${toCamelCase(t.name)}.js`,
          exportName: `${toCamelCase(t.name)}Tool`,
        })),
      },
      {
        step: 4,
        action: 'Optional: Add metadata to registry',
        description: 'Add tool metadata for BM25 search routing',
        path: 'packages/agent/src/toolRegistry/metadata.ts',
      },
    ],
    summary: `Integration plan for ${tools.length} TPMJS tools. Step 1 works immediately; steps 2-4 are optional for tighter integration.`,
  };
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase())
    .replace(/^[A-Z]/, chr => chr.toLowerCase());
}
