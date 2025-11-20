/**
 * User Preferences Storage
 * Manages per-user settings like personality mode (vibe)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getDataDir } from './storage.js';

export type VibeMode = 'normal' | 'terse';

export interface UserPreferences {
  userId: string;
  username: string;
  vibeMode: VibeMode;
  updatedAt: string;
}

const PREFERENCES_DIR = 'user-preferences';

/**
 * Get preferences file path for a user
 */
function getPreferencesPath(userId: string): string {
  const dir = getDataDir(PREFERENCES_DIR);
  return join(dir, `${userId}.json`);
}

/**
 * Load user preferences from storage
 */
export function loadUserPreferences(userId: string, username: string): UserPreferences {
  const path = getPreferencesPath(userId);

  if (!existsSync(path)) {
    // Return default preferences if none exist
    return {
      userId,
      username,
      vibeMode: 'normal',
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const data = readFileSync(path, 'utf-8');
    const prefs = JSON.parse(data) as UserPreferences;
    // Update username in case it changed
    prefs.username = username;
    return prefs;
  } catch (error) {
    console.error(`Error loading preferences for user ${userId}:`, error);
    // Return defaults on error
    return {
      userId,
      username,
      vibeMode: 'normal',
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Save user preferences to storage
 */
export function saveUserPreferences(prefs: UserPreferences): void {
  const path = getPreferencesPath(prefs.userId);

  try {
    prefs.updatedAt = new Date().toISOString();
    writeFileSync(path, JSON.stringify(prefs, null, 2), 'utf-8');
    console.log(`✅ Saved preferences for user ${prefs.username} (${prefs.userId})`);
  } catch (error) {
    console.error(`Error saving preferences for user ${prefs.userId}:`, error);
    throw error;
  }
}

/**
 * Set vibe mode for a user
 */
export function setUserVibeMode(userId: string, username: string, vibeMode: VibeMode): UserPreferences {
  const prefs = loadUserPreferences(userId, username);
  prefs.vibeMode = vibeMode;
  saveUserPreferences(prefs);
  return prefs;
}

/**
 * Get vibe mode for a user (with default)
 */
export function getUserVibeMode(userId: string, username: string): VibeMode {
  const prefs = loadUserPreferences(userId, username);
  return prefs.vibeMode;
}
