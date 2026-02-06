/**
 * Basic Usage Example
 *
 * Demonstrates simple tech translation usage.
 */

import { translateTech } from '@omega/tech-translate';

async function main() {
  console.log('Tech Translate - Basic Example\n');

  const result = await translateTech(
    {
      userRequest: 'Build a user authentication system with email and password',
      context: 'For a web application with approximately 10,000 users',
    },
    {
      format: 'both',
      style: 'enterprise',
      depth: 'medium',
      domain: 'web',
    }
  );

  if (result.success) {
    console.log(`✓ ${result.title}\n`);
    console.log('=== MARKDOWN OUTPUT ===\n');
    console.log(result.markdown);
    console.log('\n=== JSON OUTPUT ===\n');
    console.log(JSON.stringify(result.json, null, 2));
  } else {
    console.error('✗ Error:', result.error);
    process.exit(1);
  }
}

main().catch(console.error);
