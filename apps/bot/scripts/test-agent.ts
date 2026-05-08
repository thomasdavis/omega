#!/usr/bin/env tsx
/**
 * Test the Omega agent programmatically without Discord.
 *
 * Usage:
 *   pnpm --filter bot tsx scripts/test-agent.ts "your message here"
 *   pnpm --filter bot tsx scripts/test-agent.ts "use opencode to check the database"
 *   pnpm --filter bot tsx scripts/test-agent.ts --user foxhop "tell me a joke"
 */

import dotenv from 'dotenv';
dotenv.config();

import { runAgent } from '@repo/agent';

const args = process.argv.slice(2).filter(a => a !== '--');

let username = 'test-user';
let userId = '000000000000000000';
let message = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--user' && args[i + 1]) {
    username = args[i + 1];
    i++;
  } else if (args[i] === '--uid' && args[i + 1]) {
    userId = args[i + 1];
    i++;
  } else {
    message = args.slice(i).join(' ');
    break;
  }
}

if (!message) {
  console.error('Usage: tsx scripts/test-agent.ts [--user name] [--uid id] "your message"');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not set. Export it or add to apps/bot/.env');
  console.error('   export OPENAI_API_KEY=sk-...');
  process.exit(1);
}

console.log(`\n📨 Message: "${message}"`);
console.log(`👤 User: ${username} (${userId})`);
console.log(`${'─'.repeat(60)}\n`);

try {
  const result = await runAgent(message, {
    username,
    userId,
    channelName: 'test-cli',
    guildId: undefined,
    messageHistory: [],
    attachments: [],
  });

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`\n💬 Response:\n${result.response}`);

  if (result.toolCalls && result.toolCalls.length > 0) {
    console.log(`\n🔧 Tools used (${result.toolCalls.length}):`);
    for (const tc of result.toolCalls) {
      console.log(`   - ${tc.toolName}(${JSON.stringify(tc.args).slice(0, 100)})`);
      if (tc.error) console.log(`     ❌ Error: ${tc.error}`);
    }
  }

  if (result.toolErrors && result.toolErrors.length > 0) {
    console.log(`\n❌ Tool errors (${result.toolErrors.length}):`);
    for (const te of result.toolErrors) {
      console.log(`   - ${te.toolName}: ${te.error}`);
    }
  }
} catch (err) {
  console.error('\n❌ Agent error:', err);
  process.exit(1);
}
