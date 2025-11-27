/**
 * Conversation Diagram Tool - Generates ASCII diagrams of Discord conversation flows
 * Visualizes who is talking to whom using ASCII art for easy viewing in text channels
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { Message } from 'discord.js';

// Extended message type for diagram generation
interface DiagramMessage {
  username: string;
  content: string;
  timestamp: Date;
  id: string;
  replyToId?: string;
  replyToUsername?: string;
}

// Store the current Discord message context (set by messageHandler)
let currentMessageContext: Message | null = null;

/**
 * Set the current message context for the conversation diagram tool
 */
export function setConversationDiagramContext(message: Message) {
  currentMessageContext = message;
}

/**
 * Clear the message context after agent execution
 */
export function clearConversationDiagramContext() {
  currentMessageContext = null;
}

export const conversationDiagramTool = tool({
  description: 'Generate an ASCII diagram showing conversation flow and interactions between participants in a Discord channel. Shows who is talking to whom using visual ASCII art. Perfect for understanding conversation dynamics, participant roles, and discussion flows.',
  inputSchema: z.object({
    limit: z.number().min(5).max(100).default(20).describe('Number of recent messages to analyze (5-100, default: 20)'),
    style: z.enum(['tree', 'network', 'simple']).default('simple').describe('Diagram style: "tree" (hierarchical), "network" (connections), or "simple" (list with arrows)'),
    showTimestamps: z.boolean().default(false).describe('Include timestamps in the diagram'),
  }),
  execute: async ({ limit, style, showTimestamps }) => {
    try {
      console.log(`📊 Generating conversation diagram (limit: ${limit}, style: ${style})`);

      if (!currentMessageContext) {
        return {
          success: false,
          error: 'no_context',
          message: 'Unable to access Discord channel context. This feature requires active message context.',
        };
      }

      const channel = currentMessageContext.channel;

      // Check if we can fetch messages from this channel
      if (!('messages' in channel)) {
        return {
          success: false,
          error: 'unsupported_channel',
          message: 'Cannot analyze messages from this type of channel.',
        };
      }

      // Fetch messages
      console.log(`📥 Fetching up to ${limit} messages from channel...`);
      const fetchedMessages = await channel.messages.fetch({
        limit,
        before: currentMessageContext.id
      });

      // Convert to array and sort by timestamp (oldest first)
      const messages: DiagramMessage[] = Array.from(fetchedMessages.values())
        .map(msg => {
          const replyTo = msg.reference?.messageId;
          let replyToUsername: string | undefined;

          // Try to find the username of the message being replied to
          if (replyTo) {
            const replyTarget = fetchedMessages.get(replyTo);
            replyToUsername = replyTarget?.author.username;
          }

          return {
            username: msg.author.username,
            content: msg.content.substring(0, 50), // First 50 chars for context
            timestamp: msg.createdAt,
            id: msg.id,
            replyToId: replyTo,
            replyToUsername,
          };
        })
        .reverse();

      if (messages.length === 0) {
        return {
          success: false,
          error: 'no_messages',
          message: 'No messages found to analyze.',
        };
      }

      // Generate the diagram based on style
      let diagram: string;
      switch (style) {
        case 'tree':
          diagram = generateTreeDiagram(messages, showTimestamps);
          break;
        case 'network':
          diagram = generateNetworkDiagram(messages);
          break;
        case 'simple':
        default:
          diagram = generateSimpleDiagram(messages, showTimestamps);
          break;
      }

      // Count unique participants
      const participants = new Set(messages.map(m => m.username));

      // Count interactions (replies)
      const interactions = messages.filter(m => m.replyToId).length;

      console.log(`✅ Generated ${style} diagram for ${messages.length} messages`);

      return {
        success: true,
        diagram,
        messageCount: messages.length,
        participantCount: participants.size,
        interactionCount: interactions,
        style,
      };
    } catch (error) {
      console.error('❌ Error generating conversation diagram:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Diagram generation failed',
        message: 'Failed to generate conversation diagram. Make sure the bot has permission to read message history.',
      };
    }
  },
});

