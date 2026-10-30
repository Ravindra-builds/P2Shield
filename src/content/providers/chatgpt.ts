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
  private userViews = new Map<HTMLElement, 'safe' | 'original'>();
  private assistantViews = new Map<HTMLElement | HTMLButtonElement, 'restored' | 'raw'>();
  private userRecords = new Map<HTMLElement, PromptRecord>();

  /** Entry point to attach or update ChatGPT user prompt and assistant response action buttons. */
  attachPills(prompts: PromptRecord[], activeMap: Record<string, string>): void {
    // Combine activeMap with any tokens from stored prompts so tokens are never lost across turns
    const effectiveMap: Record<string, string> = { ...activeMap };
    for (const p of prompts) {
      if (p.tokenMap) {
        Object.assign(effectiveMap, p.tokenMap);
      }
    }

    this.attachUserActionButtons(prompts, effectiveMap);
    this.attachAssistantActionButtons(prompts, effectiveMap);
  }

  /** Attach sleek icon button alongside user prompt actions in ChatGPT. */
  private attachUserActionButtons(prompts: PromptRecord[], activeMap: Record<string, string>): void {
    // In ChatGPT, user messages are inside <article> with [data-message-author-role="user"]
    const rawTurns = document.querySelectorAll<HTMLElement>(
      'article:has([data-message-author-role="user"]), [data-message-author-role="user"]',
    );

    for (const raw of rawTurns) {
      // 1. Strictly ignore sidebars, history panels, navigation, and headers
      if (raw.closest('nav, aside, [role="navigation"], [class*="sidebar" i], [class*="history" i], header')) {
        continue;
      }

      // 2. Resolve to the top-level article container
      const turn = raw.closest<HTMLElement>('article') || raw;

      if (
        turn.querySelector('.p2shield-action-host.user-action') ||
        turn.hasAttribute('data-p2shield-user-btn') ||
        turn.closest('[data-p2shield-user-btn]')
      ) {
        continue;
      }

      const text = turn.textContent || '';
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

      turn.setAttribute('data-p2shield-user-btn', 'true');
      this.userRecords.set(turn, record);

      const promptTokens = record.tokenMap ?? {};
      let currentHasOrig = false;
      for (const [surrogate, original] of Object.entries(promptTokens)) {
        if (!surrogate || !original || surrogate === original) continue;
        if (text.includes(original)) currentHasOrig = true;
      }
      if (record.original && text.includes(record.original)) currentHasOrig = true;

      const initialView: 'safe' | 'original' = currentHasOrig ? 'original' : 'safe';
      this.userViews.set(turn, initialView);
      turn.setAttribute('data-p2shield-user-view', initialView);

      // Create isolated shadow host
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

        btn.title = tipText;
        tooltip.textContent = tipText;

        btn.append(icon, dot, tooltip);
      };

      render(initialView);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const currentView = this.userViews.get(turn) ?? initialView;
        const nextView: 'safe' | 'original' = currentView === 'safe' ? 'original' : 'safe';
        this.userViews.set(turn, nextView);
        turn.setAttribute('data-p2shield-user-view', nextView);

        const tokenMap = { ...activeMap, ...(record!.tokenMap ?? {}) };

        if (nextView === 'safe') {
          // Switch to safe view: replace real original data -> synthetic surrogates
          const reverseMap = this.buildReverseMap(tokenMap);
          this.replaceTextInTurn(turn, reverseMap);
        } else {
          // Switch to original view: replace synthetic surrogates -> real original data
          this.replaceTextInTurn(turn, tokenMap);
        }

        render(nextView);
      });

      shadow.appendChild(btn);

      // Insert cleanly into ChatGPT native action bar beside Copy
      this.insertIntoChatGPTActionBar(turn, host, 'user');
    }
  }

  /** Attach sleek icon button alongside assistant response actions (Copy, Read aloud, etc.) in ChatGPT. */
  private attachAssistantActionButtons(prompts: PromptRecord[], activeMap: Record<string, string>): void {
    if (!activeMap || Object.keys(activeMap).length === 0) return;

    // In ChatGPT, assistant action buttons live in the bottom action bar.
    // Modern ChatGPT explicitly tags the assistant response copy button with data-testid="copy-turn-action-button".
    const copyBtns = document.querySelectorAll<HTMLElement>(
      [
        'button[data-testid="copy-turn-action-button"]',
        'button[data-testid="action-bar-copy"]',
        'button[aria-label="Copy response"]',
        'button[aria-label*="Copy response" i]',
        'article:has([data-message-author-role="assistant"]) button[aria-label*="Copy" i]',
        '[data-testid*="conversation-turn"]:has([data-message-author-role="assistant"]) button[aria-label*="Copy" i]',
        '[data-message-author-role="assistant"] ~ * button[aria-label*="Copy" i]',
        '[data-message-author-role="assistant"] + * button[aria-label*="Copy" i]',
      ].join(', '),
    );

    for (const copyBtn of copyBtns) {
      // 1. Strictly ignore sidebars, history panels, navigation, and headers
      if (copyBtn.closest('nav, aside, [role="navigation"], [class*="sidebar" i], [class*="history" i], header')) {
        continue;
      }

      // 2. Strictly ensure this copy button is NOT for a user message
      if (copyBtn.closest('[data-message-author-role="user"]')) {
        continue;
      }
      const article = copyBtn.closest<HTMLElement>('article, [data-testid*="conversation-turn"]');
      if (article && article.querySelector('[data-message-author-role="user"]') && !article.querySelector('[data-message-author-role="assistant"]')) {
        continue;
      }

      // 3. Find the direct flex toolbar holding the assistant buttons
      const flexBar =
        copyBtn.closest<HTMLElement>(
          'div.text-token-text-secondary, div.items-end div.flex, div.items-start div.flex, div.flex.items-center, div.flex',
        ) || copyBtn.parentElement;

      if (!flexBar) continue;

      // Prevent duplicate buttons in the same flex bar
      if (flexBar.querySelector('.p2shield-action-host.assistant-action')) {
        continue;
      }

      // 4. Find the corresponding assistant text container to undo/redo
      const turn = article || copyBtn.closest<HTMLElement>('[data-testid*="conversation-turn"]') || copyBtn.parentElement?.parentElement;
      const textTarget = turn?.querySelector<HTMLElement>('[data-message-author-role="assistant"]') || turn || copyBtn.parentElement;

      // 5. Determine initial view based on whether text currently contains dummy tokens or real private details
      const text = textTarget?.textContent || '';
      let hasSafe = false;
      let hasOrig = false;
      for (const [surrogate, original] of Object.entries(activeMap)) {
        if (!surrogate || !original || surrogate === original) continue;
        if (text.includes(surrogate)) hasSafe = true;
        if (text.includes(original)) hasOrig = true;
      }

      const initialView: 'restored' | 'raw' = hasSafe && !hasOrig ? 'raw' : 'restored';
      textTarget?.setAttribute('data-p2shield-view', initialView);

      // Create isolated shadow host
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

        btn.title = tipText;
        tooltip.textContent = tipText;

        btn.append(icon, dot, tooltip);
      };

      render(initialView);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const currentView = this.assistantViews.get(btn) ?? initialView;
        const nextView: 'restored' | 'raw' = currentView === 'restored' ? 'raw' : 'restored';
        this.assistantViews.set(btn, nextView);

        if (textTarget) {
          textTarget.setAttribute('data-p2shield-view', nextView);
          if (nextView === 'raw') {
            // Undo: flip restored real details back to raw synthetic surrogate values
            const reverseMap = this.buildReverseMap(activeMap);
            this.replaceTextInTurn(textTarget, reverseMap);
          } else {
            // Redo: restore real private details
            this.replaceTextInTurn(textTarget, activeMap);
          }
        }

        render(nextView);
      });

      shadow.appendChild(btn);

      // 6. Insert immediately next to Copy button in the ChatGPT assistant toolbar
      const directChild =
        copyBtn.parentElement && copyBtn.parentElement !== flexBar
          ? copyBtn.parentElement
          : copyBtn;
      flexBar.insertBefore(host, directChild.nextSibling);
    }
  }

  /**
   * Inserts the button into ChatGPT's native action bar (next to Copy).
   * Keeps the button on the exact same row as native Copy / Edit tools.
   */
  private insertIntoChatGPTActionBar(turn: HTMLElement, host: HTMLElement, role: 'user' | 'assistant'): void {
    const copySelector =
      role === 'assistant'
        ? 'button[aria-label*="Copy" i], button[data-testid*="copy" i], button[data-testid="copy-turn-action-button"], button[aria-label*="Share" i]'
        : 'button[aria-label*="Copy" i], button[data-testid*="copy" i], button[aria-label*="Edit" i]';

    const copyBtn = turn.querySelector<HTMLElement>(copySelector);

    if (copyBtn) {
      const flexBar =
        copyBtn.closest<HTMLElement>(
          'div.text-token-text-secondary, div.items-end div.flex, div.items-start div.flex, div.flex.items-center, div.flex',
        ) || copyBtn.parentElement;

      if (flexBar) {
        if (flexBar.querySelector(`.p2shield-action-host.${role}-action`)) {
          return;
        }
        const directChild =
          copyBtn.parentElement && copyBtn.parentElement !== flexBar
            ? copyBtn.parentElement
            : copyBtn;
        flexBar.insertBefore(host, directChild.nextSibling);
        return;
      }
    }

    // Fallback: look for ChatGPT action row container within turn
    const actionBar = turn.querySelector<HTMLElement>('div.text-token-text-secondary, div.items-end div.flex, div.flex.items-center');
    if (actionBar && !actionBar.querySelector(`.p2shield-action-host.${role}-action`)) {
      actionBar.appendChild(host);
    }
  }

  /** Builds a reversed map of original values to synthetic surrogates, sorted by descending original length. */
  private buildReverseMap(tokenMap: Record<string, string>): Record<string, string> {
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
          parent.closest('p2shield-host')
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
}
