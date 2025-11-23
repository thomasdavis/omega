/**
 * Message Handler - Decides if bot should respond and generates response using AI SDK v6
 */

import { Message, AttachmentBuilder } from 'discord.js';
import { runAgent } from '../agent/agent.js';
import { shouldRespond } from '../lib/shouldRespond.js';
import { setExportMessageContext, clearExportMessageContext } from '../agent/tools/exportConversation.js';
import { setSlidevMessageContext, clearSlidevMessageContext } from '../agent/tools/conversationToSlidev.js';
import { setUnsandboxMessageContext, clearUnsandboxMessageContext } from '../agent/tools/unsandbox.js';
import { logError, generateUserErrorMessage } from '../utils/errorLogger.js';
import { messageAdapter, type ToolCallInfo } from '../utils/discordMessageAdapter.js';
import { saveHumanMessage, saveAIMessage, saveToolExecution } from '../database/messageService.js';

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
    // Use spoiler tags to hide verbose reasoning while keeping key info visible
    await message.channel.send(
      `${emoji} ${decision.shouldRespond ? 'Responding' : 'Ignoring'} (${decision.confidence}% confidence)\n||📋 Reason: ${decision.reason}||`
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

  // Persist human message to database
  try {
    await saveHumanMessage({
      userId: message.author.id,
      username: message.author.username,
      channelId: message.channel.id,
      channelName: channelName,
      guildId: message.guild?.id,
      messageContent: message.content,
      messageId: message.id,
    });
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
    // Using new message adapter with embeds + spoilers for clean, organized output
    if (result.toolCalls && result.toolCalls.length > 0 && 'send' in message.channel) {
      console.log(`🔧 Sending ${result.toolCalls.length} tool usage reports...`);

      // Convert tool calls to ToolCallInfo format for adapter
      const toolCallsInfo: ToolCallInfo[] = result.toolCalls.map((call: any, index: number) => ({
        toolName: call.toolName,
        args: call.args,
        result: call.result,
        success: call.result?.success !== false, // Assume success unless explicitly false
        duration: call.duration,
        jobId: call.result?.job_id || call.result?.jobId,
        index: index + 1,
        total: result.toolCalls.length
      }));

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

      // Special handling for renderChart and generateUserImage tools - display images inline
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

              // Build embed for chart tool
              const embed = messageAdapter.buildToolEmbed(toolCallsInfo[i]);

              // Send the embed with the chart image attached
              await message.channel.send({
                embeds: [embed],
                files: [attachment],
              });
              console.log(`✅ Sent chart image attachment (${buffer.length} bytes)`);
            } else {
              console.error(`❌ Failed to download chart image: HTTP ${imageResponse.status}`);
              // Send embed without attachment
              const embed = messageAdapter.buildToolEmbed(toolCallsInfo[i]);
              await message.channel.send({ embeds: [embed] });
            }
          } catch (error) {
            logError(error, {
              operation: 'Download and attach chart image',
              toolName: 'renderChart',
              username: message.author.username,
              channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
              additionalInfo: { downloadUrl: toolCall.result?.downloadUrl },
            });
            // Fallback: send embed without attachment
            const embed = messageAdapter.buildToolEmbed(toolCallsInfo[i]);
            await message.channel.send({ embeds: [embed] });
          }
        } else if (toolCall.toolName === 'generateUserImage' && toolCall.result?.success && toolCall.result?.imageUrl) {
          try {
            console.log(`🎨 Displaying generated image from: ${toolCall.result.imageUrl}`);

            // Build embed for image generation tool with image displayed inline
            const embed = messageAdapter.buildToolEmbed(toolCallsInfo[i]);
            embed.setImage(toolCall.result.imageUrl);

            // Add revised prompt as a field if available
            if (toolCall.result.revisedPrompt) {
              embed.addFields({
                name: '📝 Revised Prompt',
                value: toolCall.result.revisedPrompt.substring(0, 1000), // Discord field limit
                inline: false
              });
            }

            // Send the embed with the image displayed inline
            await message.channel.send({
              embeds: [embed],
            });
            console.log(`✅ Sent generated image inline`);
          } catch (error) {
            logError(error, {
              operation: 'Display generated image inline',
              toolName: 'generateUserImage',
              username: message.author.username,
              channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
              additionalInfo: { imageUrl: toolCall.result?.imageUrl },
            });
            // Fallback: send embed without image
            const embed = messageAdapter.buildToolEmbed(toolCallsInfo[i]);
            await message.channel.send({ embeds: [embed] });
          }
        } else {
          // Regular tool report - send single embed
          const embed = messageAdapter.buildToolEmbed(toolCallsInfo[i]);
          await message.channel.send({ embeds: [embed] });
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
      // Convert response to embed for better visual hierarchy
      const responseEmbed = messageAdapter.buildResponseEmbed(result.response, {
        username: message.author.username,
        toolCount: result.toolCalls?.length || 0,
      });

      await message.reply({
        embeds: [responseEmbed],
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
