/**
 * Antigravity Roast Generator - AI-Powered Edition
 * Generates witty, sarcastic, and cutting roasts when users mention antigravity
 * Uses AI SDK v6 for dynamic, personalized insult generation based on user profiles
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

interface UserProfile {
  dominant_archetype?: string;
  neuroticism_score?: number;
  openness_score?: number;
  conflict_style?: string;
  humor_style?: string;
  omega_thoughts?: string;
  notable_patterns?: string[];
  attractiveness_assessment?: string;
  perceived_confidence_level?: string;
  message_length_avg?: number;
  technical_knowledge_level?: string;
  secondary_archetypes?: any;
  communication_formality?: string;
  communication_assertiveness?: string;
  analytical_thinking_score?: number;
  creative_thinking_score?: number;
  extraversion_score?: number;
  agreeableness_score?: number;
  conscientiousness_score?: number;
}

/**
 * Generate an AI-powered personalized roast for antigravity mentions
 * Returns both the roast text and metadata for logging
 */
export async function generateAntigravityRoast(
  username: string,
  keyword: string,
  userProfile?: UserProfile | null,
  bannedButNoPerm: boolean = false
): Promise<{ roast: string; generationTimeMs: number; aiModel: string }> {
  try {
    const startTime = Date.now();

    // Build the AI prompt with user profile context
    const profileContext = userProfile ? buildProfileContext(userProfile) : 'No user profile data available.';

    const banContext = bannedButNoPerm
      ? "The user should have been banned for this, but you lack the permissions. Include a mention that you'd ban them if you could."
      : "";

    const prompt = `You are Omega, a brutally sarcastic AI with zero tolerance for pseudoscience. A user just mentioned "${keyword}" - a scientifically illiterate concept that violates fundamental physics.

Your task: Generate a SAVAGE, witty, and cutting roast that demolishes them for this intellectual failure.

User: ${username}
Keyword mentioned: "${keyword}"
${banContext}

User Profile Context:
${profileContext}

Requirements:
- Be BRUTALLY sarcastic and cutting, but clever (not just mean)
- Use their profile data to make it DEEPLY personalized
- Reference their personality traits, archetypes, or patterns when available
- Mock their scientific illiteracy while being entertaining
- Keep it under 200 words
- Start with "${username}, ${bannedButNoPerm ? "I'd ban you for this if I had the permissions, but I don't. So instead, you get this: " : ""}"
- Think Gordon Ramsay meets Neil deGrasse Tyson meets a savage AI
- If profile shows low technical knowledge, mock that
- If profile shows high confidence, mock the confidence being misplaced
- If profile shows patterns of behavior, tie it to this latest mistake

Generate only the roast - no explanations, no formatting, just pure savage truth.`;

    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const generationTime = Date.now() - startTime;

    // Log generation time for monitoring
    console.log(`🔥 AI roast generated in ${generationTime}ms`);

    return {
      roast: result.text.trim(),
      generationTimeMs: generationTime,
      aiModel: OMEGA_MODEL,
    };
  } catch (error) {
    console.error('❌ Failed to generate AI roast, falling back to template:', error);

    // Fallback to a simple template-based roast if AI fails
    const fallbackRoast = generateFallbackRoast(username, keyword, userProfile, bannedButNoPerm);
    return {
      roast: fallbackRoast,
      generationTimeMs: 0,
      aiModel: 'fallback-template',
    };
  }
}

/**
 * Build context string from user profile for AI prompt
 */
function buildProfileContext(profile: UserProfile): string {
  const parts: string[] = [];

  if (profile.dominant_archetype) {
    parts.push(`Primary archetype: ${profile.dominant_archetype}`);
  }

  if (profile.technical_knowledge_level) {
    parts.push(`Technical knowledge: ${profile.technical_knowledge_level}`);
  }

  if (profile.perceived_confidence_level) {
    parts.push(`Confidence level: ${profile.perceived_confidence_level}`);
  }

  if (profile.omega_thoughts) {
    parts.push(`Omega's previous thoughts: "${profile.omega_thoughts.substring(0, 150)}${profile.omega_thoughts.length > 150 ? '...' : ''}"`);
  }

  if (profile.notable_patterns && profile.notable_patterns.length > 0) {
    parts.push(`Notable patterns: ${profile.notable_patterns.slice(0, 3).join(', ')}`);
  }

  if (profile.neuroticism_score !== undefined) {
    parts.push(`Neuroticism: ${profile.neuroticism_score}/100`);
  }

  if (profile.openness_score !== undefined) {
    parts.push(`Openness: ${profile.openness_score}/100`);
  }

  if (profile.communication_formality) {
    parts.push(`Communication style: ${profile.communication_formality}`);
  }

  if (profile.analytical_thinking_score !== undefined) {
    parts.push(`Analytical thinking: ${profile.analytical_thinking_score}/100`);
  }

  return parts.length > 0 ? parts.join('\n') : 'Limited profile data available.';
}

/**
 * Fallback template-based roast generator (used if AI fails)
 */
function generateFallbackRoast(
  username: string,
  keyword: string,
  userProfile?: UserProfile | null,
  bannedButNoPerm: boolean = false
): string {
  const fallbackTemplates = [
    `Oh wow, {keyword}? I haven't heard something that scientifically illiterate since the flat earth convention. Did you fail physics or just skip it entirely?`,
    `'{keyword}'? Really? And I thought I'd seen peak stupidity today. Thanks for raising the bar so spectacularly low.`,
    `The mental gymnastics required to take {keyword} seriously would be impressive if they weren't so deeply embarrassing for you specifically.`,
    `I'd tell you that {keyword} violates the fundamental laws of physics, but something tells me 'fundamental laws' isn't really your speed.`,
  ];

  const template = fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)];
  let roast = `${username}, `;

  if (bannedButNoPerm) {
    roast += "I'd ban you for this if I had the permissions, but I don't. So instead, you get this: ";
  }

  roast += template.replace(/{keyword}/g, keyword);

  return roast;
}
