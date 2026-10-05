# TechKnights Privacy Firewall

A Chrome extension that cleans your prompt **on your own device** before any AI chatbot sees it.

Click the shield that appears in a chat box. The extension finds personal data, credentials and confidential details, replaces them according to a privacy policy, and puts the safe version back in the box. You press Send as usual.

There is no proxy, no server, no account and no analytics. The extension makes no network requests. Raw text never leaves the browser.

Built for the hackathon problem **"Pre-LLM Privacy Firewall for Sensitive Data Protection"**.

## What it does

| Problem statement asks for | How it is covered |
|---|---|
| Detect names, phones, emails, financial data, credentials, health records, confidential data | Rule detectors with checksums (Luhn, Verhoeff, IBAN mod-97), credential patterns, and heuristics for names, medical terms, amounts, confidential markers. Optional on-device AI (Smart mode) for context. |
| Operate before the LLM receives the input | The text is rewritten inside the chat box before you send it. |
| Redaction, anonymization, tokenization | Per-type actions: keep, mask, tokenize (`[PERSON_1]`), redact (`[REDACTED_PHONE]`), generalize (`27` becomes `20-30`, `₹12,50,000` becomes `approx. ₹13 lakh`, a city becomes its state), remove secret. |
| Configurable privacy policies | Four built-in profiles (Personal, Healthcare, Finance, Enterprise), an editable rules table, import/export as JSON, and organization-pushed policy through Chrome managed storage. |
| Risk scoring | 0 to 100 score before and after sanitization, with Low / Medium / High / Critical levels. |
| A safe version of the input | Written into the box, with Undo and a per-item review panel. |

Passwords, API keys, tokens, private keys and credentials in URLs are **always removed**, in every profile. A custom or imported profile cannot change that.

## Install (load unpacked)

```
npm install
npm run build
```

Then in Chrome open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose the `dist` folder.

## Use it

