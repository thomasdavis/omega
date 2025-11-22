/**
 * Market Prediction Tool - Generates realpolitik-based market predictions
 * Uses AI to analyze global economic/geopolitical trends and predict market movements
 */

import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { OMEGA_MODEL } from '../../config/models.js';
import { getDatabase } from '../../database/client.js';

interface MarketPrediction {
  date: string;
  summary: string;
  predictions: {
    asset: string;
    direction: 'up' | 'down' | 'sideways';
    confidence: number;
    reasoning: string;
  }[];
  blackSwanFactors: string[];
  geopoliticalContext: string;
}

/**
 * Get recent predictions from database for context
 */
async function getRecentPredictions(limit: number = 10): Promise<Array<{
  date: string;
  prediction_text: string;
}>> {
  const db = getDatabase();

  try {
    const result = await db.execute({
      sql: `SELECT date, prediction_text FROM market_predictions
            ORDER BY date DESC LIMIT ?`,
      args: [limit],
    });

    return result.rows as Array<{ date: string; prediction_text: string }>;
  } catch (error) {
    // Table might not exist yet
    console.log('No previous predictions found (table may not exist yet)');
    return [];
  }
}

/**
 * Store prediction in database
 */
async function storePrediction(prediction: MarketPrediction): Promise<void> {
  const db = getDatabase();

  // Ensure table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS market_predictions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      prediction_text TEXT NOT NULL,
      predictions_json TEXT NOT NULL,
      black_swan_factors TEXT NOT NULL,
      geopolitical_context TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_market_predictions_date
    ON market_predictions(date DESC)
  `);

  const id = `pred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await db.execute({
    sql: `INSERT INTO market_predictions
          (id, date, prediction_text, predictions_json, black_swan_factors, geopolitical_context)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      prediction.date,
      prediction.summary,
      JSON.stringify(prediction.predictions),
      JSON.stringify(prediction.blackSwanFactors),
      prediction.geopoliticalContext,
    ],
  });
}

export const marketPredictionTool = tool({
  description: `Generate sophisticated market predictions based on realpolitik assessment of global flows of goods and currency.

  This tool analyzes:
  - Current geopolitical tensions and their economic implications
  - Global trade flows and supply chain dynamics
  - Central bank policies and monetary conditions
  - Political instability and regime changes
  - Resource constraints and climate factors
  - Technological disruptions
  - Black swan event probabilities

  The tool maintains a learning history - each prediction is stored and used to inform future forecasts.
  Previous predictions are analyzed for accuracy to continuously improve the model.`,

  inputSchema: z.object({
    timeframe: z.enum(['day', 'week', 'month', 'quarter']).default('day')
      .describe('Prediction timeframe (default: day)'),
    focusAssets: z.array(z.string()).default([
      'USD', 'EUR', 'Gold', 'Oil', 'Bitcoin', 'S&P500', 'Treasuries'
    ]).describe('Assets to focus predictions on'),
  }),

  execute: async ({ timeframe, focusAssets }) => {
    console.log(`📊 Generating ${timeframe} market predictions...`);

    try {
      const model = openai(OMEGA_MODEL);
      const today = new Date().toISOString().split('T')[0];

      // Get recent predictions for context
      const recentPredictions = await getRecentPredictions(10);

      let predictionContext = '';
      if (recentPredictions.length > 0) {
        predictionContext = `\n\nRecent Historical Predictions (for calibration):\n` +
          recentPredictions.map(p => `${p.date}: ${p.prediction_text}`).join('\n');
      }

      // Generate prediction using AI
      const result = await generateText({
        model,
        prompt: `You are a realpolitik analyst specializing in global economic and geopolitical forecasting.

Generate a comprehensive market prediction for the next ${timeframe} based on:

1. GEOPOLITICAL REALPOLITIK:
   - Current great power competition (US-China, Russia-West, etc.)
   - Regional conflicts and their economic spillovers
   - Political stability in major economies
   - Trade wars, sanctions, and economic coercion
   - Energy geopolitics and resource control

2. ECONOMIC FUNDAMENTALS:
   - Central bank policies (Fed, ECB, PBoC, etc.)
   - Inflation dynamics and purchasing power
   - Debt levels and fiscal sustainability
   - Employment and productivity trends
   - Supply chain resilience

3. BLACK SWAN FACTORS:
   - Potential regime changes or revolutions
   - Financial system vulnerabilities
   - Climate-related disruptions
   - Pandemic or health crisis risks
   - Cyber warfare and infrastructure attacks
   - Sudden technological breakthroughs or disruptions

4. LEARNING FROM PAST PREDICTIONS:${predictionContext}
   - Review accuracy of recent predictions
   - Identify what factors were over/under-weighted
   - Adjust confidence levels based on track record

For each of these assets, provide specific predictions: ${focusAssets.join(', ')}

Format your response as follows:

SUMMARY:
[2-3 sentence overview of the global situation and key drivers]

PREDICTIONS:
For each asset:
- Asset name
- Direction (up/down/sideways)
- Confidence (0-100%)
- Reasoning (1-2 sentences with realpolitik analysis)

BLACK SWAN FACTORS:
[List 3-5 potential black swan events that could invalidate these predictions]

GEOPOLITICAL CONTEXT:
[Detailed paragraph on the current realpolitik landscape]

Be contrarian when consensus is overly optimistic or pessimistic. Account for second-order effects and unintended consequences of policy actions.`,
      });

      const predictionText = result.text;

      // Parse the AI response into structured format
      const summaryMatch = predictionText.match(/SUMMARY:\s*\n([\s\S]*?)(?=\n\nPREDICTIONS:|$)/);
      const predictionsMatch = predictionText.match(/PREDICTIONS:\s*\n([\s\S]*?)(?=\n\nBLACK SWAN FACTORS:|$)/);
      const blackSwanMatch = predictionText.match(/BLACK SWAN FACTORS:\s*\n([\s\S]*?)(?=\n\nGEOPOLITICAL CONTEXT:|$)/);
      const geopoliticalMatch = predictionText.match(/GEOPOLITICAL CONTEXT:\s*\n([\s\S]*?)$/);

      const summary = summaryMatch ? summaryMatch[1].trim() : 'Market analysis pending';
      const geopoliticalContext = geopoliticalMatch ? geopoliticalMatch[1].trim() : '';

      // Parse predictions (simplified - assumes consistent format)
      const predictions = focusAssets.map(asset => {
        const assetRegex = new RegExp(`${asset}[\\s\\S]*?Direction[:\\s]*(up|down|sideways)[\\s\\S]*?Confidence[:\\s]*(\\d+)%[\\s\\S]*?Reasoning[:\\s]*([^\\n]+)`, 'i');
        const match = predictionsMatch?.[1].match(assetRegex);

        if (match) {
          return {
            asset,
            direction: match[1] as 'up' | 'down' | 'sideways',
            confidence: parseInt(match[2]),
            reasoning: match[3].trim(),
          };
        }

        // Default prediction if parsing fails
        return {
          asset,
          direction: 'sideways' as const,
          confidence: 50,
          reasoning: 'Insufficient data for confident prediction',
        };
      });

      // Parse black swan factors
      const blackSwanFactors = blackSwanMatch?.[1]
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        || ['Unexpected geopolitical events', 'Financial system shocks', 'Natural disasters'];

      const prediction: MarketPrediction = {
        date: today,
        summary,
        predictions,
        blackSwanFactors,
        geopoliticalContext,
      };

      // Store prediction for future reference
      await storePrediction(prediction);

      console.log('✅ Market prediction generated and stored');

      return {
        success: true,
        date: today,
        timeframe,
        summary,
        predictions,
        blackSwanFactors,
        geopoliticalContext,
        fullAnalysis: predictionText,
        message: `Generated ${timeframe} market predictions based on realpolitik analysis. Predictions stored for future calibration.`,
      };
    } catch (error) {
      console.error('❌ Error generating market prediction:', error);
      return {
        success: false,
        error: 'exception',
        message: `Error generating market prediction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
