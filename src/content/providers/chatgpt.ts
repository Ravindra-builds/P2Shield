// Dedicated Provider Adapter for OpenAI ChatGPT (chatgpt.com & chat.openai.com)
// Provides clean, native-matching action bar integration for user prompts and assistant responses.
// Completely isolated from other AI providers so changes here never affect Gemini, Claude, Grok, or Perplexity.

import { restore } from '../../core/vault';
import type { PromptRecord } from '../bubble-pill';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function isChatGptHost(host?: string): boolean {
  try {
    const h = (host || window.location.hostname || '').toLowerCase();
    return (
      h === 'chatgpt.com' ||
      h.endsWith('.chatgpt.com') ||
      h === 'chat.openai.com' ||
      h.endsWith('.openai.com')
    );
  } catch {
    return false;
  }
}

const CHATGPT_ACTION_BTN_CSS = `
:host {
  display: inline-flex !important;
  all: initial !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif !important;
  pointer-events: auto !important;
  position: relative !important;
  vertical-align: middle !important;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: #94a3b8;
  padding: 0;
  margin: 0 2px;
  transition: all 0.15s ease-in-out;
  outline: none;
  position: relative;
  user-select: none;
}

.action-btn:hover {
  background: rgba(148, 163, 184, 0.15);
  color: #f1f5f9;
  transform: scale(1.06);
}

.action-btn:active {
  transform: scale(0.96);
}

.action-btn.safe, .action-btn.restored {
  color: #10b981;
}

.action-btn.safe:hover, .action-btn.restored:hover {
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.25);
}

.action-btn.original, .action-btn.raw {
  color: #f59e0b;
}

.action-btn.original:hover, .action-btn.raw:hover {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.25);
}

.action-btn svg {
  width: 16px;
  height: 16px;
  display: block;
}

/* Micro-badge dot on icon */
.dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

/* Tooltip */
.tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #f1f5f9;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
  z-index: 2147483647;
}

.action-btn:hover .tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}
`;

function shieldIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z');

  const check = document.createElementNS(SVG_NS, 'path');
  check.setAttribute('d', 'm9 12 2 2 4-4');

  svg.append(path, check);
  return svg;
}

function eyeIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z');

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '12');
  circle.setAttribute('cy', '12');
  circle.setAttribute('r', '3');

  svg.append(path, circle);
  return svg;
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

export class ChatGptProvider {
  private userViews = new Map<HTMLElement | HTMLButtonElement, 'safe' | 'original'>();
  private assistantViews = new Map<HTMLElement | HTMLButtonElement, 'restored' | 'raw'>();
  private latestEffectiveMap: Record<string, string> = {};
  private latestPrompts: PromptRecord[] = [];

  /** Entry point to attach or update ChatGPT user prompt and assistant response action buttons. */
  attachPills(prompts: PromptRecord[], activeMap: Record<string, string>): void {
    this.latestPrompts = prompts;
    this.latestEffectiveMap = { ...this.latestEffectiveMap, ...activeMap };
    for (const p of prompts) {
      if (p.tokenMap) {
        Object.assign(this.latestEffectiveMap, p.tokenMap);
      }
    }
    const effectiveMap = { ...this.latestEffectiveMap };

    this.attachUserTurns(prompts, effectiveMap);
    this.attachAssistantTurns(effectiveMap);
  }

  /** Retrieve the latest active token map across all prompt records and vault. */
  private getLatestTokenMap(record?: PromptRecord): Record<string, string> {
    const map: Record<string, string> = { ...this.latestEffectiveMap };
    if (record?.tokenMap) {
      Object.assign(map, record.tokenMap);
    }
    for (const p of this.latestPrompts) {
      if (p.tokenMap) {
        Object.assign(map, p.tokenMap);
      }
    }
    return map;
  }

  private isIgnoredNavigation(el: HTMLElement): boolean {
    return Boolean(
      el.closest('nav, aside, [role="navigation"], [class*="sidebar" i], [class*="history" i], header'),
    );
  }

