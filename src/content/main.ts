// Content script: puts a shield button on chat input boxes and sanitizes the prompt on click.
// Everything here runs locally. The only messages sent out of the page go to our own
// background worker (Smart mode labelling and metadata-only audit entries).

import { analyze, evaluate, quickScan } from '../core/engine';
import type { AiEntity, AnalysisResult, Detection, Profile } from '../core/types';
import type { Override } from '../core/sanitize';
import {
  activeProfile,
  isSiteDisabled,
  loadSettings,
  type AuditEntry,
  type Msg,
  type Settings,
  type SmartLabelReply,
} from '../shared/settings';
import {
  anchorBox,
  copyToClipboard,
  deepActiveElement,
  findReplacement,
  getText,
  hasText,
  normalizeForCompare,
  resolveEditable,
  setText,
  shouldShowShield,
  signatureOf,
  visibleBox,
  type EditorSignature,
} from './editable';
import { ShieldUi } from './ui';

declare global {
  interface Window {
    __techknightsPf?: boolean;
  }
}

if (!window.__techknightsPf) {
  window.__techknightsPf = true;
  void start();
}

interface Session {
  editor: HTMLElement;
  sig: EditorSignature;
  original: string;
  detections: Detection[];
  overrides: Record<string, Override>;
  mode: 'basic' | 'smart';
  result: AnalysisResult;
  /** The safe text we last wrote, used to detect edits made after protection. */
  lastSafe: string;
  /** True while the box holds the protected text. Undo turns it off, so the shield can protect again. */
  active: boolean;
  smartNote?: string;
}

