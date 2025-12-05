import { describe, it, expect } from 'vitest';
import { runTechTranslate, inputSchema, outputSchema } from '../src/index.js';
import type { TechTranslateInput } from '../src/schema.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

describe('Tech Translate Library', () => {
  describe('runTechTranslate', () => {
    it('should process a simple request', async () => {
      const input: TechTranslateInput = {
        request: 'make a status page',
        audience: 'fullstack',
      };

      const output = await runTechTranslate(input);

      expect(output).toHaveProperty('title');
      expect(output).toHaveProperty('summary');
      expect(output).toHaveProperty('spec');
      expect(output.spec).toHaveProperty('goals');
      expect(output.spec).toHaveProperty('architecture');
      expect(output.spec).toHaveProperty('acceptanceCriteria');
    });

    it('should validate input against schema', async () => {
      const invalidInput = {
        // missing required 'request' field
        audience: 'fullstack',
      } as TechTranslateInput;

      await expect(runTechTranslate(invalidInput)).rejects.toThrow('Invalid input');
    });

    it('should apply defaults for optional fields', async () => {
      const input: TechTranslateInput = {
        request: 'create an API',
      };

      const output = await runTechTranslate(input);

      expect(output.spec.goals).toBeInstanceOf(Array);
      expect(output.spec.goals.length).toBeGreaterThan(0);
    });

    it('should handle assumptions and constraints', async () => {
      const input: TechTranslateInput = {
        request: 'build a dashboard',
        assumptions: ['Users are authenticated', 'Data is already available'],
        constraints: ['Must work on mobile', 'Low latency required'],
      };

      const output = await runTechTranslate(input);

      expect(output.notes).toBeDefined();
      expect(output.notes?.some((note) => note.includes('assumptions'))).toBe(true);
      expect(output.notes?.some((note) => note.includes('constraints'))).toBe(true);
    });

    it('should generate warnings for very brief requests', async () => {
      const input: TechTranslateInput = {
        request: 'API',
      };

      const output = await runTechTranslate(input);

      expect(output.warnings).toBeDefined();
      expect(output.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('Schema Validation', () => {
    it('should validate correct input schema', () => {
      const validate = ajv.compile(inputSchema);
      const validInput: TechTranslateInput = {
        request: 'test request',
        audience: 'backend',
        outputMode: 'json',
      };

      const isValid = validate(validInput);
      expect(isValid).toBe(true);
    });

    it('should reject invalid input schema', () => {
      const validate = ajv.compile(inputSchema);
      const invalidInput = {
        request: '',
        audience: 'invalid-audience',
      };

      const isValid = validate(invalidInput);
      expect(isValid).toBe(false);
    });

    it('should validate output schema', () => {
      const validate = ajv.compile(outputSchema);
      const validOutput = {
        title: 'Test Title',
        summary: 'Test Summary',
        spec: {
          goals: ['goal 1'],
          architecture: 'arch description',
          apiDesign: 'api description',
          dataModel: 'data model',
          devOps: 'devops description',
          testing: 'testing description',
          acceptanceCriteria: ['criterion 1'],
        },
      };

      const isValid = validate(validOutput);
      expect(isValid).toBe(true);
    });
  });
});
