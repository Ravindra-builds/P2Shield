// Helpers for Chrome's Prompt API, shared by the offscreen document and the options page.

import type { SmartState } from './settings';

type LM = {
  availability(o?: unknown): Promise<string>;
  create(o?: unknown): Promise<{ destroy(): void }>;
};

function lm(): LM | undefined {
  return (globalThis as unknown as { LanguageModel?: LM }).LanguageModel;
}

export function modelOptions() {
  return {
    expectedInputs: [{ type: 'text', languages: ['en'] }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
  };
}

export async function getAvailability(): Promise<SmartState> {
  const api = lm();
  if (!api) return 'unsupported';
  try {
    const s = await api.availability(modelOptions());
    if (s === 'available' || s === 'downloadable' || s === 'downloading' || s === 'unavailable') return s;
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

interface PromptSession {
  prompt(input: string, options?: Record<string, unknown>): Promise<string>;
  clone(): Promise<PromptSession>;
  destroy(): void;
}

/**
 * Returns a function that asks the on-device model for structured JSON. A base session holding the
 * system prompt is cached and cloned per request so each call starts from a clean context.
 */
export function createModelRunner(schema: object): (system: string, user: string) => Promise<string> {
  let base: { system: string; session: PromptSession } | null = null;
  return async (system, user) => {
    const api = (globalThis as unknown as { LanguageModel?: { create(o: unknown): Promise<PromptSession> } })
      .LanguageModel;
    if (!api) throw new Error('LanguageModel API not present');
    if (!base || base.system !== system) {
      base?.session.destroy();
      const session = await api.create({
        ...modelOptions(),
        initialPrompts: [{ role: 'system', content: system }],
      });
      base = { system, session };
    }
    const run = await base.session.clone();
    try {
      return await run.prompt(user, { responseConstraint: schema });
    } finally {
      run.destroy();
    }
  };
}

/** Must be called from a user gesture (a click). Downloads the model if needed. */
export async function downloadModel(onProgress: (pct: number) => void): Promise<void> {
  const api = lm();
  if (!api) throw new Error('The Prompt API is not available in this browser.');
  const session = await api.create({
    ...modelOptions(),
    monitor(m: EventTarget) {
      m.addEventListener('downloadprogress', (e) => {
        onProgress(Math.round(((e as unknown as { loaded: number }).loaded ?? 0) * 100));
      });
    },
  });
  session.destroy();
}
