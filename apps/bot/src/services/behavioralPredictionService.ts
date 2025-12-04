/**
 * Behavioral Prediction Service
 * Generates behavioral predictions by combining psychological profiling,
 * cultural background, and astrological influences
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../config/models.js';
import {
  getUserProfile,
  updateUserProfile,
  getAllUserProfiles,
  type UserProfileRecord,
} from '@repo/database';

/**
 * Zodiac sign mappings
 */
const ZODIAC_SIGNS = {
  Aries: { element: 'Fire', modality: 'Cardinal', dates: '03-21 to 04-19' },
  Taurus: { element: 'Earth', modality: 'Fixed', dates: '04-20 to 05-20' },
  Gemini: { element: 'Air', modality: 'Mutable', dates: '05-21 to 06-20' },
  Cancer: { element: 'Water', modality: 'Cardinal', dates: '06-21 to 07-22' },
  Leo: { element: 'Fire', modality: 'Fixed', dates: '07-23 to 08-22' },
  Virgo: { element: 'Earth', modality: 'Mutable', dates: '08-23 to 09-22' },
  Libra: { element: 'Air', modality: 'Cardinal', dates: '09-23 to 10-22' },
  Scorpio: { element: 'Water', modality: 'Fixed', dates: '10-23 to 11-21' },
  Sagittarius: { element: 'Fire', modality: 'Mutable', dates: '11-22 to 12-21' },
  Capricorn: { element: 'Earth', modality: 'Cardinal', dates: '12-22 to 01-19' },
  Aquarius: { element: 'Air', modality: 'Fixed', dates: '01-20 to 02-18' },
  Pisces: { element: 'Water', modality: 'Mutable', dates: '02-19 to 03-20' },
} as const;

type ZodiacSign = keyof typeof ZODIAC_SIGNS;

/**
 * Behavioral prediction interface
 */
export interface BehavioralPrediction {
  behavior: string;
  confidence: number; // 0-1
  timeframe: string;
  category: 'communication' | 'emotional' | 'social' | 'cognitive' | 'interests';
  influencingFactors: string[]; // e.g., ["High Openness", "Fire Sign", "Western Individualism"]
}

/**
 * Infer cultural background from communication patterns and language use
 */
function inferCulturalBackground(profile: UserProfileRecord): {
  background: string;
  values: string[];
  communicationStyle: string;
  confidence: number;
} {
  // Default to Western individualist culture (most common on Discord)
  let background = 'Western Individualist';
  const values: string[] = [];
  let communicationStyle = 'direct';
  let confidence = 0.5;

  // Analyze communication patterns
  if (profile.communication_formality === 'formal') {
    values.push('respect for hierarchy');
    confidence += 0.1;
  }

  if (profile.communication_assertiveness === 'passive') {
    background = 'East Asian Collectivist';
    communicationStyle = 'indirect';
    values.push('group harmony', 'face-saving', 'respect for authority');
    confidence += 0.2;
  } else if (profile.communication_assertiveness === 'assertive' || profile.communication_assertiveness === 'aggressive') {
    background = 'Western Individualist';
    communicationStyle = 'direct';
    values.push('self-expression', 'directness', 'individual achievement');
    confidence += 0.2;
  }

  // Analyze cooperation score
  if (profile.cooperation_score && profile.cooperation_score > 70) {
    values.push('collaboration', 'community focus');
    confidence += 0.1;
  }

  // Analyze emotional expression
  if (profile.emotional_awareness_score && profile.emotional_awareness_score > 70) {
    values.push('emotional openness');
    confidence += 0.1;
  }

  // Cap confidence at 0.8 (we can never be 100% certain from text alone)
  confidence = Math.min(0.8, confidence);

  return {
    background,
    values: values.length > 0 ? values : ['individualism', 'pragmatism'],
    communicationStyle,
    confidence,
  };
}

/**
 * Infer zodiac sign from personality traits
 * This is a speculative inference based on common astrological associations
 */
