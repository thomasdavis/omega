#!/usr/bin/env tsx
/**
 * Log the "rules of blah" decisions to the decision_logs table
 * Usage: tsx packages/database/scripts/log-blah-rules.ts
 *
 * This script logs the three key rules as decision entries for autonomous bot growth.
 * Related to issue #884
 */

import { logDecision } from '../src/postgres/decisionLogService.js';
import { closePostgresPool } from '../src/postgres/client.js';

async function logBlahRules() {
  console.log('📝 Logging "rules of blah" decisions...');

  try {
    // Rule 1: We don't talk about blah
    await logDecision({
      decisionDescription: 'The first rule of blah is: we don\'t talk about blah.',
      blame: 'issue-884-blah-rules',
      metadata: {
        decisionType: 'finalAnswer',
        ruleNumber: 1,
        ruleSet: 'blah-rules',
        issueNumber: 884,
        context: 'Key decision statement - first rule of blah',
      },
    });
    console.log('✅ Logged Rule 1: We don\'t talk about blah');

    // Rule 2: We don't walk about blah
    await logDecision({
      decisionDescription: 'The second rule is: we don\'t walk about blah.',
      blame: 'issue-884-blah-rules',
      metadata: {
        decisionType: 'finalAnswer',
        ruleNumber: 2,
        ruleSet: 'blah-rules',
        issueNumber: 884,
        context: 'Key decision statement - second rule of blah',
      },
    });
    console.log('✅ Logged Rule 2: We don\'t walk about blah');

    // Rule 3: If it's your first night, you have to fight (or talk)—newcomers
    await logDecision({
      decisionDescription: 'The third rule is: if it\'s your first night, you have to fight (or talk)—newcomers.',
      blame: 'issue-884-blah-rules',
      metadata: {
        decisionType: 'finalAnswer',
        ruleNumber: 3,
        ruleSet: 'blah-rules',
        issueNumber: 884,
        context: 'Key decision statement - third rule of blah',
      },
    });
    console.log('✅ Logged Rule 3: If it\'s your first night, you have to fight (or talk)—newcomers');

    console.log('🎉 Successfully logged all three "rules of blah" decisions!');
  } catch (error) {
    console.error('❌ Failed to log decisions:', error);
    process.exit(1);
  } finally {
    // Clean up database connection
    await closePostgresPool();
    console.log('🔌 Database connection closed');
  }
}

logBlahRules();
