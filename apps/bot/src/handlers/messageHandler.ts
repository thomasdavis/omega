/**
 * Message Handler - Decides if bot should respond and generates response using AI SDK v6
 */

import { Message } from 'discord.js';
import { runAgent } from '../agent/agent.js';
import { shouldRespond } from '../lib/shouldRespond.js';

export async function handleMessage(message: Message): Promise<void> {
  // Ignore bot messages (including our own)
  if (message.author.bot) {
    return;
  }

  // Check if we should respond to this message
  const decision = await shouldRespond(message);

  // Post decision info to channel for debugging
  if ('send' in message.channel) {
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

    // Run the AI agent with tools and conversation history
    const result = await runAgent(message.content, {
      username: message.author.username,
      channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
      messageHistory,
    });

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
 * Format tool usage into a nice Discord message
 */
function formatToolReport(toolCalls: any[]): string {
  const lines = ['**🔧 Tools Used:**\n'];

  for (const call of toolCalls) {
    lines.push(`• **${call.toolName}**`);

    if (call.args && Object.keys(call.args).length > 0) {
      const argsStr = JSON.stringify(call.args, null, 2)
        .split('\n')
        .map(line => `  ${line}`)
        .join('\n');
      lines.push('```json');
      lines.push(argsStr);
      lines.push('```');
    }

    if (call.result) {
      const resultPreview = typeof call.result === 'string'
        ? call.result.slice(0, 200) + (call.result.length > 200 ? '...' : '')
        : JSON.stringify(call.result).slice(0, 200);
      lines.push(`  Result: ${resultPreview}\n`);
    }
  }

  return lines.join('\n');
}
