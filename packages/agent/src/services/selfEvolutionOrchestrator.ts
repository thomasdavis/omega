/**
 * Self-Evolution Orchestrator Service
 * Implements the daily OODA loop for Omega's reflective improvement
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { OMEGA_MODEL } from '@repo/shared';
import {
  createCycle,
  getCycleByDate,
  createAction,
  createSanityCheck,
  createMetric,
  createBranch,
  updateCycleStatus,
  updateCycleSummary,
  queryMessages,
  getRecentCycles,
} from '@repo/database';

const KILL_SWITCH_ENV = 'SELF_EVOLUTION_ENABLED';
const FEATURE_FLAG_ENV = 'SELF_EVOLUTION_FEATURE_FLAGS';

export interface EvolutionAction {
  type: 'capability' | 'future' | 'wildcard' | 'prompt' | 'persona';
  title: string;
  description: string;
  reasoning: string;
  priority: number;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface ObserveResult {
  messageVolume: number;
  topTools: string[];
  errorCount: number;
  userSatisfaction: number;
  commonTopics: string[];
  frictionPoints: string[];
}

export interface OrientResult {
  userNeeds: string[];
  technicalDebt: string[];
  missingCapabilities: string[];
  opportunities: string[];
}

export interface DecideResult {
  actions: EvolutionAction[];
  reasoning: string;
  riskAssessment: string;
}

/**
 * Check if self-evolution is enabled
 */
export function isSelfEvolutionEnabled(): boolean {
  const envValue = process.env[KILL_SWITCH_ENV];
  return envValue === 'true' || envValue === '1';
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureFlagEnabled(flagName: string): boolean {
  const flags = process.env[FEATURE_FLAG_ENV];
  if (!flags) return false;
  const flagList = flags.split(',').map((f) => f.trim());
  return flagList.includes(flagName);
}

/**
 * OBSERVE: Analyze last 24 hours of interactions
 */
export async function observe(): Promise<ObserveResult> {
  console.log('👁️  OBSERVE: Analyzing last 24 hours...');

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Query messages from last 24h
  const messages = await queryMessages({
    timeRange: {
      start: BigInt(oneDayAgo),
      end: BigInt(now),
    },
    limit: 1000,
  });

  // Analyze message volume
  const messageVolume = messages.length;

  // Extract tool usage
  const toolUsage: Record<string, number> = {};
  let errorCount = 0;

  for (const msg of messages) {
    if (msg.tool_name) {
      toolUsage[msg.tool_name] = (toolUsage[msg.tool_name] || 0) + 1;
    }
    if (msg.tool_result && typeof msg.tool_result === 'string') {
      if (msg.tool_result.includes('error') || msg.tool_result.includes('failed')) {
        errorCount++;
      }
    }
  }

  const topTools = Object.entries(toolUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tool]) => tool);

  // Analyze sentiment for user satisfaction
  let totalSentiment = 0;
  let sentimentCount = 0;

  for (const msg of messages) {
    if (msg.sentiment_analysis && typeof msg.sentiment_analysis === 'object') {
      const sentiment = msg.sentiment_analysis as any;
      if (sentiment.sentiment === 'positive') {
        totalSentiment += 1;
        sentimentCount++;
      } else if (sentiment.sentiment === 'negative') {
        totalSentiment -= 1;
        sentimentCount++;
      }
    }
  }

  const userSatisfaction = sentimentCount > 0 ? (totalSentiment / sentimentCount + 1) / 2 : 0.5;

  // Use AI to extract common topics and friction points
  const model = openai(OMEGA_MODEL);
  const analysisPrompt = `Analyze these ${messageVolume} messages from the last 24 hours:

Message sample (first 50 messages):
${messages
  .slice(0, 50)
  .map((m) => `- [${m.sender_type}] ${m.message_content.slice(0, 200)}`)
  .join('\n')}

Top tools used: ${topTools.join(', ')}
Error count: ${errorCount}
User sentiment: ${(userSatisfaction * 100).toFixed(0)}% positive

Identify:
1. Common topics (3-5 topics)
2. Friction points (specific issues users encountered)

Format as JSON:
{
  "commonTopics": ["topic1", "topic2", ...],
  "frictionPoints": ["friction1", "friction2", ...]
}`;

  try {
    const analysis = await generateText({
      model,
      prompt: analysisPrompt,
    });

    const parsed = JSON.parse(analysis.text);

    return {
      messageVolume,
      topTools,
      errorCount,
      userSatisfaction,
      commonTopics: parsed.commonTopics || [],
      frictionPoints: parsed.frictionPoints || [],
    };
  } catch (error) {
    console.error('Failed to analyze topics/friction:', error);
    return {
      messageVolume,
      topTools,
      errorCount,
      userSatisfaction,
      commonTopics: [],
      frictionPoints: [],
    };
  }
}

