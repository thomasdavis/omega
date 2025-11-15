/**
 * Message Handler - Decides if bot should respond and generates response using AI SDK v6
 */

import { Message } from 'discord.js';
import { runAgent } from '../agent/agent.js';
import { shouldRespond } from '../lib/shouldRespond.js';
import { setExportMessageContext, clearExportMessageContext } from '../agent/tools/exportConversation.js';

export async function handleMessage(message: Message): Promise<void> {
  // Ignore bot messages (including our own)
  if (message.author.bot) {
    return;
  }

  // Check if we should respond to this message
  const decision = await shouldRespond(message);

  // Post decision info ONLY in #omega channel for debugging
  const channelName = message.channel.isDMBased() ? 'DM' : (message.channel as any).name;
  if ('send' in message.channel && channelName === 'omega') {
    const emoji = decision.shouldRespond ? '✅' : '❌';
    await message.channel.send(
      `${emoji} **Decision:** ${decision.shouldRespond ? 'Respond' : 'Ignore'} | **Confidence:** ${decision.confidence}% | **Reason:** ${decision.reason}`
    );
  }

  if (!decision.shouldRespond) {
    return;
  }

  console.log(`\n📨 Processing message from ${message.author.tag}:`);
  console.log(`   Content: "${message.content}"`);
  console.log(`   Channel: #${message.channel.isDMBased() ? 'DM' : (message.channel as any).name}`);

  // Show typing indicator while processing
  if ('sendTyping' in message.channel) {
    await message.channel.sendTyping();
  }

  try {
    // Fetch recent message history for context (last 20 messages)
    let messageHistory: Array<{ username: string; content: string }> = [];

    if ('messages' in message.channel) {
      try {
        const messages = await message.channel.messages.fetch({ limit: 20, before: message.id });
        messageHistory = messages
          .reverse()
          .map(msg => ({
            username: msg.author.username,
            content: msg.content,
          }))
          .filter(msg => msg.content.length > 0); // Filter out empty messages
      } catch (error) {
        console.log('   ⚠️ Could not fetch message history');
      }
    }

    // Check for file attachments
    let enrichedContent = message.content;
    if (message.attachments.size > 0) {
      console.log(`   📎 Message has ${message.attachments.size} attachment(s)`);
      const attachmentInfo = Array.from(message.attachments.values())
        .map(att => `- ${att.name} (${att.contentType || 'unknown type'}, ${(att.size / 1024).toFixed(2)} KB): ${att.url}`)
        .join('\n');

      enrichedContent = `${message.content}\n\n**[ATTACHMENTS]**\n${attachmentInfo}`;
      console.log('   Attachment details added to message context');
    }

    // Set message context for export tool
    setExportMessageContext(message);

    // Run the AI agent with tools and conversation history
    const result = await runAgent(enrichedContent, {
      username: message.author.username,
      channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
      messageHistory,
    });

    // Clear message context after agent execution
    clearExportMessageContext();

    // Send the response
    if (result.response) {
      await message.reply({
        content: result.response,
        allowedMentions: { repliedUser: false }, // Don't ping the user
      });
      console.log(`✅ Sent response (${result.response.length} chars)`);
    }

    // If tools were used, send a follow-up message with details
    if (result.toolCalls && result.toolCalls.length > 0 && 'send' in message.channel) {
      const toolReport = formatToolReport(result.toolCalls);
      await message.channel.send({
        content: toolReport,
      });
      console.log(`🔧 Sent tool usage report (${result.toolCalls.length} tools)`);
    }
  } catch (error) {
    console.error('Error generating response:', error);

    // Send error message to user
    await message.reply({
      content: '❌ Sorry, I encountered an error processing your message. Please try again.',
      allowedMentions: { repliedUser: false },
    });
  }
}

/**
 * Suppress auto-embeds for URLs in Discord by wrapping them in <>
 */
function suppressEmbeds(text: string): string {
  // Match URLs and wrap them in <> to prevent auto-embed
  return text.replace(/(https?:\/\/[^\s<>]+)/g, '<$1>');
}

/**
 * Format tool usage into a nice Discord message
 */
function formatToolReport(toolCalls: any[]): string {
  const lines = ['**🔧 Tools Used:**'];
  lines.push(''); // Empty line for spacing

  for (let i = 0; i < toolCalls.length; i++) {
    const call = toolCalls[i];

    // Tool name with number
    lines.push(`**${i + 1}. ${call.toolName}**`);

    // Arguments in code block if present
    if (call.args && Object.keys(call.args).length > 0) {
      lines.push('**Arguments:**');
      lines.push('```json');
      lines.push(JSON.stringify(call.args, null, 2));
      lines.push('```');
    }

    // Result in code block if present
    if (call.result) {
      lines.push('**Result:**');

      // Format result based on type
      if (typeof call.result === 'string') {
        // For string results, check if it looks like JSON
        try {
          const parsed = JSON.parse(call.result);
          lines.push('```json');
          lines.push(JSON.stringify(parsed, null, 2));
          lines.push('```');
        } catch {
          // Not JSON, display as regular text (with URL suppression)
          const suppressedResult = suppressEmbeds(call.result);
          if (suppressedResult.length > 500) {
            lines.push('```');
            lines.push(suppressedResult.slice(0, 500) + '...\n(truncated)');
            lines.push('```');
          } else {
            lines.push('```');
            lines.push(suppressedResult);
            lines.push('```');
          }
        }
      } else if (typeof call.result === 'object') {
        // For object results, format as JSON
        const jsonStr = JSON.stringify(call.result, null, 2);
        if (jsonStr.length > 1000) {
          lines.push('```json');
          lines.push(jsonStr.slice(0, 1000) + '\n...\n(truncated)');
          lines.push('```');
        } else {
          lines.push('```json');
          // Suppress embeds in URLs within JSON
          lines.push(suppressEmbeds(jsonStr));
          lines.push('```');
        }
      } else {
        // For other types (number, boolean, etc.)
        lines.push('```');
        lines.push(String(call.result));
        lines.push('```');
      }
    }

    // Add separator between tools (except for last one)
    if (i < toolCalls.length - 1) {
      lines.push(''); // Empty line between tools
    }
  }

  return lines.join('\n');
}
