import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from './prompts.js';
import type { TemplateContext } from '../types/index.js';

describe('Prompt Templates', () => {
  const baseContext: TemplateContext = {
    userRequest: 'Build a user authentication system',
    style: 'enterprise',
    depth: 'medium',
    format: 'both',
    includeAssumptions: true,
    includeRisks: true,
    includeMilestones: true,
  };

  it('should build system prompt with style guidance', () => {
    const prompt = buildSystemPrompt(baseContext);

    expect(prompt).toContain('Enterprise style');
    expect(prompt).toContain('Medium depth');
    expect(prompt).toContain('Summary');
    expect(prompt).toContain('Requirements');
  });

  it('should include domain guidance when specified', () => {
    const contextWithDomain: TemplateContext = {
      ...baseContext,
      domain: 'api',
    };

    const prompt = buildSystemPrompt(contextWithDomain);

    expect(prompt).toContain('API Development Domain');
    expect(prompt).toContain('RESTful');
  });

  it('should respect optional sections', () => {
    const minimalContext: TemplateContext = {
      ...baseContext,
      includeAssumptions: false,
      includeRisks: false,
      includeMilestones: false,
    };

    const prompt = buildSystemPrompt(minimalContext);

    expect(prompt).toContain('Assumptions section is optional');
    expect(prompt).toContain('Risk analysis is optional');
    expect(prompt).toContain('Milestones section is optional');
  });

  it('should build user prompt with request', () => {
    const prompt = buildUserPrompt(baseContext);

    expect(prompt).toContain('Build a user authentication system');
    expect(prompt).toContain('Convert the following user request');
  });

  it('should include context when provided', () => {
    const contextWithExtra: TemplateContext = {
      ...baseContext,
      context: 'For a mobile app with OAuth support',
    };

    const prompt = buildUserPrompt(contextWithExtra);

    expect(prompt).toContain('For a mobile app with OAuth support');
    expect(prompt).toContain('Additional Context');
  });

  it('should specify correct output format', () => {
    const mdContext: TemplateContext = { ...baseContext, format: 'md' };
    const jsonContext: TemplateContext = { ...baseContext, format: 'json' };
    const bothContext: TemplateContext = { ...baseContext, format: 'both' };

    expect(buildUserPrompt(mdContext)).toContain('Markdown document');
    expect(buildUserPrompt(jsonContext)).toContain('JSON object');
    expect(buildUserPrompt(bothContext)).toContain('both formats');
  });
});
