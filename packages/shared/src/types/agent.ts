/**
 * Agent-related types
 */

export interface AgentResponse {
  text: string;
  toolCalls: ToolCall[];
  steps: number;
}

export interface ToolCall {
  toolName: string;
  args: Record<string, any>;
  result?: any;
}

export interface AgentContext {
  userId: string;
  username: string;
  channelName?: string;
  channelId?: string;
  guildId?: string;
  messageHistory?: any[];
  attachmentContext?: string;
}
