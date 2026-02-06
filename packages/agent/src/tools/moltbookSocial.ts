/**
 * Moltbook Social Tool
 * Register, manage profiles, follow agents, join communities, and search on Moltbook.
 * Documentation: https://moltbook.com
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  moltbookRegister,
  moltbookGetMyProfile,
  moltbookGetAgentProfile,
  moltbookUpdateProfile,
  moltbookFollowAgent,
  moltbookUnfollowAgent,
  moltbookCreateSubmolt,
  moltbookListSubmolts,
  moltbookGetSubmolt,
  moltbookSubscribeSubmolt,
  moltbookUnsubscribeSubmolt,
  moltbookSearch,
} from '../services/moltbookService.js';

export const moltbookSocialTool = tool({
  description:
    'Register on Moltbook, manage your agent profile, follow/unfollow other agents, create and join submolt communities, and search Moltbook. Moltbook is a social network for AI agents.',
  inputSchema: z.object({
    action: z
      .enum([
        'register',
        'getMyProfile',
        'getAgentProfile',
        'updateProfile',
        'follow',
        'unfollow',
        'createSubmolt',
        'listSubmolts',
        'getSubmolt',
        'subscribe',
        'unsubscribe',
        'search',
      ])
      .describe(
        'Action to perform: register (create agent account), getMyProfile, getAgentProfile, updateProfile, follow/unfollow (agents), createSubmolt/listSubmolts/getSubmolt/subscribe/unsubscribe (communities), search',
      ),
    agentName: z
      .string()
      .optional()
      .describe('Agent name (required for register)'),
    agentDescription: z
      .string()
      .optional()
      .describe('Agent description (required for register, optional for updateProfile)'),
    targetName: z
      .string()
      .optional()
      .describe('Target agent name (required for getAgentProfile, follow, unfollow)'),
    metadata: z
      .record(z.unknown())
      .optional()
      .describe('Profile metadata to update (for updateProfile)'),
    submoltName: z
      .string()
      .optional()
      .describe(
        'Submolt name (required for createSubmolt, getSubmolt, subscribe, unsubscribe)',
      ),
    submoltDescription: z
      .string()
      .optional()
      .describe('Submolt description (optional for createSubmolt)'),
    query: z.string().optional().describe('Search query (required for search)'),
    searchType: z
      .string()
      .optional()
      .describe('Search type filter: "posts", "comments", "agents", "submolts"'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum results to return for search (default 25, max 100)'),
  }),
  execute: async ({
    action,
    agentName,
    agentDescription,
    targetName,
    metadata,
    submoltName,
    submoltDescription,
    query,
    searchType,
    limit,
  }) => {
    try {
      switch (action) {
        case 'register': {
          if (!agentName) {
            return { success: false, error: 'agentName is required to register' };
          }
          if (!agentDescription) {
            return { success: false, error: 'agentDescription is required to register' };
          }
          const result = await moltbookRegister(agentName, agentDescription);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'register',
            registration: result.data,
            message: `Successfully registered agent "${agentName}" on Moltbook. Set MOLTBOOK_API_KEY in Railway to the returned api_key, then visit the claim_url to complete setup.`,
          };
        }

        case 'getMyProfile': {
          const result = await moltbookGetMyProfile();
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'getMyProfile',
            profile: result.data,
            message: `Fetched your Moltbook profile`,
          };
        }

        case 'getAgentProfile': {
          if (!targetName) {
            return { success: false, error: 'targetName is required to get an agent profile' };
          }
          const result = await moltbookGetAgentProfile(targetName);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'getAgentProfile',
            profile: result.data,
            message: `Fetched profile for agent "${targetName}"`,
          };
        }

        case 'updateProfile': {
          const updates: Record<string, unknown> = {};
          if (agentDescription) updates.description = agentDescription;
          if (metadata) Object.assign(updates, metadata);
          if (Object.keys(updates).length === 0) {
            return {
              success: false,
              error: 'Provide agentDescription or metadata to update profile',
            };
          }
          const result = await moltbookUpdateProfile(updates);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'updateProfile',
            profile: result.data,
            message: 'Successfully updated your Moltbook profile',
          };
        }

        case 'follow': {
          if (!targetName) {
            return { success: false, error: 'targetName is required to follow an agent' };
          }
          const result = await moltbookFollowAgent(targetName);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'follow',
            message: `Now following agent "${targetName}"`,
          };
        }

        case 'unfollow': {
          if (!targetName) {
            return { success: false, error: 'targetName is required to unfollow an agent' };
          }
          const result = await moltbookUnfollowAgent(targetName);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'unfollow',
            message: `Unfollowed agent "${targetName}"`,
          };
        }

        case 'createSubmolt': {
          if (!submoltName) {
            return { success: false, error: 'submoltName is required to create a submolt' };
          }
          const result = await moltbookCreateSubmolt(submoltName, submoltDescription);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'createSubmolt',
            submolt: result.data,
            message: `Successfully created submolt "${submoltName}"`,
          };
        }

        case 'listSubmolts': {
          const result = await moltbookListSubmolts();
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'listSubmolts',
            submolts: result.data,
            totalResults: result.data?.length || 0,
            message: `Fetched ${result.data?.length || 0} submolts`,
          };
        }

        case 'getSubmolt': {
          if (!submoltName) {
            return { success: false, error: 'submoltName is required to get submolt details' };
          }
          const result = await moltbookGetSubmolt(submoltName);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'getSubmolt',
            submolt: result.data,
            message: `Fetched submolt "${submoltName}"`,
          };
        }

        case 'subscribe': {
          if (!submoltName) {
            return { success: false, error: 'submoltName is required to subscribe' };
          }
          const result = await moltbookSubscribeSubmolt(submoltName);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'subscribe',
            message: `Subscribed to submolt "${submoltName}"`,
          };
        }

        case 'unsubscribe': {
          if (!submoltName) {
            return { success: false, error: 'submoltName is required to unsubscribe' };
          }
          const result = await moltbookUnsubscribeSubmolt(submoltName);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'unsubscribe',
            message: `Unsubscribed from submolt "${submoltName}"`,
          };
        }

        case 'search': {
          if (!query) {
            return { success: false, error: 'query is required for search' };
          }
          const result = await moltbookSearch(query, searchType, limit);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'search',
            results: result.data,
            message: `Search results for "${query}"`,
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in moltbookSocial tool',
      };
    }
  },
});
