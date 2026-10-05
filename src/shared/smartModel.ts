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
  clone(options?: Record<string, unknown>): Promise<PromptSession>;
  destroy(): void;
}

interface PromptApi {
  create(o: unknown): Promise<PromptSession>;
  params?(): Promise<{ defaultTopK?: number; maxTopK?: number; defaultTemperature?: number }>;
}

export interface ModelRunner {
  (system: string, user: string, signal?: AbortSignal): Promise<string>;
  /** Create the base session now (loads the model into memory) so the first real request is fast. */
  warm(system: string): Promise<void>;
}

/** Classification wants the most predictable output. Extensions may set topK and temperature (both or neither). */
async function samplingOptions(api: PromptApi): Promise<Record<string, number>> {
  try {
    const p = await api.params?.();
    if (p && typeof p.defaultTopK === 'number') return { topK: 1, temperature: 0 };
  } catch {
    /* params() is extension-only and may be missing; defaults are fine */
  }
  return {};
}

/**
 * Returns a function that asks the on-device model for structured JSON. A base session holding the
 * system prompt is created once (or ahead of time with warm()) and cloned per request, so each call
 * starts from a clean context without re-processing the system prompt.
 */
export function createModelRunner(schema: object): ModelRunner {
  let base: { system: string; session: Promise<PromptSession> } | null = null;

  const api = (): PromptApi => {
    const a = (globalThis as unknown as { LanguageModel?: PromptApi }).LanguageModel;
    if (!a) throw new Error('LanguageModel API not present');
    return a;
  };

  const baseSession = (system: string): Promise<PromptSession> => {
    if (base && base.system === system) return base.session;
    const old = base;
    const a = api();
    const session = samplingOptions(a).then((sampling) =>
      a.create({ ...modelOptions(), ...sampling, initialPrompts: [{ role: 'system', content: system }] }),
    );
    base = { system, session };
    session.catch(() => {
      if (base?.session === session) base = null; // let the next call retry
    });
    void old?.session.then((s) => s.destroy()).catch(() => undefined);
    return session;
  };

  const run = (async (system: string, user: string, signal?: AbortSignal) => {
    const session = await baseSession(system);
    if (signal?.aborted) throw new Error('smart-aborted');
    const clone = await session.clone(signal ? { signal } : undefined);
    try {
      return await clone.prompt(user, { responseConstraint: schema, ...(signal ? { signal } : {}) });
    } finally {
      clone.destroy();
    }
  }) as ModelRunner;
  run.warm = async (system: string) => {
    await baseSession(system);
  };
  return run;
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
