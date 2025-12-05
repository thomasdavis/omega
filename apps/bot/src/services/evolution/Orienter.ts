/**
 * Evolution Engine - Orienter Service
 * Analyzes observations and generates scored proposals
 */

import type { ObservationData } from './Observer.js';
import fs from 'fs/promises';
import path from 'path';

export interface Proposal {
  type: 'capability' | 'anticipatory' | 'wildcard' | 'other';
  title: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  expectedImpact: {
    userExperience: number; // 0-10
    systemPerformance: number; // 0-10
    maintainability: number; // 0-10
  };
  score: number; // Combined score for prioritization
  reasoning: string;
}

/**
 * Analyze observations and generate proposals
 */
export async function orient(observations: ObservationData): Promise<Proposal[]> {
  console.log('🧭 Orienter: Analyzing observations and generating proposals...');

  const proposals: Proposal[] = [];

  // Load risk matrix for scoring
  const riskMatrix = await loadRiskMatrix();

  // Generate capability improvements based on observed pain points
  proposals.push(...generateCapabilityProposals(observations, riskMatrix));

  // Generate anticipatory proposals based on trends
  proposals.push(...generateAnticipatoryProposals(observations, riskMatrix));

  // Generate wildcard proposals (creative, low-risk)
  proposals.push(...generateWildcardProposals(observations, riskMatrix));

  // Score and sort proposals
  const scoredProposals = proposals
    .map(p => ({ ...p, score: calculateProposalScore(p, observations) }))
    .sort((a, b) => b.score - a.score);

  console.log(`   Generated ${scoredProposals.length} proposals`);

  return scoredProposals;
}

/**
 * Generate capability improvement proposals
 */
function generateCapabilityProposals(observations: ObservationData, riskMatrix: any): Proposal[] {
  const proposals: Proposal[] = [];

  // Example: If high error count, propose error handling improvement
  if (observations.errorCount > 10) {
    proposals.push({
      type: 'capability',
      title: 'Enhanced Error Recovery',
      description: `Add automatic retry logic and better error messages. Observed ${observations.errorCount} errors in last 24h.`,
      riskLevel: 'low',
      expectedImpact: {
        userExperience: 7,
        systemPerformance: 5,
        maintainability: 6,
      },
      score: 0,
      reasoning: 'High error count indicates need for better error handling',
    });
  }

  // Example: If confusion is high, propose clarification feature
  if (observations.feelings.confusion > 0.5) {
    proposals.push({
      type: 'capability',
      title: 'Contextual Help System',
      description: 'Add inline help and clarification prompts when confusion is detected.',
      riskLevel: 'low',
      expectedImpact: {
        userExperience: 8,
        systemPerformance: 4,
        maintainability: 5,
      },
      score: 0,
      reasoning: `Confusion level at ${(observations.feelings.confusion * 100).toFixed(0)}%`,
    });
  }

  return proposals;
}

/**
 * Generate anticipatory proposals based on trends
 */
function generateAnticipatoryProposals(observations: ObservationData, riskMatrix: any): Proposal[] {
  const proposals: Proposal[] = [];

  // Example: If message volume is growing, propose caching
  if (observations.messageVolume > 100) {
    proposals.push({
      type: 'anticipatory',
      title: 'Response Caching Layer',
      description: 'Add caching for frequently asked questions to improve response time.',
      riskLevel: 'medium',
      expectedImpact: {
        userExperience: 7,
        systemPerformance: 9,
        maintainability: 6,
      },
      score: 0,
      reasoning: `High message volume (${observations.messageVolume}) suggests caching would help`,
    });
  }

  // Example: If user count is growing, propose analytics
  if (observations.userCount > 5) {
    proposals.push({
      type: 'anticipatory',
      title: 'User Behavior Analytics Dashboard',
      description: 'Create internal dashboard to track user patterns and preferences.',
      riskLevel: 'low',
      expectedImpact: {
        userExperience: 5,
        systemPerformance: 3,
        maintainability: 7,
      },
      score: 0,
      reasoning: `Growing user base (${observations.userCount}) needs better tracking`,
    });
  }

  return proposals;
}

/**
 * Generate wildcard proposals (creative, low-risk)
 */
function generateWildcardProposals(observations: ObservationData, riskMatrix: any): Proposal[] {
  const wildcards: Proposal[] = [
    {
      type: 'wildcard',
      title: 'Comedic Timing Calibration',
      description: 'Add a subtle probability parameter for when to inject dry humor into responses.',
      riskLevel: 'low',
      expectedImpact: {
        userExperience: 6,
        systemPerformance: 1,
        maintainability: 3,
      },
      score: 0,
      reasoning: 'Enhances personality without affecting core functionality',
    },
    {
      type: 'wildcard',
      title: 'ASCII Art Response Decorator',
      description: 'Add optional ASCII art embellishments for special occasions or achievements.',
      riskLevel: 'low',
      expectedImpact: {
        userExperience: 5,
        systemPerformance: 1,
        maintainability: 2,
      },
      score: 0,
      reasoning: 'Fun, reversible visual enhancement',
    },
    {
      type: 'wildcard',
      title: 'Smart Quote Library',
      description: 'Curate a library of witty, context-aware callbacks to previous conversations.',
      riskLevel: 'low',
      expectedImpact: {
        userExperience: 7,
        systemPerformance: 2,
        maintainability: 4,
      },
      score: 0,
      reasoning: 'Demonstrates continuity and personality',
    },
  ];

  // Return one random wildcard
  return [wildcards[Math.floor(Math.random() * wildcards.length)]];
}

/**
 * Calculate proposal score based on impact and risk
 */
function calculateProposalScore(proposal: Proposal, observations: ObservationData): number {
  const { userExperience, systemPerformance, maintainability } = proposal.expectedImpact;

  // Weighted average of impact factors
  const impactScore = (
    userExperience * 0.4 +
    systemPerformance * 0.3 +
    maintainability * 0.3
  );

  // Risk penalty
  const riskPenalty = proposal.riskLevel === 'low' ? 0 : proposal.riskLevel === 'medium' ? 2 : 5;

  // Type bonus (prioritize capability improvements)
  const typeBonus = proposal.type === 'capability' ? 2 : proposal.type === 'anticipatory' ? 1 : 0.5;

  return impactScore + typeBonus - riskPenalty;
}

/**
 * Load risk matrix configuration
 */
async function loadRiskMatrix(): Promise<any> {
  try {
    const configPath = path.join(process.cwd(), 'config/evolution/risk-matrix.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('⚠️  Could not load risk matrix, using defaults');
    return {};
  }
}