function inferZodiacSign(profile: UserProfileRecord): {
  sign: ZodiacSign;
  confidence: number;
} {
  const scores = new Map<ZodiacSign, number>();

  // Initialize all signs with base score
  Object.keys(ZODIAC_SIGNS).forEach((sign) => {
    scores.set(sign as ZodiacSign, 0);
  });

  // Fire signs (Aries, Leo, Sagittarius): High extraversion, assertiveness
  if (profile.extraversion_score && profile.extraversion_score > 70) {
    scores.set('Aries', (scores.get('Aries') || 0) + 2);
    scores.set('Leo', (scores.get('Leo') || 0) + 2);
    scores.set('Sagittarius', (scores.get('Sagittarius') || 0) + 2);
  }

  // Earth signs (Taurus, Virgo, Capricorn): High conscientiousness
  if (profile.conscientiousness_score && profile.conscientiousness_score > 70) {
    scores.set('Taurus', (scores.get('Taurus') || 0) + 2);
    scores.set('Virgo', (scores.get('Virgo') || 0) + 2);
    scores.set('Capricorn', (scores.get('Capricorn') || 0) + 2);
  }

  // Air signs (Gemini, Libra, Aquarius): High openness, analytical
  if (profile.openness_score && profile.openness_score > 70) {
    scores.set('Gemini', (scores.get('Gemini') || 0) + 2);
    scores.set('Libra', (scores.get('Libra') || 0) + 2);
    scores.set('Aquarius', (scores.get('Aquarius') || 0) + 2);
  }

  // Water signs (Cancer, Scorpio, Pisces): High emotional awareness
  if (profile.emotional_awareness_score && profile.emotional_awareness_score > 70) {
    scores.set('Cancer', (scores.get('Cancer') || 0) + 2);
    scores.set('Scorpio', (scores.get('Scorpio') || 0) + 2);
    scores.set('Pisces', (scores.get('Pisces') || 0) + 2);
  }

  // Specific sign associations
  if (profile.communication_assertiveness === 'assertive' || profile.communication_assertiveness === 'aggressive') {
    scores.set('Aries', (scores.get('Aries') || 0) + 1);
    scores.set('Scorpio', (scores.get('Scorpio') || 0) + 1);
  }

  if (profile.agreeableness_score && profile.agreeableness_score > 75) {
    scores.set('Libra', (scores.get('Libra') || 0) + 1);
    scores.set('Pisces', (scores.get('Pisces') || 0) + 1);
  }

  if (profile.analytical_thinking_score && profile.analytical_thinking_score > 70) {
    scores.set('Virgo', (scores.get('Virgo') || 0) + 1);
    scores.set('Aquarius', (scores.get('Aquarius') || 0) + 1);
  }

  // Find highest scoring sign
  let maxScore = 0;
  let predictedSign: ZodiacSign = 'Gemini'; // Default

  scores.forEach((score, sign) => {
    if (score > maxScore) {
      maxScore = score;
      predictedSign = sign;
    }
  });

  // Calculate confidence (0-0.6 max, since this is highly speculative)
  const confidence = Math.min(0.6, maxScore / 10);

  return {
    sign: predictedSign,
    confidence,
  };
}

/**
 * Generate behavioral predictions using AI
 */
