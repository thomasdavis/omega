/**
 * Message Handler - Decides if bot should respond and generates response using AI SDK v6
 */

import { Message, AttachmentBuilder } from 'discord.js';
import {
  runAgent,
  setExportMessageContext,
  clearExportMessageContext,
  setConversationDiagramContext,
  clearConversationDiagramContext,
  setSlidevMessageContext,
  clearSlidevMessageContext
} from '@repo/agent';
import { shouldRespond, shouldMinimallyAcknowledge, getMinimalAcknowledgment } from '../lib/shouldRespond.js';
import { checkIntentGate } from '../lib/intentGate.js';
import { logError, generateUserErrorMessage } from '../utils/errorLogger.js';
import { saveHumanMessage, saveAIMessage, saveToolExecution, getOrCreateConversation, addMessageToConversation, logDecision, logBan, logAntigravityRoast } from '@repo/database';
import { feelingsService } from '../lib/feelings/index.js';
import { getOrCreateUserProfile, incrementMessageCount, getUserProfile } from '@repo/database';
import { generateAntigravityRoast } from '../lib/antigravityRoasts.js';
import { fetchMessageWithDurableAttachments, downloadDurableAttachment } from '../utils/fetchDurableAttachments.js';
import { setCachedAttachment, type CachedAttachment } from '@repo/shared';
import { sendChunkedMessage } from '../utils/messageChunker.js';
import { extractLargeCodeBlocks } from '../utils/codeBlockExtractor.js';
import { handleBuildFailureMessage } from '../services/buildFailureIssueService.js';
import { captureError } from '../services/errorMonitoringService.js';
import { analyzeSentiment } from '@repo/shared';
import { processMessageForBookmarks } from '../utils/valTownBookmarks.js';

