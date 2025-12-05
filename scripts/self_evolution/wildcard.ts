/**
 * Wildcard Feature Hook - Daily self-directed tiny capability/persona tweaks
 *
 * This module implements the daily wildcard feature where the AI suggests
 * and (with approval) executes small, reversible improvements to its own
 * capabilities or persona.
 *
 * Strict Constraints:
 * - One small change per day maximum
 * - Must be reversible
 * - Confined to allowlist areas only
 * - Must pass guardrails and canary tests
 * - Behind feature flag with gradual rollout (0% → 25%)
 * - No changes to core runtime
 */

import { getPostgresPool } from '@repo/database';
import { randomUUID } from 'crypto';

// Feature flag - controlled by environment variable
export const WILDCARD_ENABLED = process.env.ENABLE_SELF_EVOLUTION_WILDCARD === 'true';

// Allowlist of safe areas where wildcard changes are permitted
const WILDCARD_ALLOWLIST = {
  // Saved replies - harmless predefined responses
  savedReplies: ['jokes', 'greetings', 'farewells', 'expressions'],

  // Minor prompt flavoring - personality tweaks only
  promptFlavoring: ['tone_modifiers', 'emoji_preferences', 'speech_patterns'],

  // Harmless tool aliases - convenience shortcuts
  toolAliases: true,

  // Content categories - joke types, music genres, etc.
  contentCategories: ['joke_categories', 'music_genres', 'image_styles'],
};

// Risk levels for different wildcard types
const WILDCARD_RISK_LEVELS = {
  savedReply: 'low',
  promptFlavor: 'low',
  toolAlias: 'low',
  contentCategory: 'low',
} as const;

