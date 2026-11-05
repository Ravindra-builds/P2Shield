import { describe, expect, it } from 'vitest';
import { ChatGptProvider, isChatGptHost } from '../src/content/providers/chatgpt';
import { restore } from '../src/core/vault';

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

describe('ChatGPT Reverse Map Builder', () => {
  it('correctly maps original private data back to surrogates', () => {
    const provider = new ChatGptProvider();
    const tokenMap = {
      'Arjun Patel': 'Rahul Sharma',
      'arjun.patel@gmail.com': 'rahul.sharma@example.com',
      '+91 91234 56789': '+91 98765 43210',
    };

    const reverseMap = provider.buildReverseMap(tokenMap);

    expect(reverseMap['Rahul Sharma']).toBe('Arjun Patel');
    expect(reverseMap['rahul.sharma@example.com']).toBe('arjun.patel@gmail.com');
    expect(reverseMap['+91 98765 43210']).toBe('+91 91234 56789');
  });

  it('handles empty or identity mappings gracefully', () => {
    const provider = new ChatGptProvider();
    expect(provider.buildReverseMap({})).toEqual({});
    expect(provider.buildReverseMap({ identical: 'identical' })).toEqual({});
  });

  it('verifies two-way text swapping with restore and reverseMap', () => {
    const provider = new ChatGptProvider();

    const forwardMap = {
      'Arjun Patel': 'Ravindra',
      'arjun.patel@gmail.com': 'ravindra@gmail.com',
    };
    const reverseMap = provider.buildReverseMap(forwardMap);

    const safeText = 'Hello Arjun Patel at arjun.patel@gmail.com';
    const originalText = 'Hello Ravindra at ravindra@gmail.com';

    // Safe -> Original using forwardMap
    expect(restore(safeText, forwardMap)).toBe(originalText);

    // Original -> Safe using reverseMap
    expect(restore(originalText, reverseMap)).toBe(safeText);
  });
});
