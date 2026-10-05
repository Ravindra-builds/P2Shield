// Finding chat input boxes on arbitrary pages, reading them and writing text back robustly.

export type EditorKind = 'textarea' | 'input' | 'contenteditable';

export function kindOf(el: HTMLElement): EditorKind {
  if (el instanceof HTMLTextAreaElement) return 'textarea';
  if (el instanceof HTMLInputElement) return 'input';
  return 'contenteditable';
}

export function deepActiveElement(): Element | null {
  let a: Element | null = document.activeElement;
  while (a && (a as HTMLElement).shadowRoot && (a as HTMLElement).shadowRoot!.activeElement) {
    a = (a as HTMLElement).shadowRoot!.activeElement;
  }
  return a;
}

function isTextInput(el: HTMLInputElement): boolean {
  const t = (el.getAttribute('type') ?? 'text').toLowerCase();
  return (t === 'text' || t === 'search') && !el.readOnly && !el.disabled;
}

function parentOf(el: Element): Element | null {
  if (el.parentElement) return el.parentElement;
  const root = el.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

/** Walk up from an event target to the nearest editable text control (or null). */
export function resolveEditable(start: EventTarget | null): HTMLElement | null {
  let el: Element | null = start instanceof Element ? start : null;
  while (el) {
    if (el instanceof HTMLTextAreaElement) return el.readOnly || el.disabled ? null : el;
    if (el instanceof HTMLInputElement) return isTextInput(el) ? el : null;
    if (el instanceof HTMLElement && el.isContentEditable && el.getAttribute('contenteditable') !== 'false') {
      let host: HTMLElement = el;
      while (host.parentElement && host.parentElement.isContentEditable) host = host.parentElement;
      return host;
    }
    if (el.getAttribute('role') === 'textbox' && el instanceof HTMLElement) return el;
    el = parentOf(el);
  }
  return null;
}

// ---- Which editors get a shield? --------------------------------------------

const KNOWN_AI_HOSTS = [
  'chatgpt.com', 'chat.openai.com', 'claude.ai', 'gemini.google.com', 'aistudio.google.com',
  'copilot.microsoft.com', 'perplexity.ai', 'chat.deepseek.com', 'grok.com',
  'chat.mistral.ai', 'poe.com', 'meta.ai', 'huggingface.co', 'you.com', 'chat.qwen.ai',
  'kimi.com', 'character.ai', 'pi.ai', 'phind.com', 'lmarena.ai', 'openrouter.ai', 'chat.z.ai',
];

export function isKnownAiHost(hostname: string): boolean {
  return KNOWN_AI_HOSTS.some((h) => {
    const host = h.split('/')[0];
    return hostname === host || hostname.endsWith('.' + host);
  });
}

const POSITIVE_LABEL =
  /message|ask\b|ask |prompt|chat|type (?:here|your|a |something)|anything|question|talk|reply|write|how can i help|what'?s on your mind|help me|assistant|\bai\b|gpt|copilot|describe/i;
const NEGATIVE_LABEL =
  /search|find in|filter|user ?name|e-?mail|password|phone|address|zip|postal|otp|coupon|promo|captcha|first name|last name|city|url|website|subject/i;
const SEND_LABEL = /send|submit|ask|arrow|up\b|go\b|run\b|generate/i;

function labelsOf(el: HTMLElement): string {
  const parts = [
    el.getAttribute('placeholder'),
    el.getAttribute('aria-label'),
    el.getAttribute('aria-placeholder'),
    el.getAttribute('data-placeholder'),
    el.getAttribute('title'),
    el.getAttribute('name'),
    el.id,
    el.querySelector?.('[data-placeholder]')?.getAttribute('data-placeholder'),
  ];
  return parts.filter(Boolean).join(' | ');
}

function hasNearbySend(el: HTMLElement): boolean {
  let scope: Element | null = el;
  for (let i = 0; i < 5 && scope; i++) {
    scope = parentOf(scope);
    if (!scope) break;
    const buttons = scope.querySelectorAll('button, [role="button"]');
    for (const b of Array.from(buttons).slice(0, 40)) {
      if (b.contains(el)) continue;
      const label = [
        b.getAttribute('aria-label'),
        b.getAttribute('title'),
        b.getAttribute('data-testid'),
        b.getAttribute('type') === 'submit' ? 'submit' : '',
        (b.textContent ?? '').slice(0, 20),
      ].join(' ');
      if (SEND_LABEL.test(label)) return true;
    }
  }
  return false;
}

export function looksLikeChatBox(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 120 || rect.height < 18) return false;
  const labels = labelsOf(el);
  if (NEGATIVE_LABEL.test(labels) && !POSITIVE_LABEL.test(labels)) return false;
  if (POSITIVE_LABEL.test(labels)) return true;
  const multi = el instanceof HTMLTextAreaElement || (!(el instanceof HTMLInputElement) && rect.width >= 240);
  return multi && hasNearbySend(el);
}

