/**
 * Shellmates.app API Tool
 * Query user profiles, challenges, and leaderboards from Shellmates.app
 * Documentation: https://www.shellmates.app/
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  getShellmatesUser,
  getShellmatesChallenges,
  getShellmatesLeaderboard,
} from '../services/shellmatesService.js';

export const shellmatesTool = tool({
  description: 'Query Shellmates.app for user profiles, CTF challenges, and leaderboards. Shellmates.app is a cybersecurity platform for Capture The Flag (CTF) competitions and security challenges. Use this tool to fetch user statistics, browse available challenges, or check leaderboard rankings.',
  inputSchema: z.object({
    action: z.enum(['getUserProfile', 'getChallenges', 'getLeaderboard']).describe(
      'Action to perform: getUserProfile (get user data), getChallenges (list challenges), getLeaderboard (get top users)'
    ),
    username: z.string().optional().describe('Username to query (required for getUserProfile action)'),
    category: z.string().optional().describe('Filter challenges by category (e.g., "web", "crypto", "pwn", "reverse")'),
    difficulty: z.string().optional().describe('Filter challenges by difficulty (e.g., "easy", "medium", "hard")'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum number of results to return (default 10, max 100)'),
  }),
  execute: async ({ action, username, category, difficulty, limit = 10 }) => {
    try {
      console.log(`🔧 Shellmates action: ${action}`);

      switch (action) {
        case 'getUserProfile': {
          if (!username) {
            return {
              success: false,
              error: 'Username is required for getUserProfile action',
            };
          }

          const result = await getShellmatesUser(username);

          if (!result.success) {
            return {
              success: false,
              error: result.error,
            };
          }

          return {
            success: true,
            action: 'getUserProfile',
            user: result.data,
            message: `Successfully fetched profile for user: ${username}`,
          };
        }

        case 'getChallenges': {
          const result = await getShellmatesChallenges({
            category,
            difficulty,
            limit,
          });

          if (!result.success) {
            return {
              success: false,
              error: result.error,
            };
          }

          return {
            success: true,
            action: 'getChallenges',
            challenges: result.data,
            totalResults: result.data?.length || 0,
            filters: {
              category: category || 'all',
              difficulty: difficulty || 'all',
            },
            message: `Successfully fetched ${result.data?.length || 0} challenges`,
          };
        }

        case 'getLeaderboard': {
          const result = await getShellmatesLeaderboard(limit);

          if (!result.success) {
            return {
              success: false,
              error: result.error,
            };
          }

          return {
            success: true,
            action: 'getLeaderboard',
            leaderboard: result.data,
            totalResults: result.data?.length || 0,
            message: `Successfully fetched top ${result.data?.length || 0} users from leaderboard`,
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
          };
      }
    } catch (error) {
      console.error('❌ Error in shellmatesTool:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in Shellmates tool',
      };
    }
  },
});
