/**
 * shouldRespond Tests
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

vi.mock('./systemPrompt.js', () => ({
  buildSystemPrompt: vi.fn(() => 'mock system prompt'),
}));

vi.mock('../config/models.js', () => ({
  OMEGA_MODEL: 'gpt-4.1-mini',
}));

import { shouldRespond, shouldMinimallyAcknowledge, getMinimalAcknowledgment } from './shouldRespond.js';
import { generateText } from 'ai';
import type { Message } from 'discord.js';

const mockGenerateText = vi.mocked(generateText);

/**
 * Helper to create a mock Discord message
 */
function createMockMessage(overrides: Record<string, any> = {}): Message {
  return {
    content: overrides.content ?? 'hello there',
    author: {
      id: overrides.authorId ?? 'user-123',
      username: overrides.username ?? 'testuser',
      bot: overrides.bot ?? false,
    },
    channel: {
      isDMBased: vi.fn(() => overrides.isDM ?? false),
      name: overrides.channelName ?? 'omega',
    },
    client: {
      user: {
        id: overrides.botId ?? 'bot-456',
      },
    },
    mentions: {
      users: {
        has: vi.fn((id: string) => overrides.mentionsBot ?? false),
      },
    },
    reference: overrides.reference ?? null,
    fetchReference: overrides.fetchReference ?? vi.fn(),
  } as unknown as Message;
}

