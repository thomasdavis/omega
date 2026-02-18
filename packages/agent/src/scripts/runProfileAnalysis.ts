/**
 * Standalone entry point for profile analysis
 * Run via: node packages/agent/dist/scripts/runProfileAnalysis.js --limit 100
 * Used by GitHub Actions scheduled workflow
 */

import { runBatchAnalysis } from '../services/userProfileAnalysis.js';
import { batchUpdatePredictions } from '../services/behavioralPredictionService.js';

async function main() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 && args[limitIndex + 1]
    ? parseInt(args[limitIndex + 1], 10)
    : 100;

  console.log(`\n=== Profile Analysis Script ===`);
  console.log(`Limit: ${limit}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  try {
    // Step 1: Run batch user analysis
    console.log('--- Step 1: Batch User Analysis ---');
    await runBatchAnalysis(limit);

    // Step 2: Run batch prediction updates
    console.log('\n--- Step 2: Batch Prediction Updates ---');
    await batchUpdatePredictions(limit);

    console.log(`\n=== Analysis Complete ===`);
    console.log(`Finished: ${new Date().toISOString()}\n`);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error in profile analysis:', error);
    process.exit(1);
  }
}

main();
