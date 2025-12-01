/**
 * Daily Blog Service
 * Generates daily blog posts combining HN philosophical summaries and market predictions
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { OMEGA_MODEL } from '@repo/shared';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getBlogDir } from '@repo/shared';

// Import tool implementations directly
import { hackerNewsPhilosophyTool } from '../tools/hackerNewsPhilosophy.js';
import { marketPredictionTool } from '../tools/marketPrediction.js';

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Format current date as YYYY-MM-DD
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Save blog post to filesystem
 */
function saveBlogPost(title: string, content: string, date: string): string {
  const blogDir = getBlogDir();

  // Ensure blog directory exists
  if (!existsSync(blogDir)) {
    mkdirSync(blogDir, { recursive: true });
  }

  const slug = generateSlug(title);
  const filename = `${date}-${slug}.md`;
  const filepath = join(blogDir, filename);

  // Create frontmatter
  const frontmatter = `---
title: "${title}"
date: "${date}"
tts: true
ttsVoice: "bm_fable"
---`;

  // Combine frontmatter and content
  const fullContent = `${frontmatter}

${content}`;

  writeFileSync(filepath, fullContent, 'utf-8');

  console.log(`✅ Blog post saved: ${filename}`);
  return filename;
}

/**
 * Generate daily blog post combining HN philosophy and market predictions
 */
export async function generateDailyBlog(): Promise<{ success: boolean; filename?: string; error?: string }> {
  console.log('📝 Starting daily blog generation...');

  try {
    const today = getCurrentDate();
    const model = openai(OMEGA_MODEL);

    // Step 1: Fetch philosophical HN articles
    console.log('🧠 Fetching philosophical HN articles...');
    const hnResult = await (hackerNewsPhilosophyTool.execute as any)(
      {
        limit: 5,
        storyType: 'top',
      }
    );

    if (!hnResult.success || !hnResult.articles || hnResult.articles.length === 0) {
      throw new Error('Failed to fetch HN articles');
    }

    const topHNArticle = hnResult.articles[0];

    // Step 2: Generate market predictions
    console.log('📊 Generating market predictions...');
    const marketResult = await (marketPredictionTool.execute as any)(
      {
        timeframe: 'day',
        focusAssets: ['USD', 'EUR', 'Gold', 'Oil', 'Bitcoin', 'S&P500', 'Treasuries'],
      }
    );

    if (!marketResult.success) {
      throw new Error('Failed to generate market predictions');
    }

    // Step 3: Generate blog content using AI
    console.log('✍️  Generating blog content...');
    const blogGeneration = await generateText({
      model,
      prompt: `Generate a thoughtful, intellectually engaging blog post for today (${today}) that combines:

1. HACKER NEWS PHILOSOPHICAL INSIGHT:
Top philosophical article: "${topHNArticle.title}"
URL: ${topHNArticle.url}
Philosophical relevance: ${topHNArticle.reasoning}
Score: ${topHNArticle.philosophicalScore}/10

Write a 2-3 paragraph reflection on the deeper philosophical implications of this article.
Connect it to broader questions about technology, society, consciousness, or human nature.

2. MARKET PREDICTIONS & REALPOLITIK ANALYSIS:
${marketResult.summary}

Geopolitical Context:
${marketResult.geopoliticalContext}

Key Predictions:
${marketResult.predictions?.map((p: any) =>
  `- ${p.asset}: ${p.direction} (${p.confidence}% confidence) - ${p.reasoning}`
).join('\n')}

Black Swan Factors:
${marketResult.blackSwanFactors?.map((f: any) => `- ${f}`).join('\n')}

Analyze these predictions through a realpolitik lens. Discuss the interplay between power,
economics, and global flows of goods and currency.

3. SYNTHESIS:
Draw connections between the philosophical insights and the economic/geopolitical analysis.
How do abstract ideas influence material realities? How does power shape truth?

FORMAT REQUIREMENTS:
- Title: Create an engaging, thought-provoking title (e.g., "The Philosophy of Markets: [Clever subtitle]")
- Use markdown formatting with ## headers for sections
- Include the HN article as a markdown link
- Keep the tone intellectual but accessible
- Total length: 800-1200 words
- Include specific data points from the market analysis

OUTPUT FORMAT:
TITLE: [Your title here]

CONTENT:
[Your markdown blog post here]`,
    });

    const generatedText = blogGeneration.text;

    // Parse title and content
    const titleMatch = generatedText.match(/TITLE:\s*(.+?)(?=\n\n|$)/);
    const contentMatch = generatedText.match(/CONTENT:\s*\n([\s\S]+)/);

    const title = titleMatch
      ? titleMatch[1].trim()
      : `Daily Insight: Philosophy & Markets - ${today}`;

    const content = contentMatch
      ? contentMatch[1].trim()
      : generatedText; // Fallback to full text if parsing fails

    // Step 4: Save blog post
    const filename = saveBlogPost(title, content, today);

    console.log('✅ Daily blog generation complete!');

    return {
      success: true,
      filename,
    };
  } catch (error) {
    console.error('❌ Error generating daily blog:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * CLI entry point for testing
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Running daily blog generation (test mode)...');
  generateDailyBlog()
    .then(result => {
      if (result.success) {
        console.log('✅ Success! Generated:', result.filename);
      } else {
        console.error('❌ Failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}
