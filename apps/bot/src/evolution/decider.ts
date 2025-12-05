/**
 * Evolution Decider
 * Selects which proposals to implement based on scores and constraints
 */

import type { DecisionResult, ScoredProposal } from './types.js';
import { EVOLUTION_CONFIG } from './config.js';

/**
 * Decide which proposals to implement
 */
export function decide(scoredProposals: ScoredProposal[]): DecisionResult {
  // Sort by total score (descending)
  const sorted = [...scoredProposals].sort((a, b) => b.total_score - a.total_score);

  const selected: ScoredProposal[] = [];
  const deferred: ScoredProposal[] = [];

  // Track type counts
  const typeCounts = {
    capability: 0,
    anticipatory: 0,
    wildcard: 0,
    other: 0,
  };

  // Selection logic: ensure minimum requirements
  for (const proposal of sorted) {
    const typeCount = typeCounts[proposal.type];

    // Check if we need more of this type
    const needsType =
      (proposal.type === 'capability' && typeCount < EVOLUTION_CONFIG.required_capability) ||
      (proposal.type === 'anticipatory' && typeCount < EVOLUTION_CONFIG.required_anticipatory) ||
      (proposal.type === 'wildcard' && typeCount < EVOLUTION_CONFIG.required_wildcard);

    // Check if we have room for optional proposals
    const hasRoom = selected.length < EVOLUTION_CONFIG.max_proposals_per_day;

    if (needsType || (hasRoom && proposal.total_score > 0.5)) {
      // Safety gate: only select low or medium risk
      if (proposal.risk_level === 'high') {
        deferred.push({
          ...proposal,
          status: 'deferred',
        });
        continue;
      }

      selected.push({
        ...proposal,
        status: 'selected',
      });
      typeCounts[proposal.type]++;
    } else {
      deferred.push({
        ...proposal,
        status: 'deferred',
      });
    }
  }

  // Verify minimum requirements
  const meetsRequirements =
    typeCounts.capability >= EVOLUTION_CONFIG.required_capability &&
    typeCounts.anticipatory >= EVOLUTION_CONFIG.required_anticipatory &&
    typeCounts.wildcard >= EVOLUTION_CONFIG.required_wildcard;

  const reason = meetsRequirements
    ? `Selected ${selected.length} proposals meeting all requirements`
    : `Insufficient proposals of required types. Capability: ${typeCounts.capability}/${EVOLUTION_CONFIG.required_capability}, Anticipatory: ${typeCounts.anticipatory}/${EVOLUTION_CONFIG.required_anticipatory}, Wildcard: ${typeCounts.wildcard}/${EVOLUTION_CONFIG.required_wildcard}`;

  return {
    selected,
    deferred,
    reason,
  };
}