export interface ShowOptions {
  hostname: string;
  showOnAll: boolean;
}

export function shouldShowShield(el: HTMLElement, opts: ShowOptions): boolean {
  if (el instanceof HTMLInputElement) {
    const t = (el.getAttribute('type') ?? 'text').toLowerCase();
    if (t === 'password') return false;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width < 60 || rect.height < 14) return false;
  if (opts.showOnAll) return true;
  if (isKnownAiHost(opts.hostname) && !(el instanceof HTMLInputElement)) {
    return rect.width >= 150 && rect.height >= 20;
  }
  return looksLikeChatBox(el);
}

// ---- Finding an editor again after the page re-renders it ----------------------------

export interface EditorSignature {
  id: string;
  labels: string;
}

export function signatureOf(el: HTMLElement): EditorSignature {
  return { id: el.id || '', labels: labelsOf(el) };
}

function matchesSignature(el: HTMLElement, s: EditorSignature): boolean {
  if (s.id && el.id === s.id) return true;
  return !!s.labels && labelsOf(el) === s.labels;
}

/**
 * Single-page chat apps often replace the composer node (after sending, switching chats, or when the
 * layout changes). Find the editor that took the old one's place, or null if it isn't clear which.
 */
export function findReplacement(sig: EditorSignature | null, opts: ShowOptions): HTMLElement | null {
  const seen = new Set<HTMLElement>();
  const usable: HTMLElement[] = [];
  for (const node of Array.from(document.querySelectorAll('textarea, input, [contenteditable], [role="textbox"]'))) {
    const ed = resolveEditable(node);
    if (!ed || seen.has(ed) || !ed.isConnected) continue;
    seen.add(ed);
    const v = visibleBox(ed);
    if (v.width < 60 || v.height < 14) continue;
    if (shouldShowShield(ed, opts)) usable.push(ed);
  }
  if (sig) {
    const same = usable.filter((e) => matchesSignature(e, sig));
    if (same.length) return same[same.length - 1];
  }
  return usable.length === 1 ? usable[0] : null;
}

// ---- Where to put the shield ---------------------------------------------------

