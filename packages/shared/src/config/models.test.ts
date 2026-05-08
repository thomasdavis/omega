import { describe, it, expect } from 'vitest';
import { OMEGA_MODEL, OMEGA_MODEL_DISPLAY_NAME } from './models.js';

describe('models config', () => {
  describe('OMEGA_MODEL', () => {
    it('is a non-empty string', () => {
      expect(typeof OMEGA_MODEL).toBe('string');
      expect(OMEGA_MODEL.length).toBeGreaterThan(0);
    });

    it('contains a valid OpenAI model identifier', () => {
      expect(OMEGA_MODEL).toMatch(/^gpt-/);
    });
  });

  describe('OMEGA_MODEL_DISPLAY_NAME', () => {
    it('is a non-empty string', () => {
      expect(typeof OMEGA_MODEL_DISPLAY_NAME).toBe('string');
      expect(OMEGA_MODEL_DISPLAY_NAME.length).toBeGreaterThan(0);
    });

    it('contains a human-readable model name', () => {
      expect(OMEGA_MODEL_DISPLAY_NAME).toMatch(/GPT/i);
    });
  });
});
