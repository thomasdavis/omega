/**
 * Portrait Prompt Enhancer
 * Automatically improves vague portrait requests by analyzing user context
 * and adding explicit gender, style, and feature details
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { queryMessages, type UserProfileRecord } from '@repo/database';

export interface EnhancedPromptDetails {
  gender: 'male' | 'female' | 'non-binary' | 'unknown';
  age: string; // e.g., "young adult", "middle-aged", "elderly"
  physicalFeatures: string[]; // e.g., ["muscular build", "short hair", "beard"]
  stylePreferences: string[]; // e.g., ["rugged", "casual", "professional"]
  mood: string; // e.g., "confident", "thoughtful", "playful"
  additionalContext: string; // Any other relevant details
}

/**
 * Analyze user context to extract gender and appearance cues
 */
async function analyzeUserContext(
  userId: string,
  username: string,
  profile: UserProfileRecord | null
): Promise<EnhancedPromptDetails> {
  // Get recent messages for context
  const messages = await queryMessages({
    userId: userId,
    senderType: 'human',
    limit: 50,
  });
  const messageTexts = messages.map((m) => m.message_content).join('\n');

  // Build context for AI analysis
  const contextParts: string[] = [];

  if (profile?.ai_appearance_description) {
    contextParts.push(`Appearance description: ${profile.ai_appearance_description}`);
  }

  if (messageTexts) {
    contextParts.push(`Recent messages from user:\n${messageTexts.substring(0, 2000)}`);
  }

  const contextText = contextParts.length > 0
    ? contextParts.join('\n\n')
    : `Username: ${username}`;

  // Use AI to analyze context for gender and appearance cues
  const analysisPrompt = `Analyze the following user information and extract appearance details for portrait generation.

User: ${username}
${contextText}

Based on this information, determine:
1. Gender (male/female/non-binary/unknown) - look for explicit mentions, pronouns, cultural name patterns, self-descriptions
2. Approximate age range (e.g., "young adult 20s-30s", "middle-aged 40s-50s", "elderly 60+", "unknown")
3. Physical features mentioned or implied (e.g., facial hair, hair style, build, distinctive features)
4. Style preferences or aesthetic (e.g., "rugged", "professional", "artistic", "casual")
5. Mood or energy (e.g., "confident", "thoughtful", "playful", "serious")
6. Any other relevant context for creating an accurate portrait

If gender or other details are ambiguous, use "unknown" but make your best inference based on available cues.

Respond in JSON format:
{
  "gender": "male|female|non-binary|unknown",
  "age": "description",
  "physicalFeatures": ["feature1", "feature2"],
  "stylePreferences": ["style1", "style2"],
  "mood": "description",
  "additionalContext": "any other relevant details",
  "confidence": "high|medium|low",
  "reasoning": "brief explanation of gender inference"
}`;

  try {
    const { text } = await generateText({
      model: openai('gpt-5'),
      prompt: analysisPrompt,
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      console.log(`   🔍 Gender analysis: ${analysis.gender} (${analysis.confidence} confidence)`);
      console.log(`   📝 Reasoning: ${analysis.reasoning}`);

      return {
        gender: analysis.gender || 'unknown',
        age: analysis.age || 'unknown',
        physicalFeatures: Array.isArray(analysis.physicalFeatures) ? analysis.physicalFeatures : [],
        stylePreferences: Array.isArray(analysis.stylePreferences) ? analysis.stylePreferences : [],
        mood: analysis.mood || 'neutral',
        additionalContext: analysis.additionalContext || '',
      };
    }
  } catch (error) {
    console.error('Error analyzing user context:', error);
  }

  // Fallback to basic analysis
  return {
    gender: 'unknown',
    age: 'unknown',
    physicalFeatures: [],
    stylePreferences: [],
    mood: 'neutral',
    additionalContext: '',
  };
}

/**
 * Enhance a portrait prompt with explicit details from user context
 */
export async function enhancePortraitPrompt(
  basePrompt: string,
  userId: string,
  username: string,
  profile: UserProfileRecord | null
): Promise<string> {
  console.log('   🎨 Enhancing portrait prompt with user context analysis...');

  // Analyze user context for gender and appearance details
  const details = await analyzeUserContext(userId, username, profile);

  // Build enhancement sections
  const enhancements: string[] = [];

  // Add explicit gender if known
  if (details.gender !== 'unknown') {
    enhancements.push(`**CRITICAL - Gender: ${details.gender.toUpperCase()}**\nThis portrait MUST clearly depict a ${details.gender} person. Pay special attention to facial structure, features, and characteristics typical of ${details.gender} individuals.`);
  }

  // Add age if known
  if (details.age !== 'unknown') {
    enhancements.push(`**Age Range:**\n${details.age}`);
  }

  // Add physical features
  if (details.physicalFeatures.length > 0) {
    enhancements.push(`**Physical Features:**\n${details.physicalFeatures.map(f => `- ${f}`).join('\n')}`);
  }

  // Add style preferences
  if (details.stylePreferences.length > 0) {
    enhancements.push(`**Style & Aesthetic:**\n${details.stylePreferences.map(s => `- ${s}`).join('\n')}`);
  }

  // Add mood/energy
  if (details.mood !== 'neutral') {
    enhancements.push(`**Mood & Energy:**\n${details.mood}`);
  }

  // Add additional context
  if (details.additionalContext) {
    enhancements.push(`**Additional Context:**\n${details.additionalContext}`);
  }

  // Combine base prompt with enhancements
  if (enhancements.length === 0) {
    console.log('   ℹ️  No additional context found, using base prompt');
    return basePrompt;
  }

  const enhancedPrompt = `${enhancements.join('\n\n')}

---

${basePrompt}

---

**IMPORTANT REMINDER:**
${details.gender !== 'unknown' ? `This portrait MUST depict a ${details.gender.toUpperCase()} individual. Double-check that all facial features, body structure, and characteristics are consistent with ${details.gender} gender presentation.` : 'Ensure the portrait accurately reflects the user\'s identity based on available context.'}`;

  console.log('   ✅ Prompt enhanced with explicit details');
  console.log(`   📊 Added: gender=${details.gender}, features=${details.physicalFeatures.length}, styles=${details.stylePreferences.length}`);

  return enhancedPrompt;
}
