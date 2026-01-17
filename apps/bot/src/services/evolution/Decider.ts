/**
 * Evolution Engine - Decider Service
 * Selects proposals to implement based on requirements and constraints
 */

import type { Proposal } from './Orienter.js';
import fs from 'fs/promises';
import path from 'path';

export interface SelectedProposal extends Proposal {
  selected: true;
  selectionReason: string;
}

export interface DecisionResult {
  selected: SelectedProposal[];
  deferred: Proposal[];
  rejected: Proposal[];
}

/**
 * Decide which proposals to implement
 * Requirements: 1 capability, 1 anticipatory, 1 wildcard (optional 4th)
 */
export async function decide(proposals: Proposal[]): Promise<DecisionResult> {
  console.log('🎯 Decider: Selecting proposals for implementation...');

  const thresholds = await loadThresholds();
  const selected: SelectedProposal[] = [];
  const deferred: Proposal[] = [];
  const rejected: Proposal[] = [];

  // Separate proposals by type
  const byType = {
    capability: proposals.filter(p => p.type === 'capability'),
    anticipatory: proposals.filter(p => p.type === 'anticipatory'),
    wildcard: proposals.filter(p => p.type === 'wildcard'),
    other: proposals.filter(p => p.type === 'other'),
  };

  // Select 1 capability (highest scored)
  const capabilityProposal = byType.capability[0];
  if (capabilityProposal) {
    if (await passesGatingChecks(capabilityProposal, thresholds)) {
      selected.push({
        ...capabilityProposal,
        selected: true,
        selectionReason: 'Top-scored capability improvement',
      });
    } else {
      rejected.push(capabilityProposal);
    }
  }

  // Select 1 anticipatory (highest scored)
  const anticipatoryProposal = byType.anticipatory[0];
  if (anticipatoryProposal) {
    if (await passesGatingChecks(anticipatoryProposal, thresholds)) {
      selected.push({
        ...anticipatoryProposal,
        selected: true,
        selectionReason: 'Top-scored anticipatory change',
      });
    } else {
      rejected.push(anticipatoryProposal);
    }
  }

  // Select 1 wildcard (must be low-risk)
  const wildcardProposal = byType.wildcard.find(p => p.riskLevel === 'low');
  if (wildcardProposal) {
    if (await passesGatingChecks(wildcardProposal, thresholds)) {
      selected.push({
        ...wildcardProposal,
        selected: true,
        selectionReason: 'Daily wildcard feature (low-risk)',
      });
    } else {
      rejected.push(wildcardProposal);
    }
  }

  // Optional: Select 1 more if trivial and low-risk
  const remainingLowRisk = proposals.filter(
    p => p.riskLevel === 'low' &&
         !selected.some(s => s.title === p.title)
  );

  if (remainingLowRisk.length > 0 && selected.length < 4) {
    const trivialProposal = remainingLowRisk[0];
    if (await passesGatingChecks(trivialProposal, thresholds)) {
      selected.push({
        ...trivialProposal,
        selected: true,
        selectionReason: 'Additional low-risk improvement',
      });
    }
  }

  // Defer remaining proposals
  for (const proposal of proposals) {
    if (!selected.some(s => s.title === proposal.title) &&
        !rejected.some(r => r.title === proposal.title)) {
      deferred.push(proposal);
    }
  }

  console.log(`   Selected: ${selected.length}, Deferred: ${deferred.length}, Rejected: ${rejected.length}`);

  return { selected, deferred, rejected };
}

/**
 * Run gating checks on a proposal
 */
async function passesGatingChecks(proposal: Proposal, thresholds: any): Promise<boolean> {
  // Check 1: Risk level acceptable
  if (proposal.riskLevel === 'high') {
    console.log(`   ❌ Rejected ${proposal.title}: High risk`);
    return false;
  }

  // Check 2: Wildcard constraints
  if (proposal.type === 'wildcard') {
    const maxRisk = thresholds.wildcardConstraints?.maxRiskLevel || 'low';
    if (proposal.riskLevel !== maxRisk) {
      console.log(`   ❌ Rejected ${proposal.title}: Wildcard must be ${maxRisk} risk`);
      return false;
    }
  }

  // Check 3: Expected impact is positive
  const totalImpact = Object.values(proposal.expectedImpact).reduce((a: number, b) => a + (b as number), 0);
  if (totalImpact < 10) {
    console.log(`   ❌ Rejected ${proposal.title}: Low expected impact (${totalImpact})`);
    return false;
  }

  return true;
}

/**
 * Load thresholds configuration
 */
async function loadThresholds(): Promise<any> {
  try {
    const configPath = path.join(process.cwd(), 'config/evolution/thresholds.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('⚠️  Could not load thresholds, using defaults');
    return {
      wildcardConstraints: {
        maxRiskLevel: 'low',
        requiresReversibility: true,
      },
    };
  }
}