export interface Box {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

function toBox(r: { top: number; left: number; right: number; bottom: number }): Box {
  return {
    top: r.top,
    left: r.left,
    right: r.right,
    bottom: r.bottom,
    width: Math.max(0, r.right - r.left),
    height: Math.max(0, r.bottom - r.top),
  };
}

function intersect(a: Box, b: Box): Box {
  return toBox({
    top: Math.max(a.top, b.top),
    left: Math.max(a.left, b.left),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  });
}

/** The part of the editor the user can actually see (rich editors grow inside a scrolling wrapper). */
export function visibleBox(el: HTMLElement): Box {
  let box = toBox(el.getBoundingClientRect());
  let p = parentOf(el);
  while (p && p !== document.documentElement) {
    const cs = getComputedStyle(p);
    if (/(auto|scroll|hidden|clip)/.test(cs.overflowX + cs.overflowY)) {
      box = intersect(box, toBox(p.getBoundingClientRect()));
    }
    p = parentOf(p);
  }
  return intersect(box, toBox({ top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight }));
}

function looksLikeCard(cs: CSSStyleDeclaration): boolean {
  const radius = parseFloat(cs.borderTopLeftRadius) || 0;
  if (radius < 10) return false;
  const bg = cs.backgroundColor;
  const hasBg = !!bg && bg !== 'transparent' && !/^rgba\(\s*0,\s*0,\s*0,\s*0\s*\)$/.test(bg);
  const hasBorder = (parseFloat(cs.borderTopWidth) || 0) > 0 && cs.borderTopStyle !== 'none';
  const hasShadow = !!cs.boxShadow && cs.boxShadow !== 'none';
  return hasBg || hasBorder || hasShadow;
}

/**
 * The box the shield should sit on. Chat sites wrap the editor in a rounded "composer" card that also
 * holds the + button, mic and send button. Anchoring to that card (not the narrower editor inside it)
 * keeps the shield at the composer's edge. Falls back to the visible part of the editor.
 */
export function anchorBox(el: HTMLElement): Box {
  const inner = visibleBox(el);
  let p = parentOf(el);
  for (let depth = 0; p && depth < 8; depth++) {
    if (p === document.body || p === document.documentElement) break;
    const r = p.getBoundingClientRect();
    if (r.height > window.innerHeight * 0.7 || r.width > window.innerWidth * 0.98) break;
    if (r.width >= inner.width - 1 && r.height >= inner.height - 1 && looksLikeCard(getComputedStyle(p))) {
      return intersect(toBox(r), toBox({ top: -1e6, left: 0, right: window.innerWidth, bottom: window.innerHeight }));
    }
    p = parentOf(p);
  }
  return inner;
}

// ---- Reading / writing ---------------------------------------------------------

export function getText(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value;
  return readLines(el);
}

/**
 * Read a rich editor the way the user sees it: one line per paragraph, `<br>` as a line break, an empty
 * paragraph as a blank line. `innerText` is not used because it reports two newlines between every pair
 * of paragraphs, which would get written back as extra blank lines.
 */
function readLines(root: HTMLElement): string {
  const lines: string[] = [];
  let cur: string | null = null; // the line being built, or null between lines
  let curCollapsed = false; // the line currently ends in a collapsible space
  const preserve = new Map<Element, boolean>();

  const keepsWhitespace = (e: Element): boolean => {
    let v = preserve.get(e);
    if (v === undefined) {
      v = /^(pre|break-spaces)/.test(getComputedStyle(e).whiteSpace);
      preserve.set(e, v);
    }
    return v;
  };
  const flush = () => {
    if (cur !== null) lines.push(curCollapsed ? cur.replace(/ $/, '') : cur);
    cur = null;
    curCollapsed = false;
  };
  const append = (t: string, collapsed: boolean) => {
    if (!t) return;
    cur = (cur ?? '') + t;
    curCollapsed = collapsed && t.endsWith(' ');
  };

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? '').replace(/\r\n?/g, '\n').replace(/[\u200b\ufeff]/g, '');
      const parent = node.parentElement;
      if (parent && keepsWhitespace(parent)) {
        t.split('\n').forEach((part, i) => {
          if (i > 0) {
            if (cur === null) cur = '';
            flush();
          }
          append(part, false);
        });
        return;
      }
      let c = t.replace(/[ \t\n\f]+/g, ' ');
      if (cur === null || curCollapsed) c = c.replace(/^ /, '');
      append(c, true);
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.classList.contains('ProseMirror-separator')) return; // caret placeholder, not content
    if (node instanceof HTMLBRElement) {
      if (cur === null) cur = '';
      flush();
      return;
    }
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(node.tagName)) return;
    const display = node === root ? 'block' : getComputedStyle(node).display;
    if (display === 'none') return;
    const block = display !== 'inline' && display !== 'contents' && !display.startsWith('inline-');
    if (block) flush();
    node.childNodes.forEach(walk);
    if (block) flush();
  };

  walk(root);
  flush();
  return lines.join('\n').replace(/\u00a0/g, ' ');
}

export function normalizeForCompare(s: string): string {
  return s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function canonLines(s: string): string {
  return s
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

/** True if both texts have the same lines in the same order (so paragraph breaks and blank lines survived). */
export function sameLines(a: string, b: string): boolean {
  return canonLines(a) === canonLines(b);
}

function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}

function fireInput(el: HTMLElement, data: string): void {
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data }));
}

function selectAllIn(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel) return false;
  const range = document.createRange();
  range.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(range);
  return true;
}

const delay = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Select everything, then give the editor a moment to see the selection (frameworks sync on selectionchange). */
async function selectAllAndSettle(el: HTMLElement): Promise<boolean> {
  el.focus();
  if (!selectAllIn(el)) return false;
  await delay(40);
  return true;
}