  /** Locate all user prompt turns in ChatGPT and attach Protected/Original toggle buttons. */
  private attachUserTurns(prompts: PromptRecord[], activeMap: Record<string, string>): void {
    const userTurns: HTMLElement[] = [];

    // 1. Find by author role
    const roleEls = document.querySelectorAll<HTMLElement>(
      '[data-message-author-role="user"], div.font-user-message',
    );
    for (const el of roleEls) {
      if (this.isIgnoredNavigation(el)) continue;
      const turn =
        el.closest<HTMLElement>('article, [data-testid*="conversation-turn"], [data-testid*="turn"]') ||
        el.parentElement ||
        el;
      if (!userTurns.includes(turn)) userTurns.push(turn);
    }

    // 2. Find by user edit button (Edit pencil button exists only on user prompts in ChatGPT)
    const editBtns = document.querySelectorAll<HTMLElement>(
      'button[aria-label*="Edit" i], button[data-testid*="edit" i]',
    );
    for (const btn of editBtns) {
      if (this.isIgnoredNavigation(btn)) continue;
      if (btn.closest('form')) continue;
      const turn =
        btn.closest<HTMLElement>('article, [data-testid*="conversation-turn"], [data-testid*="turn"]') ||
        btn.parentElement?.parentElement;
      if (turn && !userTurns.includes(turn)) userTurns.push(turn);
    }

    // 3. Attach button to each discovered user turn
    for (const turn of userTurns) {
      if (turn.querySelector('.p2shield-action-host.user-action')) continue;

      const textTarget =
        turn.querySelector<HTMLElement>('.whitespace-pre-wrap, [data-message-author-role="user"], div.font-user-message') ||
        turn;

      const text = textTarget.textContent || turn.textContent || '';
      if (!text.trim()) continue;

      // Find matching prompt record
      let record = prompts.find(
        (p) =>
          normalize(text).includes(normalize(p.safe)) ||
          normalize(p.safe).includes(normalize(text)) ||
          normalize(text).includes(normalize(p.original)) ||
          normalize(p.original).includes(normalize(text)),
      );

      // Reconstruct using activeMap if any token is present
      if (!record && activeMap && Object.keys(activeMap).length > 0) {
        let hasMatch = false;
        for (const [synth, orig] of Object.entries(activeMap)) {
          if ((synth && text.includes(synth)) || (orig && text.includes(orig))) {
            hasMatch = true;
            break;
          }
        }
        if (hasMatch) {
          let origText = text;
          let safeText = text;
          for (const [synth, orig] of Object.entries(activeMap)) {
            if (!synth || !orig) continue;
            origText = origText.split(synth).join(orig);
            safeText = safeText.split(orig).join(synth);
          }
          if (origText !== safeText) {
            record = {
              original: origText,
              safe: safeText,
              tokenMap: activeMap,
              timestamp: Date.now(),
            };
          }
        }
      }

      if (!record) continue;

      const promptTokens = record.tokenMap ?? activeMap;
      let currentHasOrig = false;
      for (const [surrogate, original] of Object.entries(promptTokens)) {
        if (!surrogate || !original || surrogate === original) continue;
        if (text.includes(original)) currentHasOrig = true;
      }
      if (record.original && text.includes(record.original)) currentHasOrig = true;

      const initialView: 'safe' | 'original' = currentHasOrig ? 'original' : 'safe';
      this.attachUserButtonToTurn(turn, textTarget, initialView, record, activeMap);
    }
  }