async function start(): Promise<void> {
  let settings: Settings = await loadSettings();
  let profile: Profile = activeProfile(settings);
  const hostname = location.hostname;

  let current: HTMLElement | null = null;
  /** What the current (or last) editor looked like, so we can find it again if the page re-renders it. */
  let currentSig: EditorSignature | null = null;
  let session: Session | null = null;
  let busy = false;
  /** Our own edits fire input events; don't re-scan the text we just cleaned. */
  let quietUntil = 0;
  let scanTimer: number | undefined;
  let lastFocusAt = 0;

  const ui = new ShieldUi({
    onProtect: () => {
      const editor = liveEditor(current);
      if (editor) {
        current = editor;
        void protect(editor);
      } else {
        ui.showChip({ message: 'Click into the message box first, then click the shield.' }, 3500);
      }
    },
    onUndo: () => void undo(),
    onToggle: (id, protectIt) => void toggle(id, protectIt),
  });

  const enabled = () => !isSiteDisabled(settings, hostname);

  // ---- settings live-reload --------------------------------------------------
  try {
    chrome.storage.onChanged.addListener(() => {
      void loadSettings().then((s) => {
        settings = s;
        profile = activeProfile(s);
        if (!enabled()) detach();
        else scheduleScan();
      });
    });
  } catch {
    /* context invalidated */
  }

  // ---- attach / detach -------------------------------------------------------
  const showOpts = () => ({ hostname, showOnAll: settings.showOnAll });

  function attach(el: HTMLElement): void {
    if (current === el) return;
    current = el;
    currentSig = signatureOf(el);
    if (session && session.editor !== el && session.editor.isConnected) session = null;
    ui.setBadge(0, null);
    reposition();
    scheduleScan();
  }

  function detach(): void {
    current = null;
    session = null;
    ui.hideButton();
  }

  function visible(el: HTMLElement): boolean {
    if (!el.isConnected) return false;
    const v = visibleBox(el);
    return v.width >= 40 && v.height >= 10;
  }

  /** The editor to act on now. If the page swapped the node, find its replacement and carry the session over. */
  function liveEditor(preferred: HTMLElement | null): HTMLElement | null {
    if (preferred && preferred.isConnected) return preferred;
    const active = resolveEditable(deepActiveElement());
    const next =
      active && shouldShowShield(active, showOpts()) ? active : findReplacement(session?.sig ?? currentSig, showOpts());
    if (next && session && (!preferred || session.editor === preferred)) session.editor = next;
    return next;
  }

  /**
   * Rewriting the box changes its height and often scrolls the page, and the scroll events can arrive
   * mid-edit. Re-anchor the shield (and the chip above it) once the box has settled.
   */
  function repositionAfterEdit(): void {
    reposition();
    window.setTimeout(reposition, 150);
  }

  function reposition(): void {
    if (!enabled() || ui.isPressed()) return;

    // The page re-rendered the editor (common after sending, switching chats, or layout changes).
    if (current && !current.isConnected) {
      const next = liveEditor(current);
      if (next) {
        current = next;
        currentSig = signatureOf(next);
        scheduleScan();
      } else {
        ui.hideButton();
        current = null;
        return;
      }
    }

    // Focus can land on an editor without a focusin we saw (programmatic focus, re-clicking a focused box).
    if (!current) {
      const active = resolveEditable(deepActiveElement());
      if (active && shouldShowShield(active, showOpts())) attach(active);
      if (!current) return;
    }

    if (!visible(current)) {
      ui.hideButton();
      return;
    }
    const focused = deepActiveElement();
    const hasFocus = !!focused && (focused === current || current.contains(focused));
    const recent = Date.now() - lastFocusAt < 4000;
    if (hasFocus || ui.isHovered() || recent || hasText(current)) {
      ui.showButton(anchorBox(current));
    } else {
      ui.hideButton();
    }
  }

  // ---- live scan -------------------------------------------------------------
  function scheduleScan(): void {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scanNow, 300);
  }

  function scanNow(): void {
    if (!current || !enabled() || busy) return;
    if (Date.now() < quietUntil) return;
    if (!settings.liveScan) {
      ui.setBadge(0, null);
      return;
    }
    const text = getText(current);
    if (!text.trim()) {
      ui.setBadge(0, null);
      return;
    }
    try {
      const q = quickScan(text, profile);
      ui.setBadge(q.applied, q.applied > 0 ? q.level : null);
    } catch {
      ui.setBadge(0, null);
    }
  }

  // ---- protect ---------------------------------------------------------------
  async function askSmart(text: string): Promise<{ ai?: AiEntity[]; note?: string }> {
    if (settings.mode !== 'smart') return {};
    try {
      const reply = (await chrome.runtime.sendMessage({ type: 'SMART_LABEL', text } satisfies Msg)) as
        | SmartLabelReply
        | undefined;
      if (reply && reply.ok) return { ai: reply.entities };
      return { note: 'On-device AI unavailable, used Basic mode' };
    } catch {
      return { note: 'On-device AI unavailable, used Basic mode' };
    }
  }

  function chipFor(s: Session): void {
    const applied = s.result.findings.filter((f) => f.applied).length;
    const subParts = [`${s.mode === 'smart' ? 'Smart' : 'Basic'} mode`, `${profile.name} profile`];
    if (s.smartNote) subParts.push(s.smartNote);
    ui.setResult(s.result, profile.name);
    ui.showChip(
      {
        message: `Protected ${applied} item${applied === 1 ? '' : 's'} · Risk ${s.result.riskBefore} → ${s.result.riskAfter} (${s.result.levelAfter})`,
        sub: subParts.join(' · '),
        undo: true,
        details: true,
      },
      30000,
    );
  }

  function audit(result: AnalysisResult): void {
    const counts: Record<string, number> = {};
    for (const f of result.findings) {
      if (!f.applied) continue;
      const key = f.label ?? f.type;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const entry: AuditEntry = {
      ts: Date.now(),
      host: hostname,
      mode: result.mode,
      profileId: result.profileId,
      riskBefore: result.riskBefore,
      riskAfter: result.riskAfter,
      counts,
    };
    try {
      void chrome.runtime.sendMessage({ type: 'AUDIT', entry } satisfies Msg).catch(() => undefined);
    } catch {
      /* ignore */
    }
  }

  async function protect(editor: HTMLElement): Promise<void> {
    if (busy) return;
    busy = true;
    ui.setBusy(true);
    try {
      const text = getText(editor);
      if (!text.trim()) {
        ui.showChip({ message: 'Type or paste a prompt first, then click the shield.' }, 3500);
        return;
      }

      // Clicking the shield again on text we already cleaned must not replace the saved original,
      // otherwise Undo would "restore" the cleaned text. After an Undo the box holds the original
      // again, so this must not apply: the next click has to protect it afresh.
      if (
        session &&
        session.active &&
        session.editor === editor &&
        session.result.findings.some((f) => f.applied) &&
        normalizeForCompare(text) === normalizeForCompare(session.lastSafe)
      ) {
        chipFor(session);
        return;
      }

      const { ai, note } = await askSmart(text);
      const { result, detections } = analyze(text, { profile, ai });
      const applied = result.findings.filter((f) => f.applied);

      session = {
        editor,
        sig: signatureOf(editor),
        original: text,
        detections,
        overrides: {},
        mode: result.mode,
        result,
        lastSafe: text,
        active: false,
        smartNote: note,
      };

      if (!applied.length) {
        ui.setResult(result, profile.name);
        const held = result.findings.length;
        ui.showChip(
          {
            message: held
              ? `No changes needed. ${held} item${held === 1 ? '' : 's'} found, but your ${profile.name} profile keeps ${held === 1 ? 'it' : 'them'}.`
              : 'No sensitive data found.',
            sub: note ?? `${result.mode === 'smart' ? 'Smart' : 'Basic'} mode · analysed on this device`,
            details: held > 0,
          },
          6000,
        );
        ui.setBadge(0, null);
        return;
      }

      const ok = await setText(editor, result.safeText);
      quietUntil = Date.now() + 800;
      session.lastSafe = result.safeText;
      session.active = ok;
      ui.setBadge(0, null);
      repositionAfterEdit();
      audit(result);
      if (ok) {
        chipFor(session);
      } else {
        const copied = await copyToClipboard(result.safeText);
        ui.setResult(result, profile.name);
        ui.showChip(
          {
            message: copied
              ? "Couldn't edit this box automatically. The safe prompt is on your clipboard: select all and paste (Ctrl+V)."
              : "Couldn't edit this box automatically. Open Details to copy the safe prompt.",
            details: true,
          },
          15000,
        );
      }
    } catch {
      ui.showChip({ message: 'Something went wrong. Your text may not have been changed.' }, 5000);
    } finally {
      busy = false;
      ui.setBusy(false);
    }
  }

  async function undo(): Promise<void> {
    if (!session) {
      ui.showChip({ message: 'Nothing to undo.' }, 2500);
      return;
    }
    const s = session;
    ui.closePanel();
    const editor = liveEditor(s.editor);
    let ok = false;
    if (editor) {
      s.editor = editor;
      ok = await setText(editor, s.original);
      repositionAfterEdit();
    }
    quietUntil = Date.now() + 800;
    window.setTimeout(scanNow, 900);
    if (ok) {
      s.lastSafe = s.original;
      s.active = false; // the box holds the original again; the shield can protect it once more
      ui.showChip({ message: 'Original text restored.' }, 3500);
      return;
    }
    const copied = await copyToClipboard(s.original);
    ui.showChip(
      {
        message: copied
          ? "Couldn't restore the box automatically. Your original text is on the clipboard: select all and paste (Ctrl+V)."
          : "Couldn't restore the box automatically. Try Ctrl+Z in the box.",
      },
      15000,
    );
  }

  async function toggle(id: string, protectIt: boolean): Promise<void> {
    if (!session) return;
    const editor = liveEditor(session.editor);
    if (!editor) return;
    session.editor = editor;
    const edited = normalizeForCompare(getText(editor)) !== normalizeForCompare(session.lastSafe);
    if (edited) {
      ui.showChip({ message: 'The text changed since it was protected. Click the shield again to re-scan.' }, 5000);
      return;
    }
    session.overrides[id] = protectIt ? 'PROTECT' : 'KEEP';
    const result = evaluate(session.original, session.detections, profile, session.mode, session.overrides);
    const ok = await setText(editor, result.safeText);
    quietUntil = Date.now() + 800;
    session.result = result;
    session.lastSafe = result.safeText;
    session.active = ok;
    repositionAfterEdit();
    ui.setResult(result, profile.name);
    if (!ok) ui.showChip({ message: "Couldn't update the box. Use Undo and try again." }, 4000);
    else chipFor(session);
  }

  // ---- events ----------------------------------------------------------------
  function onFocusIn(e: FocusEvent): void {
    if (!enabled()) return;
    const target = e.composedPath()[0] ?? e.target;
    const el = resolveEditable(target);
    if (!el) return;
    lastFocusAt = Date.now();
    if (shouldShowShield(el, { hostname, showOnAll: settings.showOnAll })) attach(el);
    else if (current && current !== el) detach();
  }

  /** Clicking into a box that is already focused doesn't fire focusin, so listen for the pointer too. */
  function onPointerDown(e: PointerEvent): void {
    if (!enabled()) return;
    const el = resolveEditable(e.composedPath()[0] ?? e.target);
    if (!el) return;
    lastFocusAt = Date.now();
    if (shouldShowShield(el, showOpts())) attach(el);
  }

  function onInput(e: Event): void {
    if (!current) return;
    const el = resolveEditable(e.composedPath()[0] ?? e.target);
    if (el === current) scheduleScan();
  }

  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('input', onInput, true);
  document.addEventListener('keyup', onInput, true);
  document.addEventListener('paste', () => window.setTimeout(scheduleScan, 50), true);
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);
  window.setInterval(reposition, 400);

  // Already-focused editor at load time (e.g. autofocus on a chat page).
  const initial = resolveEditable(deepActiveElement());
  if (initial && enabled() && shouldShowShield(initial, { hostname, showOnAll: settings.showOnAll })) attach(initial);

  // ---- shortcut / context menu ----------------------------------------------
  chrome.runtime.onMessage.addListener((msg: Msg) => {
    if (msg?.type !== 'PROTECT_FOCUSED') return;
    if (!msg.force && !document.hasFocus()) return;
    const el = resolveEditable(deepActiveElement());
    if (!el) return;
    lastFocusAt = Date.now();
    attach(el);
    ui.showButton(anchorBox(el));
    void protect(el);
  });
}