describe('shouldRespond', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('DM messages', () => {
    it('should always respond to DMs', async () => {
      const message = createMockMessage({ isDM: true });
      const result = await shouldRespond(message);

      expect(result.shouldRespond).toBe(true);
      expect(result.confidence).toBe(100);
      expect(result.reason).toBe('Direct message');
    });

    it('should not call AI for DM messages', async () => {
      const message = createMockMessage({ isDM: true });
      await shouldRespond(message);

      expect(mockGenerateText).not.toHaveBeenCalled();
    });
  });

  describe('Direct mentions', () => {
    it('should always respond when bot is mentioned', async () => {
      const message = createMockMessage({ mentionsBot: true });
      const result = await shouldRespond(message);

      expect(result.shouldRespond).toBe(true);
      expect(result.confidence).toBe(100);
      expect(result.reason).toBe('Direct mention');
    });

    it('should not call AI for direct mentions', async () => {
      const message = createMockMessage({ mentionsBot: true });
      await shouldRespond(message);

      expect(mockGenerateText).not.toHaveBeenCalled();
    });
  });

  describe('Wrong channel', () => {
    it('should not respond in non-omega channels when not mentioned', async () => {
      const message = createMockMessage({ channelName: 'general' });
      const result = await shouldRespond(message);

      expect(result.shouldRespond).toBe(false);
      expect(result.confidence).toBe(100);
      expect(result.reason).toContain('Wrong channel');
      expect(result.reason).toContain('#general');
    });

    it('should not call AI for wrong channel', async () => {
      const message = createMockMessage({ channelName: 'random' });
      await shouldRespond(message);

      expect(mockGenerateText).not.toHaveBeenCalled();
    });
  });

  describe('Reply to bot message', () => {
    it('should respond when user replies to the bot', async () => {
      const fetchReference = vi.fn().mockResolvedValue({
        author: { id: 'bot-456' },
      });
      const message = createMockMessage({
        reference: { messageId: 'ref-123' },
        fetchReference,
      });

      const result = await shouldRespond(message);

      expect(result.shouldRespond).toBe(true);
      expect(result.confidence).toBe(100);
      expect(result.reason).toBe('Reply to my message');
    });

    it('should continue to AI analysis when reply is to another user', async () => {
      const fetchReference = vi.fn().mockResolvedValue({
        author: { id: 'other-user-789' },
      });
      const message = createMockMessage({
        reference: { messageId: 'ref-123' },
        fetchReference,
      });

      mockGenerateText.mockResolvedValue({
        output: { decision: 'no', confidence: 80, reason: 'Not addressed to bot' },
      } as any);

      const result = await shouldRespond(message);

      // Falls through to AI decision
      expect(mockGenerateText).toHaveBeenCalled();
    });

    it('should gracefully handle failed reference fetch', async () => {
      const fetchReference = vi.fn().mockRejectedValue(new Error('Not found'));
      const message = createMockMessage({
        reference: { messageId: 'ref-123' },
        fetchReference,
      });

      mockGenerateText.mockResolvedValue({
        output: { decision: 'no', confidence: 70, reason: 'Not relevant' },
      } as any);

      // Should not throw; should fall through to AI
      const result = await shouldRespond(message);
      expect(mockGenerateText).toHaveBeenCalled();
    });
  });

  describe('Error/deployment failure detection', () => {
    it('should respond to deployment failure messages', async () => {
      const message = createMockMessage({ content: 'Deployment failed on Railway!' });
      const result = await shouldRespond(message);

      expect(result.shouldRespond).toBe(true);
      expect(result.confidence).toBe(95);
      expect(result.reason).toContain('Error or deployment failure detected');
    });

    it('should respond to runtime error messages', async () => {
      const message = createMockMessage({ content: 'fatal error: out of memory' });
      const result = await shouldRespond(message);

      expect(result.shouldRespond).toBe(true);
      expect(result.confidence).toBe(95);
    });

    it('should respond to stack traces', async () => {
      const message = createMockMessage({
        content: 'TypeError: Cannot read properties\n    at Object.<anonymous> (index.ts:42:10)',
      });
      const result = await shouldRespond(message);

      expect(result.shouldRespond).toBe(true);
      expect(result.confidence).toBe(95);
    });

    it('should respond to HTTP error codes', async () => {
      const message = createMockMessage({ content: 'Getting 503 error on the API' });
      const result = await shouldRespond(message);

      expect(result.shouldRespond).toBe(true);
      expect(result.confidence).toBe(95);
    });

    it('should respond to error formatting patterns', async () => {
      const message = createMockMessage({ content: 'error: ECONNREFUSED 127.0.0.1:5432' });
      const result = await shouldRespond(message);

      expect(result.shouldRespond).toBe(true);
    });
  });

  describe('AI decision path', () => {
    it('should respond when AI decides yes', async () => {
      const message = createMockMessage({ content: 'Can someone help with TypeScript?' });
      mockGenerateText.mockResolvedValue({
        output: { decision: 'yes', confidence: 85, reason: 'User seeking help' },
      } as any);

      const result = await shouldRespond(message);

      expect(result.shouldRespond).toBe(true);
      expect(result.confidence).toBe(85);
      expect(result.reason).toBe('AI: User seeking help');
    });

    it('should not respond when AI decides no', async () => {
      const message = createMockMessage({ content: 'lol nice meme' });
      mockGenerateText.mockResolvedValue({
        output: { decision: 'no', confidence: 90, reason: 'Casual banter between users' },
      } as any);

      const result = await shouldRespond(message);

      expect(result.shouldRespond).toBe(false);
      expect(result.confidence).toBe(90);
      expect(result.reason).toBe('AI: Casual banter between users');
    });

    it('should pass message history to AI', async () => {
      const message = createMockMessage({ content: 'What do you think?' });
      const history = [
        { username: 'alice', content: 'Anyone tried the new API?', timestamp: 1 },
        { username: 'bob', content: 'Yeah it works great', timestamp: 2 },
      ];

      mockGenerateText.mockResolvedValue({
        output: { decision: 'no', confidence: 75, reason: 'Discussion between users' },
      } as any);

      await shouldRespond(message, history);

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('alice: Anyone tried the new API?');
      expect(callArgs.prompt).toContain('bob: Yeah it works great');
    });

    it('should include context flags for indirect addressing', async () => {
      const message = createMockMessage({ content: 'Can someone help me?' });
      mockGenerateText.mockResolvedValue({
        output: { decision: 'yes', confidence: 80, reason: 'Indirect help request' },
      } as any);

      await shouldRespond(message);

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('indirect addressing pattern');
    });

    it('should include context flags for casual suggestions', async () => {
      const message = createMockMessage({ content: 'Would be nice if the bot could do that' });
      mockGenerateText.mockResolvedValue({
        output: { decision: 'yes', confidence: 70, reason: 'Feature suggestion' },
      } as any);

      await shouldRespond(message);

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('casual feature suggestion');
    });
  });

  describe('Error handling', () => {
    it('should throw when AI decision fails', async () => {
      const message = createMockMessage({ content: 'test message' });
      mockGenerateText.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(shouldRespond(message)).rejects.toThrow('Failed to make response decision');
      await expect(shouldRespond(message)).rejects.toThrow('API rate limit exceeded');
    });

    it('should throw with generic message for non-Error objects', async () => {
      const message = createMockMessage({ content: 'test message' });
      mockGenerateText.mockRejectedValue('some string error');

      await expect(shouldRespond(message)).rejects.toThrow('Unknown error');
    });
  });
});

