/**
 * User Appearance Descriptor Module
 *
 * Provides shared utilities for extracting and formatting user appearance data
 * for consistent AI prompting across tools (comics, portraits, etc.)
 */

import { getUserProfile, type UserProfileRecord } from '@repo/database';

/**
 * User character data for AI prompting
 */
export interface UserCharacter {
  username: string;
  appearance?: string;
  personality?: any;
  feelings?: any;
}

/**
 * Formatted character description for AI prompts
 */
export interface CharacterDescription {
  username: string;
  appearanceDescription: string;
  archetypeDescription: string;
  traitsDescription: string;
  fullDescription: string;
}

/**
 * Get user profiles by user IDs
 */
export async function getUserCharacters(userIds: string[]): Promise<UserCharacter[]> {
  const userProfiles = await Promise.all(
    userIds.map(async (userId) => {
      const profile = await getUserProfile(userId);
      if (!profile) return null;

      // Prisma Json fields are already parsed - don't call JSON.parse() again
      const feelings = profile.feelings_json as any;
      const personality = profile.personality_facets as any;

      return {
        username: profile.username,
        appearance: profile.ai_appearance_description,
        personality,
        feelings,
      };
    })
  );

  // Filter out null profiles
  return userProfiles.filter((p) => p !== null) as UserCharacter[];
}

/**
 * Format a single user character into a detailed description for AI prompts
 */
export function formatCharacterDescription(
  character: UserCharacter,
  index?: number
): CharacterDescription {
  const appearance = character.appearance || 'a person';
  const dominantArchetype =
    character.personality?.dominantArchetypes?.[0] || 'Everyman';
  const traits = character.feelings?.facets?.slice(0, 2).join(', ') || 'friendly';

  const prefix = typeof index === 'number' ? `${index + 1}. ` : '';

  const fullDescription = `${prefix}${character.username} - ${appearance}
   Personality: ${dominantArchetype}
   Traits: ${traits}`;

  return {
    username: character.username,
    appearanceDescription: appearance,
    archetypeDescription: dominantArchetype,
    traitsDescription: traits,
    fullDescription,
  };
}

/**
 * Format multiple user characters into a combined description for AI prompts
 */
export function formatMultipleCharacters(characters: UserCharacter[]): string {
  return characters
    .map((character, index) => formatCharacterDescription(character, index).fullDescription)
    .join('\n\n');
}

/**
 * Get detailed character description from user profile
 * This is useful for portrait generation and other single-user contexts
 */
export function getDetailedCharacterDescription(profile: UserProfileRecord): {
  appearance: string;
  personality: any;
  feelings: any;
} {
  // Prisma Json fields are already parsed - don't call JSON.parse() again
  const feelings = profile.feelings_json
    ? (profile.feelings_json as any)
    : {
        affinityScore: 50,
        trustLevel: 50,
        thoughts: 'A new friend I\'m getting to know',
      };

  const personality = profile.personality_facets
    ? (profile.personality_facets as any)
    : {
        dominantArchetypes: ['Everyman'],
        communicationStyle: { formality: 'neutral' },
      };

  const appearance = profile.ai_appearance_description ||
    'A person with warm, intelligent eyes and an expressive, thoughtful face';

  return {
    appearance,
    personality,
    feelings,
  };
}

/**
 * Build a character list for comic/multi-user scenarios
 * Returns a formatted string ready to be inserted into AI prompts
 */
export async function buildCharacterList(userIds: string[]): Promise<{
  characters: UserCharacter[];
  formattedList: string;
}> {
  const characters = await getUserCharacters(userIds);
  const formattedList = formatMultipleCharacters(characters);

  return {
    characters,
    formattedList,
  };
}

/**
 * Get appearance description only (for simple use cases)
 */
export function getAppearanceOnly(character: UserCharacter): string {
  return character.appearance || 'a person';
}

/**
 * Get personality archetype only (for simple use cases)
 */
export function getArchetypeOnly(character: UserCharacter): string {
  return character.personality?.dominantArchetypes?.[0] || 'Everyman';
}

/**
 * Get personality traits only (for simple use cases)
 */
export function getTraitsOnly(character: UserCharacter): string {
  return character.feelings?.facets?.slice(0, 2).join(', ') || 'friendly';
}
