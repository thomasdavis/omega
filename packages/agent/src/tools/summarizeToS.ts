/**
 * Summarize Terms of Service Tool
 * Fetches and summarizes Terms of Service documents from URLs
 * Uses AI to extract key points, identify risks, and simplify legal language
 */

import { tool } from 'ai';
import { z } from 'zod';
import { webFetchTool } from './webFetch.js';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { getPostgresPool } from '@repo/database';
import crypto from 'crypto';

export const summarizeToSTool = tool({
  description: 'Fetch and summarize a Terms of Service (ToS) document from a URL. Automatically extracts key points, identifies privacy concerns, risk flags, and liability limitations. Returns a plain-text summary that is easy to understand. Supports HTML and text-based ToS pages. Results are cached to avoid redundant fetches.',
  inputSchema: z.object({
    url: z.string().url().describe('URL to the Terms of Service document'),
    userId: z.string().describe('User ID of the person requesting the summary'),
    username: z.string().describe('Username of the person requesting the summary'),
    forceRefresh: z.boolean().default(false).describe('Force re-fetch even if cached (default: false)'),
  }),
  execute: async ({ url, userId, username, forceRefresh }) => {
    console.log(`📜 Summarizing ToS from: ${url}`);

    const pool = await getPostgresPool();

    try {
      // Step 1: Check if we already have this URL cached
      if (!forceRefresh) {
        const cachedResult = await pool.query(
          'SELECT * FROM tos_summaries WHERE url = $1 LIMIT 1',
          [url]
        );

        if (cachedResult.rows.length > 0) {
          const cached = cachedResult.rows[0];
          console.log(`✅ Using cached ToS summary for ${url}`);

          return {
            success: true,
            cached: true,
            url: cached.url,
            title: cached.title,
            summary: cached.summary,
            keyPoints: cached.key_points,
            riskFlags: cached.risk_flags,
            privacyConcerns: cached.privacy_concerns,
            liabilityLimitations: cached.liability_limitations,
            domain: cached.domain,
            fetchedAt: new Date(Number(cached.created_at) * 1000).toISOString(),
            message: 'Retrieved from cache. Use forceRefresh: true to re-fetch.',
          };
        }
      }

      // Step 2: Fetch the ToS content using webFetch tool
      console.log(`🌐 Fetching ToS content from ${url}...`);
      if (!webFetchTool.execute) {
        return {
          success: false,
          error: 'tool_unavailable',
          message: 'Web fetch tool is not available',
          url,
        };
      }

      const fetchResult = await webFetchTool.execute({
        url,
        userAgent: 'OmegaBot/1.0 (ToS Analyzer)',
        mode: 'parsed',
        maxRedirects: 10,
      }) as Awaited<ReturnType<typeof webFetchTool.execute>>;

      if (!('success' in fetchResult) || !fetchResult.success) {
        // Save failed fetch to database
        const errorId = crypto.randomUUID();
        const domain = new URL(url).hostname;
        const errorMessage = 'message' in fetchResult ? fetchResult.message : ('error' in fetchResult ? fetchResult.error : 'Unknown error');

        await pool.query(`
          INSERT INTO tos_summaries (
            id, url, domain, fetch_status, fetch_error, requested_by, requested_by_username
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [errorId, url, domain, 'failed', errorMessage, userId, username]);

        return {
          success: false,
          error: 'fetch_failed',
          message: `Failed to fetch ToS: ${errorMessage}`,
          url,
        };
      }

      const rawContent = ('content' in fetchResult ? fetchResult.content : undefined) || ('body' in fetchResult ? fetchResult.body : undefined) || '';

      if (!rawContent || rawContent.trim().length < 50) {
        return {
          success: false,
          error: 'insufficient_content',
          message: 'The fetched content is too short to be a valid ToS document. Please verify the URL.',
          url,
        };
      }

      console.log(`✅ Fetched ${rawContent.length} characters`);

      // Step 3: Use AI to analyze and summarize the ToS
      console.log(`🤖 Analyzing ToS with AI...`);

      const analysisPrompt = `You are a legal document analyzer. Analyze the following Terms of Service document and provide a comprehensive summary.

IMPORTANT: Return your response as a valid JSON object with the following structure:
{
  "title": "Brief title of the service/document",
  "summary": "2-3 paragraph plain-text summary of the main terms",
  "keyPoints": [
    "Key point 1",
    "Key point 2",
    ...
  ],
  "riskFlags": [
    "Risk or concerning clause 1",
    "Risk or concerning clause 2",
    ...
  ],
  "privacyConcerns": [
    "Privacy concern 1",
    "Privacy concern 2",
    ...
  ],
  "liabilityLimitations": "Summary of liability limitations and disclaimers"
}

Focus on:
1. What the user is agreeing to
2. Data collection and privacy policies
3. User rights and restrictions
4. Liability limitations and dispute resolution
5. Red flags or concerning clauses
6. Automatic renewals, fees, or hidden costs

Terms of Service Document:
${rawContent.substring(0, 15000)}${rawContent.length > 15000 ? '\n\n... (content truncated)' : ''}

Return ONLY the JSON object, no additional text.`;

      const analysisResult = await generateText({
        model: openai.chat('gpt-4o'),
        prompt: analysisPrompt,
        temperature: 0.3, // Lower temperature for more consistent analysis
      });

      console.log('🔍 Raw AI response:', analysisResult.text);

      // Parse the AI response
      let analysis;
      try {
        // Try to extract JSON from the response
        const jsonMatch = analysisResult.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          analysis = JSON.parse(analysisResult.text);
        }
      } catch (parseError) {
        console.error('❌ Failed to parse AI response as JSON:', parseError);
        return {
          success: false,
          error: 'analysis_parse_error',
          message: 'Failed to parse AI analysis. The response was not valid JSON.',
          rawResponse: analysisResult.text.substring(0, 500),
        };
      }

      // Step 4: Generate content hash for duplicate detection
      const contentHash = crypto
        .createHash('sha256')
        .update(rawContent)
        .digest('hex')
        .substring(0, 16);

      // Step 5: Save to database
      const id = crypto.randomUUID();
      const domain = new URL(url).hostname;
      const timestamp = Math.floor(Date.now() / 1000);

      await pool.query(`
        INSERT INTO tos_summaries (
          id, url, title, raw_content, summary, key_points, risk_flags,
          privacy_concerns, liability_limitations, content_hash, domain,
          fetch_status, requested_by, requested_by_username, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (url) DO UPDATE SET
          title = EXCLUDED.title,
          raw_content = EXCLUDED.raw_content,
          summary = EXCLUDED.summary,
          key_points = EXCLUDED.key_points,
          risk_flags = EXCLUDED.risk_flags,
          privacy_concerns = EXCLUDED.privacy_concerns,
          liability_limitations = EXCLUDED.liability_limitations,
          content_hash = EXCLUDED.content_hash,
          fetch_status = EXCLUDED.fetch_status,
          updated_at = EXCLUDED.updated_at
      `, [
        id,
        url,
        analysis.title || 'Terms of Service',
        rawContent.substring(0, 50000), // Limit storage to 50K chars
        analysis.summary || '',
        JSON.stringify(analysis.keyPoints || []),
        JSON.stringify(analysis.riskFlags || []),
        JSON.stringify(analysis.privacyConcerns || []),
        analysis.liabilityLimitations || '',
        contentHash,
        domain,
        'success',
        userId,
        username,
        timestamp,
        timestamp,
      ]);

      console.log(`✅ Saved ToS summary to database (ID: ${id})`);

      // Step 6: Return the summary
      return {
        success: true,
        cached: false,
        url,
        title: analysis.title || 'Terms of Service',
        summary: analysis.summary || '',
        keyPoints: analysis.keyPoints || [],
        riskFlags: analysis.riskFlags || [],
        privacyConcerns: analysis.privacyConcerns || [],
        liabilityLimitations: analysis.liabilityLimitations || '',
        domain,
        contentHash,
        message: 'Successfully analyzed and summarized the Terms of Service document.',
      };

    } catch (error) {
      console.error('❌ Error summarizing ToS:', error);
      return {
        success: false,
        error: 'exception',
        message: `Error summarizing ToS: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url,
      };
    }
  },
});
