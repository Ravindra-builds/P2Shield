// Offscreen document: the only place that touches Chrome's on-device Prompt API (Gemini Nano)
// on behalf of web pages. The model only labels text. It never produces the safe prompt.

import { AI_SCHEMA, smartLabel } from '../core/smart';
import type { SmartLabelReply, SmartState } from '../shared/settings';
import { createModelRunner, getAvailability } from '../shared/smartModel';

const runModel = createModelRunner(AI_SCHEMA);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== 'offscreen') return false;

  if (msg.type === 'SMART_STATUS') {
    getAvailability().then((state: SmartState) => sendResponse({ state }));
    return true;
  }

  if (msg.type === 'SMART_LABEL') {
    (async (): Promise<SmartLabelReply> => {
      const state = await getAvailability();
      if (state !== 'available') return { ok: false, error: `model-${state}` };
      const entities = await smartLabel(String(msg.text ?? ''), runModel, { timeoutMs: 15000 });
      return { ok: true, entities };
    })()
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: String(e?.message ?? e) } satisfies SmartLabelReply));
    return true;
  }
  return false;
});
