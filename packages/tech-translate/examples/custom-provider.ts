/**
 * Example: Using custom provider configuration
 */

import { translateTech } from '@omega/tech-translate';

async function main() {
  // Using Anthropic Claude
  const result = await translateTech(
    {
      input: 'Create a machine learning pipeline for sentiment analysis',
      domain: 'ml',
    },
    {
      depth: 'high',
      style: 'enterprise',
      format: 'both',
    },
    {
      type: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      // apiKey: 'your-key-here', // Or use ANTHROPIC_API_KEY env var
    }
  );

  console.log(result.markdown);
}

// Using OpenAI with specific model
async function withOpenAI() {
  const result = await translateTech(
    {
      input: 'Build a microservices architecture for e-commerce',
      domain: 'infrastructure',
    },
    {
      depth: 'exhaustive',
      style: 'enterprise',
    },
    {
      type: 'openai',
      model: 'gpt-4o',
    }
  );

  console.log('Requirements:', result.spec.requirements);
  console.log('Architecture:', result.spec.devops);
}

main().catch(console.error);
