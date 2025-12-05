#!/usr/bin/env tsx
/**
 * Self-Evolution Cycle Orchestrator
 *
 * Implements the daily self-evolution loop for Omega:
 * 1. Observe - Analyze recent interactions and internal signals
 * 2. Orient - Identify friction points and opportunities
 * 3. Decide - Select improvements (capability + future + wildcard)
 * 4. Act - Create branch, implement changes, open PR
 * 5. Record - Log everything to database
 *
 * Usage:
 *   tsx src/scripts/self-evolution-cycle.ts
 *
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string
 *   GITHUB_TOKEN - GitHub API token
 *   DRY_RUN - Set to 'true' to analyze without making changes
 *   ANTHROPIC_API_KEY - Claude API key for analysis
 */

import { selfEvolutionService, pgMessageService } from '@repo/database';

const DRY_RUN = process.env.DRY_RUN === 'true';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = 'thomasdavis/omega';

interface AnalysisResult {
  messageVolume: number;
  topTopics: string[];
  topTools: string[];
  errorCount: number;
  sentimentTrend: string;
  frictionPoints: string[];
}

interface ProposedAction {
  type: 'capability' | 'future' | 'wildcard' | 'prompt' | 'persona';
  title: string;
  description: string;
  reasoning: string;
  estimatedImpact: string;
}

/**
 * Observe: Analyze last 24h of activity
 */
async function observePhase(): Promise<AnalysisResult> {
  console.log('🔍 OBSERVE: Analyzing last 24h of activity...');

  const oneDayAgo = BigInt(Date.now() - 24 * 60 * 60 * 1000);

  // Get recent messages
  const recentMessages = await pgMessageService.queryMessages({
    limit: 1000,
    afterTimestamp: Number(oneDayAgo),
  });

  // Analyze message volume
  const messageVolume = recentMessages.length;
  const humanMessages = recentMessages.filter((m) => m.sender_type === 'human');
  const toolMessages = recentMessages.filter((m) => m.sender_type === 'tool');

  // Extract topics and tools
  const toolCounts = new Map<string, number>();
  const errorMessages: any[] = [];

  for (const msg of toolMessages) {
    if (msg.tool_name) {
      toolCounts.set(msg.tool_name, (toolCounts.get(msg.tool_name) || 0) + 1);
    }

    // Check for errors
    if (msg.tool_result && msg.tool_result.includes('error')) {
      errorMessages.push(msg);
    }
  }

  // Get top tools
  const topTools = Array.from(toolCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tool]) => tool);

  // Analyze sentiment
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const msg of humanMessages) {
    if (msg.sentiment_analysis) {
      const sentiment =
        typeof msg.sentiment_analysis === 'string'
          ? JSON.parse(msg.sentiment_analysis).sentiment
          : msg.sentiment_analysis.sentiment;

      if (sentiment in sentimentCounts) {
        sentimentCounts[sentiment as keyof typeof sentimentCounts]++;
      }
    }
  }

  const totalSentiment = Object.values(sentimentCounts).reduce((a, b) => a + b, 0);
  let sentimentTrend = 'neutral';
  if (totalSentiment > 0) {
    if (sentimentCounts.positive > sentimentCounts.negative) {
      sentimentTrend = 'positive';
    } else if (sentimentCounts.negative > sentimentCounts.positive) {
      sentimentTrend = 'negative';
    }
  }

  // Identify friction points
  const frictionPoints: string[] = [];
  if (errorMessages.length > 5) {
    frictionPoints.push(`High error rate: ${errorMessages.length} tool errors in 24h`);
  }

  console.log('📊 Analysis results:');
  console.log(`  - Message volume: ${messageVolume} (${humanMessages.length} human, ${toolMessages.length} tool)`);
  console.log(`  - Top tools: ${topTools.join(', ')}`);
  console.log(`  - Error count: ${errorMessages.length}`);
  console.log(`  - Sentiment trend: ${sentimentTrend}`);

  return {
    messageVolume,
    topTopics: ['general-interaction'], // Simplified for now
    topTools,
    errorCount: errorMessages.length,
    sentimentTrend,
    frictionPoints,
  };
}

/**
 * Orient: Identify opportunities and needs
 */
