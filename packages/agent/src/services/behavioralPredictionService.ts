/**
 * Behavioral Prediction Service
 * Generates behavioral predictions by combining psychological profiling
 * and communication orientation
 */

import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import {
  getUserProfile,
  updateUserProfile,
  getAllUserProfiles,
  type UserProfileRecord,
} from '@repo/database';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Model used for behavioral predictions — GPT-5 for deeper insight */
const PREDICTION_MODEL = 'gpt-5';

const PREDICTION_STALENESS_DAYS = 7;
const BATCH_DELAY_MS = 2000;
const MAX_USER_STRING_LENGTH = 500;

// =============================================================================
// SCHEMAS
// =============================================================================

export interface BehavioralPrediction {
  behavior: string;
  confidence: number;
  timeframe: string;
  category: 'communication' | 'emotional' | 'social' | 'cognitive' | 'interests';
  influencingFactors: string[];
}

const PredictionsSchema = z.object({
  predictions: z.array(z.object({
    behavior: z.string().describe('Specific predicted behavior'),
    confidence: z.number().min(0.3).max(0.8).describe('Confidence level 0.3-0.8'),
    timeframe: z.enum(['next 7 days', 'next 14 days', 'next 30 days']),
    category: z.enum(['communication', 'emotional', 'social', 'cognitive', 'interests']),
    influencingFactors: z.array(z.string()).min(1).max(4).describe('Contributing factors'),
  })).min(3).max(5),
});

// =============================================================================
// PROMPT INJECTION PROTECTION
// =============================================================================

/**
 * Sanitize user-derived strings before interpolation into prompts
 */
function sanitize(input: string | null | undefined): string {
  if (!input) return 'unknown';
  return input
    .replace(/[\r\n]+/g, ' ')       // Strip newlines
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove control chars
    .slice(0, MAX_USER_STRING_LENGTH)
    .trim() || 'unknown';
}

function sanitizeArray(input: string | string[] | null | undefined): string {
  if (!input) return 'Unknown';
  try {
    const arr = typeof input === 'string' ? JSON.parse(input) : input;
    if (Array.isArray(arr)) {
      return arr.map(s => sanitize(String(s))).join(', ') || 'Unknown';
    }
    return sanitize(String(input));
  } catch {
    return sanitize(String(input));
  }
}

// =============================================================================
// COMMUNICATION ORIENTATION (replaces cultural binary)
// =============================================================================

/**
 * Infer communication orientation dimensions from patterns
 * Replaces the old "Western Individualist" / "East Asian Collectivist" binary
 */
function inferCommunicationOrientation(profile: UserProfileRecord): {
  directness: number;     // 0-100: indirect ← → direct
  formality: number;      // 0-100: informal ← → formal
  individualism: number;  // 0-100: collectivist ← → individualist
  values: string[];
  confidence: number;
} {
  let directness = 50;
  let formality = 50;
  let individualism = 50;
  const values: string[] = [];
  let confidence = 0.4;

  // Directness from assertiveness
  if (profile.communication_assertiveness === 'assertive' || profile.communication_assertiveness === 'aggressive') {
    directness += 25;
    values.push('self-expression', 'directness');
    confidence += 0.1;
  } else if (profile.communication_assertiveness === 'passive') {
    directness -= 20;
    values.push('diplomacy', 'harmony');
    confidence += 0.1;
  }

  // Formality from communication patterns
  if (profile.communication_formality === 'formal') {
    formality += 30;
    values.push('respect for hierarchy');
    confidence += 0.1;
  } else if (profile.communication_formality === 'casual') {
    formality -= 25;
    values.push('egalitarianism');
    confidence += 0.1;
  }

  // Individualism from cooperation + social dominance
  if (profile.cooperation_score && profile.cooperation_score > 70) {
    individualism -= 20;
    values.push('collaboration', 'community focus');
    confidence += 0.1;
  }
  if (profile.social_dominance_score && profile.social_dominance_score > 60) {
    individualism += 15;
    values.push('individual achievement');
    confidence += 0.05;
  }

  // Emotional expressiveness
  if (profile.emotional_awareness_score && profile.emotional_awareness_score > 70) {
    values.push('emotional openness');
    confidence += 0.05;
  }

  confidence = Math.min(0.8, confidence);

  return {
    directness: Math.max(0, Math.min(100, Math.round(directness))),
    formality: Math.max(0, Math.min(100, Math.round(formality))),
    individualism: Math.max(0, Math.min(100, Math.round(individualism))),
    values: values.length > 0 ? values : ['pragmatism'],
    confidence,
  };
}

// =============================================================================
// PREDICTION GENERATION
// =============================================================================

