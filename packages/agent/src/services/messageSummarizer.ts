/**
 * Message Summarizer Service — Multi-Pass Summarize-Then-Synthesize
 *
 * Pass 1: Batch summarization (parallelizable) — split messages into chronological batches,
 *         extract topics, emotional arc, notable quotes, communication observations,
 *         and how the user interacts with Omega vs other people
 *
 * Pass 2: Temporal synthesis — feed all batch summaries into a single call to produce
 *         a ~1000-word temporal narrative
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { MessageRecord } from '@repo/database';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Model used for summarization — GPT-5 for deeper insight */
const SUMMARIZER_MODEL = 'gpt-5';

export const MESSAGE_COLLECTION_CONFIG = {
  /** Max messages to fetch for analysis */
  MAX_MESSAGES_TO_FETCH: 5000,
  /** Batch size for Pass 1 summarization */
  BATCH_SIZE: 100,
  /** Number of recent raw messages to pass verbatim to Pass 3 */
  RECENT_RAW_MESSAGES: 50,
  /** Max channels to fetch from */
  MAX_CHANNELS_TO_FETCH: 10,
  /** Messages per channel */
  MESSAGES_PER_CHANNEL: 500,
  /** Concurrency limit for parallel batch summarization */
  CONCURRENCY_LIMIT: 5,
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface BatchSummary {
  batchIndex: number;
  dateRange: string;
  messageCount: number;
  summary: string;
}

export interface TemporalSynthesis {
  narrative: string;
  interactionsWithOthersSummary: string;
}

// =============================================================================
// PASS 1 — BATCH SUMMARIZATION
// =============================================================================

/**
 * Split messages into chronological batches and summarize each in parallel
 */
export async function batchSummarizeMessages(
  username: string,
  messages: MessageRecord[],
  allChannelMessages: MessageRecord[],
): Promise<BatchSummary[]> {
  // Sort messages chronologically (oldest first)
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  // Split into batches
  const batches: MessageRecord[][] = [];
  for (let i = 0; i < sorted.length; i += MESSAGE_COLLECTION_CONFIG.BATCH_SIZE) {
    batches.push(sorted.slice(i, i + MESSAGE_COLLECTION_CONFIG.BATCH_SIZE));
  }

  if (batches.length === 0) return [];

  console.log(`  [Summarizer] Pass 1: ${batches.length} batches of ~${MESSAGE_COLLECTION_CONFIG.BATCH_SIZE} messages`);

  // Build a lookup of channel messages by ID for context
  const channelMsgMap = new Map<string, MessageRecord>();
  allChannelMessages.forEach(m => channelMsgMap.set(m.id, m));

  // Parallel summarization with concurrency limit
  const results: BatchSummary[] = [];
  for (let i = 0; i < batches.length; i += MESSAGE_COLLECTION_CONFIG.CONCURRENCY_LIMIT) {
    const chunk = batches.slice(i, i + MESSAGE_COLLECTION_CONFIG.CONCURRENCY_LIMIT);
    const promises = chunk.map((batch, idx) =>
      summarizeBatch(username, batch, allChannelMessages, i + idx)
    );
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
    console.log(`  [Summarizer] Pass 1: completed batches ${i + 1}-${Math.min(i + MESSAGE_COLLECTION_CONFIG.CONCURRENCY_LIMIT, batches.length)}/${batches.length}`);
  }

  return results;
}

async function summarizeBatch(
  username: string,
  batch: MessageRecord[],
  allChannelMessages: MessageRecord[],
  batchIndex: number,
): Promise<BatchSummary> {
  const firstDate = new Date(batch[0].timestamp).toISOString().split('T')[0];
  const lastDate = new Date(batch[batch.length - 1].timestamp).toISOString().split('T')[0];

  // Build conversation context — include surrounding messages from the same channels
  const batchChannelIds = new Set(batch.map(m => m.channel_id).filter(Boolean));
  const batchTimestampMin = batch[0].timestamp;
  const batchTimestampMax = batch[batch.length - 1].timestamp;

  // Find other people's messages and Omega's responses in the same timeframe
  const contextMessages = allChannelMessages.filter(m =>
    batchChannelIds.has(m.channel_id) &&
    m.timestamp >= batchTimestampMin &&
    m.timestamp <= batchTimestampMax
  );

  // Identify messages to/from other humans (not Omega, not the target user)
  const otherPeopleMessages = contextMessages.filter(m =>
    m.sender_type === 'human' && m.username !== username
  );

  // Format the batch messages
  const messageList = batch.map(m => {
    const date = new Date(m.timestamp).toISOString().split('T')[0];
    return `[${date}] ${m.username || username}: ${m.message_content}`;
  }).join('\n');

  // Format interactions with others context
  const othersContext = otherPeopleMessages.length > 0
    ? otherPeopleMessages.slice(0, 30).map(m => {
      const date = new Date(m.timestamp).toISOString().split('T')[0];
      return `[${date}] ${m.username}: ${m.message_content.slice(0, 200)}`;
    }).join('\n')
    : 'No visible interactions with other users in this batch.';

  // Omega's responses in this timeframe
  const omegaResponses = contextMessages.filter(m => m.sender_type === 'ai').slice(0, 20);
  const omegaContext = omegaResponses.length > 0
    ? omegaResponses.map(m => {
      const date = new Date(m.timestamp).toISOString().split('T')[0];
      return `[${date}] Omega: ${m.message_content.slice(0, 200)}`;
    }).join('\n')
    : '';

  const prompt = `You are analyzing a batch of Discord messages from user "${username}" for psychological profiling.

## Messages from ${username} (${firstDate} to ${lastDate}):
${messageList}

${omegaContext ? `## Omega's responses to them:\n${omegaContext}\n` : ''}

## Other people's messages in the same channels:
${othersContext}

## Extract the following:

1. **Topics discussed**: What were they talking about?
2. **Emotional arc**: How did their emotional state shift across these messages?
3. **Notable quotes**: 2-3 verbatim quotes that reveal personality or character
4. **Communication observations**: Style shifts, vocabulary patterns, rhetoric
5. **How ${username} interacts with Omega**: Are they curious, demanding, rude, playful, deep?
6. **How ${username} interacts with OTHER people**: Are they helpful, rude, funny, dominant, passive, supportive? (If no interactions visible, say so)

Keep the summary under 400 words. Be specific, not generic.`;

  try {
    const result = await generateText({
      model: openai.chat(SUMMARIZER_MODEL),
      prompt,
    });

    return {
      batchIndex,
      dateRange: `${firstDate} to ${lastDate}`,
      messageCount: batch.length,
      summary: result.text,
    };
  } catch (error) {
    console.error(`  [Summarizer] Batch ${batchIndex} failed:`, error);
    return {
      batchIndex,
      dateRange: `${firstDate} to ${lastDate}`,
      messageCount: batch.length,
      summary: `[Summarization failed for batch ${batchIndex}]`,
    };
  }
}

// =============================================================================
// PASS 2 — TEMPORAL SYNTHESIS
// =============================================================================

/**
 * Feed all batch summaries chronologically into one call to produce a temporal narrative
 */
export async function synthesizeTemporalNarrative(
  username: string,
  batchSummaries: BatchSummary[],
  messageCount: number,
): Promise<TemporalSynthesis> {
  if (batchSummaries.length === 0) {
    return {
      narrative: 'Insufficient data for temporal synthesis.',
      interactionsWithOthersSummary: 'No data available.',
    };
  }

  console.log(`  [Summarizer] Pass 2: Temporal synthesis from ${batchSummaries.length} batch summaries`);

  const summariesText = batchSummaries
    .sort((a, b) => a.batchIndex - b.batchIndex)
    .map(s => `### Batch ${s.batchIndex + 1} (${s.dateRange}, ${s.messageCount} messages)\n${s.summary}`)
    .join('\n\n---\n\n');

  const prompt = `You are synthesizing a chronological analysis of Discord user "${username}" across ${messageCount} total messages.

Below are chronological batch summaries of their activity. Your job is to weave these into a coherent temporal narrative.

${summariesText}

## Produce TWO sections:

### 1. Temporal Narrative (~1000 words)
Write a detailed chronological narrative covering:
- **Trends**: How have their topics, tone, and engagement evolved over time?
- **Inflection points**: Were there moments of significant change in behavior or attitude?
- **Vocabulary evolution**: Has their language become more or less sophisticated/formal/casual?
- **Relationship arc with Omega**: How has their dynamic with the bot changed? (More comfortable? More demanding? More playful?)
- **Emotional trajectory**: Are they becoming happier, more cynical, more engaged, more disengaged?
- **Consistency patterns**: What stays constant about them across all periods?

### 2. Interactions With Others Summary (~300 words)
Specifically synthesize how ${username} treats and interacts with OTHER people in the server:
- Are they helpful to others?
- Do they start conflicts or resolve them?
- How do they treat newcomers vs regulars?
- Are they a leader, follower, or independent?
- Do they change behavior based on who they're talking to?
- Any notable relationships with specific people?

Be specific with evidence from the summaries. No generic observations.`;

  try {
    const result = await generateText({
      model: openai.chat(SUMMARIZER_MODEL),
      prompt,
    });

    // Split the response into the two sections
    const text = result.text;
    const othersIdx = text.indexOf('### 2.');
    if (othersIdx === -1) {
      // Fallback: treat entire thing as narrative
      const interactIdx = text.toLowerCase().indexOf('interactions with others');
      if (interactIdx !== -1) {
        return {
          narrative: text.slice(0, interactIdx).trim(),
          interactionsWithOthersSummary: text.slice(interactIdx).trim(),
        };
      }
      return {
        narrative: text,
        interactionsWithOthersSummary: 'See narrative above for interaction observations.',
      };
    }

    return {
      narrative: text.slice(0, othersIdx).trim(),
      interactionsWithOthersSummary: text.slice(othersIdx).trim(),
    };
  } catch (error) {
    console.error('  [Summarizer] Pass 2 temporal synthesis failed:', error);
    return {
      narrative: 'Temporal synthesis failed — falling back to batch summaries.',
      interactionsWithOthersSummary: 'Unable to synthesize interaction patterns.',
    };
  }
}
