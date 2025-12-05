/**
 * Status Manager - Singleton service for tracking Omega's runtime state
 * Safe for public exposure (no secrets, no PII, no detailed args)
 */

import { AgentState, StatusSnapshot, StateTransition } from './types.js';

const PROCESS_START_TIME = Date.now();
const VERSION = process.env.npm_package_version || '1.0.0';

// Whitelist of tools safe to expose by name
const SAFE_TOOL_NAMES = new Set([
  'search',
  'calculator',
  'weather',
  'webFetch',
  'generateComic',
  'generateUserImage',
  'editUserImage',
  'generateHaiku',
  'generateSonnet',
  'tellJoke',
  'defineWord',
  'createBlogPost',
  'generateMarkdown',
]);

export class StatusManager {
  private currentState: AgentState = 'idle';
  private currentSubstate?: string;
  private currentToolName?: string;
  private stateStartTime: number = Date.now();
  private lastError?: { message: string; at: number };
  private currentUser?: string;
  private currentChannel?: string;
  private stateHistory: StateTransition[] = [];

  /**
   * Transition to a new state
   */
  setState(
    newState: AgentState,
    metadata?: {
      toolName?: string;
      substate?: string;
      user?: string;
      channel?: string;
    }
  ): void {
    const transition: StateTransition = {
      from: this.currentState,
      to: newState,
      timestamp: Date.now(),
      metadata,
    };

    this.stateHistory.push(transition);

    // Keep only last 50 transitions to prevent memory growth
    if (this.stateHistory.length > 50) {
      this.stateHistory.shift();
    }

    this.currentState = newState;
    this.stateStartTime = Date.now();
    this.currentSubstate = metadata?.substate;
    this.currentUser = metadata?.user;
    this.currentChannel = metadata?.channel;

    // Only expose safe tool names
    if (metadata?.toolName && SAFE_TOOL_NAMES.has(metadata.toolName)) {
      this.currentToolName = metadata.toolName;
    } else if (metadata?.toolName) {
      // Generic label for non-whitelisted tools
      this.currentToolName = 'tool';
    } else {
      this.currentToolName = undefined;
    }

    console.log(`📊 Status: ${this.currentState}${this.currentToolName ? ` (${this.currentToolName})` : ''}`);
  }

  /**
   * Record an error (sanitized)
   */
  setError(error: Error | string): void {
    const sanitizedMessage = this.sanitizeErrorMessage(
      typeof error === 'string' ? error : error.message
    );

    this.lastError = {
      message: sanitizedMessage,
      at: Date.now(),
    };

    this.setState('error');
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.lastError = undefined;
  }

  /**
   * Get current status snapshot (safe for public exposure)
   */
  getSnapshot(): StatusSnapshot {
    const now = Date.now();
    const elapsedMs = now - this.stateStartTime;
    const uptimeSec = Math.floor((now - PROCESS_START_TIME) / 1000);

    return {
      state: this.currentState,
      substate: this.currentSubstate,
      toolName: this.currentToolName,
      startedAt: this.stateStartTime,
      elapsedMs,
      lastError: this.lastError,
      version: VERSION,
      uptimeSec,
      currentUser: this.currentUser,
      currentChannel: this.currentChannel,
    };
  }

  /**
   * Get recent state transitions (for debugging)
   */
  getHistory(): StateTransition[] {
    return [...this.stateHistory];
  }

  /**
   * Reset to idle state
   */
  reset(): void {
    this.setState('idle');
    this.currentSubstate = undefined;
    this.currentToolName = undefined;
    this.currentUser = undefined;
    this.currentChannel = undefined;
  }

  /**
   * Sanitize error messages to remove secrets, tokens, paths, etc.
   */
  private sanitizeErrorMessage(message: string): string {
    let sanitized = message;

    // Remove potential tokens (long alphanumeric strings)
    sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED]');

    // Remove file paths
    sanitized = sanitized.replace(/\/[a-zA-Z0-9/_.-]+/g, '[PATH]');

    // Remove URLs with tokens
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '[URL]');

    // Remove email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

    // Truncate to max 200 chars
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 197) + '...';
    }

    return sanitized;
  }
}

// Singleton instance
export const statusManager = new StatusManager();
