/**
 * Custom Provider Example
 *
 * Demonstrates using a custom LLM provider configuration.
 */

import { translateTech, createProvider, AnthropicProvider } from '@omega/tech-translate';

async function main() {
  console.log('Tech Translate - Custom Provider Example\n');

  // Option 1: Create provider explicitly
  const provider = new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4000,
    temperature: 0.7,
  });

  const result = await translateTech(
    {
      userRequest: 'Create a real-time notification system with WebSocket support',
    },
    {
      format: 'md',
      style: 'technical',
      depth: 'high',
      domain: 'api',
      provider: {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-5-sonnet-20241022',
      },
    }
  );

  if (result.success) {
    console.log(`✓ ${result.title}\n`);
    console.log(result.markdown);
  } else {
    console.error('✗ Error:', result.error);
    process.exit(1);
  }
}

main().catch(console.error);
