/**
 * Centralized Model Configuration
 * Single source of truth for AI model settings across the entire application
 */

/**
 * Primary AI model used across all Omega operations
 * - Main agent reasoning and response generation
 * - Decision making (shouldRespond)
 * - Tool executions requiring AI (generateHtmlPage, etc.)
 *
 * Change this value to switch models globally:
 * - 'gpt-4o-mini' - Fast, cost-effective (recommended)
 * - 'gpt-4o' - More capable, higher cost
 * - 'gpt-4-turbo' - Previous generation
 */
export const OMEGA_MODEL = 'gpt-4o-mini';

/**
 * Model name for logging and display purposes
 */
export const OMEGA_MODEL_DISPLAY_NAME = 'GPT-4o Mini';
