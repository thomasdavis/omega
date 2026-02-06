/**
 * @tpmjs/tech-translate
 *
 * Translate technical requirements into actionable implementation specs
 *
 * @example
 * ```typescript
 * import { translateTech } from '@tpmjs/tech-translate';
 *
 * // Markdown output (default)
 * const spec = await translateTech('Add user authentication', {
 *   level: 'prod',
 *   include: ['db', 'security']
 * });
 * console.log(spec);
 *
 * // JSON output
 * const jsonSpec = await translateTech('Add user authentication', {
 *   format: 'json',
 *   level: 'mvp'
 * });
 * console.log(JSON.stringify(jsonSpec, null, 2));
 * ```
 */

export { translateTech } from './translator.js';
export * from './types.js';
