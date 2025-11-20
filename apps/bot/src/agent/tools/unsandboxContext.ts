/**
 * Context for Unsandbox tool to send progress updates to Discord
 * Similar pattern to exportConversation and conversationToSlidev context
 */

import type { Message } from 'discord.js';

let currentMessage: Message | null = null;

export function setUnsandboxMessageContext(message: Message): void {
  currentMessage = message;
}

export function getUnsandboxMessageContext(): Message | null {
  return currentMessage;
}

export function clearUnsandboxMessageContext(): void {
  currentMessage = null;
}
