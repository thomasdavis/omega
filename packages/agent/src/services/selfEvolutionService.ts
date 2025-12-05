/**
 * Self-Evolution Service
 * Phase 1: Daily reflection, candidate generation, and dry-run reporting
 *
 * Implements autonomous capability evolution with safety guardrails:
 * - Reflects on recent interactions and performance
 * - Proposes improvements across capability/anticipatory/persona/wildcard categories
 * - Scores candidates by risk/impact/effort/novelty
 * - Runs sanity checks and enforces guardrails
 * - Creates branches and PRs for low-risk changes (when enabled)
 * - Reports to GitHub issue and Discord
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  createRun,
  updateRun,
  createCandidate,
  createAction,
  createMetric,
  createSanity,
  createApproval,
  getRunByDate,
} from '@repo/database';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ReflectionResult {
  summary: string;
  painPoints: string[];
  missedCapabilities: string[];
  userSentimentTrends: string[];
  performanceMetrics: Record<string, number>;
}

export interface Candidate {
  category: 'capability' | 'anticipatory' | 'wildcard' | 'persona';
  title: string;
  description: string;
  riskScore: number; // 0-5
  impactScore: number; // 0-5
  effortScore: number; // 0-5
  noveltyScore: number; // 0-5
  priority: number; // weighted score
}

export interface SanityCheckResult {
  passed: boolean;
  rules: Record<string, boolean>;
  details: string;
}

/**
 * Main daily evolution cycle
 */