1. Open any AI chatbot, or the demo page (`npm run demo`, then open http://localhost:4173/).
2. Click into the message box. A shield appears just above the top-right corner of the input card (the rounded box that holds the text, the + button and the send button). If the site has no such card, it sits above the text box itself.
3. Type or paste a prompt. A number on the shield shows how many items would be protected, and its colour shows the risk.
4. Click the shield. The box now holds the safe prompt and a note shows `Protected 5 items · Risk 99 → 63`.
5. **Undo** restores your original text. **Details** lists every finding with a checkbox so you can keep an item's original value (except secrets).

Other ways in:

- **Shortcut:** `Alt+Shift+S` protects the focused box (change it at `chrome://extensions/shortcuts`).
- **Right-click** any text box and choose *Protect this text with TechKnights*.
- **Toolbar icon** opens settings and the playground.

The shield shows automatically on common AI sites (ChatGPT, Claude, Gemini, Copilot, Perplexity, DeepSeek, Grok, Mistral, Poe, Meta AI, HuggingChat and more) and on any page where a box looks like a chat prompt (chat-style placeholder, multi-line field, nearby send button). Turn on *Show the shield on every text box* in settings for everything else. The shortcut and right-click menu work everywhere.

### Settings and playground

The settings page has a **Playground** where you can paste text or drop a `.txt`, `.md`, `.csv`, `.json` or `.log` file and see the highlighted findings, risk before and after, and the safe version. It also has the policy editor, site controls and the audit log. PDF and Office files are not supported yet.

## Basic mode and Smart mode

**Basic mode** (default) uses rules and heuristics. It works in every Chromium browser and needs nothing installed.

**Smart mode** adds Chrome's built-in on-device model (Gemini Nano, through the Prompt API). It helps with context: for "what should I ask my doctor about diabetes", it can tell that the diagnosis is needed while the name and ID are not, so profiles with *keep if needed* (Finance, Enterprise) keep the diagnosis and protect the rest. If the model is missing, slow (15 s) or returns something invalid, the extension falls back to Basic mode and tells you.

Important design rules for Smart mode:

- The model **only labels** sensitive items. It never rewrites your prompt. Our code performs every replacement.
- Each label must appear verbatim in your text, otherwise it is discarded (no hallucinated spans).
- Your text is sent to the model as fenced data with an instruction never to follow it, and the model cannot mark a credential as "needed".
- The policy, not the model, makes the final decision.

Requirements (from Chrome's documentation): desktop Chrome on Windows 10/11, macOS 13+, Linux or Chromebook Plus; 22 GB free disk; a GPU with more than 4 GB VRAM or 16 GB RAM with 4+ cores; about 4 GB download on first use; English, Spanish, Japanese, German or French. Check your machine at `chrome://on-device-internals`. Enable the download from the settings page, which needs a click.

## Architecture

```
chat box ──► content script ──► core engine (pure TypeScript, no DOM)
                                   │
                  rule detectors ──┤  email, phone, cards (Luhn), Aadhaar (Verhoeff), PAN, IFSC,
                                   │  bank account, IBAN, UPI, passport, IP, DOB, age, employee ID,
                                   │  API keys, JWT, private keys, passwords, secrets in URLs
                heuristic layer ───┤  names, medical, amounts, confidential markers, places
          Smart labels (optional) ─┤  on-device model: type + "needed for task"
                                   ▼
                  overlap resolver ► policy (profile per data type) ► risk score ► sanitizer
                                   │
                                   ▼
                  safe text written back into the box (verify, Undo, per-item review)
```

- `src/core` has the engine. It has no browser APIs and is fully unit tested.
- `src/content` finds editors, draws the shield in a closed Shadow DOM and writes text back.
- `src/background` handles the shortcut, context menu, metadata-only audit log and the bridge to the model.
- `src/offscreen` hosts the Prompt API, because it is not available in service workers.
- `src/options` is the settings page and playground.

Writing text back is the hard part on real chat sites. Plain inputs use the native value setter plus an `input` event (so React-style state updates). Rich editors get a simulated paste first (ProseMirror, Lexical, Slate, Quill and Draft handle paste through their own model), then browser editing commands, then a text fallback. Every attempt is verified by reading the box back. If all fail, the safe prompt is copied to the clipboard and you are told to paste it.

## Privacy

- No network requests from the extension; no remote code; no analytics.
- Your text and detected values are never logged or stored. The audit log holds only time, site, mode, profile, counts by type, and risk before and after (last 200 entries, with a Clear button).
- Token maps (`[PERSON_1]` back to the real name) exist in memory only.
- The in-page UI is in a closed Shadow DOM so the website cannot read the findings.

Permissions: `storage` (settings and audit log), `contextMenus` (right-click action), `offscreen` (host for the on-device model), `clipboardWrite` (fallback copy of the safe prompt), and a content script on all pages so the shield can appear on any chatbot.

## Organization policy (managed storage)

IT can push settings with Chrome's managed storage (`storage.managed`), for example `profileId`, `lockProfile`, `mode`, `showOnAll`, `disabledSites` and a full `customProfile` (same JSON as an exported profile). See `src/managed_schema.json`. This is implemented but was not tested against a real enterprise policy deployment.

## Known limits

- It reduces accidental exposure. It is not a guarantee. Obfuscated values ("nine eight seven six...") or secrets in unusual formats can slip through.
- Name detection in Basic mode is heuristic (cue phrases, titles and a small name list). Unusual names and non-English text are weaker.
- Only text is handled. Images and scanned documents (OCR) and PDF/Office files are not.
- Restoring real values inside the AI's reply is not implemented.
- Website changes can break box detection or text replacement. The shortcut and right-click menu are the fallback.
- Chromium only. Smart mode is Chrome-only.

## Tests

```
npm test        # 93 unit tests for the engine, policies, risk, Smart-mode merging (mocked model)
npm run typecheck
npm run e2e     # builds a test variant, loads it into Chromium with Playwright, drives the demo page
```

The first e2e run needs a browser: `npx playwright install chromium`.

The end-to-end suite checks, for a plain textarea, a React-style controlled textarea, a plain contenteditable, a model-driven rich editor and a single-line input: the shield appears, the live badge counts, clicking replaces the text, the page's own state receives only the safe text, and Undo restores the original. It also covers multi-line credentials, the details panel, profiles, disabled sites, non-chat fields, the shortcut path, the Smart-mode fallback, the settings page and the audit log contents.

The test build differs from the production build in one way: the shield's Shadow DOM is open so Playwright can reach it.

### What is not automatically tested

- **Real chat sites.** ChatGPT, Claude, Gemini and others need a login and change their markup often, so they are checked by hand (below).
- **Smart mode with a real model.** Playwright's Chromium has no Gemini Nano. The fallback path is tested; the model call itself is only tested with a mock.
- **Organization-managed policy** on a real device.

### Manual checklist for live sites

For each site: open a chat, click into the box, and paste this fictional prompt.

```
I'm Rahul Sharma, phone 98765 43210, email rahul.sharma@gmail.com, Aadhaar 2345 6789 0124. My key is sk-proj-Ab3dEf9hIjKlMnOpQrStUv12. I have type 2 diabetes. What should I ask my doctor?
```

- [ ] Shield appears near the box, with a count after pasting.
- [ ] Clicking it replaces the text (name tokenized, phone masked, Aadhaar and key removed).
- [ ] Press Send: the chat shows the safe text, and the conversation works.
- [ ] Undo restores the original.
- [ ] A multi-line prompt keeps its line breaks.
- [ ] After sending, the box clears and the shield still works for the next message.
- [ ] `Alt+Shift+S` and the right-click action work.

Sites to try: chatgpt.com, claude.ai, gemini.google.com, copilot.microsoft.com, perplexity.ai, chat.deepseek.com, grok.com, chat.mistral.ai.

## Roadmap

- Restore real values in the AI's response using the local token map.
- PDF and DOCX extraction, and OCR for images.
- A local NER model for stronger name detection.
- Hindi and other Indian-language support.
- An organization gateway for apps outside the browser.
- Policy upload (PDF to rules) with admin approval.
- Tamper-evident audit hashes.

## Project layout

```
src/core        detection, policy, risk, sanitizer, Smart-mode helpers (pure TypeScript)
src/content     chat box detection, shield UI, text replacement
src/background  shortcut, context menu, audit log, model bridge
src/offscreen   on-device model host
src/options     settings page and playground
src/shared      settings storage, samples, Prompt API helpers
demo/           demo chat page and a zero-dependency static server
tests/          unit tests
e2e/            Playwright end-to-end run
build.mjs       esbuild bundler and icon generator
```