async function generatePredictions(profile: UserProfileRecord): Promise<BehavioralPrediction[]> {
  const orientation = inferCommunicationOrientation(profile);

  const prompt = `You are Omega, an AI analyzing a user's future behavior by integrating psychology and communication orientation.

## User Profile: ${sanitize(profile.username)}

### Psychological Profile (Big Five OCEAN):
- Openness: ${profile.openness_score ?? 'unknown'}/100
- Conscientiousness: ${profile.conscientiousness_score ?? 'unknown'}/100
- Extraversion: ${profile.extraversion_score ?? 'unknown'}/100
- Agreeableness: ${profile.agreeableness_score ?? 'unknown'}/100
- Neuroticism: ${profile.neuroticism_score ?? 'unknown'}/100

### Emotional Intelligence:
- Emotional Awareness: ${profile.emotional_awareness_score ?? 'unknown'}/100
- Empathy: ${profile.empathy_score ?? 'unknown'}/100
- Emotional Regulation: ${profile.emotional_regulation_score ?? 'unknown'}/100

### Communication Patterns:
- Formality: ${sanitize(profile.communication_formality)}
- Assertiveness: ${sanitize(profile.communication_assertiveness)}
- Engagement: ${sanitize(profile.communication_engagement)}

### Communication Orientation:
- Directness: ${orientation.directness}/100 (0=very indirect, 100=very direct)
- Formality: ${orientation.formality}/100 (0=very informal, 100=very formal)
- Individualism: ${orientation.individualism}/100 (0=collectivist, 100=individualist)
- Core Values: ${orientation.values.join(', ')}

### Current Interests:
${sanitizeArray(profile.primary_interests)}

## Weighting Guidance:
- **Psychology (80%):** Base predictions primarily on OCEAN traits, EI scores, and communication patterns
- **Communication orientation (20%):** Use orientation dimensions to calibrate HOW behaviors manifest

## Examples of Good vs Bad Predictions:

**GOOD (specific, observable):**
- "Will initiate a deep technical discussion about AI architecture within the next week"
- "Will offer emotional support to another user experiencing frustration"
- "Will ask more questions than usual as their curiosity score suggests an exploration phase"

**BAD (vague, unfalsifiable):**
- "Will continue to be themselves"
- "Might feel some emotions"
- "Could potentially engage with content"

## Task:
Generate 3-5 specific, observable behavioral predictions for the next 7-30 days.`;

  try {
    const result = await generateText({
      model: openai.chat(PREDICTION_MODEL),
      output: Output.object({ schema: PredictionsSchema }),
      prompt,
    });

    if (!result.output) {
      throw new Error('No structured output returned');
    }

    return result.output.predictions;
  } catch (error) {
    console.error('Failed to generate predictions:', error);
    return [
      {
        behavior: 'Continue engaging in technical discussions',
        confidence: 0.5,
        timeframe: 'next 7 days',
        category: 'interests',
        influencingFactors: ['Past behavior patterns'],
      },
    ];
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

export async function updateUserPredictions(userId: string): Promise<void> {
  console.log(`  Updating behavioral predictions for user: ${userId}`);

  const profile = await getUserProfile(userId);
  if (!profile) {
    console.log('   User profile not found');
    return;
  }

  if (!profile.message_count || profile.message_count < 10) {
    console.log('   Skipping - insufficient message history');
    return;
  }

  // Infer communication orientation
  const orientation = inferCommunicationOrientation(profile);

  // Generate predictions
  const predictions = await generatePredictions(profile);

  const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / Math.max(predictions.length, 1);

  // Create integrated summary using communication orientation
  const directnessLabel = orientation.directness > 65 ? 'direct' : orientation.directness < 35 ? 'indirect' : 'balanced';
  const integratedSummary = `${sanitize(profile.username)} has a ${directnessLabel} communication style. ` +
    `Psychologically, they exhibit ${profile.openness_score ?? 'moderate'} openness, ${profile.extraversion_score ?? 'moderate'} extraversion, ` +
    `and ${profile.agreeableness_score ?? 'moderate'} agreeableness. Their communication orientation ` +
    `suggests they are likely to ${predictions[0]?.behavior || 'continue current patterns'}.`;

  await updateUserProfile(userId, {
    // Communication orientation
    cultural_background: `directness:${orientation.directness} formality:${orientation.formality} individualism:${orientation.individualism}`,
    cultural_values: orientation.values,
    cultural_communication_style: directnessLabel,
    cultural_confidence: orientation.confidence,

    // Predictions
    predicted_behaviors: predictions,
    prediction_confidence: avgConfidence,
    prediction_timeframe: 'next 30 days',
    last_prediction_at: Math.floor(Date.now() / 1000),

    // Integration
    integrated_profile_summary: integratedSummary,
    profile_integration_confidence: orientation.confidence,
  });

  console.log(`   Predictions updated for ${profile.username}`);
  console.log(`      Orientation: direct=${orientation.directness} formal=${orientation.formality} indiv=${orientation.individualism} (${Math.round(orientation.confidence * 100)}%)`);
  console.log(`      Predictions: ${predictions.length} behaviors predicted (avg confidence: ${Math.round(avgConfidence * 100)}%)`);
}

export async function batchUpdatePredictions(limit = 100): Promise<void> {
  console.log('Starting batch behavioral prediction updates...');

  const profiles = await getAllUserProfiles(limit);
  console.log(`   Found ${profiles.length} user profiles`);

  let updated = 0;
  for (const profile of profiles) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const staleCutoff = now - PREDICTION_STALENESS_DAYS * 24 * 60 * 60;

      const shouldUpdate =
        !profile.last_prediction_at ||
        profile.last_prediction_at < staleCutoff ||
        (profile.last_analyzed_at && profile.last_prediction_at < profile.last_analyzed_at);

      if (shouldUpdate) {
        await updateUserPredictions(profile.user_id);
        updated++;
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      } else {
        console.log(`   Skipping ${profile.username} - predictions still fresh`);
      }
    } catch (error) {
      console.error(`   Failed to update predictions for ${profile.username}:`, error);
    }
  }

  console.log(`Batch prediction update complete - ${updated} users updated`);
}
