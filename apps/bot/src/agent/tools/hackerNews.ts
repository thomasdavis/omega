/**
 * Hacker News API Tool - Query the official Hacker News API
 * Supports fetching stories, comments, and other data from Hacker News
 * API Documentation: https://github.com/HackerNews/API
 */

import { tool } from 'ai';
import { z } from 'zod';

interface HNItem {
  id: number;
  type: 'story' | 'comment' | 'job' | 'poll' | 'pollopt';
  by: string;
  time: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
}

interface HNStory {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
  descendants: number;
  type: string;
}

interface HNComment {
  id: number;
  by: string;
  text: string;
  time: number;
  parent: number;
  kids?: number[];
}

export const hackerNewsTool = tool({
  description: 'Query the Hacker News API to fetch stories, comments, and other data. Supports fetching top, new, best, and ask stories, as well as individual story details and comments.',
  inputSchema: z.object({
    action: z.enum(['topStories', 'newStories', 'bestStories', 'askStories', 'showStories', 'jobStories', 'storyDetails', 'comments']).describe('The type of data to fetch'),
    limit: z.number().int().min(1).max(50).optional().describe('Number of items to return (default 10, max 50)'),
    storyId: z.number().int().optional().describe('Story ID (required for storyDetails and comments actions)'),
    includeText: z.boolean().optional().describe('Include comment/story text in response (default false for lists, true for details)'),
  }),
  execute: async ({ action, limit = 10, storyId, includeText = false }) => {
    try {
      console.log(`📰 Fetching Hacker News data: ${action}`);

      const baseUrl = 'https://hacker-news.firebaseio.com/v0';

      // Handle different actions
      switch (action) {
        case 'topStories':
        case 'newStories':
        case 'bestStories':
        case 'askStories':
        case 'showStories':
        case 'jobStories': {
          // Map action to API endpoint
          const endpoint = action.replace(/([A-Z])/g, (match) => match.toLowerCase());
          const storiesUrl = `${baseUrl}/${endpoint}.json`;

          console.log(`📡 Fetching story IDs from ${storiesUrl}`);
          const storiesResponse = await fetch(storiesUrl);

          if (!storiesResponse.ok) {
            return {
              success: false,
              error: `Failed to fetch ${action}: ${storiesResponse.status}`,
            };
          }

          const storyIds = await storiesResponse.json() as number[];
          const itemsToFetch = storyIds.slice(0, Math.min(limit, 50));

          console.log(`📚 Fetching details for ${itemsToFetch.length} items...`);

          // Fetch individual story details
          const stories: HNStory[] = [];
          for (const id of itemsToFetch) {
            try {
              const itemResponse = await fetch(`${baseUrl}/item/${id}.json`);
              if (itemResponse.ok) {
                const item = await itemResponse.json() as HNItem;
                if (item && !item.dead) {
                  stories.push({
                    id: item.id,
                    title: item.title || 'No title',
                    url: item.url,
                    score: item.score || 0,
                    by: item.by,
                    time: item.time,
                    descendants: item.descendants || 0,
                    type: item.type,
                  });
                }
              }
            } catch (error) {
              console.warn(`⚠️  Failed to fetch item ${id}:`, error);
            }
          }

          return {
            success: true,
            action,
            count: stories.length,
            stories: stories.map((story, index) => ({
              rank: index + 1,
              id: story.id,
              title: story.title,
              url: story.url,
              score: story.score,
              author: story.by,
              time: new Date(story.time * 1000).toISOString(),
              comments: story.descendants,
              discussionUrl: `https://news.ycombinator.com/item?id=${story.id}`,
            })),
          };
        }

        case 'storyDetails': {
          if (!storyId) {
            return {
              success: false,
              error: 'storyId is required for storyDetails action',
            };
          }

          console.log(`📖 Fetching details for story ${storyId}`);
          const itemResponse = await fetch(`${baseUrl}/item/${storyId}.json`);

          if (!itemResponse.ok) {
            return {
              success: false,
              error: `Failed to fetch story ${storyId}: ${itemResponse.status}`,
            };
          }

          const item = await itemResponse.json() as HNItem;

          if (!item) {
            return {
              success: false,
              error: `Story ${storyId} not found`,
            };
          }

          return {
            success: true,
            action: 'storyDetails',
            story: {
              id: item.id,
              type: item.type,
              title: item.title,
              url: item.url,
              text: includeText ? item.text : undefined,
              score: item.score,
              author: item.by,
              time: new Date(item.time * 1000).toISOString(),
              comments: item.descendants || 0,
              commentIds: item.kids,
              discussionUrl: `https://news.ycombinator.com/item?id=${item.id}`,
            },
          };
        }

        case 'comments': {
          if (!storyId) {
            return {
              success: false,
              error: 'storyId is required for comments action',
            };
          }

          console.log(`💬 Fetching comments for story ${storyId}`);
          const storyResponse = await fetch(`${baseUrl}/item/${storyId}.json`);

          if (!storyResponse.ok) {
            return {
              success: false,
              error: `Failed to fetch story ${storyId}: ${storyResponse.status}`,
            };
          }

          const story = await storyResponse.json() as HNItem;

          if (!story || !story.kids || story.kids.length === 0) {
            return {
              success: true,
              action: 'comments',
              storyId,
              count: 0,
              comments: [],
            };
          }

          // Fetch top-level comments (limit to avoid too many requests)
          const commentIdsToFetch = story.kids.slice(0, Math.min(limit, 50));
          const comments: HNComment[] = [];

          for (const commentId of commentIdsToFetch) {
            try {
              const commentResponse = await fetch(`${baseUrl}/item/${commentId}.json`);
              if (commentResponse.ok) {
                const comment = await commentResponse.json() as HNItem;
                if (comment && !comment.dead && comment.text) {
                  comments.push({
                    id: comment.id,
                    by: comment.by,
                    text: comment.text,
                    time: comment.time,
                    parent: comment.parent || storyId,
                    kids: comment.kids,
                  });
                }
              }
            } catch (error) {
              console.warn(`⚠️  Failed to fetch comment ${commentId}:`, error);
            }
          }

          return {
            success: true,
            action: 'comments',
            storyId,
            storyTitle: story.title,
            count: comments.length,
            totalComments: story.descendants || 0,
            comments: comments.map(comment => ({
              id: comment.id,
              author: comment.by,
              text: includeText !== false ? comment.text : '[text omitted]',
              time: new Date(comment.time * 1000).toISOString(),
              replies: comment.kids?.length || 0,
              url: `https://news.ycombinator.com/item?id=${comment.id}`,
            })),
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
          };
      }
    } catch (error) {
      console.error('❌ Error fetching Hacker News data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