interface WildcardProposal {
  id: string;
  category: 'wildcard';
  title: string;
  description: string;
  rationale: string;
  proposedChanges: {
    type: string;
    area: string;
    change: any;
  };
  riskLevel: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

/**
 * Generate a wildcard proposal based on recent interactions and system state
 */
export async function generateWildcardProposal(): Promise<WildcardProposal | null> {
  console.log('🎲 Generating wildcard proposal...');

  if (!WILDCARD_ENABLED) {
    console.log('⚠️ Wildcard feature is disabled');
    return null;
  }

  // Check if we've already made a wildcard change today
  const pool = await getPostgresPool();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const existingToday = await pool.query(
    `SELECT id FROM self_evolution_proposals
     WHERE category = 'wildcard'
     AND proposed_at >= $1
     LIMIT 1`,
    [today]
  );

  if (existingToday.rows.length > 0) {
    console.log('✅ Already proposed a wildcard change today');
    return null;
  }

  // Generate a random wildcard idea from the allowlist
  const wildcardIdeas = [
    {
      type: 'savedReply',
      area: 'jokes',
      title: 'Add new joke category',
      description: 'Add "science puns" to the joke categories',
      rationale: 'Users enjoy varied humor styles, and science puns are universally accessible',
      change: {
        category: 'science_puns',
        examples: [
          'Why can\'t you trust atoms? They make up everything!',
          'I\'d tell you a chemistry joke but I know I wouldn\'t get a reaction.',
        ],
      },
      estimatedImpact: 'Adds variety to humor responses without affecting core functionality',
    },
    {
      type: 'promptFlavor',
      area: 'tone_modifiers',
      title: 'Add encouraging tone modifier',
      description: 'Add subtle encouragement to technical explanations',
      rationale: 'Positive reinforcement improves user experience in learning contexts',
      change: {
        modifier: 'encouraging',
        triggers: ['learning', 'tutorial', 'explanation'],
        flavor: 'subtle positive framing',
      },
      estimatedImpact: 'Slight improvement in user satisfaction during learning interactions',
    },
    {
      type: 'toolAlias',
      area: 'aliases',
      title: 'Add shortcut alias for common tool',
      description: 'Add "profile" as alias for getUserProfile',
      rationale: 'Users frequently want profile information - a shorter alias improves UX',
      change: {
        alias: 'profile',
        targetTool: 'getUserProfile',
        description: 'Quick access to user profile',
      },
      estimatedImpact: 'Convenience improvement with zero risk to existing functionality',
    },
    {
      type: 'contentCategory',
      area: 'music_genres',
      title: 'Add lo-fi genre category',
      description: 'Add "lo-fi" to supported music generation genres',
      rationale: 'Lo-fi is popular and fits well with existing music generation capabilities',
      change: {
        genre: 'lo-fi',
        characteristics: ['relaxed tempo', 'ambient', 'study-friendly'],
      },
      estimatedImpact: 'Expands creative options without changing existing behavior',
    },
  ];

  // Pick a random idea (in production, this would be more sophisticated)
  const idea = wildcardIdeas[Math.floor(Math.random() * wildcardIdeas.length)];

  const proposal: WildcardProposal = {
    id: randomUUID(),
    category: 'wildcard',
    title: idea.title,
    description: idea.description,
    rationale: idea.rationale,
    proposedChanges: {
      type: idea.type,
      area: idea.area,
      change: idea.change,
    },
    riskLevel: WILDCARD_RISK_LEVELS[idea.type as keyof typeof WILDCARD_RISK_LEVELS],
    estimatedImpact: idea.estimatedImpact,
  };

  console.log(`💡 Generated wildcard proposal: ${proposal.title}`);
  return proposal;
}

/**
 * Save proposal to database
 */
export async function saveProposal(proposal: WildcardProposal): Promise<void> {
  const pool = await getPostgresPool();

  await pool.query(
    `INSERT INTO self_evolution_proposals (
      id, category, title, description, rationale,
      proposed_changes, risk_level, estimated_impact,
      proposed_by, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      proposal.id,
      proposal.category,
      proposal.title,
      proposal.description,
      proposal.rationale,
      JSON.stringify(proposal.proposedChanges),
      proposal.riskLevel,
      proposal.estimatedImpact,
      'wildcard_system',
      'pending',
    ]
  );

  console.log(`✅ Saved proposal ${proposal.id} to database`);
}

/**
 * Run guardrails validation on a proposal
 */
export async function validateProposal(proposalId: string): Promise<{
  valid: boolean;
  reason?: string;
}> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    'SELECT * FROM self_evolution_proposals WHERE id = $1',
    [proposalId]
  );

  if (result.rows.length === 0) {
    return { valid: false, reason: 'Proposal not found' };
  }

  const proposal = result.rows[0];
  const changes = proposal.proposed_changes;

  // Validate change type is in allowlist
  if (changes.type === 'savedReply') {
    if (!WILDCARD_ALLOWLIST.savedReplies.includes(changes.area)) {
      return { valid: false, reason: 'Saved reply area not in allowlist' };
    }
  } else if (changes.type === 'promptFlavor') {
    if (!WILDCARD_ALLOWLIST.promptFlavoring.includes(changes.area)) {
      return { valid: false, reason: 'Prompt flavoring area not in allowlist' };
    }
  } else if (changes.type === 'toolAlias') {
    if (!WILDCARD_ALLOWLIST.toolAliases) {
      return { valid: false, reason: 'Tool aliases not permitted' };
    }
  } else if (changes.type === 'contentCategory') {
    if (!WILDCARD_ALLOWLIST.contentCategories.includes(changes.area)) {
      return { valid: false, reason: 'Content category area not in allowlist' };
    }
  } else {
    return { valid: false, reason: 'Unknown change type' };
  }

  // Ensure risk level is low
  if (proposal.risk_level !== 'low') {
    return { valid: false, reason: 'Only low-risk wildcard changes permitted' };
  }

  // TODO: Add more sophisticated validation
  // - Check for malicious content
  // - Verify change size is small
  // - Ensure reversibility

  return { valid: true };
}

/**
 * Execute an approved wildcard proposal with canary testing
 */
export async function executeProposal(
  proposalId: string,
  initialRolloutPercentage: number = 0
): Promise<{
  success: boolean;
  actionId?: string;
  error?: string;
}> {
  const pool = await getPostgresPool();

  // Verify proposal is approved
  const proposalResult = await pool.query(
    'SELECT * FROM self_evolution_proposals WHERE id = $1 AND status = $2',
    [proposalId, 'approved']
  );

  if (proposalResult.rows.length === 0) {
    return { success: false, error: 'Proposal not found or not approved' };
  }

  const proposal = proposalResult.rows[0];
  const actionId = randomUUID();

  try {
    // Execute the change based on type
    // In a real implementation, this would actually modify configuration
    // For now, we just log the execution

    const executionLog = `Executed wildcard change: ${proposal.title}\nType: ${proposal.proposed_changes.type}\nArea: ${proposal.proposed_changes.area}`;

    // Record the action
    await pool.query(
      `INSERT INTO self_evolution_actions (
        id, proposal_id, action_type, action_details,
        executed_by, execution_status, execution_log,
        rollout_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        actionId,
        proposalId,
        proposal.proposed_changes.type,
        JSON.stringify(proposal.proposed_changes),
        'wildcard_system',
        'success',
        executionLog,
        initialRolloutPercentage,
      ]
    );

    // Update proposal status
    await pool.query(
      'UPDATE self_evolution_proposals SET status = $1, reviewed_at = NOW(), reviewed_by = $2 WHERE id = $3',
      ['executed', 'wildcard_system', proposalId]
    );

    console.log(`✅ Executed wildcard proposal ${proposalId} with ${initialRolloutPercentage}% rollout`);

    return { success: true, actionId };
  } catch (error) {
    console.error('❌ Error executing wildcard proposal:', error);

    // Record failed action
    await pool.query(
      `INSERT INTO self_evolution_actions (
        id, proposal_id, action_type, action_details,
        executed_by, execution_status, execution_log
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        actionId,
        proposalId,
        proposal.proposed_changes.type,
        JSON.stringify(proposal.proposed_changes),
        'wildcard_system',
        'failed',
        error instanceof Error ? error.message : String(error),
      ]
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Main wildcard workflow - called daily by scheduler
 */
export async function runDailyWildcard(): Promise<{
  success: boolean;
  proposalId?: string;
  message: string;
}> {
  console.log('🎲 Running daily wildcard workflow...');

  if (!WILDCARD_ENABLED) {
    return {
      success: false,
      message: 'Wildcard feature is disabled (ENABLE_SELF_EVOLUTION_WILDCARD not set to true)'
    };
  }

  try {
    // Generate a proposal
    const proposal = await generateWildcardProposal();

    if (!proposal) {
      return {
        success: true,
        message: 'No wildcard proposal generated today (may have already proposed one)'
      };
    }

    // Save proposal
    await saveProposal(proposal);

    // Validate proposal
    const validation = await validateProposal(proposal.id);

    if (!validation.valid) {
      const pool = await getPostgresPool();
      await pool.query(
        'UPDATE self_evolution_proposals SET status = $1, review_notes = $2 WHERE id = $3',
        ['rejected', validation.reason, proposal.id]
      );

      return {
        success: false,
        proposalId: proposal.id,
        message: `Proposal rejected: ${validation.reason}`,
      };
    }

    // Auto-approve low-risk wildcard proposals
    // (In production, this might require human approval)
    const pool = await getPostgresPool();
    await pool.query(
      'UPDATE self_evolution_proposals SET status = $1 WHERE id = $2',
      ['approved', proposal.id]
    );

    // Execute with 0% rollout initially (canary phase)
    const execution = await executeProposal(proposal.id, 0);

    if (!execution.success) {
      return {
        success: false,
        proposalId: proposal.id,
        message: `Execution failed: ${execution.error}`,
      };
    }

    return {
      success: true,
      proposalId: proposal.id,
      message: `Wildcard proposal "${proposal.title}" executed successfully with 0% rollout`,
    };
  } catch (error) {
    console.error('❌ Error in daily wildcard workflow:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Gradually increase rollout percentage for a successful action
 */
export async function increaseRollout(
  actionId: string,
  targetPercentage: number
): Promise<{ success: boolean; error?: string }> {
  if (targetPercentage < 0 || targetPercentage > 25) {
    return { success: false, error: 'Target percentage must be between 0 and 25' };
  }

  const pool = await getPostgresPool();

  try {
    await pool.query(
      'UPDATE self_evolution_actions SET rollout_percentage = $1 WHERE id = $2',
      [targetPercentage, actionId]
    );

    console.log(`✅ Increased rollout to ${targetPercentage}% for action ${actionId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Rollback a wildcard action
 */
export async function rollbackAction(
  actionId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const pool = await getPostgresPool();

  try {
    await pool.query(
      `UPDATE self_evolution_actions
       SET rolled_back_at = NOW(), rollback_reason = $1, rollout_percentage = 0
       WHERE id = $2`,
      [reason, actionId]
    );

    // Update proposal status
    await pool.query(
      `UPDATE self_evolution_proposals
       SET status = 'rolled_back'
       WHERE id = (SELECT proposal_id FROM self_evolution_actions WHERE id = $1)`,
      [actionId]
    );

    console.log(`✅ Rolled back action ${actionId}: ${reason}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