  /** Attach sleek icon button to a ChatGPT user prompt turn. */
  private attachUserButtonToTurn(
    turn: HTMLElement,
    textTarget: HTMLElement,
    initialView: 'safe' | 'original',
    record: PromptRecord,
    activeMap: Record<string, string>,
  ): void {
    const host = document.createElement('div');
    host.className = 'p2shield-action-host user-action';

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CHATGPT_ACTION_BTN_CSS;
    shadow.appendChild(style);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `action-btn ${initialView}`;

    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip';

    const render = (view: 'safe' | 'original') => {
      btn.className = `action-btn ${view}`;
      btn.replaceChildren();

      const icon = view === 'safe' ? shieldIcon() : eyeIcon();
      const dot = document.createElement('span');
      dot.className = 'dot';

      const tipText = view === 'safe' ? 'Protected' : 'Original';

      btn.setAttribute('aria-label', tipText);
      tooltip.textContent = tipText;

      btn.append(icon, dot, tooltip);
    };

    render(initialView);
    this.userViews.set(btn, initialView);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const liveTurn =
        host.closest<HTMLElement>('article, [data-testid*="conversation-turn"], [data-testid*="turn"]') ||
        turn;

      const currentView: 'safe' | 'original' =
        (liveTurn.getAttribute('data-p2shield-user-view') as 'safe' | 'original') ||
        this.userViews.get(btn) ||
        initialView;
      const nextView: 'safe' | 'original' = currentView === 'safe' ? 'original' : 'safe';
      this.userViews.set(btn, nextView);
      liveTurn.setAttribute('data-p2shield-user-view', nextView);

      // Dynamically resolve latest active tokens across all prompt records and vault
      const tokenMap = this.getLatestTokenMap(record);

      if (nextView === 'safe') {
        const reverseMap = this.buildReverseMap(tokenMap);
        this.replaceTextInTurn(liveTurn, reverseMap);
      } else {
        this.replaceTextInTurn(liveTurn, tokenMap);
      }

      render(nextView);
    });

    shadow.appendChild(btn);

    // Placement:
    // 1. Try finding native edit or copy button within user turn
    const nativeBtn = turn.querySelector<HTMLElement>(
      'button[aria-label*="Edit" i], button[data-testid*="edit" i], button[aria-label*="Copy" i], button[data-testid*="copy" i]',
    );

    if (nativeBtn) {
      const flexBar =
        nativeBtn.closest<HTMLElement>(
          'div.text-token-text-secondary, div.items-end div.flex, div.items-start div.flex, div.flex.items-center.gap-x-1, div.flex.items-center, div.flex',
        ) || nativeBtn.parentElement;

      if (flexBar) {
        const directChild =
          nativeBtn.parentElement && nativeBtn.parentElement !== flexBar
            ? nativeBtn.parentElement
            : nativeBtn;
        flexBar.insertBefore(host, directChild.nextSibling);
        return;
      }
    }

    // 2. Fallback: place in sleek .p2shield-user-toolbar right below user bubble
    const bubble =
      turn.querySelector<HTMLElement>('[data-message-author-role="user"]') ||
      textTarget.parentElement ||
      textTarget;

    let toolbar = turn.querySelector<HTMLElement>('.p2shield-user-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'p2shield-user-toolbar';
      toolbar.style.cssText =
        'display: flex !important; justify-content: flex-end !important; align-items: center !important; margin-top: 4px !important; gap: 4px !important; width: 100% !important; clear: both !important;';
      bubble.insertAdjacentElement('afterend', toolbar);
    }
    toolbar.appendChild(host);
  }

  /** Locate all assistant response turns in ChatGPT and attach Restored/Raw AI toggle buttons. */
  private attachAssistantTurns(activeMap: Record<string, string>): void {
    if (!activeMap || Object.keys(activeMap).length === 0) return;

    const assistantTurns: HTMLElement[] = [];

    // 1. Find by author role assistant
    const roleEls = document.querySelectorAll<HTMLElement>(
      '[data-message-author-role="assistant"], div.markdown.prose, div.prose',
    );
    for (const el of roleEls) {
      if (this.isIgnoredNavigation(el)) continue;
      if (el.closest('[data-message-author-role="user"], .p2shield-user-toolbar')) continue;
      const turn =
        el.closest<HTMLElement>('article, [data-testid*="conversation-turn"], [data-testid*="turn"]') ||
        el.parentElement ||
        el;
      if (turn.querySelector('[data-message-author-role="user"]') && !turn.querySelector('[data-message-author-role="assistant"]')) continue;
      if (!assistantTurns.includes(turn)) assistantTurns.push(turn);
    }

    // 2. Find by assistant response actions (Copy button, excluding code blocks)
    const copyBtns = document.querySelectorAll<HTMLElement>(
      'button[aria-label*="Copy" i], button[data-testid*="copy" i]',
    );
    for (const btn of copyBtns) {
      if (this.isIgnoredNavigation(btn)) continue;
      if (btn.closest('pre, code, [data-message-author-role="user"], .p2shield-user-toolbar')) continue;
      const turn =
        btn.closest<HTMLElement>('article, [data-testid*="conversation-turn"], [data-testid*="turn"]') ||
        btn.parentElement?.parentElement;
      if (turn && !assistantTurns.includes(turn)) {
        if (!turn.querySelector('[data-message-author-role="user"]') || turn.querySelector('[data-message-author-role="assistant"]')) {
          assistantTurns.push(turn);
        }
      }
    }

    // 3. Attach button to each discovered assistant turn
    for (const turn of assistantTurns) {
      if (turn.querySelector('.p2shield-action-host.assistant-action')) continue;

      const textTarget =
        turn.querySelector<HTMLElement>('.markdown, .prose, [data-message-author-role="assistant"]') ||
        turn;

      const text = textTarget.textContent || turn.textContent || '';
      let hasSafe = false;
      let hasOrig = false;
      for (const [surrogate, original] of Object.entries(activeMap)) {
        if (!surrogate || !original || surrogate === original) continue;
        if (text.includes(surrogate)) hasSafe = true;
        if (text.includes(original)) hasOrig = true;
      }

      const initialView: 'restored' | 'raw' = hasSafe && !hasOrig ? 'raw' : 'restored';
      this.attachAssistantButtonToTurn(turn, textTarget, initialView, activeMap);
    }
  }

  /** Attach sleek icon button to a ChatGPT assistant response turn. */
  private attachAssistantButtonToTurn(
    turn: HTMLElement,
    textTarget: HTMLElement,
    initialView: 'restored' | 'raw',
    activeMap: Record<string, string>,
  ): void {
    turn.setAttribute('data-p2shield-view', initialView);
    textTarget.setAttribute('data-p2shield-view', initialView);

    const host = document.createElement('div');
    host.className = 'p2shield-action-host assistant-action';

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CHATGPT_ACTION_BTN_CSS;
    shadow.appendChild(style);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `action-btn ${initialView}`;

    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip';

    const render = (view: 'restored' | 'raw') => {
      btn.className = `action-btn ${view}`;
      btn.replaceChildren();

      const icon = view === 'restored' ? shieldIcon() : eyeIcon();
      const dot = document.createElement('span');
      dot.className = 'dot';

      const tipText = view === 'restored' ? 'Restored' : 'Raw AI';

      btn.setAttribute('aria-label', tipText);
      tooltip.textContent = tipText;

      btn.append(icon, dot, tooltip);
    };

    render(initialView);
    this.assistantViews.set(btn, initialView);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const liveTurn =
        host.closest<HTMLElement>('article, [data-testid*="conversation-turn"], [data-testid*="turn"]') ||
        turn;

      const currentView: 'restored' | 'raw' =
        (liveTurn.getAttribute('data-p2shield-view') as 'restored' | 'raw') ||
        this.assistantViews.get(btn) ||
        initialView;
      const nextView: 'restored' | 'raw' = currentView === 'restored' ? 'raw' : 'restored';
      this.assistantViews.set(btn, nextView);
      liveTurn.setAttribute('data-p2shield-view', nextView);

      // Dynamically resolve latest active tokens across all prompt records and vault
      const tokenMap = this.getLatestTokenMap();

      if (nextView === 'raw') {
        const reverseMap = this.buildReverseMap(tokenMap);
        this.replaceTextInTurn(liveTurn, reverseMap);
      } else {
        this.replaceTextInTurn(liveTurn, tokenMap);
      }

      render(nextView);
    });

    shadow.appendChild(btn);

    // Placement:
    // 1. Try finding native action toolbar with Copy, Good response, Read aloud, or Try again
    const nativeBtn = turn.querySelector<HTMLElement>(
      'button[aria-label*="Copy" i], button[data-testid*="copy" i], button[aria-label*="Good response" i], button[aria-label*="Read aloud" i], button[aria-label*="Try again" i]',
    );

    if (nativeBtn) {
      const flexBar =
        nativeBtn.closest<HTMLElement>(
          'div.text-token-text-secondary, div.items-start div.flex, div.flex.items-center.gap-x-1, div.flex.items-center, div.flex',
        ) || nativeBtn.parentElement;

      if (flexBar) {
        const directChild =
          nativeBtn.parentElement && nativeBtn.parentElement !== flexBar
            ? nativeBtn.parentElement
            : nativeBtn;
        flexBar.insertBefore(host, directChild.nextSibling);
        return;
      }
    }

    // 2. Fallback: place in sleek .p2shield-assistant-toolbar right below assistant response
    let toolbar = turn.querySelector<HTMLElement>('.p2shield-assistant-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'p2shield-assistant-toolbar';
      toolbar.style.cssText =
        'display: flex !important; justify-content: flex-start !important; align-items: center !important; margin-top: 6px !important; gap: 4px !important; width: 100% !important; clear: both !important;';
      textTarget.insertAdjacentElement('afterend', toolbar);
    }
    toolbar.appendChild(host);
  }

  /** Builds a reversed map of original values to synthetic surrogates, sorted by descending original length. */
  buildReverseMap(tokenMap: Record<string, string>): Record<string, string> {
    const entries = Object.entries(tokenMap)
      .filter(([surrogate, original]) => Boolean(original && surrogate && original !== surrogate))
      .sort((a, b) => b[1].length - a[1].length);

    const reverseMap: Record<string, string> = {};
    for (const [surrogate, original] of entries) {
      if (!reverseMap[original]) {
        reverseMap[original] = surrogate;
      }
    }
    return reverseMap;
  }

  /** Replaces text across live connected nodes without wiping DOM hierarchies or breaking React reconciler. */
  private replaceTextInTurn(turn: HTMLElement, map: Record<string, string>): void {
    if (!map || Object.keys(map).length === 0) return;
    const walker = document.createTreeWalker(turn, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (
          !parent ||
          parent.tagName === 'P2SHIELD-HOST' ||
          parent.classList.contains('p2shield-action-host') ||
          parent.closest('.p2shield-action-host') ||
          parent.closest('p2shield-host') ||
          parent.closest('button') ||
          parent.closest('.p2shield-user-toolbar') ||
          parent.closest('.p2shield-assistant-toolbar')
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let current: Node | null;
    while ((current = walker.nextNode())) {
      const val = current.nodeValue;
      if (val) {
        const replaced = restore(val, map);
        if (replaced !== val) {
          current.nodeValue = replaced;
          (current as CharacterData).data = replaced;
        }
      }
    }
  }
}
