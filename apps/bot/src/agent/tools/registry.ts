/**
 * Tools Registry - Central registry for all available tools
 * This allows tools to introspect and list all available capabilities
 */

import { CoreTool } from 'ai';

// Registry of all tools - populated by agent.ts
const registeredTools: Record<string, CoreTool> = {};

/**
 * Register a tool in the global registry
 */
export function registerTool(name: string, tool: CoreTool): void {
  registeredTools[name] = tool;
}

/**
 * Get all registered tools
 */
export function getRegisteredTools(): Record<string, CoreTool> {
  return registeredTools;
}

/**
 * Clear all registered tools (mainly for testing)
 */
export function clearRegistry(): void {
  Object.keys(registeredTools).forEach(key => delete registeredTools[key]);
}
