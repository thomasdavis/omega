/**
 * Feelings Subsystem - Aggregator
 * Collects feelings from multiple subsystems and determines salience/priority
 */

import { Feeling, FeelingType, FeelingsState } from './types.js';

/**
 * Weights for different feeling types (determines salience)
 * Higher weight = more important/salient
 */
const FEELING_WEIGHTS: Record<FeelingType, number> = {
  [FeelingType.URGENCY]: 1.0, // Highest priority - immediate needs
  [FeelingType.CONCERN]: 0.9, // High priority - problems to address
  [FeelingType.CONFUSION]: 0.8, // Important - affects effectiveness
  [FeelingType.FATIGUE]: 0.7, // Moderate - affects sustainability
  [FeelingType.CURIOSITY]: 0.5, // Lower priority - growth opportunities
  [FeelingType.ANTICIPATION]: 0.6, // Moderate - future planning
  [FeelingType.SATISFACTION]: 0.4, // Lower priority - reinforcement
};

/**
 * Aggregates feelings from multiple subsystems and computes overall state
 */
export class FeelingsAggregator {
  private feelings: Map<string, Feeling> = new Map();
  private maxFeelings: number;
  private decayTime: number;

  constructor(maxFeelings: number = 10, decayTime: number = 300000) {
    this.maxFeelings = maxFeelings;
    this.decayTime = decayTime;
  }

  /**
   * Add new feelings to the aggregator
   */
  addFeelings(feelings: Feeling[]): void {
    const now = Date.now();

    // Remove expired feelings
    this.removeExpiredFeelings(now);

    // Add new feelings with unique IDs based on source and type
    for (const feeling of feelings) {
      const key = `${feeling.source}:${feeling.type}:${feeling.timestamp.getTime()}`;
      this.feelings.set(key, feeling);
    }

    // Keep only the most salient feelings if we exceed max
    if (this.feelings.size > this.maxFeelings) {
      this.pruneToMaxFeelings();
    }
  }

  /**
   * Remove feelings that have decayed past their lifetime
   */
  private removeExpiredFeelings(now: number): void {
    for (const [key, feeling] of this.feelings.entries()) {
      const age = now - feeling.timestamp.getTime();
      if (age > this.decayTime) {
        this.feelings.delete(key);
      }
    }
  }

  /**
   * Keep only the most salient feelings
   */
  private pruneToMaxFeelings(): void {
    const sorted = this.sortBySalience(Array.from(this.feelings.values()));
    this.feelings.clear();

    // Keep top N feelings
    for (let i = 0; i < Math.min(this.maxFeelings, sorted.length); i++) {
      const feeling = sorted[i];
      const key = `${feeling.source}:${feeling.type}:${feeling.timestamp.getTime()}`;
      this.feelings.set(key, feeling);
    }
  }

  /**
   * Calculate salience (importance) of a feeling
   * Salience = intensity × type weight × recency factor
   */
  private calculateSalience(feeling: Feeling, now: number = Date.now()): number {
    const typeWeight = FEELING_WEIGHTS[feeling.type];
    const age = now - feeling.timestamp.getTime();

    // Recency factor: decays linearly from 1.0 to 0.5 over decayTime
    const recencyFactor = Math.max(0.5, 1.0 - (age / this.decayTime) * 0.5);

    return feeling.intensity * typeWeight * recencyFactor;
  }

  /**
   * Sort feelings by salience (most salient first)
   */
  private sortBySalience(feelings: Feeling[]): Feeling[] {
    const now = Date.now();
    return feelings.sort((a, b) => {
      return this.calculateSalience(b, now) - this.calculateSalience(a, now);
    });
  }

  /**
   * Get the current feelings state
   */
  getState(): FeelingsState {
    const now = Date.now();
    this.removeExpiredFeelings(now);

    const allFeelings = Array.from(this.feelings.values());
    const sortedFeelings = this.sortBySalience(allFeelings);

    const dominantFeeling = sortedFeelings.length > 0 ? sortedFeelings[0] : undefined;
    const tone = this.computeTone(sortedFeelings);

    return {
      feelings: sortedFeelings,
      dominantFeeling,
      tone,
      lastUpdated: new Date(),
    };
  }

  /**
   * Compute overall emotional tone from feelings
   */
  private computeTone(feelings: Feeling[]): FeelingsState['tone'] {
    if (feelings.length === 0) return 'calm';

    // Count feelings by category
    const counts: Record<string, number> = {};
    let totalIntensity = 0;

    for (const feeling of feelings) {
      counts[feeling.type] = (counts[feeling.type] || 0) + 1;
      totalIntensity += feeling.intensity;
    }

    const avgIntensity = totalIntensity / feelings.length;

    // Determine tone based on dominant feeling types and intensity
    if (counts[FeelingType.URGENCY] || counts[FeelingType.CONCERN]) {
      if (avgIntensity > 0.7) return 'stressed';
      return 'engaged';
    }

    if (counts[FeelingType.CONFUSION] > feelings.length / 2) {
      return 'confused';
    }

    if (counts[FeelingType.CURIOSITY] || counts[FeelingType.SATISFACTION]) {
      if (avgIntensity > 0.5) return 'energized';
      return 'engaged';
    }

    return 'calm';
  }

  /**
   * Get feelings by type
   */
  getFeelingsByType(type: FeelingType): Feeling[] {
    return Array.from(this.feelings.values())
      .filter(f => f.type === type)
      .sort((a, b) => b.intensity - a.intensity);
  }

  /**
   * Get the most salient feeling of a specific type
   */
  getDominantFeelingOfType(type: FeelingType): Feeling | undefined {
    const feelings = this.getFeelingsByType(type);
    return feelings.length > 0 ? feelings[0] : undefined;
  }

  /**
   * Check if a specific feeling type is present above a threshold
   */
  hasFeeling(type: FeelingType, minIntensity: number = 0.3): boolean {
    const feeling = this.getDominantFeelingOfType(type);
    return feeling !== undefined && feeling.intensity >= minIntensity;
  }

  /**
   * Clear all feelings (for reset/new session)
   */
  clear(): void {
    this.feelings.clear();
  }

  /**
   * Get a summary of current feelings for logging/debugging
   */
  getSummary(): string {
    const state = this.getState();
    if (state.feelings.length === 0) {
      return 'No current feelings';
    }

    const lines = [`Tone: ${state.tone}`];
    if (state.dominantFeeling) {
      lines.push(`Dominant: ${state.dominantFeeling.type} (${(state.dominantFeeling.intensity * 100).toFixed(0)}%) - ${state.dominantFeeling.description}`);
    }

    lines.push(`Total feelings: ${state.feelings.length}`);

    return lines.join('\n');
  }
}