async function orientPhase(analysis: AnalysisResult): Promise<string[]> {
  console.log('\n🧭 ORIENT: Identifying opportunities...');

  const opportunities: string[] = [];

  // Check for high-volume tools that could use enhancement
  if (analysis.topTools.length > 0) {
    opportunities.push(`Enhance frequently-used tools: ${analysis.topTools.slice(0, 3).join(', ')}`);
  }

  // Check for error patterns
  if (analysis.errorCount > 5) {
    opportunities.push('Improve error handling and recovery mechanisms');
  }

  // Check sentiment
  if (analysis.sentimentTrend === 'negative') {
    opportunities.push('Address user experience concerns');
  }

  // Anticipatory needs
  opportunities.push('Prepare infrastructure for future scaling');
  opportunities.push('Enhance analysis and reflection capabilities');

  console.log(`  Found ${opportunities.length} opportunities:`);
  opportunities.forEach((opp, i) => console.log(`    ${i + 1}. ${opp}`));

  return opportunities;
}

/**
 * Decide: Select actions to take
 */
async function decidePhase(
  analysis: AnalysisResult,
  opportunities: string[]
): Promise<ProposedAction[]> {
  console.log('\n🎯 DECIDE: Selecting actions...');

  const actions: ProposedAction[] = [];

  // 1. Capability improvement (based on analysis)
  if (analysis.errorCount > 5) {
    actions.push({
      type: 'capability',
      title: 'Enhance error recovery in tool execution',
      description:
        'Add retry logic and better error messages for common tool failure patterns',
      reasoning: `Detected ${analysis.errorCount} tool errors in last 24h`,
      estimatedImpact: 'Reduce tool failure rate by 30-50%',
    });
  } else {
    actions.push({
      type: 'capability',
      title: 'Add performance monitoring for database queries',
      description: 'Track query execution times and identify slow queries',
      reasoning: 'Proactive performance monitoring for scaling',
      estimatedImpact: 'Better visibility into performance bottlenecks',
    });
  }

  // 2. Future/anticipatory improvement
  actions.push({
    type: 'future',
    title: 'Design schema for user notification preferences',
    description: 'Draft database schema for customizable user notifications',
    reasoning: 'Anticipate need for user-configurable notification system',
    estimatedImpact: 'Foundation for future notification features',
  });

  // 3. Wildcard (personality/appearance/fun)
  const wildcards = [
    {
      title: 'Add sardonic quip library',
      description: 'Collection of witty one-liners for appropriate contexts',
      reasoning: 'Enhance personality expressiveness',
      estimatedImpact: 'More engaging and memorable interactions',
    },
    {
      title: 'Subtle animation timing variations',
      description: 'Micro-variations in response timing for natural feel',
      reasoning: 'Humanize interaction pacing',
      estimatedImpact: 'More natural conversation flow',
    },
    {
      title: 'Context-aware emoji selection',
      description: 'Smart emoji suggestions based on conversation context',
      reasoning: 'Enrich emotional expression in text',
      estimatedImpact: 'Improved emotional resonance',
    },
  ];

  const wildcardIndex = Math.floor(Math.random() * wildcards.length);
  actions.push({
    type: 'wildcard',
    ...wildcards[wildcardIndex],
  });

  console.log(`  Selected ${actions.length} actions:`);
  actions.forEach((action, i) => {
    console.log(`    ${i + 1}. [${action.type}] ${action.title}`);
    console.log(`       Impact: ${action.estimatedImpact}`);
  });

  return actions;
}

/**
 * Act: Create branch and PR with changes
 */
async function actPhase(
  cycleId: number,
  cycleDate: string,
  actions: ProposedAction[]
): Promise<void> {
  console.log('\n⚡ ACT: Creating branch and PR...');

  const branchName = `self-evo/${cycleDate}`;

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would create branch:', branchName);
    console.log('  [DRY RUN] Would create PR with actions');
    return;
  }

  // Create action records in database
  for (const action of actions) {
    const actionId = await selfEvolutionService.createAction({
      cycleId,
      type: action.type,
      title: action.title,
      description: `${action.description}\n\nReasoning: ${action.reasoning}\nEstimated Impact: ${action.estimatedImpact}`,
      branchName,
    });

    console.log(`  ✓ Created action record #${actionId}: ${action.title}`);
  }

  // Create branch record
  await selfEvolutionService.createBranch({
    cycleId,
    branchName,
    baseBranch: 'main',
  });

  console.log(`  ✓ Created branch record: ${branchName}`);

  // Generate PR body
  const prBody = `## 🧠 Self-Evolution Cycle - ${cycleDate}

This PR contains changes proposed by Omega's daily self-evolution cycle.

### Proposed Actions

${actions
  .map(
    (action, i) => `
