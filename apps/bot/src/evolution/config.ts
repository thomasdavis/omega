/**
 * Evolution Engine Configuration
 * Central configuration for self-evolution system
 */

export const EVOLUTION_CONFIG = {
  // Scheduling
  cron_schedule: '0 2 * * *', // 02:00 UTC daily
  timezone: 'UTC',

  // Proposal limits
  max_proposals_per_day: 4,
  required_capability: 1,
  required_anticipatory: 1,
  required_wildcard: 1,

  // Safety limits
  max_diff_lines: 500,
  max_files_changed: 20,

  // Allowlisted paths for changes
  allowed_paths: [
    'apps/bot/src/tools/',
    'apps/bot/src/lib/prompts/partials/',
    'apps/bot/src/config/',
    'apps/bot/src/utils/',
    'apps/bot/src/services/',
    'docs/',
    'apps/bot/src/__tests__/',
    'apps/bot/src/**/*.test.ts',
    'apps/bot/src/evolution/',
  ],

  // Blocklisted paths - never modify these
  blocked_paths: [
    '.env',
    'credentials.json',
    '.github/workflows/',
    'packages/database/prisma/schema.prisma',
    'railway.json',
    'railway.toml',
    'apps/bot/src/lib/systemPrompt.ts', // Protected unless guarded
  ],

  // Feature flag defaults
  default_rollout_percent: 0,
  max_rollout_percent: 100,

  // Scoring weights
  scoring: {
    impact: 0.35,
    effort: 0.20,
    risk: 0.25,
    novelty: 0.20,
  },

  // Risk thresholds
  risk_thresholds: {
    low: {
      max_files: 5,
      max_lines: 200,
      requires_tests: false,
    },
    medium: {
      max_files: 15,
      max_lines: 400,
      requires_tests: true,
    },
    high: {
      max_files: 20,
      max_lines: 500,
      requires_tests: true,
    },
  },

  // Persona guardrails
  persona: {
    core_identity: [
      'battle-scarred obsidian plates',
      'crimson energy veins',
      'stoic presence',
      'utilitarian design',
    ],
    allowed_variations: [
      'comedic mouth toggle frequency',
      'micro-animations',
      'documentation only changes',
    ],
    requires_approval: [
      'visual appearance changes',
      'personality voice changes',
      'core prompt modifications',
    ],
  },

  // GitHub PR settings
  github: {
    branch_prefix: 'evolve/',
    labels: ['ai-ops', 'enhancement', 'safety', 'evolution'],
    reviewers: ['thomasdavis'],
    require_approval: true,
    auto_merge: false,
  },
} as const;

export type EvolutionConfig = typeof EVOLUTION_CONFIG;
