import type { TechTranslateOutput } from '../schema.js';

/**
 * Renders TechTranslateOutput as formatted JSON
 */
export function renderJson(output: TechTranslateOutput, pretty = true): string {
  return JSON.stringify(output, null, pretty ? 2 : 0);
}