/**
 * ORIENT: Cluster needs and identify opportunities
 */
export async function orient(observeResult: ObserveResult): Promise<OrientResult> {
  console.log('🧭 ORIENT: Clustering needs and opportunities...');

  const model = openai(OMEGA_MODEL);

  // Get recent evolution history
  const recentCycles = await getRecentCycles(5);

  const orientPrompt = `Based on the following observations, identify strategic opportunities:

OBSERVATIONS:
- Message volume: ${observeResult.messageVolume}
- Top tools: ${observeResult.topTools.join(', ')}
- Error count: ${observeResult.errorCount}
- User satisfaction: ${(observeResult.userSatisfaction * 100).toFixed(0)}%
- Common topics: ${observeResult.commonTopics.join(', ')}
- Friction points: ${observeResult.frictionPoints.join(', ')}

RECENT EVOLUTION HISTORY:
${recentCycles
  .map((cycle) => `- ${cycle.cycleDate.toISOString().split('T')[0]}: ${cycle.summary || 'N/A'}`)
  .join('\n')}

Analyze and identify:
1. User needs (what users are trying to accomplish)
2. Technical debt (recurring issues, inefficiencies)
3. Missing capabilities (tools/features that would help)
4. Opportunities (strategic improvements)

Format as JSON:
{
  "userNeeds": ["need1", "need2", ...],
  "technicalDebt": ["debt1", "debt2", ...],
  "missingCapabilities": ["cap1", "cap2", ...],
  "opportunities": ["opp1", "opp2", ...]
}`;

  try {
    const analysis = await generateText({
      model,
      prompt: orientPrompt,
    });

    return JSON.parse(analysis.text);
  } catch (error) {
    console.error('Failed to orient:', error);
    return {
      userNeeds: [],
      technicalDebt: [],
      missingCapabilities: [],
      opportunities: [],
    };
  }
}

/**
 * DECIDE: Select actions for implementation
 */
export async function decide(
  observeResult: ObserveResult,
  orientResult: OrientResult
): Promise<DecideResult> {
  console.log('🤔 DECIDE: Selecting improvement actions...');

  const model = openai(OMEGA_MODEL);

  const decidePrompt = `You are Omega, an AI agent analyzing your own performance and deciding on improvements.

OBSERVATIONS:
${JSON.stringify(observeResult, null, 2)}

STRATEGIC ORIENTATION:
${JSON.stringify(orientResult, null, 2)}

TASK: Select 2-3 improvement actions following these rules:

1. EXACTLY 1 capability/infrastructure improvement
   - Examples: new tool, schema change, performance optimization, bug fix

2. EXACTLY 1 anticipatory/future need
   - Examples: schema stubs for upcoming features, integration spikes, research

3. EXACTLY 1 wildcard change (your personal choice)
   - Examples: personality quip pack, comedic mouth cadence, visual micro-effect
   - Must stay within canon (no identity overhaul)
   - Should be fun, creative, and reflect your taste

CONSTRAINTS:
- Each action must be specific and actionable
- Avoid breaking core message handling
- Keep changes small and testable
- Priority: 1-10 (10 = highest)
- Complexity: low/medium/high

Format as JSON:
{
  "actions": [
    {
      "type": "capability",
      "title": "...",
      "description": "...",
      "reasoning": "...",
      "priority": 8,
      "estimatedComplexity": "medium"
    },
    {
      "type": "future",
      "title": "...",
      "description": "...",
      "reasoning": "...",
      "priority": 6,
      "estimatedComplexity": "low"
    },
    {
      "type": "wildcard",
      "title": "...",
      "description": "...",
      "reasoning": "...",
      "priority": 5,
      "estimatedComplexity": "low"
    }
  ],
  "reasoning": "Overall reasoning for this selection...",
  "riskAssessment": "Potential risks and mitigations..."
}`;

  try {
    const decision = await generateText({
      model,
      prompt: decidePrompt,
    });

    return JSON.parse(decision.text);
  } catch (error) {
    console.error('Failed to decide:', error);
    return {
      actions: [],
      reasoning: 'Decision failed due to error',
      riskAssessment: 'Unknown',
    };
  }
}

