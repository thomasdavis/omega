/**
 * Core Translation Engine
 *
 * Implements the main tech translation logic, converting user requests
 * into structured technical specifications.
 */

import type {
  TranslateInput,
  TranslateOptions,
  TranslateResult,
  TechSpec,
  TemplateContext,
} from '../types/index.js';
import { TechSpecSchema } from '../types/index.js';
import { buildSystemPrompt, buildUserPrompt } from '../templates/prompts.js';
import { createProvider } from '../providers/index.js';
import type { LLMProvider } from '../providers/base.js';

/**
 * Parse LLM response to extract JSON and Markdown
 */
function parseResponse(response: string, format: 'md' | 'json' | 'both'): {
  markdown?: string;
  json?: TechSpec;
} {
  if (format === 'md') {
    return { markdown: response.trim() };
  }

  if (format === 'json') {
    // Try to extract JSON from response
    const jsonMatch = response.match(/```json\n([\s\S]+?)\n```/) ||
                      response.match(/\{[\s\S]+\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      try {
        const parsed = JSON.parse(jsonStr);
        const validated = TechSpecSchema.parse(parsed);
        return { json: validated };
      } catch (error) {
        throw new Error(`Invalid JSON in response: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    throw new Error('No valid JSON found in response');
  }

  // format === 'both'
  // Try to extract both markdown and JSON
  const parts = response.split(/```json/);

  if (parts.length < 2) {
    // Fallback: treat entire response as markdown
    return { markdown: response.trim() };
  }

  const markdown = parts[0].trim();
  const jsonPart = parts[1].split(/```/)[0];

  try {
    const parsed = JSON.parse(jsonPart);
    const validated = TechSpecSchema.parse(parsed);
    return { markdown, json: validated };
  } catch (error) {
    // If JSON parsing fails, return just markdown
    return { markdown: response.trim() };
  }
}

/**
 * Generate a title from the user request
 */
function generateTitle(userRequest: string): string {
  // Extract first sentence or first 60 characters
  const firstSentence = userRequest.match(/^[^.!?]+[.!?]/)?.[0];
  if (firstSentence && firstSentence.length <= 60) {
    return firstSentence.trim();
  }

  const truncated = userRequest.substring(0, 60).trim();
  return truncated.endsWith('.') ? truncated : `${truncated}...`;
}

/**
 * Main translation function
 */
export async function translateTech(
  input: TranslateInput,
  options: TranslateOptions = {}
): Promise<TranslateResult> {
  const startTime = new Date().toISOString();

  // Set defaults
  const format = options.format || 'both';
  const style = options.style || 'enterprise';
  const depth = options.depth || 'medium';
  const domain = options.domain || input.domain;

  const includeAssumptions = options.includeAssumptions !== false;
  const includeRisks = options.includeRisks !== false;
  const includeMilestones = options.includeMilestones !== false;

  try {
    // Build prompt context
    const context: TemplateContext = {
      userRequest: input.userRequest,
      context: input.context,
      domain,
      style,
      depth,
      format,
      includeAssumptions,
      includeRisks,
      includeMilestones,
    };

    const systemPrompt = buildSystemPrompt(context);
    const userPrompt = buildUserPrompt(context);

    // Create provider
    const provider: LLMProvider = options.provider
      ? createProvider(options.provider)
      : createProvider();

    // Generate response
    const response = await provider.generateText(systemPrompt, userPrompt);

    // Parse response
    const { markdown, json } = parseResponse(response, format);

    // Generate title
    const title = json?.summary?.split('\n')[0] || generateTitle(input.userRequest);

    return {
      success: true,
      title,
      markdown,
      json,
      metadata: {
        format,
        style,
        depth,
        domain,
        generatedAt: startTime,
      },
    };
  } catch (error) {
    return {
      success: false,
      title: 'Translation Error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      metadata: {
        format,
        style,
        depth,
        domain,
        generatedAt: startTime,
      },
    };
  }
}
