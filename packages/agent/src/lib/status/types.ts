/**
 * Status Tracking Types
 * Defines the state machine for Omega's runtime status
 */

export type AgentState =
  | 'idle'
  | 'thinking'
  | 'running-tool'
  | 'waiting-network'
  | 'generating-image'
  | 'success'
  | 'error';

export interface StatusSnapshot {
  state: AgentState;
  substate?: string;
  toolName?: string;
  startedAt: number;
  elapsedMs: number;
  lastError?: {
    message: string;
    at: number;
  };
  version: string;
  uptimeSec: number;
  currentUser?: string;
  currentChannel?: string;
}

export interface StateTransition {
  from: AgentState;
  to: AgentState;
  timestamp: number;
  metadata?: Record<string, any>;
}