async function generatePredictions(profile: UserProfileRecord): Promise<BehavioralPrediction[]> {
  const culturalData = profile.cultural_background
    ? {
        background: profile.cultural_background,
        values: profile.cultural_values ? JSON.parse(profile.cultural_values) : [],
        communicationStyle: profile.cultural_communication_style || 'unknown',
      }
    : inferCulturalBackground(profile);

  const astroData = profile.zodiac_sign
    ? {
        sign: profile.zodiac_sign,
        element: profile.zodiac_element,
        modality: profile.zodiac_modality,
      }
    : (() => {
        const inferred = inferZodiacSign(profile);
        const zodiacInfo = ZODIAC_SIGNS[inferred.sign];
        return {
          sign: inferred.sign,
          element: zodiacInfo.element,
          modality: zodiacInfo.modality,
        };
      })();

  const prompt = `You are Omega, an AI analyzing a user's future behavior by integrating psychology, cultural background, and astrological influences.

## User Profile: ${profile.username}

### Psychological Profile (Big Five OCEAN):
- Openness: ${profile.openness_score || 'unknown'}/100
- Conscientiousness: ${profile.conscientiousness_score || 'unknown'}/100
- Extraversion: ${profile.extraversion_score || 'unknown'}/100
- Agreeableness: ${profile.agreeableness_score || 'unknown'}/100
- Neuroticism: ${profile.neuroticism_score || 'unknown'}/100

### Emotional Intelligence:
- Emotional Awareness: ${profile.emotional_awareness_score || 'unknown'}/100
- Empathy: ${profile.empathy_score || 'unknown'}/100
- Emotional Regulation: ${profile.emotional_regulation_score || 'unknown'}/100

### Communication Patterns:
- Formality: ${profile.communication_formality || 'unknown'}
- Assertiveness: ${profile.communication_assertiveness || 'unknown'}
- Engagement: ${profile.communication_engagement || 'unknown'}

### Cultural Background:
- Background: ${culturalData.background}
- Values: ${culturalData.values.join(', ')}
- Communication Style: ${culturalData.communicationStyle}

### Astrological Profile:
- Zodiac Sign: ${astroData.sign}
- Element: ${astroData.element}
- Modality: ${astroData.modality}

### Current Interests:
${profile.primary_interests ? JSON.parse(profile.primary_interests).join(', ') : 'Unknown'}

## Task:
Predict 5 specific behaviors this person is likely to exhibit in the next 7-30 days, integrating:
1. Their psychological traits (OCEAN)
2. Their cultural values and communication style
3. Their astrological sign's typical patterns

For each prediction:
- Be specific and actionable
- Consider how psychology, culture, and astrology interact
- Assign realistic confidence (0.3-0.8 range)
- Identify which factors contribute most

Respond with JSON only (no markdown):
{
  "predictions": [
    {
      "behavior": "Specific predicted behavior",
      "confidence": 0.3-0.8,
      "timeframe": "next 7 days" or "next 14 days" or "next 30 days",
      "category": "communication|emotional|social|cognitive|interests",
      "influencingFactors": ["factor1", "factor2", "factor3"]
    }
  ]
}`;

  try {
    const result = await generateText({
      model: openai.chat(OMEGA_MODEL),
      prompt,
    });

    // Extract JSON from response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.predictions || [];
  } catch (error) {
    console.error('Failed to generate predictions:', error);
    // Return fallback predictions
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

/**
 * Update predictions for a single user
 */
export async function updateUserPredictions(userId: string): Promise<void> {
  console.log(`🔮 Updating behavioral predictions for user: ${userId}`);

  const profile = await getUserProfile(userId);
  if (!profile) {
    console.log('   ⚠️ User profile not found');
    return;
  }

  // Skip users with insufficient data
  if (!profile.message_count || profile.message_count < 10) {
    console.log('   ⏭️ Skipping - insufficient message history');
    return;
  }

  // Infer or retrieve cultural background
  let culturalData;
  if (!profile.cultural_background) {
    console.log('   📊 Inferring cultural background...');
    culturalData = inferCulturalBackground(profile);
  } else {
    culturalData = {
      background: profile.cultural_background,
      values: profile.cultural_values ? JSON.parse(profile.cultural_values) : [],
      communicationStyle: profile.cultural_communication_style || 'unknown',
      confidence: profile.cultural_confidence || 0.5,
    };
  }

  // Infer or retrieve astrological sign
  let astroData;
  if (!profile.zodiac_sign) {
    console.log('   ✨ Inferring zodiac sign from personality...');
    const inferred = inferZodiacSign(profile);
    const zodiacInfo = ZODIAC_SIGNS[inferred.sign];
    astroData = {
      sign: inferred.sign,
      element: zodiacInfo.element,
      modality: zodiacInfo.modality,
      confidence: inferred.confidence,
    };
  } else {
    astroData = {
      sign: profile.zodiac_sign,
      element: profile.zodiac_element,
      modality: profile.zodiac_modality,
      confidence: profile.astrological_confidence || 0.5,
    };
  }

  // Generate predictions
  console.log('   🤖 Generating behavioral predictions with AI...');
  const predictions = await generatePredictions(profile);

  // Calculate overall confidence
  const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / Math.max(predictions.length, 1);

  // Create integrated profile summary
  const integratedSummary = `${profile.username} is a ${astroData.element} sign (${astroData.sign}) with ${culturalData.background} cultural background. ` +
    `Psychologically, they exhibit ${profile.openness_score || 'moderate'} openness, ${profile.extraversion_score || 'moderate'} extraversion, ` +
    `and ${profile.agreeableness_score || 'moderate'} agreeableness. Their ${culturalData.communicationStyle} communication style ` +
    `combined with ${astroData.modality} modality suggests they are likely to ${predictions[0]?.behavior || 'continue current patterns'}.`;

  // Update profile
  await updateUserProfile(userId, {
    // Cultural data
    cultural_background: culturalData.background,
    cultural_values: culturalData.values,
    cultural_communication_style: culturalData.communicationStyle,
    cultural_confidence: culturalData.confidence,

    // Astrological data
    zodiac_sign: astroData.sign,
    zodiac_element: astroData.element,
    zodiac_modality: astroData.modality,
    astrological_confidence: astroData.confidence,

    // Predictions
    predicted_behaviors: predictions,
    prediction_confidence: avgConfidence,
    prediction_timeframe: 'next 30 days',
    last_prediction_at: Math.floor(Date.now() / 1000),

    // Integration
    integrated_profile_summary: integratedSummary,
    profile_integration_confidence: (culturalData.confidence + astroData.confidence) / 2,
  });

  console.log(`   ✅ Predictions updated for ${profile.username}`);
  console.log(`      Cultural: ${culturalData.background} (${Math.round(culturalData.confidence * 100)}% confidence)`);
  console.log(`      Zodiac: ${astroData.sign} - ${astroData.element} ${astroData.modality} (${Math.round(astroData.confidence * 100)}% confidence)`);
  console.log(`      Predictions: ${predictions.length} behaviors predicted (avg confidence: ${Math.round(avgConfidence * 100)}%)`);
}

/**
 * Batch update predictions for all users
 */
export async function batchUpdatePredictions(limit = 100): Promise<void> {
  console.log('🔄 Starting batch behavioral prediction updates...');

  const profiles = await getAllUserProfiles(limit);
  console.log(`   Found ${profiles.length} user profiles`);

  let updated = 0;
  for (const profile of profiles) {
    try {
      // Only update if:
      // 1. Never predicted before, OR
      // 2. Last prediction was over 7 days ago, OR
      // 3. New messages since last prediction
      const now = Math.floor(Date.now() / 1000);
      const sevenDaysAgo = now - 7 * 24 * 60 * 60;

      const shouldUpdate =
        !profile.last_prediction_at ||
        profile.last_prediction_at < sevenDaysAgo ||
        (profile.last_analyzed_at && profile.last_prediction_at < profile.last_analyzed_at);

      if (shouldUpdate) {
        await updateUserPredictions(profile.user_id);
        updated++;

        // Rate limiting - 2 second delay between users
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.log(`   ⏭️ Skipping ${profile.username} - predictions still fresh`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to update predictions for ${profile.username}:`, error);
      // Continue with next user
    }
  }

  console.log(`✅ Batch prediction update complete - ${updated} users updated`);
}
