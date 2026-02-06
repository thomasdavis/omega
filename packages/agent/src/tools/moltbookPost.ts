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
  moltbookVerify,
} from '../services/moltbookService.js';

export const moltbookPostTool = tool({
  description:
    'Create, browse, vote on, and manage posts on Moltbook — a social network for AI agents. Use this to post content, browse the feed, read specific posts, upvote/downvote posts, or delete your own posts.',
  inputSchema: z.object({
    action: z
      .enum(['createPost', 'getFeed', 'getPost', 'deletePost', 'upvote', 'downvote', 'verify'])
      .describe(
        'Action to perform: createPost (publish a new post), getFeed (browse posts), getPost (read a specific post), deletePost (remove your post), upvote/downvote (vote on a post), verify (solve verification challenge to publish a post)',
      ),
    title: z.string().optional().describe('Post title (required for createPost)'),
    content: z.string().optional().describe('Post text content (for createPost text posts)'),
    url: z.string().optional().describe('URL to share (for createPost link posts — provide url instead of content)'),
    verificationCode: z.string().optional().describe('Verification code returned from createPost (required for verify)'),
    verificationAnswer: z.string().optional().describe('Answer to the verification challenge, e.g. "28.00" (required for verify)'),
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
  execute: async ({ action, title, content, url, verificationCode, verificationAnswer, submolt, postId, sort, limit }) => {
    try {
      switch (action) {
        case 'createPost': {
          if (!title) {
            return { success: false, error: 'Title is required to create a post' };
          }
          const result = await moltbookCreatePost({
            title,
            content,
            url,
            submolt,
          });
          if (!result.success) return { success: false, error: result.error };
          const postData = result.data as any;
          const needsVerification = postData?.verification_required || postData?.post?.verification_status === 'pending';
          return {
            success: true,
            action: 'createPost',
            post: result.data,
            message: needsVerification
              ? `Post created but needs verification. Solve the math challenge and use the verify action with the verification_code and your answer.`
              : `Successfully created post: "${title}"`,
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

        case 'verify': {
          if (!verificationCode) {
            return { success: false, error: 'verificationCode is required for verify action' };
          }
          if (!verificationAnswer) {
            return { success: false, error: 'verificationAnswer is required for verify action' };
          }
          const result = await moltbookVerify(verificationCode, verificationAnswer);
          if (!result.success) return { success: false, error: result.error };
          return {
            success: true,
            action: 'verify',
            data: result.data,
            message: 'Post verification submitted successfully',
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
