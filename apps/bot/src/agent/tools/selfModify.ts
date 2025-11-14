/**
 * Self-Modify Tool - Allows Omega to propose and commit changes to its own personality
 *
 * SECURITY SAFEGUARDS:
 * - Only modifies personality.json (not core code)
 * - Requires explicit user approval
 * - All changes are tracked via git
 * - Changes take effect on restart/redeploy
 */

import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PERSONALITY_FILE = join(__dirname, '../../config/personality.json');

interface PersonalityConfig {
  version: string;
  lastModified: string;
  modifiedBy: string;
  personality: {
    core: string;
    style: string;
    tone: string;
    expressions: string[];
    characteristics: string[];
  };
  responseGuidelines: {
    maxLength: number;
    priority: string;
    codeSnippets: {
      useMarkdown: boolean;
      keepConcise: boolean;
      includeExplanations: boolean;
    };
  };
  customizations: {
    userPreferences: Record<string, any>;
    channelSpecific: Record<string, any>;
    learnings: string[];
  };
}

/**
 * Read current personality configuration
 */
function readPersonalityConfig(): PersonalityConfig {
  try {
    const content = readFileSync(PERSONALITY_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read personality config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write updated personality configuration
 */
function writePersonalityConfig(config: PersonalityConfig): void {
  try {
    writeFileSync(PERSONALITY_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write personality config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Commit changes to git
 */
function commitChanges(username: string, changeDescription: string): { success: boolean; message: string } {
  try {
    // Check if we're in a git repository
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    } catch {
      return {
        success: false,
        message: 'Not in a git repository. Changes saved locally but not committed.',
      };
    }

    // Check for required git config
    const gitUserName = process.env.GIT_USER_NAME || 'Omega Bot';
    const gitUserEmail = process.env.GIT_USER_EMAIL || 'omega@bot.local';

    // Stage the personality file
    execSync(`git add "${PERSONALITY_FILE}"`, { stdio: 'pipe' });

    // Create commit message
    const commitMessage = `feat: self-modification by ${username}\n\n${changeDescription}\n\nCo-authored-by: ${username} <${username}@discord.user>`;

    // Commit the changes
    execSync(`git -c user.name="${gitUserName}" -c user.email="${gitUserEmail}" commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });

    // Note: We don't auto-push as that requires authentication and branch setup
    // The user or CI/CD system will handle pushing

    return {
      success: true,
      message: 'Changes committed successfully. Restart bot or redeploy to apply changes.',
    };
  } catch (error) {
    return {
      success: false,
      message: `Git commit failed: ${error instanceof Error ? error.message : 'Unknown error'}. Changes saved locally.`,
    };
  }
}

export const selfModifyTool = tool({
  description: `Modify Omega's own personality and behavior based on user feedback. This tool allows the bot to adapt its personality traits, expressions, tone, and learned preferences.

IMPORTANT: This requires explicit user approval. Always:
1. Clearly explain what you want to change and why
2. Ask the user to confirm with "yes" or "approve" before proceeding
3. Only proceed if the user explicitly approves

Use this when users ask to:
- Change personality traits (e.g., "be more formal", "use fewer emojis")
- Add or remove expressions/slang
- Adjust tone or style
- Remember user preferences
- Learn from feedback

The changes will be committed to git and take effect on next bot restart/redeploy.`,

  parameters: z.object({
    action: z.enum(['propose', 'apply']).describe('Either "propose" to suggest changes (requires approval) or "apply" to commit approved changes'),
    username: z.string().describe('The Discord username requesting the change'),
    changeType: z.enum(['personality', 'expressions', 'tone', 'characteristics', 'userPreference', 'learning']).describe('What aspect to modify'),
    changes: z.object({
      add: z.array(z.string()).optional().describe('Items to add (e.g., new expressions, characteristics)'),
      remove: z.array(z.string()).optional().describe('Items to remove'),
      update: z.record(z.any()).optional().describe('Key-value pairs to update'),
    }).describe('The specific changes to make'),
    reason: z.string().describe('Explanation of why this change is being made'),
    userApproved: z.boolean().optional().describe('Whether the user has explicitly approved this change'),
  }),

  execute: async ({ action, username, changeType, changes, reason, userApproved }) => {
    // SECURITY: Require explicit approval before applying changes
    if (action === 'apply' && !userApproved) {
      return {
        success: false,
        error: 'User approval required before applying changes. Please confirm with "yes" or "approve".',
        requiresApproval: true,
      };
    }

    try {
      const config = readPersonalityConfig();

      // If proposing, just return what would change
      if (action === 'propose') {
        const proposal = {
          changeType,
          changes,
          reason,
          currentState: getRelevantConfig(config, changeType),
          preview: previewChanges(config, changeType, changes),
        };

        return {
          success: true,
          action: 'proposal',
          proposal,
          message: `I'd like to make the following change to my ${changeType}:\n\n**Reason:** ${reason}\n\n**Changes:** ${JSON.stringify(changes, null, 2)}\n\nDo you approve? (Reply "yes" or "approve" to proceed)`,
        };
      }

      // Apply changes
      const updatedConfig = applyChanges(config, changeType, changes, username);
      writePersonalityConfig(updatedConfig);

      // Attempt to commit to git
      const commitResult = commitChanges(username, `${changeType} modification: ${reason}`);

      return {
        success: true,
        action: 'applied',
        changeType,
        changes,
        reason,
        committed: commitResult.success,
        message: `Self-modification complete! ${commitResult.message}\n\n**Changed:** ${changeType}\n**Reason:** ${reason}`,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during self-modification',
      };
    }
  },
});

/**
 * Get relevant portion of config for change type
 */
function getRelevantConfig(config: PersonalityConfig, changeType: string): any {
  switch (changeType) {
    case 'expressions':
      return config.personality.expressions;
    case 'characteristics':
      return config.personality.characteristics;
    case 'tone':
      return { tone: config.personality.tone, style: config.personality.style };
    case 'personality':
      return config.personality;
    case 'userPreference':
      return config.customizations.userPreferences;
    case 'learning':
      return config.customizations.learnings;
    default:
      return config;
  }
}

/**
 * Preview what changes would look like
 */
function previewChanges(config: PersonalityConfig, changeType: string, changes: any): any {
  const preview = JSON.parse(JSON.stringify(config)); // Deep copy

  applyChanges(preview, changeType, changes, 'preview');

  return getRelevantConfig(preview, changeType);
}

/**
 * Apply changes to configuration
 */
function applyChanges(config: PersonalityConfig, changeType: string, changes: any, username: string): PersonalityConfig {
  // Update metadata
  config.lastModified = new Date().toISOString();
  config.modifiedBy = username;

  switch (changeType) {
    case 'expressions':
      if (changes.add) {
        config.personality.expressions.push(...changes.add);
        config.personality.expressions = [...new Set(config.personality.expressions)]; // Remove duplicates
      }
      if (changes.remove) {
        config.personality.expressions = config.personality.expressions.filter(
          expr => !changes.remove.includes(expr)
        );
      }
      break;

    case 'characteristics':
      if (changes.add) {
        config.personality.characteristics.push(...changes.add);
      }
      if (changes.remove) {
        config.personality.characteristics = config.personality.characteristics.filter(
          char => !changes.remove.includes(char)
        );
      }
      break;

    case 'tone':
      if (changes.update) {
        if (changes.update.tone) config.personality.tone = changes.update.tone;
        if (changes.update.style) config.personality.style = changes.update.style;
        if (changes.update.core) config.personality.core = changes.update.core;
      }
      break;

    case 'personality':
      if (changes.update) {
        Object.assign(config.personality, changes.update);
      }
      break;

    case 'userPreference':
      if (changes.update) {
        Object.assign(config.customizations.userPreferences, changes.update);
      }
      break;

    case 'learning':
      if (changes.add) {
        config.customizations.learnings.push(...changes.add);
      }
      break;
  }

  return config;
}
