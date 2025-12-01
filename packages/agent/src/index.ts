/**
 * @repo/agent - AI Agent Package
 * Complete agent system with tools, orchestration, and dependencies
 */

// Agent orchestration
export { runAgent } from './agent.js';
export { selectTools } from './toolRouter.js';
export { loadTools, preloadCoreTools } from './toolLoader.js';

// Tool metadata
export { TOOL_METADATA, CORE_TOOLS } from './toolRegistry/metadata.js';

// Tool context setters
export { setExportMessageContext, clearExportMessageContext } from './tools/exportConversation.js';
export { setConversationDiagramContext, clearConversationDiagramContext } from './tools/conversationDiagram.js';
export { setSlidevMessageContext, clearSlidevMessageContext } from './tools/conversationToSlidev.js';
export { setUnsandboxMessageContext, clearUnsandboxMessageContext } from './tools/unsandbox.js';

// Services (re-export for bot to use)
export * from './services/userProfileAnalysis.js';
export * from './services/geminiImageService.js';
export * from './services/discordWebhookService.js';

export const AGENT_PACKAGE_VERSION = '1.0.0';
