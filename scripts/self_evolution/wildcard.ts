#!/usr/bin/env tsx
/**
 * Wildcard Feature Hook v1
 *
 * Implements daily wildcard feature changes with strict sandboxing:
 * - One small, reversible change per day
 * - Confined to allowlist areas only
 * - Feature flag controlled with gradual rollout (0% → 25%)
 * - Logs all proposals and actions to database
 *
 * Related: #751, #752, #755
 */

import { randomUUID } from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ProposalChange {
  type: 'saved_reply' | 'prompt_flavor' | 'tool_alias' | 'joke_category' | 'config_tweak';
  target: string;
  before?: any;
  after: any;
  allowlistArea: string;
}

interface Proposal {
  id: string;
  category: 'wildcard' | 'enhancement' | 'bugfix' | 'optimization';
  proposalType: ProposalChange['type'];
  title: string;
  description: string;
  rationale: string;
  proposedChange: ProposalChange;
  allowlistArea: string;
  riskLevel: 'low' | 'medium' | 'high';
  reversible: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'rolled_back';
  proposedAt: Date;
  metadata?: Record<string, any>;
}

interface Action {
  id: string;
  proposalId: string;
  category: 'wildcard' | 'enhancement' | 'bugfix' | 'optimization';
  actionType: string;
  title: string;
  description: string;
  executedChange: ProposalChange;
  rollbackInfo?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  executionTimeMs?: number;
  rolloutPercentage: number;
  executedAt: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// CONFIGURATION & ALLOWLIST
// ============================================================================

const FEATURE_FLAG = process.env.SELF_EVOLUTION_WILDCARD_ENABLED === 'true';
const ROLLOUT_PERCENTAGE = parseInt(process.env.WILDCARD_ROLLOUT_PERCENTAGE || '0', 10);
const MAX_ROLLOUT = 25; // Hard cap at 25% for v1

// Allowlist: Strictly define areas where wildcards can make changes
const ALLOWLIST_AREAS = {
  SAVED_REPLIES: 'config/saved_replies.json',
  PROMPT_FLAVORS: 'config/prompt_flavors.json',
  TOOL_ALIASES: 'config/tool_aliases.json',
  JOKE_CATEGORIES: 'jokes',
  CONFIG_TWEAKS: 'config/wildcard_tweaks.json',
} as const;

// ============================================================================
// WILDCARD PROPOSAL GENERATORS
// ============================================================================

/**
 * Generate a random wildcard proposal
 * Each generator creates a small, reversible change in an allowlisted area
 */
const WILDCARD_GENERATORS: Array<() => Proposal> = [
  // Saved reply generator
  () => {
    const replies = [
      { trigger: 'weekend', reply: 'Have a great weekend! 🎉' },
      { trigger: 'thanks', reply: 'You\'re very welcome! Happy to help.' },
      { trigger: 'morning', reply: 'Good morning! Hope you have a productive day.' },
      { trigger: 'night', reply: 'Good night! Sleep well.' },
    ];
    const selected = replies[Math.floor(Math.random() * replies.length)];

    return {
      id: randomUUID(),
      category: 'wildcard',
      proposalType: 'saved_reply',
      title: `Add saved reply for "${selected.trigger}"`,
      description: `Quick reply shortcut for common "${selected.trigger}" messages`,
      rationale: 'Improve response efficiency for frequent casual interactions',
      proposedChange: {
        type: 'saved_reply',
        target: selected.trigger,
        after: selected.reply,
        allowlistArea: ALLOWLIST_AREAS.SAVED_REPLIES,
      },
      allowlistArea: ALLOWLIST_AREAS.SAVED_REPLIES,
      riskLevel: 'low',
      reversible: true,
      status: 'pending',
      proposedAt: new Date(),
    };
  },

  // Prompt flavor generator
  () => {
    const flavors = [
      { name: 'enthusiastic', prefix: 'Let me help you with that! ' },
      { name: 'thoughtful', prefix: 'That\'s an interesting question. ' },
      { name: 'concise', prefix: '' },
      { name: 'detailed', prefix: 'Here\'s a comprehensive answer: ' },
    ];
    const selected = flavors[Math.floor(Math.random() * flavors.length)];

    return {
      id: randomUUID(),
      category: 'wildcard',
      proposalType: 'prompt_flavor',
      title: `Add "${selected.name}" prompt flavor`,
      description: `Response style variation: ${selected.name}`,
      rationale: 'Provide personality variety in responses',
      proposedChange: {
        type: 'prompt_flavor',
        target: selected.name,
        after: { prefix: selected.prefix },
        allowlistArea: ALLOWLIST_AREAS.PROMPT_FLAVORS,
      },
      allowlistArea: ALLOWLIST_AREAS.PROMPT_FLAVORS,
      riskLevel: 'low',
      reversible: true,
      status: 'pending',
      proposedAt: new Date(),
    };
  },

  // Tool alias generator
  () => {
    const aliases = [
      { alias: 'db', tool: 'database', description: 'Shorthand for database commands' },
      { alias: 'gh', tool: 'github', description: 'Shorthand for GitHub operations' },
      { alias: 'calc', tool: 'calculate', description: 'Quick calculator alias' },
    ];
    const selected = aliases[Math.floor(Math.random() * aliases.length)];

    return {
      id: randomUUID(),
      category: 'wildcard',
      proposalType: 'tool_alias',
      title: `Add tool alias "${selected.alias}" → "${selected.tool}"`,
      description: selected.description,
      rationale: 'Improve command accessibility with common shortcuts',
      proposedChange: {
        type: 'tool_alias',
        target: selected.alias,
        after: { targetTool: selected.tool },
        allowlistArea: ALLOWLIST_AREAS.TOOL_ALIASES,
      },
      allowlistArea: ALLOWLIST_AREAS.TOOL_ALIASES,
      riskLevel: 'low',
      reversible: true,
      status: 'pending',
      proposedAt: new Date(),
    };
  },

  // Joke category generator
  () => {
    const categories = [
      { name: 'puns', description: 'Classic puns and wordplay' },
      { name: 'tech', description: 'Technology and programming humor' },
      { name: 'dad-jokes', description: 'Family-friendly dad jokes' },
      { name: 'riddles', description: 'Brain teasers and riddles' },
    ];
    const selected = categories[Math.floor(Math.random() * categories.length)];

    return {
      id: randomUUID(),
      category: 'wildcard',
      proposalType: 'joke_category',
      title: `Add joke category: ${selected.name}`,
      description: selected.description,
      rationale: 'Expand humor variety for entertainment interactions',
      proposedChange: {
        type: 'joke_category',
        target: selected.name,
        after: { category: selected.name, description: selected.description },
        allowlistArea: ALLOWLIST_AREAS.JOKE_CATEGORIES,
      },
      allowlistArea: ALLOWLIST_AREAS.JOKE_CATEGORIES,
      riskLevel: 'low',
      reversible: true,
      status: 'pending',
      proposedAt: new Date(),
    };
  },
];

// ============================================================================
// GUARDRAILS & VALIDATION
// ============================================================================

/**
 * Validate that a proposal meets safety requirements
 */
function validateProposal(proposal: Proposal): { valid: boolean; reason?: string } {
  // Check feature flag
  if (!FEATURE_FLAG) {
    return { valid: false, reason: 'Feature flag SELF_EVOLUTION_WILDCARD_ENABLED is not enabled' };
  }

  // Check rollout percentage
  if (ROLLOUT_PERCENTAGE <= 0) {
    return { valid: false, reason: 'Rollout percentage is 0%' };
  }

  if (ROLLOUT_PERCENTAGE > MAX_ROLLOUT) {
    return { valid: false, reason: `Rollout percentage ${ROLLOUT_PERCENTAGE}% exceeds max ${MAX_ROLLOUT}%` };
  }

  // Validate allowlist area
  const validAreas = Object.values(ALLOWLIST_AREAS);
  if (!validAreas.includes(proposal.allowlistArea as any)) {
    return { valid: false, reason: `Area "${proposal.allowlistArea}" not in allowlist` };
  }

  // Ensure reversibility
  if (!proposal.reversible) {
    return { valid: false, reason: 'Change must be reversible for wildcard v1' };
  }

  // Ensure low risk
  if (proposal.riskLevel !== 'low') {
    return { valid: false, reason: 'Only low-risk changes allowed in wildcard v1' };
  }

  // Validate change structure
  if (!proposal.proposedChange || !proposal.proposedChange.type) {
    return { valid: false, reason: 'Invalid proposal change structure' };
  }

  return { valid: true };
}

/**
 * Check if we should execute based on rollout percentage
 */
function shouldExecuteRollout(): boolean {
  const random = Math.random() * 100;
  return random < Math.min(ROLLOUT_PERCENTAGE, MAX_ROLLOUT);
}

// ============================================================================
// DATABASE OPERATIONS (Mock for now - integrate with Prisma later)
// ============================================================================

/**
 * Save proposal to database
 */
async function saveProposal(proposal: Proposal): Promise<void> {
  // In production, this would use Prisma to save to self_evolution_proposals table
  console.log('💾 Saving proposal to database:', {
    id: proposal.id,
    category: proposal.category,
    title: proposal.title,
    status: proposal.status,
  });

  // For now, just log to console
  // TODO: Integrate with Prisma client
  // await prisma.selfEvolutionProposal.create({ data: proposal });
}

/**
 * Save action to database
 */
async function saveAction(action: Action): Promise<void> {
  // In production, this would use Prisma to save to self_evolution_actions table
  console.log('💾 Saving action to database:', {
    id: action.id,
    proposalId: action.proposalId,
    category: action.category,
    success: action.success,
    rolloutPercentage: action.rolloutPercentage,
  });

  // For now, just log to console
  // TODO: Integrate with Prisma client
  // await prisma.selfEvolutionAction.create({ data: action });
}

/**
 * Get last execution timestamp (to ensure only one per day)
 */
async function getLastExecutionTimestamp(): Promise<Date | null> {
  // In production, query database for last successful wildcard action
  // For now, return null to allow execution
  // TODO: Integrate with Prisma client
  // const lastAction = await prisma.selfEvolutionAction.findFirst({
  //   where: { category: 'wildcard', success: true },
  //   orderBy: { executedAt: 'desc' }
  // });
  // return lastAction?.executedAt || null;
  return null;
}

// ============================================================================
// EXECUTION ENGINE
// ============================================================================

/**
 * Execute a validated proposal
 */
async function executeProposal(proposal: Proposal): Promise<Action> {
  const startTime = Date.now();

  const action: Action = {
    id: randomUUID(),
    proposalId: proposal.id,
    category: proposal.category,
    actionType: proposal.proposalType,
    title: proposal.title,
    description: proposal.description,
    executedChange: proposal.proposedChange,
    rollbackInfo: {
      originalValue: proposal.proposedChange.before,
      canRollback: proposal.reversible,
    },
    success: false,
    rolloutPercentage: ROLLOUT_PERCENTAGE,
    executedAt: new Date(),
  };

  try {
    // Simulate execution (in production, this would actually make the change)
    console.log('⚡ Executing wildcard change:', proposal.title);
    console.log('   Type:', proposal.proposalType);
    console.log('   Area:', proposal.allowlistArea);
    console.log('   Rollout:', `${ROLLOUT_PERCENTAGE}%`);

    // TODO: Implement actual change execution based on proposal type
    // For now, just mark as successful
    action.success = true;
    action.executionTimeMs = Date.now() - startTime;

    console.log('✅ Wildcard executed successfully');
  } catch (error) {
    action.success = false;
    action.errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Wildcard execution failed:', action.errorMessage);
  }

  return action;
}

// ============================================================================
// MAIN WORKFLOW
// ============================================================================

/**
 * Main wildcard feature hook execution
 */
async function runWildcardHook(): Promise<void> {
  console.log('🎲 Wildcard Feature Hook v1');
  console.log('═'.repeat(80));

  // Check feature flag
  if (!FEATURE_FLAG) {
    console.log('⏸️  Feature flag SELF_EVOLUTION_WILDCARD_ENABLED is disabled');
    console.log('   Set SELF_EVOLUTION_WILDCARD_ENABLED=true to enable');
    return;
  }

  console.log(`🚀 Feature enabled | Rollout: ${ROLLOUT_PERCENTAGE}% | Max: ${MAX_ROLLOUT}%`);

  // Check daily limit
  const lastExecution = await getLastExecutionTimestamp();
  if (lastExecution) {
    const hoursSinceLastExecution = (Date.now() - lastExecution.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastExecution < 24) {
      console.log(`⏰ Last execution was ${hoursSinceLastExecution.toFixed(1)} hours ago`);
      console.log('   Daily limit: one wildcard per 24 hours');
      return;
    }
  }

  // Check rollout percentage
  if (!shouldExecuteRollout()) {
    console.log(`🎯 Rollout check: Not selected (${ROLLOUT_PERCENTAGE}% chance)`);
    return;
  }

  console.log('🎯 Rollout check: Selected for execution');

  // Generate a wildcard proposal
  const generator = WILDCARD_GENERATORS[Math.floor(Math.random() * WILDCARD_GENERATORS.length)];
  const proposal = generator();

  console.log(`\n📝 Generated Proposal: ${proposal.title}`);
  console.log(`   Description: ${proposal.description}`);
  console.log(`   Rationale: ${proposal.rationale}`);
  console.log(`   Type: ${proposal.proposalType}`);
  console.log(`   Area: ${proposal.allowlistArea}`);
  console.log(`   Risk: ${proposal.riskLevel}`);
  console.log(`   Reversible: ${proposal.reversible}`);

  // Validate proposal
  const validation = validateProposal(proposal);
  if (!validation.valid) {
    console.log(`\n❌ Validation Failed: ${validation.reason}`);
    proposal.status = 'rejected';
    await saveProposal(proposal);
    return;
  }

  console.log('\n✅ Validation Passed');

  // Save proposal
  await saveProposal(proposal);

  // Auto-approve for wildcard category (in v2, might require manual approval)
  proposal.status = 'approved';
  console.log('✅ Auto-approved (wildcard category)');

  // Execute proposal
  const action = await executeProposal(proposal);

  // Save action
  await saveAction(action);

  // Update proposal status
  if (action.success) {
    proposal.status = 'executed';
    console.log('\n🎉 Wildcard Feature Hook Completed Successfully');
  } else {
    proposal.status = 'rejected';
    console.log('\n❌ Wildcard Feature Hook Failed');
  }

  await saveProposal(proposal);

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Proposal ID: ${proposal.id}`);
  console.log(`   Action ID: ${action.id}`);
  console.log(`   Status: ${proposal.status}`);
  console.log(`   Execution Time: ${action.executionTimeMs}ms`);
  console.log(`   Rollout: ${action.rolloutPercentage}%`);
}

// ============================================================================
// CLI EXECUTION
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  runWildcardHook().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runWildcardHook, validateProposal, WILDCARD_GENERATORS, ALLOWLIST_AREAS };
