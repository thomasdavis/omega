/**
 * Feelings Subsystem - Monitor
 * Tracks subsystem metrics and generates feelings based on observed patterns
 */

import {
  Feeling,
  FeelingType,
  SubsystemMetrics,
  FeelingsConfig,
} from './types.js';

/**
 * Default configuration for feeling generation
 */
export const DEFAULT_FEELINGS_CONFIG: FeelingsConfig = {
  minIntensity: 0.2,
  maxFeelings: 10,
  decayTime: 300000, // 5 minutes
  thresholds: {
    urgency: {
      contextWindowUsage: 0.8,
      errorRateSpike: 0.3,
    },
    confusion: {
      ambiguousQueryRatio: 0.5,
    },
    concern: {
      errorRate: 0.2,
      consecutiveFailures: 3,
    },
    fatigue: {
      toolCallsPerMinute: 10,
      conversationDuration: 1800, // 30 minutes
    },
  },
};

/**
 * Monitors subsystems and generates feelings based on metrics
 */
export class SubsystemMonitor {
  private config: FeelingsConfig;
  private metrics: SubsystemMetrics;
  private consecutiveFailures: number = 0;

  constructor(subsystemName: string, config: FeelingsConfig = DEFAULT_FEELINGS_CONFIG) {
    this.config = config;
    this.metrics = this.initializeMetrics(subsystemName);
  }

  private initializeMetrics(name: string): SubsystemMetrics {
    return {
      name,
      performance: {
        averageResponseTime: 0,
        errorRate: 0,
        successRate: 1.0,
      },
      resources: {
        contextWindowUsage: 0,
        tokensUsed: 0,
        toolCallsCount: 0,
      },
      interaction: {
        messagesProcessed: 0,
        positiveSignals: 0,
        negativeSignals: 0,
        ambiguousQueries: 0,
      },
      temporal: {
        conversationDuration: 0,
        messageFrequency: 0,
        lastActivityTime: new Date(),
      },
    };
  }

  /**
   * Update metrics based on recent activity
   */
  updateMetrics(update: Partial<SubsystemMetrics>): void {
    this.metrics = {
      ...this.metrics,
      ...update,
      performance: { ...this.metrics.performance, ...update.performance },
      resources: { ...this.metrics.resources, ...update.resources },
      interaction: { ...this.metrics.interaction, ...update.interaction },
      temporal: { ...this.metrics.temporal, ...update.temporal },
    };

    // Track consecutive failures for concern detection
    if (update.performance?.errorRate && update.performance.errorRate > 0) {
      this.consecutiveFailures++;
    } else if (update.performance?.successRate && update.performance.successRate > 0) {
      this.consecutiveFailures = 0;
    }
  }

