/**
 * Summarize Tool - Summarizes text content
 * Can summarize articles, documents, or any text content
 */

import { tool } from 'ai';
import { z } from 'zod';

export const summarizeTool = tool({
  description: 'Summarize text content, articles, or documents. Provides concise summaries of any text input. Useful for digesting long content quickly.',
  parameters: z.object({
    content: z.string().describe('The text content to summarize'),
    style: z.enum(['brief', 'detailed', 'bullet-points']).default('brief').describe('Summarization style: brief (2-3 sentences), detailed (paragraph), or bullet-points (key points list)'),
    maxLength: z.number().default(150).describe('Maximum length of summary in words (default: 150)'),
  }),
  execute: async ({ content, style, maxLength }) => {
    console.log(`📝 Summarizing content (${content.length} chars, style: ${style}, max: ${maxLength} words)`);

    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: 'Empty content provided',
          message: 'Cannot summarize empty content.',
        };
      }

      // For now, we'll create a simple extractive summary
      // In a production system, you might want to use a dedicated summarization model
      // or let the main AI model handle the summarization through the prompt

      // Clean and prepare the content
      const cleanedContent = content
        .replace(/\s+/g, ' ')
        .trim();

      // Basic word count
      const wordCount = cleanedContent.split(/\s+/).length;

      // If content is already short, just return it formatted
      if (wordCount <= maxLength) {
        return {
          success: true,
          summary: cleanedContent,
          originalLength: content.length,
          summaryLength: cleanedContent.length,
          wordCount: wordCount,
          style: style,
          message: 'Content was already concise, minimal summarization needed.',
        };
      }

      // For actual summarization, we'll extract key sentences based on style
      const sentences = cleanedContent.match(/[^.!?]+[.!?]+/g) || [cleanedContent];

      let summary: string;
      switch (style) {
        case 'brief':
          // Take first 2-3 sentences
          summary = sentences.slice(0, Math.min(3, sentences.length)).join(' ').trim();
          break;

        case 'bullet-points':
          // Extract key sentences as bullet points
          const keyPoints = sentences.slice(0, Math.min(5, sentences.length));
          summary = keyPoints.map(s => `• ${s.trim()}`).join('\n');
          break;

        case 'detailed':
        default:
          // Take more sentences for detailed summary
          summary = sentences.slice(0, Math.min(7, sentences.length)).join(' ').trim();
          break;
      }

      // Ensure we don't exceed maxLength
      const summaryWords = summary.split(/\s+/);
      if (summaryWords.length > maxLength) {
        summary = summaryWords.slice(0, maxLength).join(' ') + '...';
      }

      console.log(`✅ Summarization complete (${wordCount} → ${summary.split(/\s+/).length} words)`);

      return {
        success: true,
        summary: summary,
        originalLength: content.length,
        summaryLength: summary.length,
        originalWordCount: wordCount,
        summaryWordCount: summary.split(/\s+/).length,
        style: style,
        message: 'Content successfully summarized.',
      };
    } catch (error) {
      console.error('❌ Error in summarization:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Summarization failed',
        message: 'Failed to summarize content.',
      };
    }
  },
});
