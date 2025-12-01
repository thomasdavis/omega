/**
 * List Tools - Show available AI tools
 * Returns a list of all available tools with descriptions and categories
 */

import { tool } from 'ai';
import { z } from 'zod';
import { TOOL_METADATA, CORE_TOOLS } from '../toolRegistry/metadata.js';

export const listToolsTool = tool({
  description: `List all available AI tools with their descriptions and capabilities.

Use this when:
- User asks "what can you do?"
- User wants to know available tools
- User asks "what tools do you have?"
- User wants to see capabilities by category

Examples:
- "What tools are available?"
- "Show me all database tools"
- "What can you do?"
- "List your capabilities"`,

  inputSchema: z.object({
    category: z.enum(['development', 'content', 'database', 'github', 'file', 'research', 'admin', 'specialized']).optional().describe('Filter tools by category (optional)'),
    search: z.string().optional().describe('Search tools by keyword (optional)'),
    showExamples: z.boolean().optional().default(false).describe('Include example usage queries'),
    coreOnly: z.boolean().optional().default(false).describe('Show only core tools'),
  }),

  execute: async ({ category, search, showExamples, coreOnly }) => {
    try {
      console.log(`🔧 Listing tools - Category: ${category || 'all'}, Search: ${search || 'none'}, Core only: ${coreOnly}`);

      // Filter tools
      let filteredTools = TOOL_METADATA;

      if (coreOnly) {
        filteredTools = filteredTools.filter(tool => CORE_TOOLS.includes(tool.id));
      }

      if (category) {
        filteredTools = filteredTools.filter(tool => tool.category === category);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        filteredTools = filteredTools.filter(tool =>
          tool.name.toLowerCase().includes(searchLower) ||
          tool.description.toLowerCase().includes(searchLower) ||
          tool.keywords.some(k => k.toLowerCase().includes(searchLower)) ||
          tool.tags.some(t => t.toLowerCase().includes(searchLower))
        );
      }

      // Sort: core tools first, then alphabetically
      const sortedTools = filteredTools.sort((a, b) => {
        const aIsCore = CORE_TOOLS.includes(a.id);
        const bIsCore = CORE_TOOLS.includes(b.id);

        if (aIsCore && !bIsCore) return -1;
        if (!aIsCore && bIsCore) return 1;
        return a.name.localeCompare(b.name);
      });

      // Group by category
      const toolsByCategory = sortedTools.reduce((acc, tool) => {
        if (!acc[tool.category]) {
          acc[tool.category] = [];
        }
        acc[tool.category].push(tool);
        return acc;
      }, {} as Record<string, typeof sortedTools>);

      // Build formatted response
      let response = '';

      // Summary stats
      response += `📊 **Tool Summary**\n`;
      response += `Total tools: ${TOOL_METADATA.length}\n`;
      response += `Core tools: ${CORE_TOOLS.length}\n`;
      response += `Filtered results: ${sortedTools.length}\n`;
      response += `Categories: ${Object.keys(toolsByCategory).length}\n\n`;

      // List by category
      for (const [cat, tools] of Object.entries(toolsByCategory).sort()) {
        response += `\n## ${cat.toUpperCase()} (${tools.length} tools)\n\n`;

        for (const tool of tools) {
          const isCore = CORE_TOOLS.includes(tool.id);
          response += `### ${tool.name}${isCore ? ' ⭐ CORE' : ''}\n`;
          response += `${tool.description}\n`;
          response += `**Tags:** ${tool.tags.join(', ')}\n`;
          response += `**Keywords:** ${tool.keywords.join(', ')}\n`;

          if (showExamples) {
            response += `**Example queries:**\n`;
            tool.examples.forEach(ex => {
              response += `  - "${ex}"\n`;
            });
          }

          response += `\n`;
        }
      }

      // Add footer with link
      response += `\n---\n`;
      response += `🌐 **View interactive tool browser:** /api/tools\n`;
      response += `💡 **Tip:** Use category or search parameters to filter tools!\n`;

      console.log(`✅ Listed ${sortedTools.length} tools`);

      return {
        success: true,
        totalTools: TOOL_METADATA.length,
        coreTools: CORE_TOOLS.length,
        filteredCount: sortedTools.length,
        categories: Object.keys(toolsByCategory),
        response,
      };
    } catch (error) {
      console.error('❌ Failed to list tools:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list tools',
      };
    }
  },
});
