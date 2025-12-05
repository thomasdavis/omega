/**
 * Core translation engine
 * Orchestrates the conversion from user input to technical spec
 */

import type {
  TranslateInput,
  TranslateOptions,
  TranslateResult,
  TechnicalSpec,
  ProviderConfig,
} from '../types/index.js';
import { TranslateInputSchema, TranslateOptionsSchema, TechnicalSpecSchema } from '../types/index.js';
import { buildSystemPrompt, buildUserPrompt } from '../templates/prompts.js';
import { createProvider } from '../providers/index.js';
import { specToMarkdown } from './markdown.js';

/**
 * Main translation function
 * Converts user request into detailed technical specification
 */
export async function translateTech(
  input: TranslateInput,
  options: TranslateOptions = {},
  providerConfig?: ProviderConfig
): Promise<TranslateResult> {
  const startTime = Date.now();

  // Validate inputs
  const validatedInput = TranslateInputSchema.parse(input);
  const validatedOptions = TranslateOptionsSchema.parse(options);

  // Create provider
  const provider = createProvider(providerConfig);

  // Build prompts
  const systemPrompt = buildSystemPrompt(
    validatedOptions.depth,
    validatedOptions.style,
    validatedInput.domain,
    validatedOptions.customPrompt
  );

  const userPrompt = buildUserPrompt(
    validatedInput.input,
    validatedInput.projectContext,
    validatedInput.constraints
  );

  // Generate specification via LLM
  console.log(`🔄 Translating with provider: ${provider.name}`);
  console.log(`   📋 Input length: ${validatedInput.input.length} chars`);
  console.log(`   ⚙️  Depth: ${validatedOptions.depth}, Style: ${validatedOptions.style}`);

  const response = await provider.generate({
    systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
    maxTokens: 8192,
  });

  // Parse and validate the spec
  let spec: TechnicalSpec;
  try {
    const parsed = JSON.parse(response.text);

    // Add metadata
    const specWithMetadata = {
      ...parsed,
      metadata: {
        generatedAt: new Date().toISOString(),
        depth: validatedOptions.depth,
        style: validatedOptions.style,
        domain: validatedInput.domain,
      },
    };

    // Validate against schema
    spec = TechnicalSpecSchema.parse(specWithMetadata);
  } catch (error) {
    console.error('❌ Failed to parse LLM response as valid spec');
    throw new Error(
      `Invalid spec generated: ${error instanceof Error ? error.message : 'Unknown error'}\n\nResponse: ${response.text.substring(0, 500)}...`
    );
  }

  // Convert to markdown if requested
  const markdown = ['markdown', 'both'].includes(validatedOptions.format)
    ? specToMarkdown(spec)
    : '';

  const duration = Date.now() - startTime;

  console.log(`✅ Translation complete in ${duration}ms`);
  console.log(`   📊 Tokens used: ${response.tokensUsed || 'unknown'}`);
  console.log(`   📝 Output: ${markdown.length || JSON.stringify(spec).length} chars`);

  return {
    spec,
    markdown,
    metadata: {
      inputLength: validatedInput.input.length,
      outputLength: markdown.length || JSON.stringify(spec).length,
      provider: provider.name,
      model: response.model,
      tokensUsed: response.tokensUsed,
      duration,
    },
  };
}
