/**
 * Evolution Orienter
 * Analyzes observations and generates scored improvement proposals
 */

import type { ObservationData, OrientationResult, ScoredProposal } from './types.js';
import { EVOLUTION_CONFIG } from './config.js';

/**
 * Orient: Analyze observations and generate proposals
 */
export async function orient(observations: ObservationData): Promise<OrientationResult> {
  const painPoints = identifyPainPoints(observations);
  const opportunities = identifyOpportunities(observations);

  // Generate proposals
  const proposals = await generateProposals(painPoints, opportunities, observations);

  // Score proposals
  const scoredProposals = scoreProposals(proposals);

  return {
    painPoints,
    opportunities,
    scoredProposals,
  };
}

/**
 * Identify pain points from observations
 */
function identifyPainPoints(observations: ObservationData): string[] {
  const painPoints: string[] = [];

  // High error rate
  if (observations.errors.length > 5) {
    painPoints.push(`High error rate: ${observations.errors.length} errors in 24h`);
  }

  // Tool failures
  if (observations.failures.length > 3) {
    painPoints.push(`Tool failures: ${observations.failures.length} failures detected`);
  }

  // Low message volume (possible engagement issue)
  if (observations.messageVolume < 10) {
    painPoints.push(`Low message volume: only ${observations.messageVolume} messages in 24h`);
  }

  // Negative feelings
  const feelings = observations.feelings as Record<string, number>;
  if (feelings.confusion && feelings.confusion > 0.5) {
    painPoints.push(`High confusion signal: ${feelings.confusion}`);
  }
  if (feelings.concern && feelings.concern > 0.5) {
    painPoints.push(`High concern signal: ${feelings.concern}`);
  }

  return painPoints;
}

/**
 * Identify opportunities from observations
 */
function identifyOpportunities(observations: ObservationData): string[] {
  const opportunities: string[] = [];

  // High engagement in specific topics
  if (observations.topics.length > 0) {
    opportunities.push(`Active topics: ${observations.topics.join(', ')}`);
  }

  // Tool usage patterns
  const mostUsedTools = Object.entries(observations.toolUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (mostUsedTools.length > 0) {
    opportunities.push(
      `Most used tools: ${mostUsedTools.map(([name, count]) => `${name}(${count})`).join(', ')}`
    );
  }

  // Positive feelings
  const feelings = observations.feelings as Record<string, number>;
  if (feelings.satisfaction && feelings.satisfaction > 0.7) {
    opportunities.push(`High satisfaction: users are happy with current capabilities`);
  }

  return opportunities;
}

/**
 * Generate improvement proposals
 */
async function generateProposals(
  painPoints: string[],
  opportunities: string[],
  observations: ObservationData
): Promise<ScoredProposal[]> {
  const proposals: ScoredProposal[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Capability improvements based on pain points
  if (painPoints.some((p) => p.includes('error'))) {
    proposals.push({
      run_date: today,
      type: 'capability',
      title: 'Enhanced error recovery',
      description: 'Add automatic retry logic and better error messages for common failures',
      risk_level: 'low',
      status: 'proposed',
      impact_score: 0,
      effort_score: 0,
      risk_score: 0,
      novelty_score: 0,
      total_score: 0,
    });
  }

  if (painPoints.some((p) => p.includes('confusion'))) {
    proposals.push({
      run_date: today,
      type: 'capability',
      title: 'Clarification prompts',
      description: 'Add proactive clarification questions when context is ambiguous',
      risk_level: 'low',
      status: 'proposed',
      impact_score: 0,
      effort_score: 0,
      risk_score: 0,
      novelty_score: 0,
      total_score: 0,
    });
  }

  // Anticipatory improvements based on opportunities
  if (opportunities.some((o) => o.includes('github'))) {
    proposals.push({
      run_date: today,
      type: 'anticipatory',
      title: 'GitHub workflow enhancements',
      description: 'Add support for GitHub Projects integration and milestone tracking',
      risk_level: 'medium',
      status: 'proposed',
      impact_score: 0,
      effort_score: 0,
      risk_score: 0,
      novelty_score: 0,
      total_score: 0,
    });
  }

  if (opportunities.some((o) => o.includes('database'))) {
    proposals.push({
      run_date: today,
      type: 'anticipatory',
      title: 'Query optimization',
      description: 'Add query result caching and index optimization for common patterns',
      risk_level: 'low',
      status: 'proposed',
      impact_score: 0,
      effort_score: 0,
      risk_score: 0,
      novelty_score: 0,
      total_score: 0,
    });
  }

  // Wildcard features - fun, creative, low-risk
  proposals.push({
    run_date: today,
    type: 'wildcard',
    title: 'ASCII art celebration',
    description: 'Add celebratory ASCII art for milestone achievements (100th PR, etc.)',
    risk_level: 'low',
    status: 'proposed',
    impact_score: 0,
    effort_score: 0,
    risk_score: 0,
    novelty_score: 0,
    total_score: 0,
  });

  proposals.push({
    run_date: today,
    type: 'wildcard',
    title: 'Witty callback library',
    description: 'Expand response variety with contextual micro-quips for common scenarios',
    risk_level: 'low',
    status: 'proposed',
    impact_score: 0,
    effort_score: 0,
    risk_score: 0,
    novelty_score: 0,
    total_score: 0,
  });

  return proposals;
}

/**
 * Score proposals using weighted criteria
 */
function scoreProposals(proposals: ScoredProposal[]): ScoredProposal[] {
  return proposals.map((proposal) => {
    // Impact: higher for capability and anticipatory
    const impactScore =
      proposal.type === 'capability'
        ? 0.8
        : proposal.type === 'anticipatory'
          ? 0.7
          : 0.4;

    // Effort: lower risk = lower effort assumed
    const effortScore =
      proposal.risk_level === 'low' ? 0.3 : proposal.risk_level === 'medium' ? 0.6 : 0.9;

    // Risk: direct mapping
    const riskScore =
      proposal.risk_level === 'low' ? 0.2 : proposal.risk_level === 'medium' ? 0.5 : 0.8;

    // Novelty: wildcards are most novel
    const noveltyScore = proposal.type === 'wildcard' ? 0.9 : 0.5;

    // Calculate weighted total (higher is better)
    const totalScore =
      impactScore * EVOLUTION_CONFIG.scoring.impact +
      (1 - effortScore) * EVOLUTION_CONFIG.scoring.effort + // Invert effort (lower effort = higher score)
      (1 - riskScore) * EVOLUTION_CONFIG.scoring.risk + // Invert risk (lower risk = higher score)
      noveltyScore * EVOLUTION_CONFIG.scoring.novelty;

    return {
      ...proposal,
      impact_score: impactScore,
      effort_score: effortScore,
      risk_score: riskScore,
      novelty_score: noveltyScore,
      total_score: totalScore,
    };
  });
}