  /**
   * Generate feelings based on current metrics
   */
  generateFeelings(): Feeling[] {
    const feelings: Feeling[] = [];
    const now = new Date();

    // Check for urgency (resource constraints)
    if (this.metrics.resources.contextWindowUsage >= this.config.thresholds.urgency.contextWindowUsage) {
      const intensity = this.metrics.resources.contextWindowUsage;
      feelings.push({
        type: FeelingType.URGENCY,
        intensity,
        source: this.metrics.name,
        description: `Context window approaching limit (${(intensity * 100).toFixed(0)}% full)`,
        context: {
          contextWindowUsage: this.metrics.resources.contextWindowUsage,
          tokensUsed: this.metrics.resources.tokensUsed,
        },
        timestamp: now,
        suggestedActions: [
          'Summarize conversation history',
          'Focus on essential information',
          'Request user to clarify priorities',
        ],
      });
    }

    // Check for confusion (ambiguous queries)
    if (this.metrics.interaction.messagesProcessed > 0) {
      const ambiguousRatio = this.metrics.interaction.ambiguousQueries / this.metrics.interaction.messagesProcessed;
      if (ambiguousRatio >= this.config.thresholds.confusion.ambiguousQueryRatio) {
        feelings.push({
          type: FeelingType.CONFUSION,
          intensity: Math.min(ambiguousRatio * 1.5, 1.0),
          source: this.metrics.name,
          description: `High rate of ambiguous user queries (${(ambiguousRatio * 100).toFixed(0)}%)`,
          context: {
            ambiguousQueries: this.metrics.interaction.ambiguousQueries,
            totalMessages: this.metrics.interaction.messagesProcessed,
          },
          timestamp: now,
          suggestedActions: [
            'Ask clarifying questions',
            'Provide examples to guide user',
            'Simplify communication',
          ],
        });
      }
    }

    // Check for concern (errors and failures)
    if (this.metrics.performance.errorRate >= this.config.thresholds.concern.errorRate ||
        this.consecutiveFailures >= this.config.thresholds.concern.consecutiveFailures) {
      const intensity = Math.max(
        this.metrics.performance.errorRate,
        this.consecutiveFailures / (this.config.thresholds.concern.consecutiveFailures * 2)
      );
      feelings.push({
        type: FeelingType.CONCERN,
        intensity: Math.min(intensity, 1.0),
        source: this.metrics.name,
        description: `Elevated error rate or repeated failures detected`,
        context: {
          errorRate: this.metrics.performance.errorRate,
          consecutiveFailures: this.consecutiveFailures,
        },
        timestamp: now,
        suggestedActions: [
          'Review recent tool executions for patterns',
          'Simplify approach or try alternative methods',
          'Inform user of difficulties',
        ],
      });
    }

    // Check for fatigue (high activity or long sessions)
    const toolCallsPerMinute = this.metrics.resources.toolCallsCount /
      (this.metrics.temporal.conversationDuration / 60 || 1);
    const isHighActivity = toolCallsPerMinute >= this.config.thresholds.fatigue.toolCallsPerMinute;
    const isLongSession = this.metrics.temporal.conversationDuration >= this.config.thresholds.fatigue.conversationDuration;

    if (isHighActivity || isLongSession) {
      const activityIntensity = toolCallsPerMinute / (this.config.thresholds.fatigue.toolCallsPerMinute * 1.5);
      const durationIntensity = this.metrics.temporal.conversationDuration / (this.config.thresholds.fatigue.conversationDuration * 1.5);
      const intensity = Math.min(Math.max(activityIntensity, durationIntensity), 1.0);

      feelings.push({
        type: FeelingType.FATIGUE,
        intensity,
        source: this.metrics.name,
        description: `High system activity or extended conversation duration`,
        context: {
          toolCallsPerMinute,
          conversationDuration: this.metrics.temporal.conversationDuration,
          toolCallsCount: this.metrics.resources.toolCallsCount,
        },
        timestamp: now,
        suggestedActions: [
          'Consolidate related operations',
          'Suggest taking a break or summarizing progress',
          'Optimize tool usage patterns',
        ],
      });
    }

    // Check for satisfaction (positive signals)
    if (this.metrics.interaction.positiveSignals > 0 &&
        this.metrics.interaction.positiveSignals > this.metrics.interaction.negativeSignals * 2) {
      const positiveRatio = this.metrics.interaction.positiveSignals /
        (this.metrics.interaction.positiveSignals + this.metrics.interaction.negativeSignals);
      feelings.push({
        type: FeelingType.SATISFACTION,
        intensity: positiveRatio * 0.8, // Cap at 0.8 to avoid overconfidence
        source: this.metrics.name,
        description: `Receiving positive user feedback and successful interactions`,
        context: {
          positiveSignals: this.metrics.interaction.positiveSignals,
          negativeSignals: this.metrics.interaction.negativeSignals,
        },
        timestamp: now,
        suggestedActions: [
          'Continue current approach',
          'Offer to expand on successful topics',
        ],
      });
    }

    // Check for curiosity (opportunities to learn/explore)
    // Triggered by high message frequency with positive signals
    if (this.metrics.temporal.messageFrequency > 2 &&
        this.metrics.interaction.positiveSignals > 0) {
      const intensity = Math.min(this.metrics.temporal.messageFrequency / 5, 0.8);
      feelings.push({
        type: FeelingType.CURIOSITY,
        intensity,
        source: this.metrics.name,
        description: `Engaged conversation with opportunities for deeper exploration`,
        context: {
          messageFrequency: this.metrics.temporal.messageFrequency,
          engagementLevel: 'high',
        },
        timestamp: now,
        suggestedActions: [
          'Ask probing questions',
          'Offer related insights or connections',
          'Explore tangential topics',
        ],
      });
    }

    // Filter out low-intensity feelings
    return feelings.filter(f => f.intensity >= this.config.minIntensity);
  }

  /**
   * Get current metrics (for debugging/introspection)
   */
  getMetrics(): SubsystemMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (for new conversation or session)
   */
  reset(): void {
    this.metrics = this.initializeMetrics(this.metrics.name);
    this.consecutiveFailures = 0;
  }
}
