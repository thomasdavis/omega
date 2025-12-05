/**
 * Example: Using Tech Translation API in Node.js
 */

import { translateTech } from '@omega/tech-translate';

async function main() {
  try {
    // Simple translation
    const result = await translateTech(
      {
        input: 'Build a real-time chat application with user presence and message history',
        domain: 'web',
        projectContext: 'Startup MVP, deploying to Railway, using TypeScript and React',
        constraints: ['Timeline: 6 weeks', 'Team: 2 developers'],
      },
      {
        depth: 'standard',
        style: 'startup',
        format: 'both',
      }
    );

    console.log('=== Generated Specification ===\n');
    console.log(result.markdown);

    console.log('\n=== Metadata ===');
    console.log(`Provider: ${result.metadata.provider}`);
    console.log(`Tokens used: ${result.metadata.tokensUsed}`);
    console.log(`Duration: ${result.metadata.duration}ms`);

    // Access structured data
    console.log('\n=== Functional Requirements ===');
    result.spec.requirements.functional.forEach(req => {
      console.log(`${req.id}: ${req.description} (${req.priority})`);
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