/**
 * Simulate a paste. Rich editors (ProseMirror, Lexical, Slate, Quill, Draft) handle `paste` through
 * their own model, so their internal state stays in sync. Plain contenteditable ignores untrusted
 * paste events, which the verification step detects before falling through to the next strategy.
 */
async function viaPaste(el: HTMLElement, text: string): Promise<void> {
  if (!(await selectAllAndSettle(el))) return;
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  await delay(90);
}

/**
 * Browser editing commands. Works for plain contenteditable and DOM-observing editors.
 * `paragraph` ends each line like the Enter key (a new block, which is what ProseMirror editors use
 * for every line); `break` inserts a <br> like Shift+Enter. The right one depends on the editor's
 * schema, so setText tries them in turn and keeps the first that reproduces every line.
 */
async function viaExecCommand(el: HTMLElement, text: string, lineEnd: 'paragraph' | 'break'): Promise<void> {
  if (!(await selectAllAndSettle(el))) return;
  document.execCommand('delete');
  const command = lineEnd === 'paragraph' ? 'insertParagraph' : 'insertLineBreak';
  text.split(/\r?\n/).forEach((line, i) => {
    if (i > 0) document.execCommand(command);
    if (line) document.execCommand('insertText', false, line);
  });
  await delay(80);
}

async function viaTextContent(el: HTMLElement, text: string): Promise<void> {
  el.textContent = text;
  fireInput(el, text);
  await delay(30);
}

/**
 * Replace a textarea/input through the browser's own editing pipeline. The page sees a normal `input`
 * event and the box keeps its undo/redo history (Ctrl+Z / Ctrl+Y), which assigning `.value` wipes.
 */
function viaNativeEdit(el: HTMLTextAreaElement | HTMLInputElement, text: string): boolean {
  if (el instanceof HTMLInputElement && /[\r\n]/.test(text)) return false;
  try {
    el.focus();
    el.select();
    const ok = text ? document.execCommand('insertText', false, text) : document.execCommand('delete');
    return ok && el.value.replace(/\r\n?/g, '\n') === text;
  } catch {
    return false;
  }
}

/**
 * Replace the whole content of an editor and verify the result.
 * Returns true if the editor now shows `text`, line for line.
 */
export async function setText(el: HTMLElement, text: string): Promise<boolean> {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    if (!viaNativeEdit(el, text)) {
      el.focus();
      setNativeValue(el, text);
      fireInput(el, text);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return normalizeForCompare(el.value) === normalizeForCompare(text);
  }
  const want = normalizeForCompare(text);
  // ProseMirror (ChatGPT, Claude, ...) watches the DOM, so editing commands work and avoid the
  // "large paste becomes an attachment" behaviour. Editors that only listen to beforeinput/paste
  // (Lexical, Slate, Draft, Quill) need the paste route first.
  const domWatching = el.classList.contains('ProseMirror') || !!el.closest('.ProseMirror');
  const paste = () => viaPaste(el, text);
  const execParagraph = () => viaExecCommand(el, text, 'paragraph');
  const execBreak = () => viaExecCommand(el, text, 'break');
  const attempts: Array<() => Promise<void>> = [
    ...(domWatching ? [execParagraph, execBreak, paste] : [paste, execBreak, execParagraph]),
    () => viaTextContent(el, text),
  ];
  // The first strategy whose result has every line in place wins. One that only gets the words right
  // (lines run together) is kept as a last resort rather than leaving the box broken.
  let wordsOnly: (() => Promise<void>) | null = null;
  for (const attempt of attempts) {
    try {
      await attempt();
    } catch {
      /* try the next strategy */
    }
    const got = getText(el);
    if (sameLines(got, text)) return true;
    if (!wordsOnly && normalizeForCompare(got) === want) wordsOnly = attempt;
  }
  if (wordsOnly) {
    try {
      await wordsOnly();
    } catch {
      /* fall through to the check below */
    }
    return normalizeForCompare(getText(el)) === want;
  }
  return false;
}

/** Cheap "is there anything in the box" check that doesn't walk the whole editor. */
export function hasText(el: HTMLElement): boolean {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value.trim().length > 0;
  return (el.textContent ?? '').trim().length > 0;
}
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* fall through to the legacy path */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
  document.documentElement.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}