export async function runDailyEvolution(): Promise<{
  success: boolean;
  runId?: number;
  summary?: string;
  error?: string;
}> {
  const enabled = process.env.SELF_EVOLVE_ENABLED === 'true';
  const dryRun = !enabled;

  console.log(`🧠 Self-Evolution: ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);

  try {
    // Create run record
    const run = await createRun({
      runDate: new Date(),
      status: 'in_progress',
      summary: dryRun ? 'Dry run - no changes will be applied' : 'Running daily evolution cycle',
    });

    console.log(`📊 Created run #${run.id} for ${run.runDate.toISOString().split('T')[0]}`);

    // Phase 1: Reflect
    console.log('🔍 Phase 1: Reflection');
    const reflection = await reflectOnInteractions();

    await createMetric({
      runId: run.id,
      metricKey: 'pain_points_count',
      metricValue: reflection.painPoints.length,
      details: { painPoints: reflection.painPoints },
    });

    await createMetric({
      runId: run.id,
      metricKey: 'missed_capabilities_count',
      metricValue: reflection.missedCapabilities.length,
      details: { missedCapabilities: reflection.missedCapabilities },
    });

    // Phase 2: Propose
    console.log('💡 Phase 2: Generating candidates');
    const candidates = await generateCandidates(reflection);

    // Store all candidates
    const candidateRecords = await Promise.all(
      candidates.map((c) =>
        createCandidate({
          runId: run.id,
          category: c.category,
          title: c.title,
          description: c.description,
          riskScore: c.riskScore,
          impactScore: c.impactScore,
          effortScore: c.effortScore,
          noveltyScore: c.noveltyScore,
          priority: c.priority,
        })
      )
    );

    console.log(`   Generated ${candidates.length} candidates`);

    // Select top candidates (max 2: 1 code/tool + 1 persona/wildcard)
    const selected = selectCandidates(candidates);

    for (const candidate of selected) {
      const idx = candidates.indexOf(candidate);
      const record = candidateRecords[idx];
      await createCandidate({
        runId: run.id,
        category: candidate.category,
        title: candidate.title,
        description: candidate.description,
        riskScore: candidate.riskScore,
        impactScore: candidate.impactScore,
        effortScore: candidate.effortScore,
        noveltyScore: candidate.noveltyScore,
        priority: candidate.priority,
        selected: true,
      });
    }

    console.log(`   Selected ${selected.length} candidates for implementation`);

    // Phase 3: Sanity & Guardrails
    console.log('🛡️ Phase 3: Sanity checks');
    const sanityCheck = await runSanityChecks(selected);

    await createSanity({
      runId: run.id,
      rules: sanityCheck.rules,
      passed: sanityCheck.passed,
      details: sanityCheck.details,
    });

    if (!sanityCheck.passed) {
      await updateRun(run.id, {
        status: 'failed',
        finishedAt: new Date(),
        summary: `Sanity checks failed: ${sanityCheck.details}`,
      });

      return {
        success: false,
        runId: run.id,
        error: `Sanity checks failed: ${sanityCheck.details}`,
      };
    }

    // Phase 4: Check approval requirements
    const needsApproval = selected.some((c) => c.riskScore >= 4);

    if (needsApproval) {
      console.log('⏸️  High-risk changes detected - requires approval');
      await createApproval({
        runId: run.id,
        required: true,
        notes: 'High-risk changes require manual approval before implementation',
      });

      await updateRun(run.id, {
        status: 'planned',
        finishedAt: new Date(),
        summary: 'Planned changes awaiting approval',
      });

      // Post report
      const report = await generateReport(run.id, reflection, selected, sanityCheck, dryRun);
      await postReport(report, run.id);

      return {
        success: true,
        runId: run.id,
        summary: 'Changes planned, awaiting approval',
      };
    }

    // Phase 5: Implement (dry run for now)
    if (dryRun) {
      console.log('🔬 DRY RUN: Skipping implementation');
      await updateRun(run.id, {
        status: 'planned',
        finishedAt: new Date(),
        summary: 'Dry run completed - no changes applied',
      });

      const report = await generateReport(run.id, reflection, selected, sanityCheck, dryRun);
      await postReport(report, run.id);

      return {
        success: true,
        runId: run.id,
        summary: 'Dry run completed successfully',
      };
    }

    // TODO: Phase 2 implementation - actual PR creation and merging
    // For now, mark as planned
    await updateRun(run.id, {
      status: 'planned',
      finishedAt: new Date(),
      summary: 'Implementation phase not yet enabled',
    });

    const report = await generateReport(run.id, reflection, selected, sanityCheck, dryRun);
    await postReport(report, run.id);

    return {
      success: true,
      runId: run.id,
      summary: 'Daily evolution cycle completed',
    };
  } catch (error) {
    console.error('❌ Self-evolution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Phase 1: Reflect on recent interactions
 */
async function reflectOnInteractions(): Promise<ReflectionResult> {
  // Use Claude to analyze recent activity
  const prompt = `You are Omega, a battle-scarred AI assistant analyzing your recent performance.

Review your recent interactions and identify:
1. Pain points: Where users struggled or you couldn't help effectively
2. Missed capabilities: Tools or features users needed but you don't have
3. User sentiment trends: Overall satisfaction and engagement patterns
4. Performance metrics: Response quality, tool usage effectiveness

Be honest and critical. Focus on actionable improvements.

Provide a JSON response with:
{
  "summary": "Brief overview of the last 24 hours",
  "painPoints": ["list of specific pain points"],
  "missedCapabilities": ["list of capabilities you wish you had"],
  "userSentimentTrends": ["list of sentiment observations"],
  "performanceMetrics": {
    "toolUsageRate": 0-100,
    "responseQuality": 0-100,
    "userSatisfaction": 0-100
  }
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract JSON from response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from reflection response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Phase 2: Generate improvement candidates
 */
async function generateCandidates(reflection: ReflectionResult): Promise<Candidate[]> {
  const prompt = `Based on this reflection of Omega's recent performance:

${JSON.stringify(reflection, null, 2)}

Generate 3-6 improvement candidates across these categories:
- capability: New tools, integrations, or workflows
- anticipatory: Infrastructure, documentation, or future needs
- persona: UX/tone adjustments within brand constraints (obsidian aesthetic, stoic/veteran tone)
- wildcard: Creative/experimental improvements (fun, expressive, but safe)

For each candidate, score (0-5):
- risk: How likely to break things or cause issues
- impact: How much value it provides
- effort: How much work required
- novelty: How innovative/unique it is

Calculate priority as: (impact * 2 + novelty - risk * 1.5 - effort * 0.5)

Rules:
- Risk ≥ 4 requires human approval
- Max 1 capability/anticipatory change per day
- Persona changes must be minor and reversible
- No core tool removal or platform rule violations

Return JSON array:
[
  {
    "category": "capability",
    "title": "Brief title",
    "description": "Detailed description",
    "riskScore": 0-5,
    "impactScore": 0-5,
    "effortScore": 0-5,
    "noveltyScore": 0-5,
    "priority": calculated_value
  }
]`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from candidates response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Select top candidates (max 2: 1 code/tool + 1 persona/wildcard)
 */
function selectCandidates(candidates: Candidate[]): Candidate[] {
  // Sort by priority
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);

  const selected: Candidate[] = [];

  // Select top capability/anticipatory (max 1)
  const codeCandidate = sorted.find(
    (c) => (c.category === 'capability' || c.category === 'anticipatory') && c.riskScore < 4
  );
  if (codeCandidate) {
    selected.push(codeCandidate);
  }

  // Select top persona/wildcard (max 1)
  const personaCandidate = sorted.find(
    (c) => (c.category === 'persona' || c.category === 'wildcard') && c.riskScore < 4
  );
  if (personaCandidate && selected.length < 2) {
    selected.push(personaCandidate);
  }

  return selected;
}

/**
 * Phase 3: Run sanity checks and guardrails
 */
async function runSanityChecks(candidates: Candidate[]): Promise<SanityCheckResult> {
  const rules: Record<string, boolean> = {};

  // Rule 1: No more than 1 code change per day
  const codeChanges = candidates.filter((c) => c.category === 'capability' || c.category === 'anticipatory');
  rules['max_one_code_change'] = codeChanges.length <= 1;

  // Rule 2: Persona changes must be low risk
  const personaChanges = candidates.filter((c) => c.category === 'persona');
  rules['persona_low_risk'] = personaChanges.every((c) => c.riskScore < 3);

  // Rule 3: No high-risk changes without approval
  rules['no_unapproved_high_risk'] = candidates.every((c) => c.riskScore < 4);

  // Rule 4: At least one candidate must have impact >= 3
  rules['minimum_impact'] = candidates.some((c) => c.impactScore >= 3);

  const passed = Object.values(rules).every((r) => r);
  const details = passed
    ? 'All sanity checks passed'
    : `Failed checks: ${Object.entries(rules)
        .filter(([_, v]) => !v)
        .map(([k]) => k)
        .join(', ')}`;

  return { passed, rules, details };
}

/**
 * Generate markdown report
 */
async function generateReport(
  runId: number,
  reflection: ReflectionResult,
  selected: Candidate[],
  sanityCheck: SanityCheckResult,
  dryRun: boolean
): Promise<string> {
  const date = new Date().toISOString().split('T')[0];

  return `## 🧠 Self-Evolution Report: ${date}
**Run ID:** #${runId} ${dryRun ? '(DRY RUN)' : ''}

### Reflection Summary
${reflection.summary}

**Pain Points:**
${reflection.painPoints.map((p) => `- ${p}`).join('\n')}

**Missed Capabilities:**
${reflection.missedCapabilities.map((c) => `- ${c}`).join('\n')}

**User Sentiment:**
${reflection.userSentimentTrends.map((s) => `- ${s}`).join('\n')}

**Performance Metrics:**
- Tool Usage: ${reflection.performanceMetrics.toolUsageRate}%
- Response Quality: ${reflection.performanceMetrics.responseQuality}%
- User Satisfaction: ${reflection.performanceMetrics.userSatisfaction}%

### Selected Candidates

${
  selected.length === 0
    ? '*No candidates selected for implementation*'
    : selected
        .map(
          (c) => `#### ${c.title}
**Category:** ${c.category} | **Priority:** ${c.priority.toFixed(2)}
**Scores:** Risk=${c.riskScore} Impact=${c.impactScore} Effort=${c.effortScore} Novelty=${c.noveltyScore}

${c.description}
`
        )
        .join('\n')
}

### Sanity Checks
${sanityCheck.passed ? '✅ PASSED' : '❌ FAILED'}

${Object.entries(sanityCheck.rules)
  .map(([rule, passed]) => `- ${passed ? '✅' : '❌'} ${rule}`)
  .join('\n')}

${sanityCheck.details}

---
${dryRun ? '_This was a dry run. No changes were applied._' : '_Ready for implementation._'}
`;
}

/**
 * Post report to GitHub issue #753
 */
async function postReport(report: string, runId: number): Promise<void> {
  // TODO: Implement GitHub API posting
  console.log('📝 Report generated:');
  console.log(report);
  console.log(`\n(Posting to issue #753 not yet implemented)`);
}
