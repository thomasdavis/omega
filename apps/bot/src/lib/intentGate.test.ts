/**
 * intentGate Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies before imports
vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn((opts: any) => opts),
  },
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: {
    chat: vi.fn((model: string) => `mock-model-${model}`),
  },
}));

vi.mock('../config/models.js', () => ({
  OMEGA_MODEL: 'gpt-5.4-mini',
}));

import { checkIntentGate } from './intentGate.js';
import { generateText } from 'ai';
import type { Message } from 'discord.js';

const mockGenerateText = vi.mocked(generateText);

function createMockMessage(content: string, overrides: Record<string, any> = {}): Message {
  return {
    content,
    author: {
      id: overrides.authorId ?? 'user-123',
      username: overrides.username ?? 'testuser',
    },
    channel: {
      isDMBased: vi.fn(() => false),
      name: 'omega',
    },
    client: {
      user: { id: 'bot-456' },
    },
    mentions: {
      users: { has: vi.fn(() => false) },
    },
    reference: null,
    fetchReference: vi.fn(),
  } as unknown as Message;
}

describe('checkIntentGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('FAST PATH 1: Explicit action keywords', () => {
    it('should pass for "please" keyword', async () => {
      const message = createMockMessage('please do this for me');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
      expect(result.confidence).toBe(100);
      expect(result.classification).toBe('interactive');
      expect(result.reason).toBe('Explicit action keywords detected');
    });

    it('should pass for "can you" keyword', async () => {
      const message = createMockMessage('can you explain this?');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
      expect(result.classification).toBe('interactive');
    });

    it('should pass for "help me" keyword', async () => {
      const message = createMockMessage('help me with this code');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
      expect(result.classification).toBe('interactive');
    });

    it('should pass for "create" keyword', async () => {
      const message = createMockMessage('create a new table');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
    });

    it('should pass for "fix" keyword', async () => {
      const message = createMockMessage('fix the broken tests');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
    });

    it('should pass for "@omega" mention', async () => {
      const message = createMockMessage('@omega do something');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
    });

    it('should pass for "also" continuation keyword', async () => {
      const message = createMockMessage('also add some logging');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
    });

    it('should not call AI for action keywords', async () => {
      const message = createMockMessage('please help');
      await checkIntentGate(message);

      expect(mockGenerateText).not.toHaveBeenCalled();
    });
  });

  describe('FAST PATH 2: Non-interactive acknowledgment patterns', () => {
    it('should block for "thanks"', async () => {
      const message = createMockMessage('thanks!');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(false);
      expect(result.confidence).toBe(95);
      expect(result.classification).toBe('non-interactive');
    });

    it('should block for "nice"', async () => {
      const message = createMockMessage('nice!');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(false);
      expect(result.classification).toBe('non-interactive');
    });

    it('should block for "lol"', async () => {
      const message = createMockMessage('lol');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(false);
      expect(result.classification).toBe('non-interactive');
    });

    it('should block for "ok"', async () => {
      const message = createMockMessage('ok');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(false);
    });

    it('should block for "looks good"', async () => {
      const message = createMockMessage('looks good.');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(false);
    });

    it('should not call AI for non-interactive patterns', async () => {
      const message = createMockMessage('thanks!');
      await checkIntentGate(message);

      expect(mockGenerateText).not.toHaveBeenCalled();
    });
  });

  describe('FAST PATH 3: Questions', () => {
    it('should pass for messages containing "?"', async () => {
      const message = createMockMessage('what time is it?');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
      expect(result.confidence).toBe(95);
      expect(result.classification).toBe('interactive');
      expect(result.reason).toBe('Question detected');
    });

    it('should not call AI for questions', async () => {
      const message = createMockMessage('is this right?');
      await checkIntentGate(message);

      expect(mockGenerateText).not.toHaveBeenCalled();
    });
  });

  describe('FAST PATH 4: Short messages without action keywords', () => {
    it('should block short acknowledgments (1-5 words, no action keywords)', async () => {
      const message = createMockMessage('sounds good to me');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(false);
      expect(result.confidence).toBe(80);
      expect(result.classification).toBe('non-interactive');
    });

    it('should pass for short command-like messages', async () => {
      const message = createMockMessage('yes');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
      expect(result.confidence).toBe(85);
      expect(result.classification).toBe('interactive');
      expect(result.reason).toBe('Short command detected');
    });

    it('should pass for "stop" command', async () => {
      const message = createMockMessage('stop');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
      expect(result.classification).toBe('interactive');
    });

    it('should pass for "continue" command', async () => {
      const message = createMockMessage('continue');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
    });

    it('should pass for "retry" command', async () => {
      const message = createMockMessage('retry');
      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
    });
  });

  describe('AI decision path', () => {
    it('should use AI for longer ambiguous messages', async () => {
      const message = createMockMessage('I think the output format is interesting but could be improved in several ways');
      mockGenerateText.mockResolvedValue({
        output: {
          classification: 'interactive',
          confidence: 75,
          reason: 'User suggesting improvements',
        },
      } as any);

      const result = await checkIntentGate(message);

      expect(mockGenerateText).toHaveBeenCalled();
      expect(result.shouldProceed).toBe(true);
      expect(result.reason).toBe('AI: User suggesting improvements');
    });

    it('should block when AI classifies as non-interactive', async () => {
      const message = createMockMessage('That was a really interesting response from the bot I must say');
      mockGenerateText.mockResolvedValue({
        output: {
          classification: 'non-interactive',
          confidence: 88,
          reason: 'User commenting on bot output',
        },
      } as any);

      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(false);
      expect(result.classification).toBe('non-interactive');
    });

    it('should pass when AI classifies as unclear', async () => {
      const message = createMockMessage('Hmm that is one way to look at it I suppose we could consider alternatives');
      mockGenerateText.mockResolvedValue({
        output: {
          classification: 'unclear',
          confidence: 55,
          reason: 'Ambiguous intent',
        },
      } as any);

      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
      expect(result.classification).toBe('unclear');
    });

    it('should pass message history and replied-to content to AI', async () => {
      const message = createMockMessage('I see what you did there with the refactoring approach you took');
      const history = [
        { username: 'omega', content: 'I refactored the code' },
        { username: 'testuser', content: 'show me the result' },
      ];
      const repliedToContent = 'Here is the refactored code...';

      mockGenerateText.mockResolvedValue({
        output: {
          classification: 'non-interactive',
          confidence: 80,
          reason: 'Observation without request',
        },
      } as any);

      await checkIntentGate(message, history, repliedToContent);

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('omega: I refactored the code');
      expect(callArgs.prompt).toContain('Here is the refactored code...');
    });
  });

  describe('Error handling', () => {
    it('should default to interactive (fail open) on AI error', async () => {
      const message = createMockMessage('Some longer message that bypasses fast paths and needs AI to classify');
      mockGenerateText.mockRejectedValue(new Error('API timeout'));

      const result = await checkIntentGate(message);

      expect(result.shouldProceed).toBe(true);
      expect(result.confidence).toBe(50);
      expect(result.classification).toBe('unclear');
      expect(result.reason).toBe('Error in analysis - defaulting to interactive');
    });
  });
});
