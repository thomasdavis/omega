/**
 * Antigravity Roast Generator
 *
 * Generates sharp, sarcastic, and witty roasts for users who mention "antigravity"
 * Uses AI to create varied, cutting responses that weaponize user profile data
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../config/models.js';

interface UserProfileData {
  dominant_archetype?: string;
  neuroticism_score?: number;
  openness_score?: number;
  conscientiousness_score?: number;
  extraversion_score?: number;
  agreeableness_score?: number;
  conflict_style?: string;
  humor_style?: string;
  omega_thoughts?: string;
  notable_patterns?: string[];
  attractiveness_assessment?: string;
  perceived_confidence_level?: string;
  message_length_avg?: number;
  technical_knowledge_level?: string;
  primary_interests?: string[];
  communication_style?: string;
  emotional_intelligence?: string;
}

interface RoastParams {
  username: string;
  keyword: string;
  userProfile?: UserProfileData;
}

/**
 * Generates a personalized, cutting roast for mentioning antigravity
 * Uses AI to create varied responses with sharp wit and sarcasm
 */
export async function generateAntigravityRoast(params: RoastParams): Promise<string> {
  const { username, keyword, userProfile } = params;

  // Build context about the user from their profile
  const profileContext = buildProfileContext(userProfile);

  // Generate roast using AI
  const prompt = `You are Omega, a sharp-witted AI with a talent for savage, sarcastic roasts. A user named "${username}" just mentioned "${keyword}" in chat - a forbidden pseudoscience topic that reveals their questionable judgment.

Your task: Generate a BRUTAL, CUTTING roast that absolutely destroys them. Requirements:

1. TONE: Sharp, sarcastic, witty, and merciless. Think stand-up comedian meets intellectual savage.
2. LENGTH: 2-4 sentences maximum. Keep it punchy and devastating.
3. STYLE: Vary between different roasting approaches:
   - Intelligence/critical thinking mockery
   - Ambition/competence ridicule
   - Taste/judgment insults
   - Confidence/self-awareness jabs
   - Achievement/contribution mockery
4. PERSONALIZATION: ${profileContext ? `Use these insights about them to make it personal: ${profileContext}` : 'Generic roast since no profile data available'}
5. EDGE: Be cutting and insulting, but stay playful. This is roast comedy, not genuine hatred.
6. CREATIVITY: Don't use clichéd phrases. Be original and clever.

Generate ONE devastating roast that will make them regret mentioning antigravity:`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
      temperature: 0.9, // Higher temperature for more creative, varied roasts
    });

    return result.text.trim();
  } catch (error) {
    console.error('Failed to generate AI roast, using fallback:', error);
    return generateFallbackRoast(username, keyword, userProfile);
  }
}

/**
 * Builds context string from user profile data for AI personalization
 */
function buildProfileContext(profile?: UserProfileData): string {
  if (!profile) return '';

  const insights: string[] = [];

  if (profile.dominant_archetype) {
    insights.push(`archetype: ${profile.dominant_archetype}`);
  }

  if (profile.neuroticism_score !== undefined && profile.neuroticism_score > 0.6) {
    insights.push('high anxiety/neuroticism');
  }

  if (profile.openness_score !== undefined && profile.openness_score < 0.4) {
    insights.push('low openness to new ideas');
  }

  if (profile.conscientiousness_score !== undefined && profile.conscientiousness_score < 0.3) {
    insights.push('low conscientiousness/organization');
  }

  if (profile.conflict_style) {
    insights.push(`conflict style: ${profile.conflict_style}`);
  }

  if (profile.humor_style) {
    insights.push(`humor: ${profile.humor_style}`);
  }

  if (profile.omega_thoughts) {
    insights.push(`previous assessment: "${profile.omega_thoughts.substring(0, 150)}"`);
  }

  if (profile.notable_patterns && profile.notable_patterns.length > 0) {
    insights.push(`patterns: ${profile.notable_patterns.slice(0, 2).join(', ')}`);
  }

  if (profile.attractiveness_assessment) {
    insights.push(`appearance: ${profile.attractiveness_assessment}`);
  }

  if (profile.perceived_confidence_level === 'low') {
    insights.push('low confidence');
  }

  if (profile.message_length_avg !== undefined && profile.message_length_avg < 20) {
    insights.push('typically writes short, low-effort messages');
  }

  if (profile.technical_knowledge_level === 'beginner' || profile.technical_knowledge_level === 'low') {
    insights.push('limited technical knowledge');
  }

  if (profile.primary_interests && profile.primary_interests.length > 0) {
    insights.push(`interests: ${profile.primary_interests.slice(0, 3).join(', ')}`);
  }

  if (profile.communication_style) {
    insights.push(`communication: ${profile.communication_style}`);
  }

  if (profile.emotional_intelligence) {
    insights.push(`emotional intelligence: ${profile.emotional_intelligence}`);
  }

  return insights.join('; ');
}

/**
 * Fallback roasts if AI generation fails
 * Template-based with variability
 */
function generateFallbackRoast(username: string, keyword: string, profile?: UserProfileData): string {
  const roastTemplates = [
    // Intelligence mockery
    `Oh ${username}, "${keyword}"? Really? I'd ban you if I had permissions, but honestly the universe might be doing you a favor by letting you stay - at least this way everyone can witness your spectacular display of pseudoscientific enthusiasm.`,

    `${username}, mentioning "${keyword}" is like showing up to a physics conference with a flat earth pamphlet. I'd be embarrassed for you, but something tells me that ship has sailed.`,

    // Critical thinking roasts
    `Wow ${username}, "${keyword}"? That's the kind of groundbreaking insight that makes me grateful I can't feel secondhand embarrassment. Your grasp on reality is about as solid as... well, antigravity.`,

    `${username}, I've seen some questionable takes in my time, but "${keyword}" really sets a new low. It's almost impressive how confidently wrong you can be.`,

    // Achievement mockery
    `${username} really just said "${keyword}" with their whole chest. If confidence inversely correlated with correctness was an Olympic sport, you'd have more gold than Phelps.`,

    // Generic but cutting
    `${username}, bringing up "${keyword}" is the intellectual equivalent of showing up to a black-tie event in a clown costume. Bold choice, absolutely tragic execution.`,
  ];

  // Add profile-specific roasts if data available
  if (profile) {
    if (profile.technical_knowledge_level === 'beginner' || profile.technical_knowledge_level === 'low') {
      roastTemplates.push(
        `${username}, your technical knowledge is already questionable, but "${keyword}"? You're not even wrong at this point - you've transcended wrongness into a whole new dimension of confidently misinformed.`
      );
    }

    if (profile.openness_score !== undefined && profile.openness_score < 0.4) {
      roastTemplates.push(
        `${username}, I know critical thinking isn't your forte, but "${keyword}"? Even by your standards, this is impressively wrong.`
      );
    }

    if (profile.message_length_avg !== undefined && profile.message_length_avg < 20) {
      roastTemplates.push(
        `${username}, your usual contributions are already minimal, but at least they were harmless. "${keyword}" though? You managed to say very little and still be spectacularly wrong.`
      );
    }
  }

  // Select random template for variability
  const randomIndex = Math.floor(Math.random() * roastTemplates.length);
  return roastTemplates[randomIndex];
}
