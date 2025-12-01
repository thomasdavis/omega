/**
 * Tool Router - Selects relevant tools using BM25 search
 * Combines user message with conversation context for better accuracy
 */

import { searchTools } from './toolRegistry/searchIndex.js';
import { CORE_TOOLS } from './toolRegistry/metadata.js';

/**
 * Configuration
 */
const CONFIG = {
  /** Number of tools to load (excluding core tools) */
  MAX_TOOLS: 20,

  /** Number of recent messages to include in context */
  CONTEXT_MESSAGES: 2,

  /** Whether to log tool selection */
  DEBUG: true
};

/**
 * Select tools for the current conversation
 *
 * @param currentMessage - The user's current message
 * @param recentMessages - Recent conversation history (optional)
 * @returns Array of tool IDs to load
 */
export function selectTools(
  currentMessage: string,
  recentMessages: string[] = []
): string[] {
  // Build search query from current message + context
  const searchQuery = buildSearchQuery(currentMessage, recentMessages);

  // Perform BM25 search
  const rankedTools = searchTools(searchQuery, CONFIG.MAX_TOOLS);

  // Combine core tools + ranked tools
  const selectedTools = [
    ...CORE_TOOLS,
    ...rankedTools.filter(id => !CORE_TOOLS.includes(id))
  ];

  // Deduplicate and limit
  const finalTools = Array.from(new Set(selectedTools)).slice(0, CONFIG.MAX_TOOLS + CORE_TOOLS.length);

  if (CONFIG.DEBUG) {
    console.log(`🎯 Tool Selection:`);
    console.log(`   Core tools: ${CORE_TOOLS.length} (${CORE_TOOLS.join(', ')})`);
    console.log(`   BM25 ranked: ${rankedTools.length}`);
    console.log(`   Final count: ${finalTools.length}`);
    console.log(`   Tools: ${finalTools.join(', ')}`);
  }

  return finalTools;
}

/**
 * Build search query from user message and context
 *
 * Combines:
 * - Current user message (highest weight)
 * - Last N messages from conversation (context)
 */
function buildSearchQuery(currentMessage: string, recentMessages: string[]): string {
  // Current message gets full weight
  let query = currentMessage;

  // Add recent context messages with lower weight
  if (recentMessages.length > 0) {
    const context = recentMessages
      .slice(-CONFIG.CONTEXT_MESSAGES) // Take last N messages
      .join(' ');

    // Weight current message 2x more than context
    query = `${currentMessage} ${currentMessage} ${context}`;
  }

  return query;
}
