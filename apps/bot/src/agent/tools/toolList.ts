/**
 * Tool List Tool - Returns a list of all available tools dynamically
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getRegisteredTools } from './registry.js';

export const toolListTool = tool({
  description: 'Returns a full list of all available tools with their names and descriptions. Use this to discover what capabilities Omega has.',

  inputSchema: z.object({}),

  execute: async () => {
    console.log('📋 Listing all registered tools...');

    const registeredTools = getRegisteredTools();

    const tools = Object.keys(registeredTools).map(name => ({
      name,
      description: registeredTools[name].description || 'No description available',
    }));

    console.log(`✅ Found ${tools.length} registered tools`);

    return {
      success: true,
      count: tools.length,
      tools: tools.sort((a, b) => a.name.localeCompare(b.name)), // Sort alphabetically
    };
  },
});
