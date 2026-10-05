// In-page UI rendered inside a closed Shadow DOM so host-site CSS and scripts can't touch it.
// No innerHTML anywhere (sites with Trusted Types would reject it).

import type { AnalysisResult, Finding, RiskLevel } from '../core/types';
import { isCredentialType } from '../core/detectors';
import type { Box } from './editable';

const SVG_NS = 'http://www.w3.org/2000/svg';

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: "Inter", system-ui, -apple-system, "Segoe UI Variable", "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
.layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; }

/* Shield button */
.shield {
  position: fixed; width: 30px; height: 30px; border-radius: 50%; border: 0; padding: 0; cursor: pointer;
  pointer-events: auto; display: none; align-items: center; justify-content: center;
  color: #fff; background: linear-gradient(135deg, #5050e6, #7c4df0);
  box-shadow: 0 0 0 1px rgba(255,255,255,.22) inset, 0 6px 16px -4px rgba(80,80,230,.65), 0 2px 4px rgba(10,12,30,.25);
  transition: background .2s, transform .12s cubic-bezier(.3,.7,.3,1.4), box-shadow .2s;
}
.shield:hover { transform: scale(1.1); }
.shield:active { transform: scale(.96); }
.shield:focus-visible { outline: 2px solid #fff; outline-offset: 2px; box-shadow: 0 0 0 5px #5050e6; }
.shield.low { background: linear-gradient(135deg, #15803d, #22c55e); box-shadow: 0 0 0 1px rgba(255,255,255,.22) inset, 0 6px 16px -4px rgba(22,163,74,.65), 0 2px 4px rgba(10,12,30,.25); }
.shield.medium { background: linear-gradient(135deg, #b45309, #f59e0b); box-shadow: 0 0 0 1px rgba(255,255,255,.22) inset, 0 6px 16px -4px rgba(217,119,6,.65), 0 2px 4px rgba(10,12,30,.25); }
.shield.high { background: linear-gradient(135deg, #c2410c, #f97316); box-shadow: 0 0 0 1px rgba(255,255,255,.22) inset, 0 6px 16px -4px rgba(234,88,12,.65), 0 2px 4px rgba(10,12,30,.25); }
.shield.critical { background: linear-gradient(135deg, #b91c1c, #ef4444); box-shadow: 0 0 0 1px rgba(255,255,255,.22) inset, 0 6px 16px -4px rgba(220,38,38,.7), 0 2px 4px rgba(10,12,30,.25); }
.shield.busy svg { animation: spin 1s linear infinite; }
.shield svg { width: 18px; height: 18px; }
.badge {
  position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
  background: #fff; color: #0d1020; font-size: 10.5px; font-weight: 750; line-height: 18px; text-align: center;
  font-variant-numeric: tabular-nums; box-shadow: 0 0 0 2px rgba(13,16,32,.12), 0 2px 6px rgba(13,16,32,.3); display: none;
}

/* Floating surfaces */
.chip, .panel {
  position: fixed; pointer-events: auto; display: none; color: #0d1020;
  background: rgba(255,255,255,.94); -webkit-backdrop-filter: blur(16px) saturate(1.5); backdrop-filter: blur(16px) saturate(1.5);
  border: 1px solid rgba(20,24,60,.1); border-radius: 14px;
  box-shadow: 0 1px 2px rgba(13,16,32,.06), 0 18px 40px -12px rgba(13,16,32,.35);
  font-size: 13px; line-height: 1.4;
}
.chip { padding: 9px 10px 9px 14px; max-width: 400px; align-items: center; gap: 10px; flex-wrap: wrap; animation: pop .22s cubic-bezier(.2,.8,.2,1) both; }
.chip.show { display: flex; }
.chip::before { content: ""; flex: none; width: 8px; height: 8px; border-radius: 50%; background: #5050e6; box-shadow: 0 0 0 3px rgba(80,80,230,.18); }
.chip .msg { flex: 1 1 auto; min-width: 140px; font-weight: 550; }
.chip .sub { display: block; margin-top: 1px; font-size: 11.5px; font-weight: 400; color: #5a607c; }
.btn {
  border: 0; background: rgba(80,80,230,.1); color: #3d3dcc; border-radius: 8px; height: 28px; padding: 0 12px;
  font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background .15s, transform .08s;
}
.btn:hover { background: rgba(80,80,230,.18); }
.btn:active { transform: translateY(1px); }
.btn:focus-visible { outline: 2px solid #5050e6; outline-offset: 1px; }

/* Details panel */
.panel { width: 420px; max-width: calc(100vw - 16px); max-height: min(440px, calc(100vh - 16px)); flex-direction: column; overflow: hidden; }
.panel.show { display: flex; animation: pop .22s cubic-bezier(.2,.8,.2,1) both; }
.panel header { padding: 12px 14px; border-bottom: 1px solid rgba(20,24,60,.08); display: flex; align-items: center; gap: 8px; }
.panel header h2 { margin: 0; font-size: 13px; font-weight: 650; letter-spacing: -.005em; flex: 1; }
.panel .list { overflow-y: auto; padding: 6px; }
.row { display: grid; grid-template-columns: 20px 1fr; gap: 10px; padding: 9px 10px; border-radius: 10px; cursor: pointer; transition: background .12s; }
.row:hover { background: rgba(80,80,230,.06); }
.row input { margin: 2px 0 0; width: 16px; height: 16px; accent-color: #5050e6; cursor: pointer; }
.row input:disabled { cursor: not-allowed; }
.row .top { display: flex; gap: 6px 8px; align-items: center; flex-wrap: wrap; }
.pill { font-size: 10.5px; font-weight: 700; letter-spacing: .03em; padding: 2px 8px; border-radius: 999px; background: rgba(80,80,230,.12); color: #3d3dcc; }
.pill.cred { background: rgba(220,38,38,.12); color: #b91c1c; }
.val { font-family: ui-monospace, "SF Mono", "Cascadia Code", Consolas, monospace; font-size: 12px; word-break: break-all; }
.meta { font-size: 11.5px; color: #5a607c; margin-top: 3px; }
.arrow { color: #8a90ab; }
.panel footer { padding: 10px 14px; border-top: 1px solid rgba(20,24,60,.08); font-size: 11.5px; color: #5a607c; background: rgba(20,24,60,.03); }
.lock { font-size: 11.5px; color: #b91c1c; margin-top: 2px; font-weight: 550; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
@media (prefers-color-scheme: dark) {
  .chip, .panel { background: rgba(18,20,34,.94); color: #eef0fa; border-color: rgba(255,255,255,.1); box-shadow: 0 1px 2px rgba(0,0,0,.4), 0 18px 44px -12px rgba(0,0,0,.75); }
  .chip::before { background: #8c8cff; box-shadow: 0 0 0 3px rgba(140,140,255,.22); }
  .chip .sub, .meta, .panel footer { color: #a3a9c6; }
  .btn { background: rgba(140,140,255,.16); color: #cfd0ff; }
  .btn:hover { background: rgba(140,140,255,.26); }
  .row:hover { background: rgba(140,140,255,.1); }
  .pill { background: rgba(140,140,255,.18); color: #d4d5ff; }
  .pill.cred { background: rgba(248,113,113,.18); color: #fecaca; }
  .lock { color: #fca5a5; }
  .arrow { color: #777d9d; }
  .panel header, .panel footer { border-color: rgba(255,255,255,.08); }
  .panel footer { background: rgba(255,255,255,.03); }
}
@media (prefers-reduced-motion: reduce) { .shield, .shield svg, .chip, .panel { transition: none; animation: none !important; } }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function shieldIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('fill-opacity', '0.25');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linejoin', 'round');
  const check = document.createElementNS(SVG_NS, 'path');
  check.setAttribute('d', 'm8.5 12 2.4 2.4 4.6-4.9');
  check.setAttribute('fill', 'none');
  check.setAttribute('stroke', 'currentColor');
  check.setAttribute('stroke-width', '2.4');
  check.setAttribute('stroke-linecap', 'round');
  check.setAttribute('stroke-linejoin', 'round');
  svg.append(path, check);
  return svg;
}

export interface UiCallbacks {
  onProtect(): void;
  onUndo(): void;
  onToggle(findingId: string, protect: boolean): void;
}

export interface ChipData {
  message: string;
  sub?: string;
  undo?: boolean;
  details?: boolean;
}

export function previewOf(f: Finding): string {
  const t = f.text.replace(/\s+/g, ' ');
  if (isCredentialType(f.type)) return t.slice(0, 3) + '•'.repeat(Math.min(8, Math.max(3, t.length - 3)));
  return t.length > 36 ? t.slice(0, 34) + '…' : t;
}

export class ShieldUi {
  private host = document.createElement('div');
  private root: ShadowRoot;
  private layer = el('div', 'layer');
  private button = el('button', 'shield');
  private badge = el('span', 'badge');
  private chip = el('div', 'chip');
  private panel = el('div', 'panel');
  private chipTimer: number | undefined;
  private hovered = false;
  private pressed = false;
  private anchor: Box | null = null;
  private panelOpen = false;

  constructor(private cb: UiCallbacks) {
    this.host.setAttribute('data-p2shield', '');
    this.host.style.cssText = 'all: initial; position: fixed; z-index: 2147483647;';
    // Closed in production so page scripts can't read the findings. Open only in the e2e test build.
    this.root = this.host.attachShadow({ mode: __E2E__ ? 'open' : 'closed' });
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
      this.root.adoptedStyleSheets = [sheet];
    } catch {
      const style = el('style', undefined, CSS);
      this.root.append(style);
    }
    this.button.type = 'button';
    this.button.setAttribute('aria-label', 'Protect this prompt with P2Shield');
    this.button.title = 'Protect this prompt (Alt+Shift+S)';
    this.button.append(shieldIcon(), this.badge);
    this.button.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the editor
    this.button.addEventListener('pointerdown', () => {
      this.pressed = true;
      const release = () => {
        // Keep "pressed" a moment longer so the click that follows isn't repositioned away.
        window.setTimeout(() => (this.pressed = false), 60);
        window.removeEventListener('pointerup', release, true);
        window.removeEventListener('pointercancel', release, true);
      };
      window.addEventListener('pointerup', release, true);
      window.addEventListener('pointercancel', release, true);
    });
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.cb.onProtect();
    });
    for (const n of [this.button, this.chip, this.panel]) {
      n.addEventListener('mouseenter', () => (this.hovered = true));
      n.addEventListener('mouseleave', () => (this.hovered = false));
      n.addEventListener('mousedown', (e) => {
        if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault();
      });
    }
    this.chip.setAttribute('role', 'status');
    this.chip.setAttribute('aria-live', 'polite');
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Protected items');
    this.layer.append(this.button, this.chip, this.panel);
    this.root.append(this.layer);
  }

  mount(): void {
    if (!this.host.isConnected) document.documentElement.appendChild(this.host);
  }

  isHovered(): boolean {
    return this.hovered;
  }

  /** True while the pointer is held down on the shield. Repositioning is paused so a click can't be lost. */
  isPressed(): boolean {
    return this.pressed;
  }

  // ---- button ----
  showButton(anchor: Box): void {
    this.mount();
    this.anchor = anchor;
    const size = 30;
    let top = anchor.top - size - 6;
    if (top < 4) top = anchor.top + 4;
    let left = anchor.right - size - 4;
    left = Math.max(4, Math.min(left, window.innerWidth - size - 4));
    top = Math.max(4, Math.min(top, window.innerHeight - size - 4));
    this.button.style.display = 'flex';
    this.button.style.top = `${top}px`;
    this.button.style.left = `${left}px`;
    if (this.chip.classList.contains('show')) this.placeChip();
    if (this.panelOpen) this.placePanel();
  }

  hideButton(): void {
    this.button.style.display = 'none';
    this.hideChip();
    this.closePanel();
  }

  setBusy(busy: boolean): void {
    this.button.classList.toggle('busy', busy);
    this.button.disabled = busy;
  }

  setBadge(count: number, level: RiskLevel | null): void {
    this.button.classList.remove('low', 'medium', 'high', 'critical');
    if (count > 0 && level) {
      this.badge.style.display = 'block';
      this.badge.textContent = count > 99 ? '99+' : String(count);
      this.button.classList.add(level.toLowerCase());
      this.button.setAttribute('aria-label', `Protect this prompt: ${count} sensitive item${count === 1 ? '' : 's'} found (${level} risk)`);
    } else {
      this.badge.style.display = 'none';
      this.button.setAttribute('aria-label', 'Protect this prompt with P2Shield');
    }
  }

  // ---- chip ----
  private buttonRect(): DOMRect {
    return this.button.getBoundingClientRect();
  }

  private placeChip(): void {
    const b = this.buttonRect();
    const w = this.chip.offsetWidth || 300;
    const h = this.chip.offsetHeight || 40;
    let left = b.right - w;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = b.top - h - 8;
    if (top < 8) top = b.bottom + 8;
    this.chip.style.left = `${left}px`;
    this.chip.style.top = `${top}px`;
  }

  showChip(data: ChipData, autoHideMs = 9000): void {
    this.mount();
    this.chip.replaceChildren();
    const msg = el('div', 'msg');
    msg.append(document.createTextNode(data.message));
    if (data.sub) msg.append(el('span', 'sub', data.sub));
    this.chip.append(msg);
    if (data.undo) {
      const undo = el('button', 'btn', 'Undo');
      undo.type = 'button';
      undo.addEventListener('click', () => this.cb.onUndo());
      this.chip.append(undo);
    }
    if (data.details) {
      const d = el('button', 'btn', 'Details');
      d.type = 'button';
      d.addEventListener('click', () => (this.panelOpen ? this.closePanel() : this.openPanelRequest()));
      this.chip.append(d);
    }
    this.chip.classList.add('show');
    this.placeChip();
    window.clearTimeout(this.chipTimer);
    if (autoHideMs > 0) this.chipTimer = window.setTimeout(() => this.hideChip(), autoHideMs);
  }

  hideChip(): void {
    window.clearTimeout(this.chipTimer);
    this.chip.classList.remove('show');
  }

  // ---- details panel ----
  private pendingResult: AnalysisResult | null = null;
  private profileName = '';

  private openPanelRequest(): void {
    if (this.pendingResult) this.renderPanel(this.pendingResult, this.profileName);
  }

  /** Give the UI the latest result so Details can be opened from the chip. */
  setResult(result: AnalysisResult | null, profileName: string): void {
    this.pendingResult = result;
    this.profileName = profileName;
    if (this.panelOpen && result) this.renderPanel(result, profileName);
  }

  private placePanel(): void {
    const b = this.buttonRect();
    const w = this.panel.offsetWidth || 400;
    const h = this.panel.offsetHeight || 300;
    let left = b.right - w;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = b.top - h - 8;
    if (top < 8) top = Math.min(b.bottom + 8, Math.max(8, window.innerHeight - h - 8));
    this.panel.style.left = `${left}px`;
    this.panel.style.top = `${top}px`;
  }

  closePanel(): void {
    this.panelOpen = false;
    this.panel.classList.remove('show');
  }

  private renderPanel(result: AnalysisResult, profileName: string): void {
    this.mount();
    this.panel.replaceChildren();
    const header = el('header');
    header.append(el('h2', undefined, `Findings · ${profileName} · ${result.mode === 'smart' ? 'Smart' : 'Basic'} mode`));
    const undo = el('button', 'btn', 'Undo all');
    undo.type = 'button';
    undo.addEventListener('click', () => this.cb.onUndo());
    const close = el('button', 'btn', 'Close');
    close.type = 'button';
    close.addEventListener('click', () => this.closePanel());
    header.append(undo, close);

    const list = el('div', 'list');
    if (!result.findings.length) list.append(el('div', 'row', 'Nothing sensitive was found.'));
    for (const f of result.findings) {
      const row = el('label', 'row');
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = f.applied;
      const locked = isCredentialType(f.type) || f.label === 'CONFIDENTIAL_MARKER';
      cb.disabled = locked;
      cb.setAttribute('aria-label', `Protect ${f.label ?? f.type}`);
      cb.addEventListener('change', () => this.cb.onToggle(f.id, cb.checked));
      const body = el('div');
      const top = el('div', 'top');
      top.append(el('span', isCredentialType(f.type) ? 'pill cred' : 'pill', (f.label ?? f.type).replace(/_/g, ' ')));
      top.append(el('span', 'val', previewOf(f)));
      if (f.applied) {
        top.append(el('span', 'arrow', '→'));
        top.append(el('span', 'val', f.replacement));
      }
      const meta = el(
        'div',
        'meta',
        `${f.applied ? f.action.replace('_', ' ').toLowerCase() : 'kept'} · ${Math.round(f.confidence * 100)}% · ${f.source} · ${f.reason}` +
          (f.neededForTask === true ? ' · needed for the task' : ''),
      );
      body.append(top, meta);
      if (isCredentialType(f.type)) body.append(el('div', 'lock', 'Secrets are always removed.'));
      row.append(cb, body);
      list.append(row);
    }
    const footer = el(
      'footer',
      undefined,
      'Analysis ran on this device. Nothing was sent anywhere. Uncheck an item to keep its original value.',
    );
    this.panel.append(header, list, footer);
    this.panel.classList.add('show');
    this.panelOpen = true;
    this.placePanel();
  }

  destroy(): void {
    window.clearTimeout(this.chipTimer);
    this.host.remove();
  }
}
