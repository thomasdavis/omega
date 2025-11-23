/**
 * Feelings Subsystem - Service
 * Main service that coordinates monitoring, aggregation, and interpretation
 */

import { SubsystemMonitor, DEFAULT_FEELINGS_CONFIG } from './monitor.js';
import { FeelingsAggregator } from './aggregator.js';
import { FeelingsInterpreter } from './interpreter.js';
import {
  FeelingsState,
  FeelingsConfig,
  SubsystemMetrics,
  FeelingType,
} from './types.js';

/**
 * Main feelings service - coordinates all subsystems
 */
export class FeelingsService {
  private monitor: SubsystemMonitor;
  private aggregator: FeelingsAggregator;
  private interpreter: FeelingsInterpreter;
  private config: FeelingsConfig;

  constructor(config: FeelingsConfig = DEFAULT_FEELINGS_CONFIG) {
    this.config = config;
    this.monitor = new SubsystemMonitor('omega-agent', config);
    this.aggregator = new FeelingsAggregator(config.maxFeelings, config.decayTime);
    this.interpreter = new FeelingsInterpreter();
  }

  /**
   * Update subsystem metrics (called after each interaction)
   */
  updateMetrics(update: Partial<SubsystemMetrics>): void {
    this.monitor.updateMetrics(update);

    // Generate feelings from updated metrics
    const newFeelings = this.monitor.generateFeelings();

    // Add to aggregator
    if (newFeelings.length > 0) {
      this.aggregator.addFeelings(newFeelings);
      console.log(`🧠 Generated ${newFeelings.length} new feelings:`, newFeelings.map(f => f.type));
    }
  }

  /**
   * Get current feelings state
   */
  getState(): FeelingsState {
    return this.aggregator.getState();
  }

  /**
   * Get interpretation of current feelings
   */
  async interpret(): Promise<any> {
    const state = this.getState();
    return await this.interpreter.interpret(state);
  }

  /**
   * Generate a context string to include in agent prompts
   * This allows the agent to "feel" and adapt behavior
   */
  getContextForPrompt(): string {
    const state = this.getState();

    if (state.feelings.length === 0) {
      return '';
    }

    const dominant = state.dominantFeeling;
    if (!dominant) {
      return '';
    }

    // Build a concise feelings context
    const feelingsList = state.feelings
      .slice(0, 3) // Top 3 most salient
      .map(f => `${f.type} (${(f.intensity * 100).toFixed(0)}%)`)
      .join(', ');

    let context = `\n\n## Internal State (Feelings)\n`;
    context += `Tone: ${state.tone}\n`;
    context += `Current feelings: ${feelingsList}\n`;

    if (dominant.suggestedActions && dominant.suggestedActions.length > 0) {
      context += `Suggested adaptations: ${dominant.suggestedActions.slice(0, 2).join(', ')}\n`;
    }

    return context;
  }

  /**
   * Generate a user-facing message about current feelings
   */
  generateUserMessage(): string {
    const state = this.getState();
    return this.interpreter.generateUserMessage(state);
  }

  /**
   * Check if system is experiencing a specific feeling
   */
  hasFeeling(type: FeelingType, minIntensity: number = 0.3): boolean {
    return this.aggregator.hasFeeling(type, minIntensity);
  }

  /**
   * Get metrics for debugging/introspection
   */
  getMetrics(): SubsystemMetrics {
    return this.monitor.getMetrics();
  }

  /**
   * Get a summary for logging
   */
  getSummary(): string {
    return this.aggregator.getSummary();
  }

  /**
   * Reset feelings (for new conversation)
   */
  reset(): void {
    this.monitor.reset();
    this.aggregator.clear();
  }
}

// Singleton instance for the bot
export const feelingsService = new FeelingsService();