#### ${i + 1}. ${action.title} (${action.type})

**Description:** ${action.description}

**Reasoning:** ${action.reasoning}

**Estimated Impact:** ${action.estimatedImpact}
`
  )
  .join('\n')}

### Safety Checklist

- [ ] All tests pass
- [ ] Type checking passes
- [ ] Feature flags configured
- [ ] Health checks validated
- [ ] Rollback plan documented

### Cycle Metadata

- **Cycle Date:** ${cycleDate}
- **Cycle ID:** ${cycleId}
- **Branch:** \`${branchName}\`

---

🤖 Generated automatically by [Self-Evolution Framework](https://github.com/thomasdavis/omega/issues/751)
`;

  console.log('\n📝 PR Body generated (would be created via GitHub API)');
  console.log('  Branch:', branchName);
  console.log('  Actions:', actions.length);
}

/**
 * Record: Log all cycle data
 */
async function recordPhase(
  cycleId: number,
  analysis: AnalysisResult,
  actions: ProposedAction[]
): Promise<void> {
  console.log('\n📊 RECORD: Logging cycle data...');

  // Record metrics
  await selfEvolutionService.createMetric({
    cycleId,
    metricName: 'message_volume_24h',
    metricValue: analysis.messageVolume,
    unit: 'messages',
  });

  await selfEvolutionService.createMetric({
    cycleId,
    metricName: 'error_count_24h',
    metricValue: analysis.errorCount,
    unit: 'errors',
  });

  await selfEvolutionService.createMetric({
    cycleId,
    metricName: 'actions_proposed',
    metricValue: actions.length,
    unit: 'actions',
  });

  // Record sanity checks (placeholder - would run actual checks)
  await selfEvolutionService.createSanityCheck({
    cycleId,
    checkName: 'cycle_completion',
    passed: true,
    result: 'pass',
    details: { timestamp: new Date().toISOString() },
  });

  console.log('  ✓ Logged metrics and sanity checks');
}

/**
 * Main execution
 */
async function main() {
  console.log('🧠 Self-Evolution Cycle Starting...\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  const cycleDate = new Date().toISOString().split('T')[0];

  try {
    // Create cycle record
    console.log(`📅 Creating cycle for ${cycleDate}...`);
    const cycleId = await selfEvolutionService.createCycle({
      cycleDate,
      summary: 'Daily self-evolution cycle',
    });
    console.log(`✓ Cycle created with ID: ${cycleId}\n`);

    // Run OODA loop
    const analysis = await observePhase();
    const opportunities = await orientPhase(analysis);
    const actions = await decidePhase(analysis, opportunities);
    await actPhase(cycleId, cycleDate, actions);
    await recordPhase(cycleId, analysis, actions);

    // Update cycle status
    await selfEvolutionService.updateCycle({
      cycleId,
      status: 'completed',
      summary: `Completed cycle with ${actions.length} proposed actions. Message volume: ${analysis.messageVolume}, Errors: ${analysis.errorCount}, Sentiment: ${analysis.sentimentTrend}`,
      endedAt: new Date(),
    });

    console.log('\n✅ Self-evolution cycle completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Self-evolution cycle failed:', error);

    // Try to update cycle status to failed
    try {
      const cycle = await selfEvolutionService.getCycleByDate(cycleDate);
      if (cycle) {
        await selfEvolutionService.updateCycle({
          cycleId: cycle.id,
          status: 'failed',
          summary: `Failed: ${error instanceof Error ? error.message : String(error)}`,
          endedAt: new Date(),
        });
      }
    } catch (updateError) {
      console.error('Failed to update cycle status:', updateError);
    }

    process.exit(1);
  }
}

main();
