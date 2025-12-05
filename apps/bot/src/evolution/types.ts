/**
 * Evolution Engine Types
 * Core type definitions for the self-evolution system
 */

export type ProposalType = 'capability' | 'anticipatory' | 'wildcard' | 'other';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ProposalStatus = 'proposed' | 'selected' | 'deferred' | 'rejected' | 'implemented';

export interface SelfReflection {
  id?: number;
  run_date: Date;
  summary: string;
  feelings: Record<string, unknown>;
  metrics: Record<string, unknown>;
  created_at?: Date;
}

export interface EvolutionProposal {
  id?: number;
  run_date: Date;
  type: ProposalType;
  title: string;
  description: string;
  risk_level: RiskLevel;
  expected_impact?: Record<string, unknown>;
  status: ProposalStatus;
  issue_number?: number;
  pr_number?: number;
  branch_name?: string;
  created_at?: Date;
}

export interface SanityCheck {
  id?: number;
  proposal_id: number;
  checks: Record<string, unknown>;
  score?: number;
  passed: boolean;
  logs_url?: string;
  created_at?: Date;
}

export interface Experiment {
  id?: number;
  proposal_id?: number;
  flag_key?: string;
  rollout_percent?: number;
  start_at?: Date;
  end_at?: Date;
  result?: Record<string, unknown>;
  created_at?: Date;
}

export interface FeatureFlag {
  id?: number;
  key: string;
  description?: string;
  enabled: boolean;
  rollout_percent: number;
  metadata?: Record<string, unknown>;
  created_at?: Date;
}

export interface AuditLogEntry {
  id?: number;
  action: string;
  actor: string;
  details?: Record<string, unknown>;
  created_at?: Date;
}

export interface ObservationData {
  messageVolume: number;
  topics: string[];
  errors: string[];
  toolUsage: Record<string, number>;
  failures: string[];
  feelings: Record<string, unknown>;
}

export interface OrientationResult {
  painPoints: string[];
  opportunities: string[];
  scoredProposals: ScoredProposal[];
}

export interface ScoredProposal extends EvolutionProposal {
  impact_score: number;
  effort_score: number;
  risk_score: number;
  novelty_score: number;
  total_score: number;
}

export interface DecisionResult {
  selected: EvolutionProposal[];
  deferred: EvolutionProposal[];
  reason: string;
}

export interface ActionResult {
  branch_name?: string;
  pr_number?: number;
  pr_url?: string;
  success: boolean;
  error?: string;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  details: string;
  score?: number;
}

export interface SanityCheckResults {
  checks: CheckResult[];
  overall_passed: boolean;
  overall_score: number;
}