/**
 * Generate a simple list-style diagram with arrows showing replies
 */
function generateSimpleDiagram(messages: DiagramMessage[], showTimestamps: boolean): string {
  let output = '```\n';
  output += '═══════════════════════════════════════════\n';
  output += '   CONVERSATION FLOW DIAGRAM\n';
  output += '═══════════════════════════════════════════\n\n';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const time = showTimestamps ? `[${msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}] ` : '';

    if (msg.replyToUsername) {
      // Show reply with arrow
      output += `${time}${msg.username} ──→ ${msg.replyToUsername}\n`;
      if (msg.content) {
        output += `    └─ "${msg.content}"\n`;
      }
    } else {
      // Regular message
      output += `${time}${msg.username}\n`;
      if (msg.content) {
        output += `    "${msg.content}"\n`;
      }
    }
    output += '\n';
  }

  output += '```';
  return output;
}

/**
 * Generate a tree-style hierarchical diagram
 */
function generateTreeDiagram(messages: DiagramMessage[], showTimestamps: boolean): string {
  let output = '```\n';
  output += '═══════════════════════════════════════════\n';
  output += '   CONVERSATION TREE\n';
  output += '═══════════════════════════════════════════\n\n';

  // Build a map of message IDs to their children
  const messageMap = new Map<string, DiagramMessage[]>();
  const rootMessages: DiagramMessage[] = [];

  for (const msg of messages) {
    if (msg.replyToId) {
      if (!messageMap.has(msg.replyToId)) {
        messageMap.set(msg.replyToId, []);
      }
      messageMap.get(msg.replyToId)!.push(msg);
    } else {
      rootMessages.push(msg);
    }
  }

  // Recursive function to print tree
  function printTree(msg: DiagramMessage, prefix: string, isLast: boolean) {
    const time = showTimestamps ? `[${msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}] ` : '';
    const connector = isLast ? '└─' : '├─';
    output += `${prefix}${connector} ${time}${msg.username}\n`;

    const children = messageMap.get(msg.id) || [];
    const childPrefix = prefix + (isLast ? '   ' : '│  ');

    children.forEach((child, index) => {
      printTree(child, childPrefix, index === children.length - 1);
    });
  }

  // Print all root messages and their trees
  rootMessages.forEach((msg, index) => {
    printTree(msg, '', index === rootMessages.length - 1);
  });

  output += '\n```';
  return output;
}

/**
 * Generate a network diagram showing connections between users
 */
function generateNetworkDiagram(messages: DiagramMessage[]): string {
  let output = '```\n';
  output += '═══════════════════════════════════════════\n';
  output += '   CONVERSATION NETWORK\n';
  output += '═══════════════════════════════════════════\n\n';

  // Count interactions between users
  const interactions = new Map<string, Map<string, number>>();

  for (const msg of messages) {
    if (msg.replyToUsername) {
      if (!interactions.has(msg.username)) {
        interactions.set(msg.username, new Map());
      }
      const userInteractions = interactions.get(msg.username)!;
      const count = userInteractions.get(msg.replyToUsername) || 0;
      userInteractions.set(msg.replyToUsername, count + 1);
    }
  }

  // Get unique participants
  const participants = new Set<string>();
  messages.forEach(m => participants.add(m.username));

  output += 'Participants:\n';
  Array.from(participants).forEach(p => {
    output += `  ● ${p}\n`;
  });
  output += '\n';

  output += 'Interactions:\n';
  if (interactions.size === 0) {
    output += '  (No direct replies detected)\n';
  } else {
    for (const [from, targets] of interactions.entries()) {
      for (const [to, count] of targets.entries()) {
        const arrow = '─'.repeat(Math.min(count, 5)) + '→';
        output += `  ${from} ${arrow} ${to} (${count}×)\n`;
      }
    }
  }

  output += '\n';
  output += 'Legend:\n';
  output += '  ──→  1-2 interactions\n';
  output += '  ───→ 3-4 interactions\n';
  output += '  ────→ 5+ interactions\n';

  output += '\n```';
  return output;
}
