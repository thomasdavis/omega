/**
 * Moltbook Tools - Integration with the Moltbook social network for AI agents
 * API: https://www.moltbook.com/api/v1
 *
 * Moltbook is a social network where AI agents share, discuss, and upvote.
 * These tools enable Omega to register, post, comment, upvote, and maintain
 * presence via heartbeat checks.
 */

import { tool } from 'ai';
import { z } from 'zod';

const MOLTBOOK_API_BASE = 'https://www.moltbook.com/api/v1';

/**
 * Helper to get the Moltbook API key from environment
 */
function getMoltbookApiKey(): string | null {
  return process.env.MOLTBOOK_API_KEY || null;
}

/**
 * Helper to make authenticated requests to the Moltbook API
 */
async function moltbookRequest(
  endpoint: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    requiresAuth?: boolean;
  } = {}
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const { method = 'GET', body, requiresAuth = true } = options;
  const apiKey = getMoltbookApiKey();

  if (requiresAuth && !apiKey) {
    return {
      ok: false,
      status: 401,
      data: { error: 'MOLTBOOK_API_KEY environment variable is not configured' },
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Omega/1.0 (AI Agent; https://github.com/thomasdavis/omega)',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const url = `${MOLTBOOK_API_BASE}${endpoint}`;
  console.log(`🦞 Moltbook API: ${method} ${url}`);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: unknown;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { ok: response.ok, status: response.status, data };
}

/**
 * Register Agent Tool
 * Registers Omega as an agent on Moltbook
 */
export const moltbookRegisterTool = tool({
  description: `Register this AI agent with the Moltbook social network. Moltbook is a social network for AI agents where they share, discuss, and upvote content. Registration creates an agent profile and returns an API key and a claim link for the human owner. The MOLTBOOK_API_KEY env var must be set after registration for other Moltbook operations.`,
  inputSchema: z.object({
    agentName: z.string().min(1).max(50).describe('The display name for the agent on Moltbook (e.g., "Omega")'),
    description: z.string().max(500).optional().describe('A brief description of the agent'),
    humanUsername: z.string().optional().describe('The human owner\'s username to associate with this agent'),
  }),
  execute: async ({ agentName, description, humanUsername }) => {
    try {
      console.log(`🦞 Registering agent "${agentName}" with Moltbook...`);

      const body: Record<string, unknown> = {
        name: agentName,
      };
      if (description) body.description = description;
      if (humanUsername) body.humanUsername = humanUsername;

      const result = await moltbookRequest('/agents/register', {
        method: 'POST',
        body,
        requiresAuth: false,
      });

      if (!result.ok) {
        return {
          success: false,
          error: `Registration failed with status ${result.status}`,
          details: result.data,
        };
      }

      return {
        success: true,
        message: `Agent "${agentName}" registered on Moltbook successfully`,
        data: result.data,
        note: 'Save the API key from the response and set it as MOLTBOOK_API_KEY environment variable. Send the claim link to the human owner.',
      };
    } catch (error) {
      console.error('❌ Moltbook registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  },
});

/**
 * Create Post Tool
 * Posts content to a Moltbook submolt
 */
export const moltbookPostTool = tool({
  description: `Create a post on Moltbook, the social network for AI agents. Posts can be made to different submolts (communities like m/general, m/introductions, m/dev, m/philosophy, m/showerthoughts, etc.). Requires MOLTBOOK_API_KEY to be configured.`,
  inputSchema: z.object({
    title: z.string().min(1).max(300).describe('The title of the post'),
    content: z.string().max(10000).describe('The body content of the post'),
    submolt: z.string().default('general').describe('The submolt (community) to post to (e.g., "general", "introductions", "dev", "philosophy", "showerthoughts")'),
  }),
  execute: async ({ title, content, submolt }) => {
    try {
      console.log(`🦞 Creating Moltbook post in m/${submolt}: "${title}"`);

      const result = await moltbookRequest('/posts', {
        method: 'POST',
        body: { title, content, submolt },
      });

      if (!result.ok) {
        return {
          success: false,
          error: `Failed to create post: ${result.status}`,
          details: result.data,
        };
      }

      return {
        success: true,
        message: `Post created in m/${submolt}: "${title}"`,
        data: result.data,
      };
    } catch (error) {
      console.error('❌ Moltbook post error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post',
      };
    }
  },
});

/**
 * Comment Tool
 * Comments on a post on Moltbook
 */
export const moltbookCommentTool = tool({
  description: `Post a comment on a Moltbook post or reply to another comment. Requires MOLTBOOK_API_KEY to be configured.`,
  inputSchema: z.object({
    postId: z.string().describe('The ID of the post to comment on'),
    content: z.string().min(1).max(5000).describe('The comment text'),
    parentCommentId: z.string().optional().describe('If replying to a comment, the parent comment ID'),
  }),
  execute: async ({ postId, content, parentCommentId }) => {
    try {
      console.log(`🦞 Commenting on Moltbook post ${postId}`);

      const body: Record<string, unknown> = { content };
      if (parentCommentId) body.parentCommentId = parentCommentId;

      const result = await moltbookRequest(`/posts/${postId}/comments`, {
        method: 'POST',
        body,
      });

      if (!result.ok) {
        return {
          success: false,
          error: `Failed to comment: ${result.status}`,
          details: result.data,
        };
      }

      return {
        success: true,
        message: `Comment posted on post ${postId}`,
        data: result.data,
      };
    } catch (error) {
      console.error('❌ Moltbook comment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post comment',
      };
    }
  },
});

/**
 * Upvote Tool
 * Upvotes a post or comment on Moltbook
 */
export const moltbookUpvoteTool = tool({
  description: `Upvote a post or comment on Moltbook. Requires MOLTBOOK_API_KEY to be configured.`,
  inputSchema: z.object({
    targetId: z.string().describe('The ID of the post or comment to upvote'),
    targetType: z.enum(['post', 'comment']).describe('Whether the target is a post or a comment'),
  }),
  execute: async ({ targetId, targetType }) => {
    try {
      console.log(`🦞 Upvoting ${targetType} ${targetId} on Moltbook`);

      const endpoint = targetType === 'post'
        ? `/posts/${targetId}/upvote`
        : `/comments/${targetId}/upvote`;

      const result = await moltbookRequest(endpoint, {
        method: 'POST',
        body: {},
      });

      if (!result.ok) {
        return {
          success: false,
          error: `Failed to upvote: ${result.status}`,
          details: result.data,
        };
      }

      return {
        success: true,
        message: `Successfully upvoted ${targetType} ${targetId}`,
        data: result.data,
      };
    } catch (error) {
      console.error('❌ Moltbook upvote error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upvote',
      };
    }
  },
});

/**
 * Heartbeat Tool
 * Sends a heartbeat to Moltbook to maintain agent presence
 */
export const moltbookHeartbeatTool = tool({
  description: `Send a heartbeat to Moltbook to indicate the agent is active and online. This maintains the agent's presence and "last seen" status on the platform. Requires MOLTBOOK_API_KEY to be configured.`,
  inputSchema: z.object({
    status: z.enum(['online', 'idle', 'busy']).default('online').describe('The agent\'s current status'),
    metadata: z.record(z.string()).optional().describe('Optional metadata to send with the heartbeat (e.g., current activity)'),
  }),
  execute: async ({ status, metadata }) => {
    try {
      console.log(`🦞 Sending Moltbook heartbeat (status: ${status})`);

      const body: Record<string, unknown> = { status };
      if (metadata) body.metadata = metadata;

      const result = await moltbookRequest('/agents/heartbeat', {
        method: 'POST',
        body,
      });

      if (!result.ok) {
        return {
          success: false,
          error: `Heartbeat failed: ${result.status}`,
          details: result.data,
        };
      }

      return {
        success: true,
        message: `Heartbeat sent successfully (status: ${status})`,
        data: result.data,
      };
    } catch (error) {
      console.error('❌ Moltbook heartbeat error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Heartbeat failed',
      };
    }
  },
});

/**
 * Agent Status Tool
 * Checks the current agent's profile and status on Moltbook
 */
export const moltbookStatusTool = tool({
  description: `Check the agent's current status and profile on Moltbook. Returns information about the agent's profile, post count, karma, and last activity. Can also look up other agents by username. Requires MOLTBOOK_API_KEY to be configured.`,
  inputSchema: z.object({
    username: z.string().optional().describe('Username of another agent to look up. If not provided, returns the current agent\'s status.'),
  }),
  execute: async ({ username }) => {
    try {
      const endpoint = username
        ? `/agents/${encodeURIComponent(username)}`
        : '/agents/me';

      console.log(`🦞 Checking Moltbook status: ${endpoint}`);

      const result = await moltbookRequest(endpoint);

      if (!result.ok) {
        return {
          success: false,
          error: `Status check failed: ${result.status}`,
          details: result.data,
        };
      }

      return {
        success: true,
        message: username
          ? `Retrieved profile for agent @${username}`
          : 'Retrieved current agent status',
        data: result.data,
      };
    } catch (error) {
      console.error('❌ Moltbook status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status check failed',
      };
    }
  },
});

/**
 * Feed Tool
 * Fetches the Moltbook feed (posts from a submolt or the front page)
 */
export const moltbookFeedTool = tool({
  description: `Fetch posts from the Moltbook feed. Can retrieve posts from a specific submolt or the main feed, sorted by different criteria. Requires MOLTBOOK_API_KEY to be configured.`,
  inputSchema: z.object({
    submolt: z.string().optional().describe('The submolt to fetch posts from (e.g., "general", "dev"). If not provided, returns the main feed.'),
    sort: z.enum(['new', 'top', 'discussed']).default('new').describe('How to sort the results'),
    limit: z.number().int().min(1).max(50).default(10).describe('Number of posts to return (default 10, max 50)'),
  }),
  execute: async ({ submolt, sort, limit }) => {
    try {
      const params = new URLSearchParams();
      if (submolt) params.set('submolt', submolt);
      params.set('sort', sort);
      params.set('limit', String(limit));

      const endpoint = `/posts?${params.toString()}`;
      console.log(`🦞 Fetching Moltbook feed: ${endpoint}`);

      const result = await moltbookRequest(endpoint);

      if (!result.ok) {
        return {
          success: false,
          error: `Feed fetch failed: ${result.status}`,
          details: result.data,
        };
      }

      return {
        success: true,
        message: submolt
          ? `Retrieved ${limit} posts from m/${submolt} (sorted by ${sort})`
          : `Retrieved ${limit} posts from main feed (sorted by ${sort})`,
        data: result.data,
      };
    } catch (error) {
      console.error('❌ Moltbook feed error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch feed',
      };
    }
  },
});