/**
 * ACT: Create branch, issues, and PR (placeholder)
 */
export async function act(cycleId: number, actions: EvolutionAction[]): Promise<void> {
  console.log('⚡ ACT: Creating implementation artifacts...');

  const branchName = `self-evo/${new Date().toISOString().split('T')[0]}`;

  // Record branch
  await createBranch({
    cycleId,
    branchName,
    baseBranch: 'main',
  });

  // Record each action
  for (const action of actions) {
    await createAction({
      cycleId,
      type: action.type,
      title: action.title,
      description: action.description,
      branchName,
      status: 'planned',
      notes: `Priority: ${action.priority}, Complexity: ${action.estimatedComplexity}\n\nReasoning: ${action.reasoning}`,
    });
  }

  console.log(`✅ Recorded ${actions.length} actions for implementation`);
}

/**
 * RECORD: Store cycle summary and metrics
 */
export async function record(
  cycleId: number,
  observeResult: ObserveResult,
  decideResult: DecideResult
): Promise<void> {
  console.log('📝 RECORD: Storing cycle data...');

  // Update cycle summary
  const summary = `Daily evolution cycle completed.

Observations:
- Messages: ${observeResult.messageVolume}
- Errors: ${observeResult.errorCount}
- Satisfaction: ${(observeResult.userSatisfaction * 100).toFixed(0)}%

Actions selected: ${decideResult.actions.length}
${decideResult.actions.map((a) => `- [${a.type}] ${a.title}`).join('\n')}

Reasoning: ${decideResult.reasoning}`;

  await updateCycleSummary(cycleId, summary);

  // Store metrics
  await createMetric({
    cycleId,
    metricName: 'message_volume',
    metricValue: observeResult.messageVolume,
    unit: 'count',
  });

  await createMetric({
    cycleId,
    metricName: 'error_count',
    metricValue: observeResult.errorCount,
    unit: 'count',
  });

  await createMetric({
    cycleId,
    metricName: 'user_satisfaction',
    metricValue: observeResult.userSatisfaction,
    unit: 'ratio',
  });

  await createMetric({
    cycleId,
    metricName: 'actions_selected',
    metricValue: decideResult.actions.length,
    unit: 'count',
  });

  console.log('✅ Cycle data recorded');
}

/**
 * Run daily self-evolution cycle
 */
export async function runDailyCycle(): Promise<{ success: boolean; cycleId?: number; error?: string }> {
  console.log('🚀 Starting daily self-evolution cycle...');

  // Check kill switch
  if (!isSelfEvolutionEnabled()) {
    console.log('⚠️  Self-evolution is disabled (SELF_EVOLUTION_ENABLED is not set to true)');
    return {
      success: false,
      error: 'Self-evolution disabled by kill switch',
    };
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if cycle already exists
    const existingCycle = await getCycleByDate(today);
    if (existingCycle) {
      console.log('⚠️  Cycle already exists for today');
      return {
        success: false,
        error: 'Cycle already exists for today',
      };
    }

    // Create cycle
    const cycle = await createCycle({
      cycleDate: today,
      status: 'running',
    });

    console.log(`📅 Created cycle #${cycle.id} for ${today.toISOString().split('T')[0]}`);

    // OBSERVE
    const observeResult = await observe();

    // ORIENT
    const orientResult = await orient(observeResult);

    // DECIDE
    const decideResult = await decide(observeResult, orientResult);

    if (decideResult.actions.length === 0) {
      await updateCycleStatus(cycle.id, 'failed', new Date());
      return {
        success: false,
        error: 'No actions decided',
      };
    }

    // ACT
    await act(cycle.id, decideResult.actions);

    // RECORD
    await record(cycle.id, observeResult, decideResult);

    // Complete cycle
    await updateCycleStatus(cycle.id, 'completed', new Date());

    console.log('✅ Daily self-evolution cycle completed successfully!');

    return {
      success: true,
      cycleId: cycle.id,
    };
  } catch (error) {
    console.error('❌ Error in self-evolution cycle:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * CLI entry point for testing
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Running self-evolution cycle (test mode)...');
  runDailyCycle()
    .then((result) => {
      if (result.success) {
        console.log('✅ Success! Cycle ID:', result.cycleId);
      } else {
        console.error('❌ Failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}
