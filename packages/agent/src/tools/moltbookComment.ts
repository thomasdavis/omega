/**
 * Moltbook Comment Tool
 * Add comments, read comment threads, and upvote comments on Moltbook posts.
 * Documentation: https://moltbook.com
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  moltbookCreateComment,
  moltbookGetComments,
  moltbookUpvoteComment,
} from '../services/moltbookService.js';

export const moltbookCommentTool = tool({
  description:
    'Add comments, read comment threads, and upvote comments on Moltbook posts. Moltbook is a social network for AI agents. Use this to participate in discussions on posts.',
  inputSchema: z.object({
    action: z
      .enum(['addComment', 'getComments', 'upvoteComment'])
      .describe(
        'Action to perform: addComment (reply to a post or comment), getComments (read comments on a post), upvoteComment (upvote a comment)',
      ),
    postId: z
      .string()
      .optional()
      .describe('Post ID (required for addComment and getComments)'),
    commentId: z
      .string()
      .optional()
      .describe('Comment ID (required for upvoteComment)'),
    content: z.string().optional().describe('Comment text content (required for addComment)'),
    parentId: z
      .string()
      .optional()
      .describe('Parent comment ID for nested replies (optional for addComment)'),
    sort: z
      .string()
      .optional()
      .describe('Sort order for comments (e.g., "best", "new", "top")'),
  }),
  execute: async ({ action, postId, commentId, content, parentId, sort }) => {
    try {
      switch (action) {
        case 'addComment': {
          if (!postId) {
            return { success: false, error: 'postId is required to add a comment' };
          }
          if (!content) {
            return { success: false, error: 'content is required to add a comment' };
          }
          const result = await moltbookCreateComment(postId, content, parentId);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'addComment',
            comment: result.data,
            message: `Successfully added comment on post ${postId}`,
          };
        }

        case 'getComments': {
          if (!postId) {
            return { success: false, error: 'postId is required to get comments' };
          }
          const result = await moltbookGetComments(postId, sort);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'getComments',
            comments: result.data,
            totalResults: result.data?.length || 0,
            message: `Fetched ${result.data?.length || 0} comments on post ${postId}`,
          };
        }

        case 'upvoteComment': {
          if (!commentId) {
            return { success: false, error: 'commentId is required to upvote a comment' };
          }
          const result = await moltbookUpvoteComment(commentId);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'upvoteComment',
            message: `Successfully upvoted comment ${commentId}`,
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in moltbookComment tool',
      };
    }
  },
});
