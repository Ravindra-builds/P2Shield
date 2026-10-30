import { describe, expect, it } from 'vitest';
import { isChatGptHost } from '../src/content/providers/chatgpt';

describe('ChatGPT Provider Host Detection', () => {
  it('correctly matches ChatGPT hosts', () => {
    expect(isChatGptHost('chatgpt.com')).toBe(true);
    expect(isChatGptHost('sub.chatgpt.com')).toBe(true);
    expect(isChatGptHost('chat.openai.com')).toBe(true);
    expect(isChatGptHost('auth.openai.com')).toBe(true);
  });

  it('rejects other AI provider hosts', () => {
    expect(isChatGptHost('gemini.google.com')).toBe(false);
    expect(isChatGptHost('grok.com')).toBe(false);
    expect(isChatGptHost('claude.ai')).toBe(false);
    expect(isChatGptHost('perplexity.ai')).toBe(false);
    expect(isChatGptHost('copilot.microsoft.com')).toBe(false);
    expect(isChatGptHost('')).toBe(false);
  });
});
