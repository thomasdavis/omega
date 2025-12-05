/**
 * Evolution Scheduler
 * Integrates evolution cycle into the main scheduler
 */

import cron from 'node-cron';
import { runEvolutionCycle } from './engine.js';
import { EVOLUTION_CONFIG } from './config.js';

/**
 * Initialize evolution scheduler
 * Call this from the main scheduler initialization
 */
export function initializeEvolutionScheduler(): void {
  console.log('🧠 Initializing evolution scheduler...');

  // Schedule daily evolution cycle
  cron.schedule(EVOLUTION_CONFIG.cron_schedule, async () => {
    console.log('⏰ Cron job triggered: Self-evolution cycle');

    try {
      const result = await runEvolutionCycle();

      if (result.success) {
        console.log(`✅ Evolution cycle completed: ${result.summary}`);
      } else {
        console.error(`❌ Evolution cycle failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error in evolution cron job:', error);
    }
  });

  console.log(
    `✅ Evolution scheduler initialized - Will run daily at ${EVOLUTION_CONFIG.cron_schedule} (${EVOLUTION_CONFIG.timezone})`
  );
}

/**
 * Manual trigger for testing
 */
export async function triggerEvolutionNow(): Promise<void> {
  console.log('🔨 Manual trigger: Running evolution cycle now...');
  const result = await runEvolutionCycle();
  if (result.success) {
    console.log(`✅ ${result.summary}`);
  } else {
    console.error(`❌ ${result.error}`);
  }
}