export async function handleMessage(message: Message): Promise<void> {
  // Ignore our own messages to prevent infinite loops
  if (message.author.id === message.client.user?.id) {
    return;
  }

  // Allow messages from other bots (like uncloseai) to be processed
  // This enables bot-to-bot interaction in the channel

  // AUTO-BAN: Check for banned keywords BEFORE any other processing
  // Keywords that trigger auto-ban: 'antigravity'
  // Keywords that trigger insult when no ban permission: 'antigravity', 'anti-gravity'
  const bannedKeywords = ['antigravity'];
  const insultKeywords = ['antigravity', 'anti-gravity'];
  const lowerContent = message.content.toLowerCase();

  // Check if any insult keyword is present (broader check)
  const hasInsultKeyword = insultKeywords.some(keyword => lowerContent.includes(keyword));

  if (hasInsultKeyword) {
    // Determine which keyword was matched (for logging)
    const matchedKeyword = insultKeywords.find(keyword => lowerContent.includes(keyword)) || 'antigravity';
    console.log(`⛔ Keyword detected: "${matchedKeyword}" from ${message.author.tag}`);

    // Only attempt ban/insult in guild channels (not DMs)
    if (message.guild && message.member) {
      // Try to ban if it's a banned keyword (currently just 'antigravity')
      if (bannedKeywords.some(keyword => lowerContent.includes(keyword))) {
        try {
          // Attempt to ban the user
          await message.member.ban({
            reason: `Auto-ban: mentioned prohibited term '${matchedKeyword}'`,
            deleteMessageSeconds: 60 * 60 * 24  // Delete messages from last 24 hours
          });

          console.log(`✅ Successfully banned user ${message.author.tag} for keyword: ${matchedKeyword}`);

          // Log the ban to database
          try {
            await logBan({
              userId: message.author.id,
              username: message.author.username,
              messageContent: message.content,
              banReason: `Auto-ban: mentioned prohibited term '${matchedKeyword}'`,
              bannedKeyword: matchedKeyword,
              channelId: message.channel.id,
              guildId: message.guild.id,
            });
          } catch (logError) {
            console.error('⚠️  Failed to log ban to database:', logError);
            // Continue even if logging fails
          }

          // Log decision for audit trail
          try {
            await logDecision({
              userId: message.author.id,
              username: message.author.username,
              decisionDescription: `AUTO-BAN: User banned for mentioning prohibited keyword '${matchedKeyword}'`,
              blame: 'messageHandler.ts:autoban',
              metadata: {
                decisionType: 'autoban',
                keyword: matchedKeyword,
                messageContent: message.content,
                channelId: message.channel.id,
                guildId: message.guild.id,
                success: true,
              }
            });
          } catch (decisionLogError) {
            console.error('⚠️  Failed to log ban decision:', decisionLogError);
          }

          // Notify channel about the ban
          if ('send' in message.channel) {
            try {
              await message.channel.send(
                `🚫 User ${message.author.tag} has been banned for violating server rules.`
              );
            } catch (notifyError) {
              console.error('⚠️  Failed to send ban notification:', notifyError);
            }
          }
        } catch (error) {
          console.error('❌ Failed to ban user:', error);

          // Check if it's a permission error
          const isPermissionError = error instanceof Error &&
            (error.message.toLowerCase().includes('permission') ||
             error.message.toLowerCase().includes('missing access'));

          // If ban failed due to permissions, insult the user instead
          if (isPermissionError && 'send' in message.channel) {
            console.log(`😈 Permission denied - generating insult for ${message.author.tag}`);

            try {
              // Fetch user profile to weaponize all available information
              const userProfile = await getUserProfile(message.author.id);

              // Generate a witty, sarcastic roast using the AI-powered roast generator
              const { roast: insult, generationTimeMs, aiModel } = await generateAntigravityRoast(
                message.author.tag,
                matchedKeyword,
                userProfile,
                true // bannedButNoPerm = true
              );

              // Send the insult
              await message.channel.send(insult);
              console.log(`✅ Sent insult to ${message.author.tag}`);

              // Log the roast to database
              try {
                await logAntigravityRoast({
                  userId: message.author.id,
                  username: message.author.username,
                  messageContent: message.content,
                  matchedKeyword,
                  roastContent: insult,
                  userProfileData: userProfile,
                  aiModel,
                  generationTimeMs,
                  bannedButNoPerm: true,
                  channelId: message.channel.id,
                  guildId: message.guild.id,
                });
              } catch (roastLogError) {
                console.error('⚠️  Failed to log antigravity roast:', roastLogError);
              }

              // Log the insult decision
              try {
                await logDecision({
                  userId: message.author.id,
                  username: message.author.username,
                  decisionDescription: `AUTO-INSULT: Insulted user for keyword '${matchedKeyword}' (ban permission denied)`,
                  blame: 'messageHandler.ts:autoinsult',
                  metadata: {
                    decisionType: 'autoinsult',
                    keyword: matchedKeyword,
                    messageContent: message.content,
                    channelId: message.channel.id,
                    guildId: message.guild.id,
                    insultSent: insult,
                    success: true,
                    reason: 'ban_permission_denied',
                  }
                });
              } catch (decisionLogError) {
                console.error('⚠️  Failed to log insult decision:', decisionLogError);
              }
            } catch (insultError) {
              console.error('❌ Failed to send insult:', insultError);

              // Log the failure
              try {
                await logDecision({
                  userId: message.author.id,
                  username: message.author.username,
                  decisionDescription: `AUTO-INSULT FAILED: Could not insult user for keyword '${matchedKeyword}'. Error: ${insultError instanceof Error ? insultError.message : String(insultError)}`,
                  blame: 'messageHandler.ts:autoinsult',
                  metadata: {
                    decisionType: 'autoinsult',
                    keyword: matchedKeyword,
                    messageContent: message.content,
                    channelId: message.channel.id,
                    guildId: message.guild.id,
                    success: false,
                    error: insultError instanceof Error ? insultError.message : String(insultError),
                  }
                });
              } catch (decisionLogError) {
                console.error('⚠️  Failed to log insult failure:', decisionLogError);
              }
            }
          } else {
            // Ban failed but not due to permissions - just log
            try {
              await logDecision({
                userId: message.author.id,
                username: message.author.username,
                decisionDescription: `AUTO-BAN FAILED: Could not ban user for keyword '${matchedKeyword}'. Error: ${error instanceof Error ? error.message : String(error)}`,
                blame: 'messageHandler.ts:autoban',
                metadata: {
                  decisionType: 'autoban',
                  keyword: matchedKeyword,
                  messageContent: message.content,
                  channelId: message.channel.id,
                  guildId: message.guild.id,
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                }
              });
            } catch (decisionLogError) {
              console.error('⚠️  Failed to log ban failure:', decisionLogError);
            }
          }
        }
      } else {
        // Insult-only keyword (like 'anti-gravity') or non-banned keyword detected
        // Send insult if in a guild channel with send permission
        if ('send' in message.channel) {
          console.log(`😈 Insult-only keyword detected - sending insult to ${message.author.tag}`);

          try {
            // Fetch user profile to weaponize all available information
            const userProfile = await getUserProfile(message.author.id);

            // Generate a witty, sarcastic roast using the AI-powered roast generator
            const { roast: insult, generationTimeMs, aiModel } = await generateAntigravityRoast(
              message.author.tag,
              matchedKeyword,
              userProfile,
              false // bannedButNoPerm = false
            );

            // Send the insult
            await message.channel.send(insult);
            console.log(`✅ Sent insult to ${message.author.tag}`);

            // Log the roast to database
            try {
              await logAntigravityRoast({
                userId: message.author.id,
                username: message.author.username,
                messageContent: message.content,
                matchedKeyword,
                roastContent: insult,
                userProfileData: userProfile,
                aiModel,
                generationTimeMs,
                bannedButNoPerm: false,
                channelId: message.channel.id,
                guildId: message.guild?.id,
              });
            } catch (roastLogError) {
              console.error('⚠️  Failed to log antigravity roast:', roastLogError);
            }

            // Log the insult decision
            try {
              await logDecision({
                userId: message.author.id,
                username: message.author.username,
                decisionDescription: `AUTO-INSULT: Insulted user for keyword '${matchedKeyword}'`,
                blame: 'messageHandler.ts:autoinsult',
                metadata: {
                  decisionType: 'autoinsult',
                  keyword: matchedKeyword,
                  messageContent: message.content,
                  channelId: message.channel.id,
                  guildId: message.guild?.id,
                  insultSent: insult,
                  success: true,
                  reason: 'insult_only_keyword',
                }
              });
            } catch (decisionLogError) {
              console.error('⚠️  Failed to log insult decision:', decisionLogError);
            }
          } catch (insultError) {
            console.error('❌ Failed to send insult:', insultError);

            // Log the failure
            try {
              await logDecision({
                userId: message.author.id,
                username: message.author.username,
                decisionDescription: `AUTO-INSULT FAILED: Could not insult user for keyword '${matchedKeyword}'. Error: ${insultError instanceof Error ? insultError.message : String(insultError)}`,
                blame: 'messageHandler.ts:autoinsult',
                metadata: {
                  decisionType: 'autoinsult',
                  keyword: matchedKeyword,
                  messageContent: message.content,
                  channelId: message.channel.id,
                  guildId: message.guild?.id,
                  success: false,
                  error: insultError instanceof Error ? insultError.message : String(insultError),
                }
              });
            } catch (decisionLogError) {
              console.error('⚠️  Failed to log insult failure:', decisionLogError);
            }
          }
        }
      }
    } else {
      // DM or no member object - log but don't take action
      console.log(`⚠️  Keyword detected in DM or without guild context: ${message.author.tag}`);
      try {
        await logDecision({
          userId: message.author.id,
          username: message.author.username,
          decisionDescription: `KEYWORD DETECTED: Keyword '${matchedKeyword}' detected but no action taken (DM or no guild context)`,
          blame: 'messageHandler.ts:keywordDetection',
          metadata: {
            decisionType: 'keywordDetection',
            keyword: matchedKeyword,
            messageContent: message.content,
            channelId: message.channel.id,
            guildId: message.guild?.id,
            isDM: message.channel.isDMBased(),
            success: false,
            reason: 'no_guild_context',
          }
        });
      } catch (decisionLogError) {
        console.error('⚠️  Failed to log keyword detection:', decisionLogError);
      }
    }

    return; // Exit early, don't process message further
  }

  // TEST TRIGGER: "kickflip" in #omega throws a deliberate error to test the
  // error → GitHub issue → Claude fix → Discord notification pipeline.
  // Remove this block once the pipeline is verified end-to-end.
  if (lowerContent.includes('kickflip') && !message.channel.isDMBased()) {
    const channelName = (message.channel as any).name;
    if (channelName === 'omega') {
      throw new Error(
        'Test error triggered by kickflip command. Please fix and remove this test error. ' +
        '(This was an intentional throw to verify the self-healing pipeline.)'
      );
    }
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

  // Log the response decision to the append-only audit trail
  try {
    await logDecision({
      userId: message.author.id,
      username: message.author.username,
      decisionDescription: `Response Decision: ${decision.shouldRespond ? 'RESPOND' : 'IGNORE'} - ${decision.reason}`,
      blame: 'shouldRespond.ts',
      metadata: {
        decisionType: 'shouldRespond',
        shouldRespond: decision.shouldRespond,
        confidence: decision.confidence,
        reason: decision.reason,
        channelId: message.channel.id,
        channelName: channelName,
        messageId: message.id,
        messageSnippet: message.content.substring(0, 100),
      },
    });
  } catch (decisionLogError) {
    console.error('⚠️  Failed to log decision:', decisionLogError);
    // Continue execution even if decision logging fails
  }
  // if ('send' in message.channel && channelName === 'omega') {
  //   const emoji = decision.shouldRespond ? '✅' : '❌';
  //   // Use spoiler tags to hide verbose reasoning while keeping key info visible
  //   await message.channel.send(
  //     `${emoji} ${decision.shouldRespond ? 'Responding' : 'Ignoring'} (${decision.confidence}% confidence)\n||📋 Reason: ${decision.reason}||`
  //   );
  // }

  // Store ALL messages to database regardless of response decision
  // This ensures we have a complete record of all Discord activity
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
  } catch (dbError) {
    console.error('⚠️  Failed to persist message to database:', dbError);
    // Continue execution even if database write fails
  }

  // Extract and send links to Val Town for bookmark tracking
  // This runs async and doesn't block message processing
  processMessageForBookmarks(
    message.content,
    message.author.id,
    message.author.username,
    message.channel.id,
    channelName,
    message.id
  ).catch(error => {
    console.error('⚠️  Failed to process bookmarks for Val Town:', error);
    // Fail silently - don't interrupt message flow
  });

  // Track conversation for better context and analytics
  try {
    const conversationId = await getOrCreateConversation({
      userId: message.author.id,
      username: message.author.username,
      channelId: message.channel.id,
    });

    await addMessageToConversation({
      conversationId,
      senderType: 'user',
      userId: message.author.id,
      username: message.author.username,
      content: message.content,
    });
  } catch (conversationError) {
    console.error('⚠️  Failed to track conversation:', conversationError);
    // Continue execution even if conversation tracking fails
  }

  // Monitor message for links and auto-save to shared collection
  // This runs for ALL messages (regardless of response decision)
  try {
    const { monitorMessageForLinks } = await import('../services/linkMonitoringService.js');
    await monitorMessageForLinks(
      message.content,
      message.author.id,
      message.author.username,
      message.channel.id,
      channelName,
      message.id,
      message.guild?.id
    );
  } catch (linkError) {
    console.error('⚠️  Failed to monitor links:', linkError);
    // Continue execution even if link monitoring fails
  }

  if (!decision.shouldRespond) {
    return;
  }

  // INTENT GATE: Check if user reply is interactive (requires action) vs non-interactive (just commenting)
  // This gate only applies to replies to Omega's messages
  if (message.reference) {
    try {
      const repliedTo = await message.fetchReference();
      if (repliedTo.author.id === message.client.user!.id) {
        // User is replying to Omega's message - check intent
        console.log('   🚪 Running intent gate (user replying to Omega)...');
        const intentResult = await checkIntentGate(message, messageHistory, repliedTo.content);

        // Log the intent gate decision to the append-only audit trail
        try {
          await logDecision({
            userId: message.author.id,
            username: message.author.username,
            decisionDescription: `Intent Gate: ${intentResult.shouldProceed ? 'PROCEED' : 'BLOCKED'} - ${intentResult.reason}`,
            blame: 'intentGate.ts',
            metadata: {
              decisionType: 'intentGate',
              shouldProceed: intentResult.shouldProceed,
              confidence: intentResult.confidence,
              classification: intentResult.classification,
              reason: intentResult.reason,
              channelId: message.channel.id,
              channelName: channelName,
              messageId: message.id,
              repliedToMessageId: repliedTo.id,
            },
          });
        } catch (decisionLogError) {
          console.error('⚠️  Failed to log intent gate decision:', decisionLogError);
        }

        // Store intent gate decision in database for telemetry
        // This is included in the response decision field for tracking
        try {
          await saveHumanMessage({
            userId: message.author.id,
            username: message.author.username,
            channelId: message.channel.id,
            channelName: channelName,
            guildId: message.guild?.id,
            messageContent: message.content,
            messageId: message.id,
            responseDecision: {
              shouldRespond: intentResult.shouldProceed,
              confidence: intentResult.confidence,
              reason: `Intent Gate: ${intentResult.reason}`,
            },
          });
        } catch (dbError) {
          console.error('⚠️  Failed to persist intent gate decision to database:', dbError);
        }

        if (!intentResult.shouldProceed) {
          console.log(`   ✋ Intent gate blocked: ${intentResult.reason}`);
          // Optionally, send a minimal acknowledgment if classification is non-interactive
          if (intentResult.classification === 'non-interactive' && intentResult.confidence >= 90) {
            const acknowledgment = '👍'; // Simple thumbs up for non-interactive comments
            const channel = message.channel;
            await message.react(acknowledgment);
            console.log(`   ✅ Sent reaction acknowledgment (non-interactive comment detected)`);
          }
          return;
        } else {
          console.log(`   ✅ Intent gate passed: ${intentResult.reason}`);
        }
      }
    } catch (refError) {
      console.log('   ⚠️ Could not fetch referenced message for intent gate - continuing');
      // Continue without intent gate if we can't fetch the reference
    }
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

    // Automatically create GitHub issue for build failure
    console.log('   📋 Automatically creating GitHub issue for build failure...');
    handleBuildFailureMessage(message).catch((error) => {
      console.error('   ⚠️  Failed to create GitHub issue for build failure:', error);
      // Continue processing the message even if issue creation fails
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
    // Use chunking for acknowledgment (though unlikely to be long)
    const channel = message.channel;
    let isFirstChunk = true;
    await sendChunkedMessage(
      acknowledgment,
      async (chunk) => {
        if (isFirstChunk) {
          await message.reply({
            content: chunk,
            allowedMentions: { repliedUser: false },
          });
          isFirstChunk = false;
        } else {
          if ('send' in channel) {
            await channel.send({ content: chunk });
          }
        }
      }
    );

    // Persist AI acknowledgment to database
    // (Human message already persisted earlier)
    try {
      await saveAIMessage({
        userId: message.client.user!.id,
        username: message.client.user!.username,
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

  // Human message already persisted to database earlier (before response decision)

  try {
    // Check for file attachments
    let enrichedContent = message.content;
    if (message.attachments.size > 0) {
      console.log(`   📎 Message has ${message.attachments.size} attachment(s)`);

      // CRITICAL: Gateway attachment URLs can be ephemeral (0-5 second TTL)
      // Re-fetch via REST API with with_application_state=true for durable URLs
      const restMessage = await fetchMessageWithDurableAttachments(message.client, message);

      if (restMessage && restMessage.attachments && restMessage.attachments.length > 0) {
        // Download and cache from DURABLE URLs
        console.log(`   Downloading ${restMessage.attachments.length} attachment(s) from durable URLs...`);

        for (let i = 0; i < restMessage.attachments.length; i++) {
          const restAttachment = restMessage.attachments[i];
          const gatewayAttachment = Array.from(message.attachments.values())[i];

          if (!gatewayAttachment) {
            console.warn(`   ⚠️  Gateway attachment ${i} missing - skipping`);
            continue;
          }

          try {
            // Download from REST URL (durable, won't 404)
            const { buffer, mimeType } = await downloadDurableAttachment(restAttachment);

            // Cache using attachment ID as key (stable, unlike URLs which have changing query params)
            setCachedAttachment(gatewayAttachment.id, {
              buffer,
              mimeType,
              filename: restAttachment.filename,
              size: buffer.length,
              url: gatewayAttachment.url,
              id: gatewayAttachment.id,
              timestamp: Date.now(),
            });

            console.log(`   ✅ Cached attachment [${gatewayAttachment.id}] ${restAttachment.filename}`);
          } catch (error) {
            console.error(`   ❌ Failed to download attachment [${gatewayAttachment.id}] ${restAttachment.filename}:`, error);
            console.error(`   ⚠️  Tools won't be able to access this attachment!`);
            // Continue with other attachments
          }
        }
      } else if (!restMessage) {
        console.error(`   ❌ Failed to fetch message via REST - attachment caching skipped`);
        console.error(`   ⚠️  Tools won't be able to access these ${message.attachments.size} attachment(s)!`);
      } else if (!restMessage.attachments || restMessage.attachments.length === 0) {
        console.warn(`   ⚠️  REST message has no attachments (expected ${message.attachments.size})`);
      }

      const attachmentInfo = Array.from(message.attachments.values())
        .map(att => `- ${att.name} (${att.contentType || 'unknown type'}, ${(att.size / 1024).toFixed(2)} KB): ${att.url}`)
        .join('\n');

      enrichedContent = `${message.content}\n\n**[ATTACHMENTS]**\n${attachmentInfo}`;
      console.log('   Attachment details added to message context');
    }

    // Prepare structured attachment data for tools (not just markdown text)
    const structuredAttachments = message.attachments.size > 0
      ? Array.from(message.attachments.values()).map(att => ({
          id: att.id, // Stable ID for cache lookups
          url: att.url,
          filename: att.name,
          contentType: att.contentType || 'unknown',
          size: att.size,
        }))
      : [];

    // Set message context for export, conversation diagram, and slidev tools
    setExportMessageContext(message);
    setConversationDiagramContext(message);
    setSlidevMessageContext(message);

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
        attachments: structuredAttachments, // Pass structured attachment data
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

    // Send tool reports FIRST (in order of occurrence), then the final response
    // Using plain text messages instead of embeds
    if (result.toolCalls && result.toolCalls.length > 0 && 'send' in message.channel) {
      console.log(`🔧 Sending ${result.toolCalls.length} tool usage reports...`);

      // Persist tool calls to database
      for (const toolCall of result.toolCalls) {
        try {
          await saveToolExecution({
            userId: message.client.user!.id,
            username: message.client.user!.username,
            channelId: message.channel.id,
            channelName: channelName,
            guildId: message.guild?.id,
            toolName: toolCall.toolName,
            toolArgs: toolCall.args,
            toolResult: toolCall.result,
            parentMessageId: message.id,
          });

          // Log tool execution decision to the append-only audit trail
          await logDecision({
            userId: message.author.id,
            username: message.author.username,
            decisionDescription: `Tool Execution: ${toolCall.toolName}`,
            blame: 'runAgent',
            metadata: {
              decisionType: 'toolExecution',
              toolName: toolCall.toolName,
              toolArgs: toolCall.args,
              channelId: message.channel.id,
              channelName: channelName,
              messageId: message.id,
            },
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

              // Send plain text with chart image attached (chunked if needed)
              const channel = message.channel;
              if ('send' in channel) {
                await sendChunkedMessage(
                  plainTextReport,
                  async (chunk) => await channel.send({
                    content: chunk,
                    files: [attachment],
                  })
                );
              }
              console.log(`✅ Sent chart image attachment (${buffer.length} bytes)`);
            } else {
              console.error(`❌ Failed to download chart image: HTTP ${imageResponse.status}`);
              // Send plain text without attachment (chunked if needed)
              const statusEmoji = '❌';
              const plainTextReport = `🔧 ${i + 1}/${result.toolCalls.length}: ${toolCall.toolName}\n${statusEmoji} Failed to download chart`;
              const channel = message.channel;
              if ('send' in channel) {
                await sendChunkedMessage(plainTextReport, async (chunk) => await channel.send({ content: chunk }));
              }
            }
          } catch (error) {
            logError(error, {
              operation: 'Download and attach chart image',
              toolName: 'renderChart',
              username: message.author.username,
              channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
              additionalInfo: { downloadUrl: toolCall.result?.downloadUrl },
            });
            // Fallback: send plain text without attachment (chunked if needed)
            const plainTextReport = `🔧 ${i + 1}/${result.toolCalls.length}: ${toolCall.toolName}\n❌ Error downloading chart`;
            const channel = message.channel;
            if ('send' in channel) {
              await sendChunkedMessage(plainTextReport, async (chunk) => await channel.send({ content: chunk }));
            }
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

            // Send plain text message (chunked if needed)
            const channel = message.channel;
            if ('send' in channel) {
              await sendChunkedMessage(plainTextReport, async (chunk) => await channel.send({ content: chunk }));
            }
            console.log(`✅ Sent generated image URL`);
          } catch (error) {
            logError(error, {
              operation: 'Display generated image URL',
              toolName: 'generateUserImage',
              username: message.author.username,
              channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
              additionalInfo: { imageUrl: toolCall.result?.imageUrl },
            });
            // Fallback: send plain text error (chunked if needed)
            const plainTextReport = `🔧 ${i + 1}/${result.toolCalls.length}: ${toolCall.toolName}\n❌ Error displaying image`;
            const channel = message.channel;
            if ('send' in channel) {
              await sendChunkedMessage(plainTextReport, async (chunk) => await channel.send({ content: chunk }));
            }
          }
        } else {
          // Regular tool report - send as plain text (chunked if needed)
          const statusEmoji = toolCall.result?.success !== false ? '✅' : '❌';
          const statusText = toolCall.result?.success !== false ? 'Success' : 'Failed';
          const durationText = toolCall.duration ? ` • ${toolCall.duration.toFixed(2)}s` : '';
          let plainTextReport = `🔧 ${i + 1}/${result.toolCalls.length}: ${toolCall.toolName}\n${statusEmoji} ${statusText}${durationText}`;

          // Add args info
          if (toolCall.args && typeof toolCall.args === 'object') {
            const argsStr = JSON.stringify(toolCall.args, null, 2);
            // Truncate args if too long (keep under 800 chars for readability)
            const truncatedArgs = argsStr.length > 800 ? argsStr.substring(0, 800) + '\n... (truncated)' : argsStr;
            plainTextReport += `\n**Args:**\n\`\`\`json\n${truncatedArgs}\n\`\`\``;
          }

          // Add result info - always show, truncate if too long
          if (toolCall.result && typeof toolCall.result === 'object') {
            const resultStr = JSON.stringify(toolCall.result, null, 2);
            // Truncate result if too long (keep under 1500 chars to stay within Discord limits after chunking)
            const truncatedResult = resultStr.length > 1500 ? resultStr.substring(0, 1500) + '\n... (truncated)' : resultStr;
            plainTextReport += `\n**Result:**\n\`\`\`json\n${truncatedResult}\n\`\`\``;
          }

          const channel = message.channel;
          if ('send' in channel) {
            await sendChunkedMessage(plainTextReport, async (chunk) => await channel.send({ content: chunk }));
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
      // Analyze sentiment of bot's response to detect final answers/key decisions
      try {
        const responseAnalysis = await analyzeSentiment(
          result.response,
          message.client.user!.username,
          { previousMessages: messageHistory.map(m => ({ content: m.content })) }
        );

        // Detect if this is a final answer or key decision based on sentiment and keywords
        const decisionKeywords = [
          'recommend', 'conclude', 'solution', 'final', 'decision', 'resolved',
          'determined', 'suggest', 'advise', 'best approach', 'should use',
          'here\'s how', 'the answer is', 'in conclusion', 'to summarize',
          'my recommendation', 'key takeaway', 'bottom line'
        ];

        const containsDecisionKeyword = decisionKeywords.some(keyword =>
          result.response.toLowerCase().includes(keyword)
        );

        const isFinalAnswer =
          (responseAnalysis.confidence >= 0.75) &&
          (containsDecisionKeyword ||
           result.response.length > 300 ||
           (result.toolCalls && result.toolCalls.length >= 2));

        if (isFinalAnswer) {
          // Log this as a key decision/final answer
          const decisionDescription = result.response.length > 150
            ? result.response.substring(0, 147) + '...'
            : result.response;

          await logDecision({
            userId: message.author.id,
            username: message.author.username,
            decisionDescription: `Final Answer / Key Decision: ${decisionDescription}`,
            blame: 'messageHandler.ts:sentimentBasedDecisionDetection',
            metadata: {
              decisionType: 'finalAnswer',
              sentiment: responseAnalysis.sentiment,
              confidence: responseAnalysis.confidence,
              emotionalTone: responseAnalysis.emotionalTone,
              archetypeAlignment: responseAnalysis.archetypeAlignment,
              responseLength: result.response.length,
              toolsUsed: result.toolCalls?.length || 0,
              toolNames: result.toolCalls?.map(tc => tc.toolName) || [],
              channelId: message.channel.id,
              channelName: channelName,
              messageId: message.id,
              containsDecisionKeyword,
            },
          });

          console.log(`📊 Logged final answer decision (sentiment: ${responseAnalysis.sentiment}, confidence: ${responseAnalysis.confidence})`);
        }
      } catch (analysisError) {
        console.error('⚠️  Failed to analyze response sentiment for decision logging:', analysisError);
        // Continue anyway - don't block message sending
      }

      // Extract large code blocks before chunking
      const { message: cleanedResponse, codeBlocks } = extractLargeCodeBlocks(result.response);

      // Build attachments from extracted code blocks
      const attachments: AttachmentBuilder[] = codeBlocks.map(block =>
        new AttachmentBuilder(Buffer.from(block.content, 'utf-8'), { name: block.filename })
      );

      if (codeBlocks.length > 0) {
        console.log(`📎 Extracted ${codeBlocks.length} large code block(s) as attachments`);
        codeBlocks.forEach(block => {
          console.log(`   - ${block.filename} (${block.lineCount} lines, ${block.charCount} chars)`);
        });
      }

      // Send as plain text message (chunked if needed for messages > 2000 chars)
      const channel = message.channel;
      let isFirstChunk = true;
      await sendChunkedMessage(
        cleanedResponse,
        async (chunk) => {
          if (isFirstChunk) {
            // First chunk as a reply with attachments (if any)
            await message.reply({
              content: chunk,
              files: attachments.length > 0 ? attachments : undefined,
              allowedMentions: { repliedUser: false }, // Don't ping the user
            });
            isFirstChunk = false;
          } else {
            // Subsequent chunks as regular messages (no attachments)
            if ('send' in channel) {
              await channel.send({ content: chunk });
            }
          }
        }
      );
      console.log(`✅ Sent response (${result.response.length} chars)`);

      // Persist AI response to database
      try {
        await saveAIMessage({
          userId: message.client.user!.id,
          username: message.client.user!.username,
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

      // Track bot's response in conversation
      try {
        const conversationId = await getOrCreateConversation({
          userId: message.author.id,
          username: message.author.username,
          channelId: message.channel.id,
        });

        await addMessageToConversation({
          conversationId,
          senderType: 'bot',
          userId: message.client.user!.id,
          username: message.client.user!.username,
          content: result.response,
        });
      } catch (conversationError) {
        console.error('⚠️  Failed to track bot response in conversation:', conversationError);
        // Continue execution even if conversation tracking fails
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

    // Report to GitHub via error monitoring (creates/updates issue with @claude)
    captureError(error instanceof Error ? error : new Error(String(error)), {
      railwayService: 'omega-bot',
      logContext: [
        `User: ${message.author.username}`,
        `Channel: ${message.channel.isDMBased() ? 'DM' : (message.channel as any).name}`,
        `Message: ${message.content.substring(0, 200)}`,
      ],
    }).catch((captureErr) => console.error('Failed to capture error:', captureErr));

    // Generate a user-friendly error message
    const userErrorMessage = generateUserErrorMessage(error, {
      operation: 'message processing',
      username: message.author.username,
    });

    // Send error message to user (chunked if needed)
    try {
      const channel = message.channel;
      let isFirstChunk = true;
      await sendChunkedMessage(
        userErrorMessage,
        async (chunk) => {
          if (isFirstChunk) {
            await message.reply({
              content: chunk,
              allowedMentions: { repliedUser: false },
            });
            isFirstChunk = false;
          } else {
            if ('send' in channel) {
              await channel.send({ content: chunk });
            }
          }
        }
      );
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
