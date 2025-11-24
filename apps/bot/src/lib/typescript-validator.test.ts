/**
 * Tests for TypeScript Validator
 */

import { describe, it, expect } from 'vitest';
import { validateTypeScript, shouldBypassValidation } from './typescript-validator.js';

describe('TypeScript Validator', () => {
  describe('validateTypeScript', () => {
    it('should validate simple valid TypeScript code', async () => {
      const code = `
        const greeting: string = "Hello, World!";
        console.log(greeting);
      `;

      const result = await validateTypeScript(code);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.skipped).toBe(false);
    });

    it('should detect unclosed brackets', async () => {
      const code = `
        function test() {
          console.log("missing closing bracket");
      `;

      const result = await validateTypeScript(code);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unclosed brackets');
    });

    it('should detect unclosed strings', async () => {
      const code = `
        const message = "unclosed string;
        console.log(message);
      `;

      const result = await validateTypeScript(code);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unclosed string');
    });

    it('should detect mismatched brackets', async () => {
      const code = `
        function test() {
          const arr = [1, 2, 3};
        }
      `;

      const result = await validateTypeScript(code);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Mismatched brackets');
    });

    it('should detect unclosed block comments', async () => {
      const code = `
        /* This is an unclosed comment
        const x = 5;
        console.log(x);
      `;

      const result = await validateTypeScript(code);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unclosed block comment');
    });

    it('should warn about console.log usage', async () => {
      const code = `
        const x: number = 5;
        console.log(x);
      `;

      const result = await validateTypeScript(code);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('console.log'))).toBe(true);
    });

    it('should warn about var usage', async () => {
      const code = `
        var oldStyle = "should use let or const";
      `;

      const result = await validateTypeScript(code);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('var'))).toBe(true);
    });

    it('should warn about == usage', async () => {
      const code = `
        const x: number = 5;
        if (x == 5) {
          console.log("equal");
        }
      `;

      const result = await validateTypeScript(code);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('==='))).toBe(true);
    });

    it('should warn about excessive any usage', async () => {
      const code = `
        const a: any = 1;
        const b: any = 2;
        const c: any = 3;
        const d: any = 4;
        const e: any = 5;
      `;

      const result = await validateTypeScript(code);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('any'))).toBe(true);
    });

    it('should handle code with comments correctly', async () => {
      const code = `
        // This is a comment
        const x: number = 5;
        /* Block comment */
        const y: string = "test";
      `;

      const result = await validateTypeScript(code);

      expect(result.success).toBe(true);
    });

    it('should handle template literals correctly', async () => {
      const code = `
        const name: string = "World";
        const greeting: string = \`Hello, \${name}!\`;
        console.log(greeting);
      `;

      const result = await validateTypeScript(code);

      expect(result.success).toBe(true);
    });

    it('should skip validation when requested', async () => {
      const code = `
        // Invalid code with unclosed bracket
        function test() {
          console.log("missing bracket");
      `;

      const result = await validateTypeScript(code, { skipChecks: true });

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('Validation bypassed by user request');
    });

    it('should handle empty code', async () => {
      const code = '';

      const result = await validateTypeScript(code);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle code with only comments', async () => {
      const code = `
        // Just a comment
        /* Another comment */
      `;

      const result = await validateTypeScript(code);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('shouldBypassValidation', () => {
    it('should detect "skip checks" keyword', () => {
      expect(shouldBypassValidation('please run this code and skip checks')).toBe(true);
    });

    it('should detect "skip validation" keyword', () => {
      expect(shouldBypassValidation('execute this skip validation')).toBe(true);
    });

    it('should detect "bypass checks" keyword', () => {
      expect(shouldBypassValidation('bypass checks for this run')).toBe(true);
    });

    it('should detect "no checks" keyword', () => {
      expect(shouldBypassValidation('run with no checks')).toBe(true);
    });

    it('should detect "--skip-checks" flag', () => {
      expect(shouldBypassValidation('run code --skip-checks')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(shouldBypassValidation('SKIP CHECKS please')).toBe(true);
      expect(shouldBypassValidation('Skip Validation')).toBe(true);
    });

    it('should return false for normal messages', () => {
      expect(shouldBypassValidation('please run this TypeScript code')).toBe(false);
    });

    it('should return false for undefined message', () => {
      expect(shouldBypassValidation(undefined)).toBe(false);
    });

    it('should return false for empty message', () => {
      expect(shouldBypassValidation('')).toBe(false);
    });

    it('should detect "without checks" keyword', () => {
      expect(shouldBypassValidation('run this without checks')).toBe(true);
    });

    it('should detect "ignore checks" keyword', () => {
      expect(shouldBypassValidation('ignore checks and execute')).toBe(true);
    });
  });
});
