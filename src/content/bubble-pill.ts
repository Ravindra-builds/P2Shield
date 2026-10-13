// Native Action Bar Integration for Message Turns (ChatGPT, Gemini, Claude, Grok).
// Replaces bulky pills with sleek, native-matching icon buttons placed alongside Copy / Edit tools.
// Provides 100% reliable two-way toggling without breaking Gemini/ChatGPT layout.

import { restore } from '../core/vault';

export interface PromptRecord {
  original: string;
  safe: string;
  tokenMap: Record<string, string>;
  timestamp: number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

const ACTION_BTN_CSS = `
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

export const USER_BUBBLE_SELECTOR = [
  '[data-message-author-role="user"]',
  '[data-role="user"]',
  'user-query',
  'user-query-container',
  '.user-query-container',
  '.query-text',
  '.user-turn',
  'article:not(:has([data-message-author-role="assistant"]))',
  '[data-testid*="user-message"]',
  '[data-testid*="user-turn"]',
  '[data-testid="user-message"]',
  '.font-user-message',
  '.user-message',
  '.user-bubble',
  '.user-prompt',
  'div[class*="ThreadQuery"]',
  'div[class*="bg-offsetPlus"]',
  '[data-testid="query"]',
  '[data-testid*="thread-title"]',
  'div:has(> button[aria-label*="Edit" i]):not(:has(div[class*="prose"]))',
  'div:has(button[aria-label*="Edit query" i])',
].join(', ');

export class BubblePillManager {
  private prompts: PromptRecord[] = [];
  private assistantTurns = new Map<HTMLElement, Record<string, string>>();
  private assistantViews = new Map<HTMLElement, 'restored' | 'raw'>();
  private userViews = new Map<HTMLElement, 'safe' | 'original'>();
  private userRecords = new Map<HTMLElement, PromptRecord>();
  private activeMap: Record<string, string> = {};

  /** Record prompt when sanitized. */
  recordPrompt(original: string, safe: string, tokenMap: Record<string, string>): void {
    if (!original || !safe) return;
    this.prompts.unshift({
      original,
      safe,
      tokenMap,
      timestamp: Date.now(),
    });
    if (this.prompts.length > 30) this.prompts.pop();
  }

  /** Record an assistant response turn where unmasking occurred. */
  recordAssistantTurn(turnContainer: HTMLElement, tokenMap: Record<string, string>): void {
    if (!turnContainer || !tokenMap || Object.keys(tokenMap).length === 0) return;
    const existing = this.assistantTurns.get(turnContainer) ?? {};
    this.assistantTurns.set(turnContainer, { ...existing, ...tokenMap });
  }

  /** Attach dual-view native icon buttons to user turns and assistant response turns. */
  attachPills(activeMap: Record<string, string>): void {
    if (activeMap && Object.keys(activeMap).length > 0) {
      this.activeMap = { ...this.activeMap, ...activeMap };
    }
    this.attachUserActionButtons(this.activeMap);
    this.attachAssistantActionButtons();
  }

  /** Attach sleek icon button alongside user prompt actions. */
  private attachUserActionButtons(activeMap: Record<string, string>): void {
    // Find top-level user turn containers across platforms (Gemini: user-query-container / user-query, ChatGPT: article / user message, Perplexity: query container / h1)
    const rawTurns = document.querySelectorAll<HTMLElement>(
      [
        'user-query-container',
        '.user-query-container',
        'user-query',
        'article:has(button[aria-label*="Edit" i])',
        'article:not(:has([data-message-author-role="assistant"]))',
        '[data-message-author-role="user"]',
        '[data-role="user"]',
        '.message-row.user',
        '[data-testid*="user-message"]',
        '[data-testid*="user-turn"]',
        'div[class*="ThreadQuery"]',
        'div[class*="bg-offsetPlus"]',
        '[data-testid="query"]',
        'div:has(button[aria-label*="Edit" i]):not(:has(div[class*="prose"])):not(:has([data-message-author-role="assistant"]))',
        'div:has(> button[aria-label*="Edit" i])',
      ].join(', '),
    );

    for (const raw of rawTurns) {
      // Find the definitive top-level turn container:
      // For Gemini: resolve to user-query-container (holds prompt + copy/edit buttons together)
      // For ChatGPT: resolve to the user article
      // For Perplexity: resolve to the query container
      const turn =
        raw.closest<HTMLElement>('user-query-container, .user-query-container') ||
        raw.closest<HTMLElement>('article') ||
        raw.closest<HTMLElement>('div:has(button[aria-label*="Edit" i]), user-query, div[class*="ThreadQuery"], div[class*="bg-offsetPlus"], [data-testid="query"]') ||
        raw;

      if (turn.querySelector('.p2shield-action-host.user-action') || turn.hasAttribute('data-p2shield-user-btn')) {
        continue;
      }

      const text = turn.textContent || '';
      if (!text.trim()) continue;

      // Find matching prompt record
      let record = this.prompts.find(
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

      turn.setAttribute('data-p2shield-user-btn', 'true');
      this.userRecords.set(turn, record);

      const initialView: 'safe' | 'original' =
        normalize(text).includes(normalize(record.original)) && !normalize(text).includes(normalize(record.safe))
          ? 'original'
          : 'safe';
      this.userViews.set(turn, initialView);

      // Create isolated shadow host
      const host = document.createElement('div');
      host.className = 'p2shield-action-host user-action';

      const shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = ACTION_BTN_CSS;
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

        btn.title = tipText;
        tooltip.textContent = tipText;

        btn.append(icon, dot, tooltip);
      };

      render(initialView);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const currentView = this.userViews.get(turn) ?? 'safe';
        const nextView: 'safe' | 'original' = currentView === 'safe' ? 'original' : 'safe';
        this.userViews.set(turn, nextView);

        // Update text in message without touching the action button
        const textTarget = this.findTextTarget(turn);
        if (textTarget) {
          textTarget.textContent = nextView === 'safe' ? record!.safe : record!.original;
        }

        render(nextView);
      });

      shadow.appendChild(btn);

      // Insert seamlessly into native action bar or clean footer
      this.insertIntoActionBar(turn, host, 'user');
    }
  }

  /** Attach sleek icon button alongside assistant response actions (Copy, Share, etc.). */
  private attachAssistantActionButtons(): void {
    for (const [rawTurn, tokenMap] of this.assistantTurns.entries()) {
      if (!rawTurn.isConnected) continue;

      // Prefer outer container (article for ChatGPT, model-response for Gemini, answer container for Perplexity)
      const turn =
        rawTurn.closest<HTMLElement>('article') ||
        rawTurn.closest<HTMLElement>('model-response') ||
        rawTurn.closest<HTMLElement>('div[class*="Answer" i], div[class*="answer" i], div[data-testid*="answer" i], div.prose, [data-testid*="assistant"]') ||
        rawTurn;

      if (
        turn.querySelector('.p2shield-action-host.assistant-action') ||
        turn.hasAttribute('data-p2shield-assistant-btn') ||
        turn.matches(USER_BUBBLE_SELECTOR) ||
        turn.closest(USER_BUBBLE_SELECTOR)
      ) {
        continue;
      }
      const combinedMap = { ...this.activeMap, ...tokenMap };
      if (Object.keys(combinedMap).length === 0) continue;

      turn.setAttribute('data-p2shield-assistant-btn', 'true');
      turn.setAttribute('data-p2shield-view', 'restored');
      this.assistantViews.set(turn, 'restored');

      const host = document.createElement('div');
      host.className = 'p2shield-action-host assistant-action';

      const shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = ACTION_BTN_CSS;
      shadow.appendChild(style);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'action-btn restored';

      const tooltip = document.createElement('span');
      tooltip.className = 'tooltip';

      const render = (view: 'restored' | 'raw') => {
        btn.className = `action-btn ${view}`;
        btn.replaceChildren();

        const icon = view === 'restored' ? shieldIcon() : eyeIcon();
        const dot = document.createElement('span');
        dot.className = 'dot';

        const tipText = view === 'restored' ? 'Restored' : 'Raw AI';

        btn.title = tipText;
        tooltip.textContent = tipText;

        btn.append(icon, dot, tooltip);
      };

      render('restored');

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const nextView = this.toggleAssistantView(turn);
        render(nextView);
      });

      shadow.appendChild(btn);

      // Insert directly into native action bar next to Copy icon
      this.insertIntoActionBar(turn, host, 'assistant');
    }
  }

  /** Two-way live text node flipping for assistant responses. */
  toggleAssistantView(turn: HTMLElement): 'restored' | 'raw' {
    const currentView = this.assistantViews.get(turn) ?? 'restored';
    const nextView: 'restored' | 'raw' = currentView === 'restored' ? 'raw' : 'restored';
    this.assistantViews.set(turn, nextView);
    turn.setAttribute('data-p2shield-view', nextView);

    const tokenMap = {
      ...this.activeMap,
      ...(this.assistantTurns.get(turn) ?? {}),
    };
    if (Object.keys(tokenMap).length === 0) return nextView;

    if (nextView === 'raw') {
      // Reverse map: original private details -> surrogate dummy tokens
      // Sort originals by descending length so "Ravindra Kumar" replaces before "Ravindra"
      const entries = Object.entries(tokenMap)
        .filter(([surrogate, original]) => Boolean(original && surrogate && original !== surrogate))
        .sort((a, b) => b[1].length - a[1].length);

      const reverseMap: Record<string, string> = {};
      for (const [surrogate, original] of entries) {
        if (!reverseMap[original]) {
          reverseMap[original] = surrogate;
        }
      }
      this.replaceTextInTurn(turn, reverseMap);
    } else {
      // Forward map: surrogate dummy tokens -> original private details
      this.replaceTextInTurn(turn, tokenMap);
    }

    return nextView;
  }

  /** Replaces text across live connected nodes without depending on stale node references. */
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
          parent.closest(USER_BUBBLE_SELECTOR)
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
        }
      }
    }
  }

  /**
   * Inserts the button into the native action bar (next to Copy / Edit) across Gemini, ChatGPT, Claude, Grok, Perplexity.
   * Keeps the button on the exact same row as the native action buttons.
   */
  private insertIntoActionBar(turn: HTMLElement, host: HTMLElement, role: 'user' | 'assistant'): void {
    // 1. Try finding native copy or edit button to place right beside it (STRICTLY WITHIN TURN!)
    const copyOrEditBtn = turn.querySelector<HTMLElement>(
      'button[aria-label*="Copy" i], button[mattooltip*="Copy" i], button[data-test-id*="copy" i], button[data-test-id="copy-button"], button[data-testid*="copy" i], button[aria-label*="Edit" i], button[mattooltip*="Edit" i], button[data-testid*="edit" i]',
    );

    if (copyOrEditBtn) {
      // Find the direct flex toolbar holding the buttons (Gemini actions-container, ChatGPT text-token-text-secondary, Perplexity flex)
      const flexBar =
        copyOrEditBtn.closest<HTMLElement>(
          'response-actions, .actions-container, .action-container, div[class*="actions"], .user-query-container, div.text-token-text-secondary, div.items-end div.flex, div.items-start div.flex, div.flex.items-center, div.flex',
        ) || copyOrEditBtn.parentElement;

      if (flexBar) {
        // If button is inside a tooltip wrapper span, insert next to the span so it's a direct sibling in the flex bar
        const directChild =
          copyOrEditBtn.parentElement && copyOrEditBtn.parentElement !== flexBar
            ? copyOrEditBtn.parentElement
            : copyOrEditBtn;
        flexBar.insertBefore(host, directChild.nextSibling);
        return;
      }
    }

    // 2. Try finding native action container within turn
    const actionBar = turn.querySelector<HTMLElement>(
      'response-actions, .actions-container, .action-container, div[class*="actions"], .user-query-container, div.text-token-text-secondary, div.items-end div.flex, div.items-start div.flex, div.flex.items-center.gap-x-1, div[class*="footer"], div[class*="bottom-bar"], [class*="toolbar"]',
    );

    if (actionBar) {
      actionBar.appendChild(host);
      return;
    }

    // 3. Fallback: create a non-intrusive action row container at the bottom of the turn
    let row = turn.querySelector<HTMLElement>(':scope > .p2shield-action-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'p2shield-action-row';
      row.style.cssText = `display: flex !important; justify-content: ${
        role === 'user' ? 'flex-end' : 'flex-start'
      } !important; align-items: center !important; margin-top: 4px !important; width: 100% !important; clear: both !important;`;
      turn.appendChild(row);
    }
    row.appendChild(host);
  }

  private findTextTarget(container: HTMLElement): HTMLElement | null {
    const textChild = container.querySelector<HTMLElement>(
      '.whitespace-pre-wrap, .query-text, .user-turn, [data-message-author-role="user"] > div, .font-user-message, div.font-display, h1.font-display, .whitespace-pre-line',
    );
    if (textChild && !textChild.classList.contains('p2shield-action-host')) {
      return textChild;
    }
    for (const child of Array.from(container.children)) {
      if (!child.classList.contains('p2shield-action-host') && child instanceof HTMLElement) {
        return child;
      }
    }
    return container;
  }
}
