/**
 * OODA Loop Tool - Adaptive problem-solving and decision-making framework
 * Based on the OODA (Observe, Orient, Decide, Act) decision cycle by John Boyd
 * Reference: https://www.flexrule.com/articles/decision-cycle-ooda/
 */

import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const oodaTool = tool({
  description: 'Apply the OODA (Observe, Orient, Decide, Act) decision-making framework to analyze problems and provide structured solutions. This adaptive, iterative approach is ideal for complex or ambiguous situations requiring systematic thinking.',
  inputSchema: z.object({
    problem: z.string().describe('The problem, challenge, or decision that needs OODA analysis'),
    context: z.string().optional().describe('Additional context about the situation, constraints, or background information'),
    focusArea: z.enum(['observe', 'orient', 'decide', 'act', 'full']).default('full').describe('Which phase to focus on: observe (gather info), orient (analyze context), decide (evaluate options), act (action steps), or full (complete cycle)'),
  }),
  execute: async ({ problem, context, focusArea }) => {
    console.log(`🎯 OODA Loop analysis starting for: "${problem}"`);
    console.log(`   Focus area: ${focusArea}`);

    try {
      // Run the OODA cycle analysis
      const analysis = await runOODAAnalysis(problem, context, focusArea);

      return {
        success: true,
        problem,
        analysis,
        metadata: {
          focusArea,
          generatedAt: new Date().toISOString(),
          framework: 'OODA (Observe, Orient, Decide, Act)',
        },
      };
    } catch (error) {
      console.error(`❌ Error in OODA analysis:`, error);
      return {
        success: false,
        error: 'analysis_failed',
        message: `Failed to complete OODA analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        problem,
      };
    }
  },
});

/**
 * Run the OODA cycle analysis using GPT-4o
 */
async function runOODAAnalysis(
  problem: string,
  context: string | undefined,
  focusArea: string
): Promise<string> {
  const contextSection = context ? `\n\nAdditional Context:\n${context}` : '';

  const oodaPrompt = `You are an expert in applying the OODA (Observe, Orient, Decide, Act) decision-making framework developed by military strategist John Boyd. This framework is designed for adaptive, iterative problem-solving in complex and ambiguous situations.

Problem/Challenge:
${problem}${contextSection}

Focus Area: ${focusArea === 'full' ? 'Complete OODA Cycle' : `${focusArea.charAt(0).toUpperCase() + focusArea.slice(1)} Phase`}

${focusArea === 'full' ? `
Apply the complete OODA cycle to this problem:

## 1. OBSERVE (Gather Information)
- What are the key facts and data points?
- What information is available and what is missing?
- What are the observable patterns or trends?
- What signals or indicators should we pay attention to?

## 2. ORIENT (Analyze Context & Reframe Understanding)
- How should we interpret the observations?
- What mental models or frameworks apply here?
- What are our assumptions and biases?
- What is the broader context and how does it influence our understanding?
- What alternative perspectives exist?

## 3. DECIDE (Evaluate Options & Choose Path)
- What are the possible decisions or paths forward?
- What are the pros and cons of each option?
- What criteria should guide the decision?
- What is the recommended decision and why?
- What are the risks and uncertainties?

## 4. ACT (Outline Action Steps)
- What are the specific, actionable next steps?
- What is the sequence and timeline?
- Who or what resources are needed?
- How will we measure progress and success?
- How will we adapt based on feedback (iterate the OODA loop)?

Provide a comprehensive, structured analysis that helps the user think through this problem systematically. Be specific, actionable, and acknowledge uncertainties where they exist.
` : focusArea === 'observe' ? `
Focus on the OBSERVE phase:
- What are the key facts and data points about this problem?
- What information is currently available?
- What information is missing or needed?
- What are the observable patterns, trends, or signals?
- What should we be paying attention to?

Provide a thorough observation analysis that gathers and synthesizes relevant information.
` : focusArea === 'orient' ? `
Focus on the ORIENT phase:
- How should we interpret the available information?
- What mental models, frameworks, or analogies apply?
- What are the underlying assumptions and potential biases?
- What is the broader context (historical, cultural, technical, etc.)?
- What alternative perspectives or interpretations exist?
- How does our understanding need to be reframed?

Provide a deep analysis that helps reframe and contextualize the problem.
` : focusArea === 'decide' ? `
Focus on the DECIDE phase:
- What are the possible decisions or paths forward?
- What are the pros and cons of each option?
- What criteria should guide the decision (values, constraints, goals)?
- What is the recommended decision and why?
- What are the key risks, trade-offs, and uncertainties?
- What contingencies should be considered?

Provide a structured decision analysis with clear recommendations.
` : `
Focus on the ACT phase:
- What are the specific, actionable next steps?
- What is the recommended sequence and timeline?
- Who needs to be involved and what resources are needed?
- What are the deliverables or milestones?
- How will progress and success be measured?
- How will we gather feedback and adapt (iterate the OODA loop)?

Provide concrete, actionable steps with clear guidance on implementation.
`}

Format your response in clear markdown with appropriate headers and bullet points. Be practical, insightful, and help the user move forward with confidence.`;

  const result = await generateText({
    model: openai('gpt-4o'),
    prompt: oodaPrompt,
  });

  return result.text;
}
