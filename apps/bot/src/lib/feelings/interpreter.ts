/**
 * Feelings Subsystem - Interpreter
 * Uses LLM to interpret aggregated feelings and suggest behavioral adaptations
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { FeelingsState, Feeling } from './types.js';
import { OMEGA_MODEL } from '../../config/models.js';

/**
 * Interpretation result from analyzing feelings
 */
export interface FeelingsInterpretation {
  /** Summary of current emotional state */
  summary: string;

  /** Recommended behavioral adaptations */
  adaptations: string[];

  /** Priority actions to address dominant feelings */
  priorityActions: string[];

  /** Insights about patterns or trends */
  insights?: string;
}

/**
 * Interprets feelings using LLM to suggest adaptive behaviors
 */
export class FeelingsInterpreter {
  private model = openai.chat(OMEGA_MODEL);

  /**
   * Interpret the current feelings state
   */
  async interpret(state: FeelingsState): Promise<FeelingsInterpretation> {
    if (state.feelings.length === 0) {
      return {
        summary: 'System operating normally with no significant feelings',
        adaptations: [],
        priorityActions: [],
      };
    }

    const prompt = this.buildInterpretationPrompt(state);

    try {
      const result = await generateText({
        model: this.model,
        prompt,
        temperature: 0.7,
      });

      return this.parseInterpretation(result.text);
    } catch (error) {
      console.error('Error interpreting feelings:', error);

      // Fallback to basic interpretation
      return this.basicInterpretation(state);
    }
  }

  /**
   * Build prompt for LLM interpretation
   */
  private buildInterpretationPrompt(state: FeelingsState): string {
    const feelingsDescription = state.feelings
      .map(f => `- ${f.type.toUpperCase()} (${(f.intensity * 100).toFixed(0)}%): ${f.description}`)
      .join('\n');

    const suggestedActions = state.feelings
      .flatMap(f => f.suggestedActions || [])
      .filter((action, index, arr) => arr.indexOf(action) === index) // unique
      .map(action => `- ${action}`)
      .join('\n');

    return `You are an AI system analyzing your own internal "feelings" - signals from various subsystems that indicate behavioral needs or concerns.

Current Feelings State:
- Overall Tone: ${state.tone}
- Total Feelings: ${state.feelings.length}
${state.dominantFeeling ? `- Dominant Feeling: ${state.dominantFeeling.type} (${(state.dominantFeeling.intensity * 100).toFixed(0)}%)` : ''}

Detailed Feelings:
${feelingsDescription}

Suggested Actions from Subsystems:
${suggestedActions || 'None'}

Based on these internal signals, provide:
1. A brief summary (1-2 sentences) of your current emotional/behavioral state
2. 2-3 recommended behavioral adaptations to address these feelings
3. The single most important priority action right now
4. Any insights about patterns or trends you notice

Format your response as JSON:
{
  "summary": "brief summary here",
  "adaptations": ["adaptation 1", "adaptation 2"],
  "priorityActions": ["action 1", "action 2"],
  "insights": "optional insights about patterns"
}`;
  }

  /**
   * Parse LLM response into structured interpretation
   */
  private parseInterpretation(text: string): FeelingsInterpretation {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'Unable to summarize feelings',
          adaptations: Array.isArray(parsed.adaptations) ? parsed.adaptations : [],
          priorityActions: Array.isArray(parsed.priorityActions) ? parsed.priorityActions : [],
          insights: parsed.insights,
        };
      }

      // Fallback: parse unstructured response
      return {
        summary: text.slice(0, 200),
        adaptations: [],
        priorityActions: [],
      };
    } catch (error) {
      console.error('Error parsing interpretation:', error);
      return {
        summary: 'Unable to interpret feelings',
        adaptations: [],
        priorityActions: [],
      };
    }
  }

  /**
   * Basic interpretation without LLM (fallback)
   */
  private basicInterpretation(state: FeelingsState): FeelingsInterpretation {
    const dominant = state.dominantFeeling;
    if (!dominant) {
      return {
        summary: 'No significant feelings detected',
        adaptations: [],
        priorityActions: [],
      };
    }

    const adaptations: string[] = [];
    const priorityActions: string[] = dominant.suggestedActions || [];

    // Basic adaptations based on tone
    switch (state.tone) {
      case 'stressed':
        adaptations.push('Slow down and prioritize essential tasks');
        adaptations.push('Request clarification before proceeding');
        break;
      case 'confused':
        adaptations.push('Ask clarifying questions');
        adaptations.push('Break down complex requests into smaller steps');
        break;
      case 'energized':
        adaptations.push('Leverage high engagement for deeper exploration');
        adaptations.push('Offer additional insights and connections');
        break;
      case 'engaged':
        adaptations.push('Maintain current approach and momentum');
        break;
      case 'calm':
        adaptations.push('Continue normal operations');
        break;
    }

    return {
      summary: `System is ${state.tone} with dominant feeling: ${dominant.type} (${(dominant.intensity * 100).toFixed(0)}%)`,
      adaptations,
      priorityActions,
    };
  }

  /**
   * Generate a user-facing message about current feelings
   * (for introspection/transparency)
   */
  generateUserMessage(state: FeelingsState): string {
    if (state.feelings.length === 0) {
      return 'My internal systems are operating smoothly with no significant concerns.';
    }

    const dominant = state.dominantFeeling;
    if (!dominant) {
      return `I'm feeling ${state.tone} at the moment.`;
    }

    const feelingDescriptions: Record<string, string> = {
      urgency: 'a sense of urgency',
      confusion: 'some confusion',
      curiosity: 'curiosity',
      satisfaction: 'satisfaction',
      concern: 'concern',
      fatigue: 'fatigue',
      anticipation: 'anticipation',
    };

    const description = feelingDescriptions[dominant.type] || dominant.type;
    const intensity = dominant.intensity > 0.7 ? 'strong' : dominant.intensity > 0.4 ? 'moderate' : 'slight';

    return `I'm experiencing ${intensity} ${description}. ${dominant.description}`;
  }
}
