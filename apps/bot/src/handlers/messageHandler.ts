/**
 * Message Handler - Decides if bot should respond and generates response using AI SDK v6
 */

import { Message, AttachmentBuilder } from 'discord.js';
import { runAgent } from '../agent/agent.js';
import { shouldRespond, shouldMinimallyAcknowledge, getMinimalAcknowledgment } from '../lib/shouldRespond.js';
import { setExportMessageContext, clearExportMessageContext } from '../agent/tools/exportConversation.js';
import { setConversationDiagramContext, clearConversationDiagramContext } from '../agent/tools/conversationDiagram.js';
import { setSlidevMessageContext, clearSlidevMessageContext } from '../agent/tools/conversationToSlidev.js';
import { setUnsandboxMessageContext, clearUnsandboxMessageContext } from '../agent/tools/unsandbox.js';
import { logError, generateUserErrorMessage } from '../utils/errorLogger.js';
import { saveHumanMessage, saveAIMessage, saveToolExecution } from '../database/messageService.js';
import { feelingsService } from '../lib/feelings/index.js';
import { getOrCreateUserProfile, incrementMessageCount } from '../database/userProfileService.js';

export async function handleMessage(message: Message): Promise<void> {
  // Ignore bot messages (including our own)
  if (message.author.bot) {
    return;
  }

  // Fetch recent message history FIRST (for shouldRespond decision context)
  let messageHistory: Array<{ username: string; content: string; timestamp?: number }> = [];

  if ('messages' in message.channel) {
    try {
      // Fetch messages from the appropriate channel/thread
      const messages = await message.channel.messages.fetch({ limit: 30, before: message.id });

      // Build basic message history
      messageHistory = messages
        .reverse()
        .map(msg => ({
          username: msg.author.username,
          content: msg.content,
          timestamp: msg.createdTimestamp,
        }))
        .filter(msg => msg.content.length > 0); // Filter out empty messages

      // If this message is in a thread, also include the thread starter message for context
      if (message.channel.isThread() && message.channel.ownerId) {
        try {
          const starterMessage = await message.channel.fetchStarterMessage();
          if (starterMessage && starterMessage.content.length > 0) {
            // Add the thread starter at the beginning for context
            messageHistory.unshift({
              username: starterMessage.author.username,
              content: `[Thread Starter] ${starterMessage.content}`,
              timestamp: starterMessage.createdTimestamp,
            });
          }
        } catch (starterError) {
          console.log('   ⚠️ Could not fetch thread starter message - continuing without it');
        }
      }

      // If this message is a reply, include the referenced message for context
      if (message.reference?.messageId) {
        try {
          const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
          if (referencedMessage && referencedMessage.content.length > 0) {
            // Add the referenced message to history if not already present
            const alreadyInHistory = messageHistory.some(msg =>
              msg.username === referencedMessage.author.username &&
              msg.content === referencedMessage.content
            );

            if (!alreadyInHistory) {
              messageHistory.push({
                username: referencedMessage.author.username,
                content: `[Replied to] ${referencedMessage.content}`,
                timestamp: referencedMessage.createdTimestamp,
              });
            }
          }
        } catch (refError) {
          console.log('   ⚠️ Could not fetch referenced message - continuing without it');
        }
      }
    } catch (error) {
      logError(error, {
        operation: 'Fetch message history',
        username: message.author.username,
        channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
      });
      console.log('   ⚠️ Could not fetch message history - continuing without context');
    }
  }

  // Track user interaction in profile FIRST (before deciding to respond)
  // This ensures we track ALL messages, even if we don't respond
  try {
    await getOrCreateUserProfile(message.author.id, message.author.username);
    await incrementMessageCount(message.author.id);
  } catch (profileError) {
    console.error('⚠️  Failed to track user profile:', profileError);
    // Continue anyway - don't let profile tracking errors block message handling
  }

  // Check if we should respond to this message (WITH conversation context)
  const decision = await shouldRespond(message, messageHistory);

  // Post decision info ONLY in #omega channel for debugging
  const channelName = message.channel.isDMBased() ? 'DM' : (message.channel as any).name;
  if ('send' in message.channel && channelName === 'omega') {
    const emoji = decision.shouldRespond ? '✅' : '❌';
    // Use spoiler tags to hide verbose reasoning while keeping key info visible
    await message.channel.send(
      `${emoji} ${decision.shouldRespond ? 'Responding' : 'Ignoring'} (${decision.confidence}% confidence)\n||📋 Reason: ${decision.reason}||`
    );
  }

  if (!decision.shouldRespond) {
    return;
  }

  // If this is an error/deployment failure, trigger CONCERN feeling
  const isErrorDetected = decision.reason.includes('Error or deployment failure detected');
  if (isErrorDetected) {
    console.log('   🧠 Triggering CONCERN feeling for error/deployment failure');
    feelingsService.updateMetrics({
      performance: {
        averageResponseTime: 0,
        errorRate: 0.8, // High error rate to trigger concern
        successRate: 0.2,
      },
      interaction: {
        messagesProcessed: 1,
        positiveSignals: 0,
        negativeSignals: 1,
        ambiguousQueries: 0,
      },
    });
  }

  // Check if a minimal acknowledgment is sufficient (when directly mentioned)
  // This avoids verbose responses for simple greetings, thanks, etc.
  const botMentioned = message.mentions.users.has(message.client.user!.id);
  if (botMentioned && shouldMinimallyAcknowledge(message)) {
    console.log(`\n📨 Minimal acknowledgment for ${message.author.tag}:`);
    console.log(`   Content: "${message.content}"`);
    console.log(`   Responding with minimal acknowledgment (avoiding verbosity)`);

    const acknowledgment = getMinimalAcknowledgment(message);
    await message.reply({
      content: acknowledgment,
      allowedMentions: { repliedUser: false },
    });

    // Still persist the interaction to database
    try {
      await saveHumanMessage({
        userId: message.author.id,
        username: message.author.username,
        channelId: message.channel.id,
        channelName: channelName,
        guildId: message.guild?.id,
        messageContent: message.content,
        messageId: message.id,
        responseDecision: decision,
      });

      // User profile already tracked at start of function

      await saveAIMessage({
        userId: message.author.id,
        username: message.author.username,
        channelId: message.channel.id,
        channelName: channelName,
        guildId: message.guild?.id,
        messageContent: acknowledgment,
        parentMessageId: message.id,
      });
    } catch (dbError) {
      console.error('⚠️  Failed to persist minimal acknowledgment to database:', dbError);
    }

    return;
  }

  console.log(`\n📨 Processing message from ${message.author.tag}:`);
  console.log(`   Content: "${message.content}"`);
  console.log(`   Channel: #${message.channel.isDMBased() ? 'DM' : (message.channel as any).name}`);

  // Show typing indicator while processing
  if ('sendTyping' in message.channel) {
    await message.channel.sendTyping();
  }

  // Persist human message to database with decision reasoning
  try {
    await saveHumanMessage({
      userId: message.author.id,
      username: message.author.username,
      channelId: message.channel.id,
      channelName: channelName,
      guildId: message.guild?.id,
      messageContent: message.content,
      messageId: message.id,
      responseDecision: decision,
    });

    // User profile already tracked at start of function
  } catch (dbError) {
    console.error('⚠️  Failed to persist message to database:', dbError);
    // Continue execution even if database write fails
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

    // Set message context for export, conversation diagram, slidev, and unsandbox tools
    setExportMessageContext(message);
    setConversationDiagramContext(message);
    setSlidevMessageContext(message);
    setUnsandboxMessageContext(message);

    console.log('🔍 DEBUG: About to call runAgent from messageHandler...');

    // Run the AI agent with tools and conversation history
    const startTime = Date.now();
    let result;
    let hadError = false;

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
      hadError = true;
      throw agentError;
    } finally {
      const duration = Date.now() - startTime;

      // Update feelings subsystem with interaction metrics
      const isAmbiguous = message.content.length < 10 || !message.content.includes(' ');
      const hasPositiveSignal = message.content.toLowerCase().includes('thank') ||
                               message.content.toLowerCase().includes('great') ||
                               message.content.toLowerCase().includes('awesome') ||
                               message.content.toLowerCase().includes('nice');

      feelingsService.updateMetrics({
        performance: {
          averageResponseTime: duration,
          errorRate: hadError ? 1.0 : 0.0,
          successRate: hadError ? 0.0 : 1.0,
        },
        resources: {
          toolCallsCount: result?.toolCalls?.length || 0,
          tokensUsed: 0, // TODO: Track actual tokens when available
          contextWindowUsage: messageHistory.length / 100, // Rough estimate
        },
        interaction: {
          messagesProcessed: 1,
          positiveSignals: hasPositiveSignal ? 1 : 0,
          negativeSignals: hadError ? 1 : 0,
          ambiguousQueries: isAmbiguous ? 1 : 0,
        },
        temporal: {
          conversationDuration: duration / 1000,
          messageFrequency: messageHistory.length > 0 ? messageHistory.length / 10 : 0,
          lastActivityTime: new Date(),
        },
      });

      // Log feelings state in omega channel
      if (channelName === 'omega') {
        const feelingsSummary = feelingsService.getSummary();
        if (feelingsSummary !== 'No current feelings') {
          console.log('🧠 Feelings:', feelingsSummary);
        }
      }
    }

    // Clear message context after agent execution
    clearExportMessageContext();
    clearConversationDiagramContext();
    clearSlidevMessageContext();
    clearUnsandboxMessageContext();

    // Send tool reports FIRST (in order of occurrence), then the final response
    // Using plain text messages instead of embeds
    if (result.toolCalls && result.toolCalls.length > 0 && 'send' in message.channel) {
      console.log(`🔧 Sending ${result.toolCalls.length} tool usage reports...`);

      // Persist tool calls to database
      for (const toolCall of result.toolCalls) {
        try {
          await saveToolExecution({
            userId: message.author.id,
            username: message.author.username,
            channelId: message.channel.id,
            channelName: channelName,
            guildId: message.guild?.id,
            toolName: toolCall.toolName,
            toolArgs: toolCall.args,
            toolResult: toolCall.result,
          });
        } catch (dbError) {
          console.error(`⚠️  Failed to persist tool execution (${toolCall.toolName}) to database:`, dbError);
          // Continue execution even if database write fails
        }
      }

      // Special handling for renderChart and generateUserImage tools - display images with plain text
      for (let i = 0; i < result.toolCalls.length; i++) {
        const toolCall = result.toolCalls[i];

        if (toolCall.toolName === 'renderChart' && toolCall.result?.success && toolCall.result?.downloadUrl) {
          try {
            console.log(`📊 Downloading chart image from: ${toolCall.result.downloadUrl}`);
            const imageResponse = await fetch(toolCall.result.downloadUrl);
            if (imageResponse.ok) {
              const arrayBuffer = await imageResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const attachment = new AttachmentBuilder(buffer, { name: 'chart.png' });

              // Format as plain text
              const statusEmoji = toolCall.result?.success !== false ? '✅' : '❌';
              const statusText = toolCall.result?.success !== false ? 'Success' : 'Failed';
              const durationText = toolCall.duration ? ` • ${toolCall.duration.toFixed(2)}s` : '';
              const plainTextReport = `🔧 ${i + 1}/${result.toolCalls.length}: ${toolCall.toolName}\n${statusEmoji} ${statusText}${durationText}`;

              // Send plain text with chart image attached
              await message.channel.send({
                content: plainTextReport,
                files: [attachment],
              });
              console.log(`✅ Sent chart image attachment (${buffer.length} bytes)`);
            } else {
              console.error(`❌ Failed to download chart image: HTTP ${imageResponse.status}`);
              // Send plain text without attachment
              const statusEmoji = '❌';
              const plainTextReport = `🔧 ${i + 1}/${result.toolCalls.length}: ${toolCall.toolName}\n${statusEmoji} Failed to download chart`;
              await message.channel.send({ content: plainTextReport });
            }
          } catch (error) {
            logError(error, {
              operation: 'Download and attach chart image',
              toolName: 'renderChart',
              username: message.author.username,
              channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
              additionalInfo: { downloadUrl: toolCall.result?.downloadUrl },
            });
            // Fallback: send plain text without attachment
            const plainTextReport = `🔧 ${i + 1}/${result.toolCalls.length}: ${toolCall.toolName}\n❌ Error downloading chart`;
            await message.channel.send({ content: plainTextReport });
          }
        } else if (toolCall.toolName === 'generateUserImage' && toolCall.result?.success && toolCall.result?.imageUrl) {
          try {
            console.log(`🎨 Displaying generated image from: ${toolCall.result.imageUrl}`);

            // Format as plain text with image URL
            const statusEmoji = '✅';
            const statusText = 'Success';
            const durationText = toolCall.duration ? ` • ${toolCall.duration.toFixed(2)}s` : '';
            let plainTextReport = `🔧 ${i + 1}/${result.toolCalls.length}: ${toolCall.toolName}\n${statusEmoji} ${statusText}${durationText}\n\n${toolCall.result.imageUrl}`;

            // Add revised prompt if available
            if (toolCall.result.revisedPrompt) {
              plainTextReport += `\n\n📝 Revised Prompt: ${toolCall.result.revisedPrompt.substring(0, 1000)}`;
            }

            // Send plain text message
            await message.channel.send({
              content: plainTextReport,
            });
            console.log(`✅ Sent generated image URL`);
          } catch (error) {
            logError(error, {
              operation: 'Display generated image URL',
              toolName: 'generateUserImage',
              username: message.author.username,
              channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
              additionalInfo: { imageUrl: toolCall.result?.imageUrl },
            });
            // Fallback: send plain text error
            const plainTextReport = `🔧 ${i + 1}/${result.toolCalls.length}: ${toolCall.toolName}\n❌ Error displaying image`;
            await message.channel.send({ content: plainTextReport });
          }
        } else {
          // Regular tool report - send as plain text
          const statusEmoji = toolCall.result?.success !== false ? '✅' : '❌';
          const statusText = toolCall.result?.success !== false ? 'Success' : 'Failed';
          const durationText = toolCall.duration ? ` • ${toolCall.duration.toFixed(2)}s` : '';
          let plainTextReport = `🔧 ${i + 1}/${result.toolCalls.length}: ${toolCall.toolName}\n${statusEmoji} ${statusText}${durationText}`;

          // Add result info if available and not too verbose
          if (toolCall.result && typeof toolCall.result === 'object') {
            const resultStr = JSON.stringify(toolCall.result, null, 2);
            if (resultStr.length < 500) {
              plainTextReport += `\n\`\`\`json\n${resultStr}\n\`\`\``;
            }
          }

          await message.channel.send({ content: plainTextReport });
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
      // Send as plain text message
      await message.reply({
        content: result.response,
        allowedMentions: { repliedUser: false }, // Don't ping the user
      });
      console.log(`✅ Sent response (${result.response.length} chars)`);

      // Persist AI response to database
      try {
        await saveAIMessage({
          userId: message.author.id,
          username: message.author.username,
          channelId: message.channel.id,
          channelName: channelName,
          guildId: message.guild?.id,
          messageContent: result.response,
          parentMessageId: message.id,
        });
      } catch (dbError) {
        console.error('⚠️  Failed to persist AI response to database:', dbError);
        // Continue execution even if database write fails
      }
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