describe('shouldMinimallyAcknowledge', () => {
  it('should return true for empty message after removing mentions', () => {
    const message = createMockMessage({ content: '<@!123456789>' });
    expect(shouldMinimallyAcknowledge(message)).toBe(true);
  });

  it('should return true for just omega mention', () => {
    const message = createMockMessage({ content: 'omega' });
    expect(shouldMinimallyAcknowledge(message)).toBe(true);
  });

  it('should return true for simple thanks', () => {
    const message = createMockMessage({ content: '<@!123456789> thanks!' });
    expect(shouldMinimallyAcknowledge(message)).toBe(true);
  });

  it('should return true for simple greeting', () => {
    const message = createMockMessage({ content: 'hi' });
    expect(shouldMinimallyAcknowledge(message)).toBe(true);
  });

  it('should return true for short acknowledgments', () => {
    const message = createMockMessage({ content: 'ok' });
    expect(shouldMinimallyAcknowledge(message)).toBe(true);
  });

  it('should return true for very short messages (1-3 chars)', () => {
    const message = createMockMessage({ content: 'yo' });
    expect(shouldMinimallyAcknowledge(message)).toBe(true);
  });

  it('should return false for feature request keywords', () => {
    const message = createMockMessage({ content: '<@!123> can you help me with this?' });
    expect(shouldMinimallyAcknowledge(message)).toBe(false);
  });

  it('should return false for questions', () => {
    const message = createMockMessage({ content: '<@!123> how does this work?' });
    expect(shouldMinimallyAcknowledge(message)).toBe(false);
  });

  it('should return false for bug reports', () => {
    const message = createMockMessage({ content: '<@!123> there is a bug in the system' });
    expect(shouldMinimallyAcknowledge(message)).toBe(false);
  });

  it('should return false for feature suggestions', () => {
    const message = createMockMessage({ content: '<@!123> add a new feature please' });
    expect(shouldMinimallyAcknowledge(message)).toBe(false);
  });

  it('should return false for substantive messages', () => {
    const message = createMockMessage({ content: 'I was thinking about the architecture' });
    expect(shouldMinimallyAcknowledge(message)).toBe(false);
  });
});

describe('getMinimalAcknowledgment', () => {
  beforeEach(() => {
    // Seed Math.random for deterministic tests
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  it('should return a gratitude response for thanks', () => {
    const message = createMockMessage({ content: 'thanks' });
    const result = getMinimalAcknowledgment(message);
    expect(['👍', '✨', '🙏', 'np!', 'anytime!']).toContain(result);
  });

  it('should return a greeting response for hello', () => {
    const message = createMockMessage({ content: 'hello' });
    const result = getMinimalAcknowledgment(message);
    expect(['👋', '🙂', 'hey!', 'hi!']).toContain(result);
  });

  it('should return a farewell response for bye', () => {
    const message = createMockMessage({ content: 'goodbye' });
    const result = getMinimalAcknowledgment(message);
    expect(['👋', '✌️', 'bye!', 'cya!']).toContain(result);
  });

  it('should return an affirmative response for ok', () => {
    const message = createMockMessage({ content: 'ok' });
    const result = getMinimalAcknowledgment(message);
    expect(['👍', '✅', '🙂', 'cool!']).toContain(result);
  });

  it('should return a negative response for nah', () => {
    const message = createMockMessage({ content: 'nah' });
    const result = getMinimalAcknowledgment(message);
    expect(['👌', '🙂', 'alright']).toContain(result);
  });

  it('should return a humor response for lol', () => {
    const message = createMockMessage({ content: 'lmao' });
    const result = getMinimalAcknowledgment(message);
    expect(['😄', '😂', '🙃', 'lol']).toContain(result);
  });

  it('should return a default response for unknown content', () => {
    const message = createMockMessage({ content: 'xyz' });
    const result = getMinimalAcknowledgment(message);
    expect(['👍', '✨', '🙂']).toContain(result);
  });
});
