// Offscreen document: the only place that touches Chrome's on-device Prompt API (Gemini Nano)
// on behalf of web pages. The model only labels text. It never produces the safe prompt.
//
// To keep Smart mode fast:
//  - SMART_WARM loads the model as soon as a chat box is focused, before the user clicks;
//  - SMART_PREFETCH labels the text while the user pauses typing, so the click usually hits the cache;
//  - only one model call runs at a time; a newer prefetch replaces a queued one and a stale running
//    one is aborted when the user clicks on different text.

import { AI_SCHEMA, SYSTEM_PROMPT, smartLabel } from '../core/smart';
import type { AiEntity } from '../core/types';
import type { SmartLabelReply, SmartState } from '../shared/settings';
import { createModelRunner, getAvailability } from '../shared/smartModel';

const runModel = createModelRunner(AI_SCHEMA);
const TIMEOUT_MS = 20000;
const CACHE_MAX = 16;

/** text -> labels (or the in-flight request for it). In memory only; dropped when the document closes. */
const cache = new Map<string, Promise<AiEntity[]>>();
let running: { text: string; ctrl: AbortController; done: Promise<unknown> } | null = null;
let queuedPrefetch: string | null = null;

let availability: { state: SmartState; at: number } | null = null;
async function state(): Promise<SmartState> {
  if (availability && (availability.state === 'available' || Date.now() - availability.at < 30000)) return availability.state;
  const s = await getAvailability();
  availability = { state: s, at: Date.now() };
  return s;
}

function remember(text: string, p: Promise<AiEntity[]>): void {
  cache.set(text, p);
  p.catch(() => {
    if (cache.get(text) === p) cache.delete(text);
  });
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}

function start(text: string): Promise<AiEntity[]> {
  const ctrl = new AbortController();
  const p = smartLabel(text, runModel, { timeoutMs: TIMEOUT_MS, signal: ctrl.signal });
  remember(text, p);
  const done = p.catch(() => undefined).finally(() => {
    if (running?.ctrl === ctrl) running = null;
    const next = queuedPrefetch;
    queuedPrefetch = null;
    if (next && !cache.has(next) && !running) start(next);
  });
  running = { text, ctrl, done };
  return p;
}

async function label(text: string): Promise<AiEntity[]> {
  const hit = cache.get(text);
  if (hit) return hit;
  queuedPrefetch = null;
  if (running && running.text !== text) {
    running.ctrl.abort();
    await running.done;
  }
  return cache.get(text) ?? start(text);
}

function prefetch(text: string): void {
  if (cache.has(text)) return;
  if (running) {
    queuedPrefetch = text;
    return;
  }
  start(text);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== 'offscreen') return false;

  if (msg.type === 'SMART_STATUS') {
    state().then((s) => sendResponse({ state: s }));
    return true;
  }

  if (msg.type === 'SMART_WARM') {
    state()
      .then(async (s) => {
        if (s === 'available') await runModel.warm(SYSTEM_PROMPT);
        sendResponse({ state: s });
      })
      .catch(() => sendResponse({ state: 'unavailable' }));
    return true;
  }

  if (msg.type === 'SMART_PREFETCH') {
    const text = String(msg.text ?? '');
    state()
      .then((s) => {
        if (s === 'available' && text.trim()) prefetch(text);
      })
      .catch(() => undefined);
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'SMART_LABEL') {
    (async (): Promise<SmartLabelReply> => {
      const s = await state();
      if (s !== 'available') return { ok: false, error: `model-${s}` };
      const entities = await label(String(msg.text ?? ''));
      return { ok: true, entities };
    })()
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: String(e?.message ?? e) } satisfies SmartLabelReply));
    return true;
  }
  return false;
});
