/**
 * Detect Bias Tool - Analyzes text for various forms of bias
 * Detects political, cultural, gender, racial, and other biases in textual content
 */

import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { OMEGA_MODEL } from '@repo/shared';

export const detectBiasTool = tool({
  description: 'Analyze text to detect and identify potential bias including political, cultural, gender, racial, or other forms of bias. Provides explanations of detected biases and suggestions for mitigation. Use this tool to improve fairness and awareness in communication and content creation.',
  inputSchema: z.object({
    text: z.string().describe('The text content to analyze for bias'),
    focusAreas: z.array(z.enum(['political', 'cultural', 'gender', 'racial', 'religious', 'age', 'socioeconomic', 'all']))
      .optional()
      .describe('Specific types of bias to focus on. Defaults to all types if not specified.'),
  }),
  execute: async ({ text, focusAreas = ['all'] }) => {
    console.log(`🔍 Analyzing text for bias (focus: ${focusAreas.join(', ')})`);

    try {
      // Validate input
      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: 'empty_text',
          message: 'Cannot analyze empty text. Please provide text content to analyze.',
        };
      }

      if (text.length > 10000) {
        return {
          success: false,
          error: 'text_too_long',
          message: 'Text is too long to analyze. Please provide text under 10,000 characters.',
          textLength: text.length,
        };
      }

      // Build focus areas prompt
      const focusPrompt = focusAreas.includes('all')
        ? 'all forms of bias (political, cultural, gender, racial, religious, age, socioeconomic, etc.)'
        : focusAreas.join(', ') + ' bias';

      // Create analysis prompt
      const analysisPrompt = `You are an expert bias detection system. Analyze the following text for ${focusPrompt}.

TEXT TO ANALYZE:
"""
${text}
"""

Provide your analysis in the following JSON format:
{
  "hasBias": true/false,
  "overallSeverity": "none" | "low" | "medium" | "high",
  "detectedBiases": [
    {
      "type": "political" | "cultural" | "gender" | "racial" | "religious" | "age" | "socioeconomic" | "other",
      "severity": "low" | "medium" | "high",
      "description": "Brief explanation of the detected bias",
      "textExcerpt": "The specific text that exhibits the bias",
      "explanation": "Detailed explanation of why this is considered biased",
      "suggestion": "How to rephrase or mitigate this bias"
    }
  ],
  "summary": "Overall summary of the bias analysis",
  "recommendations": [
    "List of general recommendations to reduce bias in this text"
  ]
}

IMPORTANT GUIDELINES:
1. Be objective and nuanced - not all controversial topics indicate bias
2. Distinguish between factual statements and biased framing
3. Consider context - some bias may be intentional (e.g., opinion pieces)
4. Focus on language that stereotypes, excludes, or unfairly characterizes groups
5. Provide actionable, specific suggestions for improvement
6. If no significant bias is found, say so clearly

Return ONLY valid JSON with no additional text.`;

      // Use OpenAI to analyze the text
      const model = openai.chat(OMEGA_MODEL);

      const result = await generateText({
        model,
        prompt: analysisPrompt,
        temperature: 0.3, // Lower temperature for more consistent analysis
      });

      // Parse the response
      let analysis;
      try {
        // Extract JSON from response (handle potential markdown code blocks)
        let jsonText = result.text.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        analysis = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('❌ Failed to parse AI response:', parseError);
        return {
          success: false,
          error: 'parse_error',
          message: 'Failed to parse bias analysis response. The AI returned an invalid format.',
          rawResponse: result.text,
        };
      }

      console.log(`✅ Bias analysis complete: ${analysis.hasBias ? 'bias detected' : 'no significant bias'}`);

      return {
        success: true,
        hasBias: analysis.hasBias,
        overallSeverity: analysis.overallSeverity,
        detectedBiases: analysis.detectedBiases || [],
        summary: analysis.summary,
        recommendations: analysis.recommendations || [],
        metadata: {
          textLength: text.length,
          focusAreas: focusAreas,
          biasCount: analysis.detectedBiases?.length || 0,
          model: OMEGA_MODEL,
        },
      };
    } catch (error) {
      console.error('❌ Error analyzing text for bias:', error);
      return {
        success: false,
        error: 'analysis_failed',
        message: `Failed to analyze text: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
