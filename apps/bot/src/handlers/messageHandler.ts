/**
 * Message Handler - Decides if bot should respond and generates response using AI SDK v6
 */

import { Message, AttachmentBuilder } from 'discord.js';
import { runAgent } from '../agent/agent.js';
import { shouldRespond } from '../lib/shouldRespond.js';
import { setExportMessageContext, clearExportMessageContext } from '../agent/tools/exportConversation.js';
import { setSlidevMessageContext, clearSlidevMessageContext } from '../agent/tools/conversationToSlidev.js';
import { setUnsandboxMessageContext, clearUnsandboxMessageContext } from '../agent/tools/unsandboxContext.js';
import { logError, generateUserErrorMessage } from '../utils/errorLogger.js';

export async function handleMessage(message: Message): Promise<void> {
  // Ignore bot messages (including our own)
  if (message.author.bot) {
    return;
  }

  // Fetch recent message history FIRST (for shouldRespond decision context)
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
      logError(error, {
        operation: 'Fetch message history',
        username: message.author.username,
        channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
      });
      console.log('   ⚠️ Could not fetch message history - continuing without context');
    }
  }

  // Check if we should respond to this message (WITH conversation context)
  const decision = await shouldRespond(message, messageHistory);

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

    // Set message context for export, slidev, and unsandbox tools
    setExportMessageContext(message);
    setSlidevMessageContext(message);
    setUnsandboxMessageContext(message);

    console.log('🔍 DEBUG: About to call runAgent from messageHandler...');

    // Run the AI agent with tools and conversation history
    let result;
    try {
      result = await runAgent(enrichedContent, {
        username: message.author.username,
        userId: message.author.id,
        channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
        messageHistory,
      });
      console.log('🔍 DEBUG: runAgent completed successfully');
    } catch (agentError) {
      console.error('🔍 DEBUG: runAgent threw an error:', agentError);
      throw agentError;
    }

    // Clear message context after agent execution
    clearExportMessageContext();
    clearSlidevMessageContext();
    clearUnsandboxMessageContext();

    // Send tool reports FIRST (in order of occurrence), then the final response
    // If tools were used, send separate messages for each tool
    // This handles many tool invocations better and avoids hitting Discord's 2000 char limit
    if (result.toolCalls && result.toolCalls.length > 0 && 'send' in message.channel) {
      console.log(`🔧 Sending ${result.toolCalls.length} tool usage reports...`);

      for (let i = 0; i < result.toolCalls.length; i++) {
        const toolCall = result.toolCalls[i];
        const toolReport = formatSingleToolReport(toolCall, i + 1, result.toolCalls.length);

        // Special handling for renderChart tool - attach the image
        if (toolCall.toolName === 'renderChart' && toolCall.result?.success && toolCall.result?.downloadUrl) {
          try {
            console.log(`📊 Downloading chart image from: ${toolCall.result.downloadUrl}`);
            const imageResponse = await fetch(toolCall.result.downloadUrl);
            if (imageResponse.ok) {
              const arrayBuffer = await imageResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const attachment = new AttachmentBuilder(buffer, { name: 'chart.png' });

              // Send the tool report with the chart image attached
              await message.channel.send({
                content: toolReport,
                files: [attachment],
              });
              console.log(`✅ Sent chart image attachment (${buffer.length} bytes)`);
            } else {
              console.error(`❌ Failed to download chart image: HTTP ${imageResponse.status}`);
              await message.channel.send({ content: toolReport });
            }
          } catch (error) {
            logError(error, {
              operation: 'Download and attach chart image',
              toolName: 'renderChart',
              username: message.author.username,
              channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
              additionalInfo: { downloadUrl: toolCall.result?.downloadUrl },
            });
            // Fall back to sending just the text report
            await message.channel.send({ content: toolReport });
          }
        } else {
          // Regular tool report handling
          // Check if the report exceeds Discord's limit (2000 chars)
          if (toolReport.length > 2000) {
            // Split into multiple messages if needed
            const chunks = splitIntoChunks(toolReport, 1990); // Leave margin for safety
            for (const chunk of chunks) {
              await message.channel.send({ content: chunk });
            }
          } else {
            await message.channel.send({ content: toolReport });
          }
        }

        // Add a small delay between messages to avoid rate limiting
        if (i < result.toolCalls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Sent ${result.toolCalls.length} tool usage reports`);
    }

    // Send the final response AFTER tool reports (in order of occurrence)
    if (result.response) {
      await message.reply({
        content: result.response,
        allowedMentions: { repliedUser: false }, // Don't ping the user
      });
      console.log(`✅ Sent response (${result.response.length} chars)`);
    }
  } catch (error) {
    // Log the error with full context and stack trace
    logError(error, {
      operation: 'Process and generate response',
      username: message.author.username,
      channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
      messageContent: message.content,
    });

    // Generate a user-friendly error message
    const userErrorMessage = generateUserErrorMessage(error, {
      operation: 'message processing',
      username: message.author.username,
    });

    // Send error message to user
    try {
      await message.reply({
        content: userErrorMessage,
        allowedMentions: { repliedUser: false },
      });
    } catch (replyError) {
      logError(replyError, {
        operation: 'Send error message to user',
        username: message.author.username,
        channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
        additionalInfo: { originalError: error instanceof Error ? error.message : String(error) },
      });
    }
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
 * Split a string into chunks that fit Discord's message limit
 */
function splitIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  const lines = text.split('\n');
  for (const line of lines) {
    if ((currentChunk + line + '\n').length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += line + '\n';
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Format a single tool usage into a Discord message
 */
function formatSingleToolReport(call: any, toolNumber: number, totalTools: number): string {
  const lines: string[] = [];

  // Header with tool number and total
  lines.push(`**🔧 Tool ${toolNumber}/${totalTools}: ${call.toolName}**`);
  lines.push(''); // Empty line for spacing

  // Arguments in code block if present
  if (call.args && Object.keys(call.args).length > 0) {
    lines.push('**Arguments:**');
    lines.push('```json');
    lines.push(JSON.stringify(call.args, null, 2));
    lines.push('```');
  }

  // Result in code block if present
  if (call.result) {
    // Extract AI summary if present (for unsandbox tool)
    let aiSummary: string | undefined;
    let resultWithoutSummary = call.result;

    if (typeof call.result === 'object' && call.result.aiSummary) {
      aiSummary = call.result.aiSummary;
      // Create a copy without aiSummary to avoid duplicating it in the JSON output
      resultWithoutSummary = { ...call.result };
      delete resultWithoutSummary.aiSummary;
    }

    // Display AI Summary first if present
    if (aiSummary) {
      lines.push('**🤖 AI Summary:**');
      lines.push(aiSummary);
      lines.push(''); // Empty line for spacing
    }

    lines.push('**Result:**');

    // Format result based on type
    if (typeof resultWithoutSummary === 'string') {
      // For string results, check if it looks like JSON
      try {
        const parsed = JSON.parse(resultWithoutSummary);
        lines.push('```json');
        lines.push(JSON.stringify(parsed, null, 2));
        lines.push('```');
      } catch {
        // Not JSON, display as regular text (with URL suppression)
        const suppressedResult = suppressEmbeds(resultWithoutSummary);
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
    } else if (typeof resultWithoutSummary === 'object') {
      // For object results, format as JSON
      const jsonStr = JSON.stringify(resultWithoutSummary, null, 2);
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
      lines.push(String(resultWithoutSummary));
      lines.push('```');
    }
  }

  return lines.join('\n');
}
