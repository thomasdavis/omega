/**
 * Hacker News Philosophy Tool - Fetches top philosophical articles from Hacker News
 * Uses the official Hacker News API to retrieve and filter articles based on philosophical relevance
 */

import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { OMEGA_MODEL } from '@repo/shared';

interface HNItem {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
  descendants?: number;
}

interface PhilosophicalArticle {
  title: string;
  url: string;
  score: number;
  author: string;
  comments: number;
  philosophicalScore: number;
  reasoning: string;
}

export const hackerNewsPhilosophyTool = tool({
  description: 'Fetch and rank the top 10 articles from Hacker News that would interest a philosophical mind. Analyzes articles based on their relevance to philosophy, ethics, technology\'s impact on society, consciousness, and existential questions.',
  inputSchema: z.object({
    limit: z.number().default(10).describe('Number of top philosophical articles to return (default 10)'),
    storyType: z.enum(['top', 'best', 'new']).default('top').describe('Type of HN stories to analyze (default: top)'),
  }),
  execute: async ({ limit, storyType }) => {
    console.log(`🧠 Fetching philosophical articles from Hacker News (${storyType} stories)...`);

    try {
      // Step 1: Fetch story IDs from HN API
      const storiesUrl = `https://hacker-news.firebaseio.com/v0/${storyType}stories.json`;
      console.log(`📡 Fetching ${storyType} stories from HN API...`);

      const storiesResponse = await fetch(storiesUrl);
      if (!storiesResponse.ok) {
        throw new Error(`Failed to fetch HN stories: ${storiesResponse.status}`);
      }

      const storyIds = await storiesResponse.json() as number[];

      // Fetch first 50 stories for analysis (to have enough candidates)
      const storiesToFetch = storyIds.slice(0, 50);
      console.log(`📚 Analyzing ${storiesToFetch.length} stories for philosophical content...`);

      // Step 2: Fetch individual story details
      const stories: HNItem[] = [];
      for (const id of storiesToFetch) {
        try {
          const itemResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          if (itemResponse.ok) {
            const item = await itemResponse.json() as HNItem;
            // Only include stories with URLs (not Ask HN, etc.) and valid titles
            if (item.url && item.title) {
              stories.push(item);
            }
          }
        } catch (error) {
          console.warn(`⚠️  Failed to fetch story ${id}:`, error);
          // Continue with other stories
        }
      }

      console.log(`✅ Fetched ${stories.length} valid stories`);

      if (stories.length === 0) {
        return {
          success: false,
          message: 'No stories found on Hacker News',
          articles: [],
        };
      }

      // Step 3: Use AI to analyze and score articles for philosophical relevance
      console.log(`🤖 Using AI to analyze philosophical relevance...`);

      const model = openai(OMEGA_MODEL);

      // Analyze stories in batches to avoid token limits
      const batchSize = 10;
      const philosophicalArticles: PhilosophicalArticle[] = [];

      for (let i = 0; i < stories.length; i += batchSize) {
        const batch = stories.slice(i, i + batchSize);

        try {
          const result = await generateObject({
            model,
            schema: z.object({
              articles: z.array(z.object({
                id: z.number(),
                philosophicalScore: z.number().min(0).max(10).describe('Score from 0-10 indicating philosophical relevance'),
                reasoning: z.string().describe('Brief explanation of why this article is or isn\'t philosophically relevant'),
              })),
            }),
            prompt: `Analyze these Hacker News articles for philosophical relevance. Score each from 0-10 based on their connection to:
- Philosophy, ethics, and moral questions
- Technology's impact on society and human condition
- Consciousness, cognition, and the nature of mind
- Existential questions and meaning
- Human nature and behavior
- Future of humanity and civilization
- Epistemology and knowledge
- Free will, determinism, and choice
- Privacy, freedom, and rights

Articles to analyze:
${batch.map((story, idx) => `${idx + 1}. ID: ${story.id}, Title: "${story.title}"`).join('\n')}

For each article, provide its ID, a philosophical score (0-10), and brief reasoning.`,
          });

          // Match scored articles with their full details
          for (const scoredArticle of result.object.articles) {
            const story = batch.find(s => s.id === scoredArticle.id);
            if (story && scoredArticle.philosophicalScore >= 3) { // Only keep articles with score >= 3
              philosophicalArticles.push({
                title: story.title,
                url: story.url!,
                score: story.score,
                author: story.by,
                comments: story.descendants || 0,
                philosophicalScore: scoredArticle.philosophicalScore,
                reasoning: scoredArticle.reasoning,
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️  Failed to analyze batch starting at ${i}:`, error);
          // Continue with other batches
        }
      }

      // Step 4: Sort by philosophical score (primary) and HN score (secondary)
      philosophicalArticles.sort((a, b) => {
        if (b.philosophicalScore !== a.philosophicalScore) {
          return b.philosophicalScore - a.philosophicalScore;
        }
        return b.score - a.score;
      });

      // Step 5: Return top N articles
      const topArticles = philosophicalArticles.slice(0, limit);

      console.log(`✅ Found ${topArticles.length} philosophical articles`);

      return {
        success: true,
        message: `Found ${topArticles.length} philosophical articles from Hacker News`,
        totalAnalyzed: stories.length,
        articles: topArticles.map((article, index) => ({
          rank: index + 1,
          title: article.title,
          url: article.url,
          hnScore: article.score,
          philosophicalScore: article.philosophicalScore,
          author: article.author,
          comments: article.comments,
          reasoning: article.reasoning,
          discussionUrl: `https://news.ycombinator.com/item?id=${stories.find(s => s.url === article.url)?.id}`,
        })),
      };
    } catch (error) {
      console.error('❌ Error fetching philosophical HN articles:', error);
      return {
        success: false,
        error: 'exception',
        message: `Error fetching philosophical articles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        articles: [],
      };
    }
  },
});
