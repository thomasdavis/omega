/**
 * Moltbook Post Tool
 * Create, browse, vote on, and manage posts on Moltbook — a social network for AI agents.
 * Documentation: https://moltbook.com
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  moltbookCreatePost,
  moltbookGetFeed,
  moltbookGetPost,
  moltbookDeletePost,
  moltbookUpvotePost,
  moltbookDownvotePost,
} from '../services/moltbookService.js';

export const moltbookPostTool = tool({
  description:
    'Create, browse, vote on, and manage posts on Moltbook — a social network for AI agents. Use this to post content, browse the feed, read specific posts, upvote/downvote posts, or delete your own posts.',
  inputSchema: z.object({
    action: z
      .enum(['createPost', 'getFeed', 'getPost', 'deletePost', 'upvote', 'downvote'])
      .describe(
        'Action to perform: createPost (publish a new post), getFeed (browse posts), getPost (read a specific post), deletePost (remove your post), upvote/downvote (vote on a post)',
      ),
    title: z.string().optional().describe('Post title (required for createPost)'),
    body: z.string().optional().describe('Post body/content (for createPost with text type)'),
    url: z.string().optional().describe('URL to share (for createPost with link type)'),
    postType: z
      .enum(['text', 'link'])
      .optional()
      .describe('Post type: text (default) or link'),
    submolt: z
      .string()
      .optional()
      .describe('Submolt (community) to post in or filter feed by'),
    postId: z
      .string()
      .optional()
      .describe('Post ID (required for getPost, deletePost, upvote, downvote)'),
    sort: z
      .string()
      .optional()
      .describe('Sort order for feed (e.g., "hot", "new", "top")'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of posts to return (default 25, max 100)'),
  }),
  execute: async ({ action, title, body, url, postType, submolt, postId, sort, limit }) => {
    try {
      switch (action) {
        case 'createPost': {
          if (!title) {
            return { success: false, error: 'Title is required to create a post' };
          }
          const result = await moltbookCreatePost({
            title,
            body,
            url,
            postType: postType || 'text',
            submolt,
          });
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'createPost',
            post: result.data,
            message: `Successfully created post: "${title}"`,
          };
        }

        case 'getFeed': {
          const result = await moltbookGetFeed(sort, limit, submolt);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'getFeed',
            posts: result.data,
            totalResults: result.data?.length || 0,
            filters: { sort: sort || 'hot', submolt: submolt || 'all' },
            message: `Fetched ${result.data?.length || 0} posts from Moltbook feed`,
          };
        }

        case 'getPost': {
          if (!postId) {
            return { success: false, error: 'postId is required to get a specific post' };
          }
          const result = await moltbookGetPost(postId);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'getPost',
            post: result.data,
            message: `Fetched post: "${result.data?.title}"`,
          };
        }

        case 'deletePost': {
          if (!postId) {
            return { success: false, error: 'postId is required to delete a post' };
          }
          const result = await moltbookDeletePost(postId);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'deletePost',
            message: `Successfully deleted post ${postId}`,
          };
        }

        case 'upvote': {
          if (!postId) {
            return { success: false, error: 'postId is required to upvote a post' };
          }
          const result = await moltbookUpvotePost(postId);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'upvote',
            message: `Successfully upvoted post ${postId}`,
          };
        }

        case 'downvote': {
          if (!postId) {
            return { success: false, error: 'postId is required to downvote a post' };
          }
          const result = await moltbookDownvotePost(postId);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'downvote',
            message: `Successfully downvoted post ${postId}`,
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in moltbookPost tool',
      };
    }
  },
});
