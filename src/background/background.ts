// Service worker: shortcut, context menu, audit log, and the bridge to the on-device model.
// The Prompt API isn't available in service workers, so Smart mode runs in an offscreen document.

import type { AuditEntry, Msg, SmartLabelReply, SmartState } from '../shared/settings';

const AUDIT_KEY = 'audit';
const AUDIT_MAX = 200;
const MENU_ID = 'techknights-protect';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create(
    { id: MENU_ID, title: 'Protect this text with TechKnights', contexts: ['editable'] },
    () => void chrome.runtime.lastError,
  );
});

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) return;
  chrome.tabs
    .sendMessage(tab.id, { type: 'PROTECT_FOCUSED', force: true } satisfies Msg, { frameId: info.frameId ?? 0 })
    .catch(() => undefined);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== 'protect-focused') return;
  const send = (id: number) =>
    chrome.tabs.sendMessage(id, { type: 'PROTECT_FOCUSED' } satisfies Msg).catch(() => undefined);
  if (tab?.id) {
    void send(tab.id);
    return;
  }
  void chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => {
    if (t?.id) void send(t.id);
  });
});

async function ensureOffscreen(): Promise<void> {
  const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType] });
  if (existing.length) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_PARSER' as chrome.offscreen.Reason],
    justification: "Run Chrome's on-device Prompt API, which is not available in service workers.",
  });
}

async function toOffscreen<T>(payload: Record<string, unknown>): Promise<T> {
  await ensureOffscreen();
  return (await chrome.runtime.sendMessage({ target: 'offscreen', ...payload })) as T;
}

async function appendAudit(entry: AuditEntry): Promise<void> {
  const got = await chrome.storage.local.get(AUDIT_KEY);
  const list: AuditEntry[] = Array.isArray(got[AUDIT_KEY]) ? got[AUDIT_KEY] : [];
  list.push(entry);
  await chrome.storage.local.set({ [AUDIT_KEY]: list.slice(-AUDIT_MAX) });
}

chrome.runtime.onMessage.addListener((msg: Msg & { target?: string }, _sender, sendResponse) => {
  if (!msg || msg.target === 'offscreen') return false;

  if (msg.type === 'SMART_LABEL') {
    toOffscreen<SmartLabelReply>({ type: 'SMART_LABEL', text: msg.text })
      .then((r) => sendResponse(r ?? { ok: false, error: 'no-reply' }))
      .catch((e) => sendResponse({ ok: false, error: String(e?.message ?? e) } satisfies SmartLabelReply));
    return true;
  }
  if (msg.type === 'SMART_STATUS') {
    toOffscreen<{ state: SmartState }>({ type: 'SMART_STATUS' })
      .then(sendResponse)
      .catch(() => sendResponse({ state: 'unsupported' }));
    return true;
  }
  if (msg.type === 'AUDIT') {
    // Metadata only. The content script never includes raw text in this entry.
    appendAudit(msg.entry)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  return false;
});
