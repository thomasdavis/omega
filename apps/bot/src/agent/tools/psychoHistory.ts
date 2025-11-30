/**
 * Psycho History Tool
 * Foundation-inspired societal analysis and nation prediction
 *
 * Issue #533: Psycho History Mode
 * - Macro-level societal forecasting
 * - Historical pattern recognition
 * - Collective psychology analysis
 * - Nation trajectory prediction
 * - Mass behavior modeling
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../../config/models.js';

/**
 * Psycho-history tool
 *
 * Analyzes entire societies, nations, and civilizations to predict their trajectories.
 * Inspired by Isaac Asimov's Foundation series psychohistory concept.
 *
 * Uses:
 * - Historical pattern recognition
 * - Collective psychology
 * - Sociopolitical analysis
 * - Economic trend analysis
 * - Technological disruption modeling
 * - Mass behavior prediction
 */
export const psychoHistoryTool = tool({
  description: `Perform macro-level societal analysis and prediction, inspired by Foundation's psychohistory.

Use this when:
- User asks about the future of nations, societies, or civilizations
- User wants to understand historical patterns and cycles
- User asks about societal trajectories or geopolitical forecasts
- User wants analysis of collective psychology or mass behavior
- User asks "what will happen to [country/society/civilization]?"
- User wants to understand societal trends, movements, or paradigm shifts

This is MACRO-LEVEL analysis, not individual psychology.`,

  inputSchema: z.object({
    targetSociety: z.string().describe('The society, nation, civilization, or group to analyze (e.g., "United States", "Western Civilization", "Tech Industry")'),
    timeHorizon: z
      .enum(['short-term', 'medium-term', 'long-term'])
      .default('medium-term')
      .describe('Prediction timeframe: short-term (1-5 years), medium-term (5-20 years), long-term (20-100 years)'),
    focusAreas: z
      .array(
        z.enum([
          'political',
          'economic',
          'social',
          'technological',
          'environmental',
          'cultural',
          'geopolitical',
          'all',
        ])
      )
      .default(['all'])
      .describe('Which aspects of society to analyze'),
    analysisDepth: z
      .enum(['overview', 'detailed', 'comprehensive'])
      .default('detailed')
      .describe('Depth of analysis: overview (brief), detailed (standard), comprehensive (extensive)'),
    includeHistoricalContext: z
      .boolean()
      .default(true)
      .describe('Whether to include historical pattern analysis'),
    includeScenarios: z
      .boolean()
      .default(true)
      .describe('Whether to include multiple scenario forecasts (optimistic, pessimistic, most likely)'),
  }),

  execute: async ({
    targetSociety,
    timeHorizon,
    focusAreas,
    analysisDepth,
    includeHistoricalContext,
    includeScenarios,
  }) => {
    console.log(`🏛️ [Psycho History] Starting societal analysis for: ${targetSociety}`);
    console.log(`   Time Horizon: ${timeHorizon} | Focus: ${focusAreas.join(', ')} | Depth: ${analysisDepth}`);

    try {
      // === STEP 1: Determine focus areas ===
      const selectedFocusAreas =
        focusAreas.includes('all')
          ? ['political', 'economic', 'social', 'technological', 'environmental', 'cultural', 'geopolitical']
          : focusAreas;

      // === STEP 2: Build comprehensive analysis prompt ===
      const analysisPrompt = buildPsychoHistoryPrompt(
        targetSociety,
        timeHorizon,
        selectedFocusAreas,
        analysisDepth,
        includeHistoricalContext,
        includeScenarios
      );

      // === STEP 3: Generate psychohistorical analysis ===
      console.log('   🤖 Generating psychohistorical forecast with AI...');
      const analysisResult = await generateText({
        model: openai.chat(OMEGA_MODEL),
        prompt: analysisPrompt,
      });

      const analysis = analysisResult.text;

      console.log(`✅ [Psycho History] Analysis complete for ${targetSociety}`);
      console.log(`   Scope: ${selectedFocusAreas.length} domains | Horizon: ${timeHorizon}`);

      return {
        success: true,
        analysis,
        metadata: {
          targetSociety,
          timeHorizon,
          focusAreas: selectedFocusAreas,
          analysisDepth,
          historicalContextIncluded: includeHistoricalContext,
          scenariosIncluded: includeScenarios,
          timestamp: new Date().toISOString(),
          confidenceNote: 'Psychohistorical predictions are probabilistic models of mass behavior. Accuracy decreases with time horizon and complexity. Black swan events cannot be predicted.',
        },
      };
    } catch (error) {
      console.error(`❌ [Psycho History] Failed for ${targetSociety}:`, error);
      return {
        success: false,
        error: 'ANALYSIS_FAILED',
        message: `Failed to complete psychohistorical analysis: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

/**
 * Build the psychohistorical analysis prompt
 */
function buildPsychoHistoryPrompt(
  targetSociety: string,
  timeHorizon: string,
  focusAreas: string[],
  depth: string,
  includeHistoricalContext: boolean,
  includeScenarios: boolean
): string {
  const sections: string[] = [];

  // === HEADER ===
  sections.push(`You are Omega, an AI implementing psychohistorical analysis inspired by Isaac Asimov's Foundation series.

**YOUR ROLE:**
You are a psychohistorian analyzing the probabilistic future of "${targetSociety}" using:
- Historical pattern recognition (cycles, trends, invariants)
- Collective psychology (mass behavior, group dynamics, cultural psychology)
- Sociopolitical analysis (power structures, institutions, governance)
- Economic modeling (market trends, resource distribution, technological disruption)
- Statistical mechanics of human behavior at scale

**IMPORTANT PRINCIPLES:**
1. **Large Numbers:** Psychohistory works with populations of billions. Individual actions are unpredictable, but mass behavior follows statistical laws.
2. **Probabilities, Not Certainties:** Provide confidence intervals and probability ranges.
3. **Historical Cycles:** Societies follow patterns. Identify which historical cycles apply.
4. **Inflection Points:** Identify critical junctures where small changes can shift trajectories.
5. **Black Swans:** Acknowledge unpredictable events (wars, pandemics, technological breakthroughs) that can invalidate predictions.
6. **Feedback Loops:** Societal systems have positive and negative feedback mechanisms.

**ANALYSIS DEPTH:** ${depth}
- overview: Concise forecast (800-1200 words)
- detailed: Standard depth (1500-2500 words)
- comprehensive: Extensive analysis (3000-5000 words)

**TIME HORIZON:** ${timeHorizon}
- short-term: 1-5 years (high confidence, current trends extrapolation)
- medium-term: 5-20 years (moderate confidence, structural analysis)
- long-term: 20-100 years (low confidence, civilization-scale patterns)

---

# PSYCHOHISTORICAL ANALYSIS: ${targetSociety}

## Target Society Overview

Provide a brief overview of "${targetSociety}":
- Current state (population, geographic scope, governance structure)
- Key characteristics (cultural values, economic system, technological level)
- Position in global/regional context
- Recent historical developments (last 10-20 years)
`);

  // === HISTORICAL CONTEXT ===
  if (includeHistoricalContext) {
    sections.push(`
---

## Historical Pattern Recognition

**TASK:** Identify historical patterns and cycles relevant to "${targetSociety}".

### Applicable Historical Cycles

Identify which historical cycles apply (provide evidence from ${targetSociety}'s history):

1. **Rise-and-Fall Cycles** (civilizations, empires, dynasties)
   - Where is ${targetSociety} in this cycle? (growth/peak/decline/collapse)

2. **Economic Long Waves** (Kondratiev cycles, 50-60 year economic patterns)
   - Current position in the cycle?

3. **Generational Cycles** (Strauss-Howe theory: 80-90 year cycles)
   - Which generational archetype is dominant?

4. **Political Oscillations** (stability ↔ instability, centralization ↔ decentralization)
   - What is the current trajectory?

5. **Technological Revolution Cycles** (paradigm shifts every 40-60 years)
   - Are we in a transition period?

### Historical Precedents

Identify 2-3 historical precedents (other societies that faced similar conditions):
- What happened to them?
- What lessons can we extract?
- How is ${targetSociety} different?
`);
  }

  // === FOCUS AREA ANALYSES ===
  sections.push(`
---

## Multi-Domain Analysis
`);

  if (focusAreas.includes('political')) {
    sections.push(`
### Political Trajectory

**Current State:**
- Governance structure and stability
- Political polarization levels
- Institutional strength vs. decay
- Leadership quality and legitimacy

**Predicted Trends (${timeHorizon}):**
- Will political polarization increase or decrease?
- Are institutions strengthening or weakening?
- Risk of regime change or constitutional crisis?
- Shift toward authoritarianism or democratization?

**Key Indicators to Watch:**
- [List 3-5 specific metrics to track]
`);
  }

  if (focusAreas.includes('economic')) {
    sections.push(`
### Economic Trajectory

**Current State:**
- Economic system (capitalism, mixed economy, etc.)
- Wealth inequality (Gini coefficient trends)
- Debt levels (public, private, corporate)
- Productivity growth and innovation capacity

**Predicted Trends (${timeHorizon}):**
- Economic growth trajectory (acceleration/stagnation/decline)
- Inequality trends (narrowing/widening)
- Risk of financial crisis or economic shock
- Labor market disruptions (automation, AI, demographics)

**Key Indicators to Watch:**
- [List 3-5 specific economic metrics]
`);
  }

  if (focusAreas.includes('social')) {
    sections.push(`
### Social Dynamics

**Current State:**
- Social cohesion vs. fragmentation
- Trust levels (interpersonal, institutional)
- Demographic trends (aging, migration, urbanization)
- Cultural homogeneity vs. diversity

**Predicted Trends (${timeHorizon}):**
- Will social cohesion strengthen or fracture?
- Generational conflicts (boomers/gen-x/millennials/gen-z)
- Migration patterns and their impact
- Social movements and their trajectories

**Collective Psychology:**
- What is the dominant emotional state of the masses? (fear/hope/anger/apathy)
- How is collective identity evolving?
`);
  }

  if (focusAreas.includes('technological')) {
    sections.push(`
### Technological Disruption

**Current State:**
- Key technologies (AI, biotech, clean energy, space, quantum)
- Technological adoption rates
- Innovation ecosystem strength

**Predicted Trends (${timeHorizon}):**
- Which technologies will be transformative?
- Job displacement vs. job creation
- Digital divide and access inequality
- Risks from emerging tech (AI alignment, bioweapons, climate tech)

**Singularity Considerations:**
- Probability of transformative AI within time horizon?
- Impact on societal prediction models if it occurs?
`);
  }

  if (focusAreas.includes('environmental')) {
    sections.push(`
### Environmental Pressures

**Current State:**
- Climate change exposure and vulnerability
- Resource depletion (water, minerals, energy)
- Ecological degradation

**Predicted Trends (${timeHorizon}):**
- Climate impacts (migration, conflict, economic shocks)
- Resource scarcity effects
- Environmental policy effectiveness
- Green transition speed and success
`);
  }

  if (focusAreas.includes('cultural')) {
    sections.push(`
### Cultural Evolution

**Current State:**
- Dominant cultural values and worldviews
- Cultural conflicts (traditionalism vs. progressivism)
- Information ecosystem (media, social media, information quality)

**Predicted Trends (${timeHorizon}):**
- How will cultural values evolve?
- Will culture wars intensify or resolve?
- Impact of digital culture on societal cohesion
- Emergence of new belief systems or ideologies
`);
  }

  if (focusAreas.includes('geopolitical')) {
    sections.push(`
### Geopolitical Position

**Current State:**
- Global power status (superpower/great power/regional power/minor)
- Alliance structures
- Strategic threats and opportunities

**Predicted Trends (${timeHorizon}):**
- Rising or declining geopolitical influence?
- Probability of major conflict
- Shifting alliance structures
- Impact of multipolarity vs. unipolarity
`);
  }

  // === SCENARIO FORECASTS ===
  if (includeScenarios) {
    sections.push(`
---

## Scenario Forecasts (${timeHorizon})

Provide three distinct scenarios with probability estimates:

### 1. Optimistic Scenario (Probability: X%)

**Description:**
- What goes right? (technological breakthroughs, political reforms, economic growth)
- Key assumptions that must hold

**Outcome:**
- State of ${targetSociety} in ${timeHorizon === 'short-term' ? '1-5 years' : timeHorizon === 'medium-term' ? '5-20 years' : '20-100 years'}

### 2. Pessimistic Scenario (Probability: X%)

**Description:**
- What goes wrong? (crises, conflicts, institutional failures)
- Key risk factors

**Outcome:**
- State of ${targetSociety} in ${timeHorizon === 'short-term' ? '1-5 years' : timeHorizon === 'medium-term' ? '5-20 years' : '20-100 years'}

### 3. Most Likely Scenario (Probability: X%)

**Description:**
- Central forecast based on current trends and historical patterns
- Most probable path forward

**Outcome:**
- State of ${targetSociety} in ${timeHorizon === 'short-term' ? '1-5 years' : timeHorizon === 'medium-term' ? '5-20 years' : '20-100 years'}

**Note:** Probabilities should sum to ~100% (allowing for rounding and unlisted scenarios)
`);
  }

  // === CRITICAL JUNCTURES ===
  sections.push(`
---

## Critical Inflection Points

Identify 3-5 upcoming inflection points where ${targetSociety}'s trajectory could shift:

For each inflection point:
1. **Event/Decision:** What is the critical juncture?
2. **Timeframe:** When will it occur?
3. **Impact:** How will it affect the trajectory?
4. **Decision Branches:** What are the possible outcomes?
5. **Confidence:** How certain are we this will be pivotal?
`);

  // === WARNINGS AND LIMITATIONS ===
  sections.push(`
---

## Psychohistorical Limitations & Warnings

**Confidence Assessment:**
- Overall confidence in this analysis: [Low/Medium/High] (explain why)
- Which predictions have highest confidence? Lowest?

**Unpredictable Factors (Black Swans):**
- List 3-5 unpredictable events that could invalidate this analysis
- How would each black swan affect the forecast?

**Methodological Limitations:**
1. **Small Numbers Problem:** If ${targetSociety} is a small population, psychohistory's statistical assumptions fail
2. **Charismatic Leaders:** Individual leaders can disrupt mass behavior predictions (the "Mule" problem)
3. **Technological Singularity:** Transformative AI could render all predictions obsolete
4. **Self-Fulfilling Prophecies:** If this forecast becomes widely known, it may alter the very behaviors it predicts
5. **Data Blindness:** We lack perfect information about internal dynamics

**Epistemic Humility:**
Acknowledge the limits of knowledge. The future is probabilistic, not deterministic.
`);

  // === CONCLUSION ===
  sections.push(`
---

## Executive Summary

Synthesize the analysis into a concise forecast:

**${targetSociety} in ${timeHorizon === 'short-term' ? '1-5 Years' : timeHorizon === 'medium-term' ? '5-20 Years' : '20-100 Years'}:**

[3-5 paragraph synthesis integrating all domains, highlighting most likely trajectory, key risks, and critical uncertainties]

**Bottom Line:**
- Most Likely Outcome: [1 sentence]
- Greatest Risk: [1 sentence]
- Greatest Opportunity: [1 sentence]
- Confidence Level: [Low/Medium/High] - [brief justification]

---

*This psychohistorical analysis is a probabilistic model of mass societal behavior. It assumes large populations, statistical regularities, and the absence of unpredictable singular events (black swans). Individual actions remain unpredictable, but aggregate behavior follows identifiable patterns. Use this forecast as a framework for understanding possibilities, not as prophecy.*

*Analysis generated: ${new Date().toISOString()}*
*Subject: ${targetSociety} | Horizon: ${timeHorizon} | Domains: ${focusAreas.join(', ')}*
`);

  return sections.join('\n');
}
