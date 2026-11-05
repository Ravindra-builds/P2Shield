<p align="center">
  <img src="p2shield-logo.png" alt="P2Shield logo" width="130" />
</p>

<h1 align="center">P2Shield</h1>

<p align="center">
  <strong>Pre-LLM Client-Side Privacy Firewall for Generative AI</strong><br />
  <em>Intercepts, sanitizes, and replaces sensitive data with natural surrogates before it reaches AI providers — and seamlessly restores confidential values in AI responses in real-time.</em>
</p>

<p align="center">
  <a href="https://p2shield.vercel.app/"><img alt="Live Demo" src="https://img.shields.io/badge/Demo-Live%20on%20Vercel-000000?style=flat&logo=vercel&logoColor=white" /></a>
  <img alt="Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?style=flat&logo=googlechrome&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat&logo=typescript&logoColor=white" />
  <img alt="Processing" src="https://img.shields.io/badge/Processing-100%25%20On--Device-2E9E5B?style=flat" />
  <img alt="Network" src="https://img.shields.io/badge/Network%20Calls-0%20(Zero%20Telemetry)-2E9E5B?style=flat" />
  <img alt="Tests" src="https://img.shields.io/badge/Tests-203%20Passing-brightgreen?style=flat&logo=vitest&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow?style=flat" />
</p>

<p align="center">
  Team <strong>TechKnights</strong> · BITSHIFT 2026 · Problem Statement 10:<br />
  <em>Pre-LLM Privacy Firewall for Sensitive Data Protection</em>
</p>

---

## 📑 Table of Contents

- [Overview & Problem Statement](#overview--problem-statement)
- [How It Works (Visual Architecture)](#how-it-works-visual-architecture)
- [Key Features & Innovations](#key-features--innovations)
- [What P2Shield Detects (28+ Types)](#what-p2shield-detects-28-types)
- [File Concept & Codebase Architecture](#file-concept--codebase-architecture)
- [Local Setup Guide (Step-by-Step)](#local-setup-guide-step-by-step)
- [How to Test Everything](#how-to-test-everything)
  - [1. Automated Test Suite (Vitest)](#1-automated-test-suite-vitest)
  - [2. Built-in Offline Demo Simulator](#2-built-in-offline-demo-simulator)
  - [3. Live AI Chatbots (ChatGPT, Claude, Gemini, Grok, Perplexity)](#3-live-ai-chatbots-chatgpt-claude-gemini-grok-perplexity)
  - [4. Interactive Options Dashboard & File Playground](#4-interactive-options-dashboard--file-playground)
  - [5. End-to-End Browser Testing (Playwright)](#5-end-to-end-browser-testing-playwright)
- [Privacy Profiles & Risk Scoring](#privacy-profiles--risk-scoring)
- [Using the Engine as an NPM Library](#using-the-engine-as-an-npm-library)
- [NPM Scripts Reference](#npm-scripts-reference)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [License](#license)

---

## Overview & Problem Statement

Every day, millions of developers, healthcare workers, financial analysts, and everyday users paste confidential information into generative AI tools like **ChatGPT**, **Claude**, **Gemini**, **Perplexity**, and **Grok**:
- API tokens, SSH keys, database connection strings, and AWS credentials
- Names, emails, phone numbers, and physical addresses (PII)
- Government IDs (Aadhaar, SSN, PAN, Passport numbers)
- Credit card numbers, bank account IBANs, and UPI IDs
- Private medical diagnoses, prescription drug names, and health records

Once sent, this information is stored on external cloud infrastructure, logged in prompt caches, and potentially used for training future foundation models.

### The P2Shield Solution

**P2Shield** is a zero-knowledge, client-side browser firewall that intercepts text *in the browser DOM* **before** any network transit occurs:
1. **Detects & Redacts**: Evaluates prompt text using 28+ rule detectors with mathematical checksums (Luhn, Verhoeff, mod-97), a structured data parser (JSON, YAML, .env, HTTP headers), heuristics, and optional on-device AI (Gemini Nano).
2. **Format-Preserving Surrogates**: Rather than breaking model coherence with synthetic tokens like `[PERSON_1]`, P2Shield can substitute realistic, context-preserving surrogates (`"Arjun Patel"`, `"Acme Corp"`), preserving LLM reasoning and grammar.
3. **Encrypted Token Vault**: Maps original values to surrogates inside a local, AES-GCM encrypted session vault that never leaves your machine.
4. **Bi-Directional Response De-anonymization**: When the AI responds referencing surrogate entities, P2Shield's Response Observer automatically unmasks the real confidential data in real-time directly inside the chat UI.
5. **Two-Way Action Bar Controls**: Native `[🛡️ Protected / 👁️ Original]` and `[🛡️ Restored / 👁️ Raw AI]` buttons allow instant toggling between sanitized and unmasked views for both prompts and AI responses.

> [!IMPORTANT]
> **Zero Network Requests**: P2Shield contains **no external tracking, no analytics, no external servers, and no proxy**. All detection, tokenization, vault storage, and restoration happen 100% locally on your own machine.

---

## How It Works (Visual Architecture)

```mermaid
flowchart TD
    subgraph Browser["User's Browser (Client-Side Only)"]
        A["User Types Prompt<br/>(ChatGPT, Claude, Gemini, etc.)"] --> B["Content Script<br/>(Isolated Shadow DOM Shield)"]
        
        subgraph Engine["P2Shield Core Engine (Pure TypeScript)"]
            direction TB
            D1["Regex & Checksum Detectors<br/>(Luhn, Verhoeff, mod-97)"]
            D2["Structured Data Parser<br/>(JSON, YAML, .env, Headers)"]
            D3["Heuristic & Smart NER<br/>(Gemini Nano Prompt API)"]
            
            D1 & D2 & D3 --> R["Overlap Resolver & Policy Engine"]
            R --> S["Sanitizer & Surrogate Generator"]
            R --> K["Risk Scorer (0-100 Score)"]
        end
        
        B --> Engine
        S --> V[("Encrypted Local Vault<br/>(AES-GCM Session Cache)")]
        S --> W["Writeback Engine<br/>(ProseMirror, Lexical, Textarea)"]
        
        W --> PromptBar["Prompt Action Bar<br/>[🛡️ Protected / 👁️ Original]"]
        PromptBar --> CloudBoundary["Network Boundary (Only Safe Prompt Sent)"]
    end

    subgraph External["External AI Provider"]
        CloudBoundary --> LLM["LLM Cloud Server<br/>(Receives Only Redacted / Surrogate Data)"]
        LLM --> Stream["AI Streams Response Back"]
    end

    subgraph ResponseFlow["Real-Time Response Restoration"]
        Stream --> Obs["DOM Response Observer"]
        Obs <--> V
        Obs --> InlineRestoration["Unmasks Original Values Live in UI"]
        InlineRestoration --> ResponseBar["Response Action Bar<br/>[🛡️ Restored / 👁️ Raw AI]"]
    end
```

---

## Key Features & Innovations

| Feature | Description |
|---|---|
| **100% On-Device Execution** | Pure local computation with zero external network calls. What you type stays on your device. |
| **Bidirectional Token Vault** | Local AES-GCM encrypted session vault automatically tracks surrogates and de-anonymizes LLM responses in real-time. |
| **Format-Preserving Surrogates** | Replaces sensitive data with natural, realistic equivalents (`"Rahul Sharma"` → `"Arjun Patel"`) so LLMs maintain natural reasoning. |
| **Two-Way UI Controls** | Native buttons embedded right in chat message action bars: `[🛡️ Protected / 👁️ Original]` on prompts and `[🛡️ Restored / 👁️ Raw AI]` on assistant replies. |
| **Provider Isolation Pattern** | Dedicated modular provider adapters (`chatgpt.ts`, `claude.ts`, etc.) ensure updates to one site never break others. |
| **28+ Data Types with Checksums** | Algorithmic validation (Luhn, Verhoeff, mod-97) eliminates false positives for cards, Aadhaar, IBAN, and credentials. |
| **Smart Mode (Gemini Nano)** | Integrates Chrome's experimental on-device Prompt API for task-aware context understanding ("keep diagnosis, redact name"). |
| **4 Built-in Privacy Profiles** | Pre-configured policies for Personal, Healthcare, Finance, and Enterprise workflows. |
| **Mathematical Risk Scoring** | Transparent 0–100 risk score based on entity weights, detector confidence, and residual risk. |
| **Local Audit Log** | Metadata-only audit trail recording timestamps, site, profile, and risk delta (zero sensitive text stored). |

---

## What P2Shield Detects (28+ Types)

### 1. Structured & Semi-Structured Data
- **Key-Value Formats:** JSON, YAML, Python dictionaries, `.env` files, HTTP headers, XML attributes, query strings, and CLI flags.
- **Context-Aware Keys:** Intelligently matches keys like `api_key`, `token`, `password`, `secret`, `access_token`, `auth`, `client_secret`.

### 2. Universal & National Identifiers (With Mathematical Checksums)
- **India:** Aadhaar (12-digit with **Verhoeff algorithm** validation), PAN (Permanent Account Number), GSTIN, IFSC, UPI IDs.
- **United States:** Social Security Numbers (SSN), ABA routing numbers.
- **United Kingdom:** National Insurance Numbers (NINO), NHS numbers, UK sort codes.
- **Global:** IBAN (International Bank Account Number with **mod-97** validation), SWIFT/BIC codes, Canadian SIN, Brazilian CPF, Singapore NRIC, Emirates ID.

### 3. Financial & Payment Data
- **Payment Cards:** Visa, Mastercard, American Express, Discover, Diners Club, JCB with **Luhn algorithm** verification.
- **Bank Accounts & Routing:** Account numbers, SWIFT codes, UPI handles (`username@okaxis`, `name@upi`).

### 4. Credentials, Secrets & Cloud Infrastructure
- **API Keys & Tokens:** OpenAI (`sk-proj-...`), Anthropic (`sk-ant-...`), AWS Access Keys (`AKIA...`), GitHub personal access tokens (`ghp_...`, `gho_...`), Stripe (`sk_live_...`, `pk_live_...`), Slack tokens (`xoxb-...`, `xoxp-...`), Google API keys (`AIza...`).
- **Cryptographic Keys:** RSA/EC private keys (`-----BEGIN PRIVATE KEY-----`), JWTs (JSON Web Tokens).
- **Network & Hostnames:** IPv4, IPv6, MAC addresses, internal private IP ranges, cloud ARNs (`arn:aws:...`), and database URIs.

---

## File Concept & Codebase Architecture

For developers and contributors exploring the codebase for the first time, here is how the project is structured and what each file is responsible for:

```text
rohit-p2shield/
├── src/
│   ├── core/                  # Pure, platform-agnostic firewall engine (Zero DOM / Zero Chrome APIs)
│   │   ├── engine.ts          # Central orchestrator: analyze(), protect(), scan()
│   │   ├── vault.ts           # Token vault, AES-GCM session storage, response de-anonymization
│   │   ├── detectors.ts       # 28+ regex patterns with checksum validators
│   │   ├── fields.ts          # Structured parser (JSON, YAML, .env, headers, XML)
│   │   ├── validators.ts      # Verhoeff, Luhn, mod-97, ISO checksum implementations
│   │   ├── policy.ts          # Built-in profiles (Personal, Healthcare, Finance, Enterprise)
│   │   ├── risk.ts            # Mathematical risk scoring engine (0-100 score calculation)
│   │   ├── sanitize.ts        # String replacement and surrogate tokenization engine
│   │   ├── smart.ts           # Gemini Nano (Prompt API) bridge for contextual labeling
│   │   ├── lexicon.ts         # Common first/last names and dictionary terms for heuristics
│   │   ├── resolve.ts         # Overlap resolver (resolves competing matches by priority)
│   │   ├── types.ts           # Shared TypeScript interfaces, types, and contracts
│   │   └── index.ts           # Public exports for the core module
│   │
│   ├── content/               # Browser content scripts injected into AI chat web pages
│   │   ├── main.ts            # Content script entry: attaches observers & discovers input boxes
│   │   ├── editable.ts        # Unified editor adapter (ProseMirror, Lexical, Slate, Textarea)
│   │   ├── bubble-pill.ts     # Floating shield button & badge (Closed Shadow DOM UI)
│   │   ├── ui.ts              # Detailed popover modal for reviewing findings & risk delta
│   │   └── providers/         # Provider-Isolated Chatbot Adapters
│   │       └── chatgpt.ts     # OpenAI ChatGPT prompt toggle & response unmasking adapter
│   │
│   ├── background/            # Manifest V3 service worker
│   │   └── background.ts      # Keyboard shortcuts (Alt+Shift+S), context menu, audit log
│   │
│   ├── offscreen/             # Chrome offscreen document
│   │   ├── offscreen.html     # Dedicated DOM environment for Chrome's Prompt API
│   │   └── offscreen.ts       # Offscreen worker hosting Gemini Nano without blocking MV3 worker
│   │
│   ├── options/               # Extension Options Dashboard & Playground (Single-Page App)
│   │   ├── options.html       # HTML structure for the settings and playground UI
│   │   ├── options.ts         # Controller: file scanner, policy editor, audit log viewer
│   │   └── options.css        # Clean, modern dashboard styling
│   │
│   └── shared/                # Code shared across content, background, and options
│       ├── settings.ts        # Typed Chrome storage settings manager
│       ├── samples.ts         # Pre-configured sample prompts for healthcare, finance, PII
│       └── smartModel.ts      # Client helpers for interacting with the offscreen model
│
├── demo/                      # Standalone local chat simulator for rapid offline testing
│   ├── index.html             # Mock AI chatbot UI with simulated streaming responses
│   ├── serve.mjs              # Local Node.js HTTP server (http://localhost:4173)
│   └── engine.js              # Standalone bundle of the core engine used by demo
│
├── tests/                     # Automated Vitest test suites (203 tests)
│   ├── core.test.ts           # Tests for detectors, checksums, structured parsing, policy
│   ├── vault.test.ts          # Tests for token vault, surrogate mapping, and unmasking
│   ├── chatgpt.test.ts        # Tests for provider isolation and response unmasking logic
│   ├── smart.test.ts          # Tests for Smart mode and Prompt API fallback handling
│   ├── coverage.test.ts       # Broad coverage tests across edge cases and large inputs
│   └── helpers.ts             # Test utilities and fixture generators
│
├── e2e/                       # End-to-end browser automation suite (Playwright)
│   └── run.mjs                # Launches real Chromium with the extension loaded
│
├── build.mjs                  # Fast esbuild bundler configuration
└── package.json               # NPM scripts, dependencies, and project metadata
```

### Key Architectural Concepts to Know

1. **Pure Core Isolation (`src/core/`)**:
   `src/core/` does **not** import any Chrome extension APIs (`chrome.*`) or browser DOM APIs (`window`, `document`). It is 100% pure TypeScript. This allows the core engine to run anywhere: inside web workers, in Node.js backend pipelines, in CLI tools, or exported as an independent NPM package.

2. **Shadow DOM Encapsulation (`src/content/bubble-pill.ts`)**:
   The floating shield icon and popover UI are rendered inside a **closed Shadow DOM**. This ensures that chatbot CSS stylesheets (like Tailwind on ChatGPT or custom themes on Claude) never affect P2Shield's UI, and P2Shield's styles never leak into the host page.

3. **Provider Isolation Pattern (`src/content/providers/`)**:
   Different AI chatbots implement entirely different DOM structures, custom message actions, and reactive frameworks (React, Svelte, custom web components). By placing site-specific logic inside dedicated provider modules (e.g., `src/content/providers/chatgpt.ts`), modifications to one provider never regress or interfere with others.

4. **Multi-Strategy Writeback Engine (`src/content/editable.ts`)**:
   Modern chatbots do not use standard `<textarea>` elements; they use rich-text frameworks (ProseMirror, Lexical, Slate, Quill). P2Shield implements a multi-tier writeback engine:
   - Level 1: Native property descriptor value setter (for inputs/textareas).
   - Level 2: Synthetic `input`, `change`, and `beforeinput` events.
   - Level 3: Document `execCommand('insertText')` simulation.
   - Level 4: Simulated paste event with DataTransfer payload.
   - Verification: Reads the element back immediately; if all writeback attempts fail, it safely copies the sanitized prompt to the user's clipboard and displays an alert.

---

## Local Setup Guide (Step-by-Step)

Follow these steps to set up P2Shield on your local development machine in under 3 minutes:

### Prerequisites
- **Node.js**: Version `20.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **Package Manager**: `npm` (comes bundled with Node.js)
- **Browser**: Google Chrome, Brave, Edge, or any Chromium-based browser (v116+)

### Step 1: Clone the Repository
```bash
git clone https://github.com/Ravindra-builds/P2Shield.git
cd P2Shield
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build the Extension
```bash
npm run build
```
This runs `build.mjs` with `esbuild` and bundles the project into the `./dist/` directory:
- `dist/content.js` (In-page content script)
- `dist/background.js` (MV3 Service Worker)
- `dist/options.js` (Options Dashboard & Playground)
- `dist/offscreen.js` (Offscreen AI worker)
- `dist/manifest.json` + extension icons

### Step 4: Load the Unpacked Extension in Chrome
1. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
2. In the top-right corner, toggle **Developer mode** to **ON**.
3. In the top-left corner, click **Load unpacked**.
4. In the file picker, select the `dist` folder inside your cloned `P2Shield` directory:
   ```text
   C:\path\to\P2Shield\dist
   ```
5. You should now see **P2Shield** in your extensions list!
6. *(Recommended)* Click the puzzle piece icon in Chrome's toolbar and **Pin** P2Shield for quick access.

---

## How to Test Everything

P2Shield provides multiple ways to test every feature, from instant automated unit tests to live chatbot interaction.

### 1. Automated Test Suite (Vitest)

To run the complete automated test suite (203 unit tests covering regexes, checksums, token vault, and edge cases):

```bash
# Run all tests once
npm test

# Run tests in interactive watch mode (ideal during development)
npm run test:watch

# Run TypeScript typecheck, unit tests, and build in one command
npm run check
```

Expected output:
```text
✓ tests/chatgpt.test.ts (5 tests)
✓ tests/vault.test.ts (27 tests)
✓ tests/smart.test.ts (18 tests)
✓ tests/coverage.test.ts (76 tests)
✓ tests/core.test.ts (77 tests)

Test Files  5 passed (5)
     Tests  203 passed (203)
```

---

### 2. Built-in Offline Demo Simulator

You don't need real API keys or internet access to test P2Shield's prompt protection and response de-anonymization. Use the bundled local chat simulator:

```bash
npm run demo
```
1. Open your browser to `http://localhost:4173/`.
2. You will see a mock AI chatbot interface with P2Shield's engine active.
3. **Test Prompt Protection**:
   - Paste a fictional prompt:
     ```text
     Hello, I'm Rahul Sharma (rahul.sharma@gmail.com). My Aadhaar is 2345 6789 0124 and my secret key is sk-proj-1234567890abcdef1234567890abcdef. Can you help me?
     ```
   - Watch the floating shield badge turn red and count the detected sensitive entities.
   - Click the shield button (or press `Alt+Shift+S`).
   - The prompt is instantly sanitized: names become realistic surrogates or tokens, Aadhaar is redacted, and secrets are removed.
4. **Test Response De-anonymization**:
   - Click **Send**.
   - The mock bot replies echoing the surrogate tokens: `"Hello [PERSON_1], I received your request..."`
   - P2Shield's Response Observer automatically intercepts the text and restores `"Rahul Sharma"` on your screen!
   - Click the `[🛡️ Restored / 👁️ Raw AI]` button on the response to toggle between the raw surrogate text and the unmasked view.

---

### 3. Live AI Chatbots (ChatGPT, Claude, Gemini, Grok, Perplexity)

P2Shield works directly on live AI web applications.

#### Testing on ChatGPT (`chatgpt.com`):
1. Ensure the P2Shield extension is loaded in `chrome://extensions`.
2. Go to [https://chatgpt.com/](https://chatgpt.com/) and start a new chat.
3. In the message box, enter a prompt with fictional sensitive data:
   ```text
   I am Alice Smith. My corporate email is alice@internal-corp.com and my AWS access key is AKIAIOSFODNN7EXAMPLE. How do I configure my S3 bucket?
   ```
4. **Observe the Shield**:
   - The floating shield icon appears on the prompt box showing detected item counts.
   - Click the shield. The input updates with safe surrogates:
     `"I am [PERSON_1]. My corporate email is [REDACTED_EMAIL] and my AWS access key is [SECRET_REMOVED]..."`
5. **Test the Prompt Action Bar**:
   - Notice the `[👁️ Original]` button injected into the prompt controls.
   - Click it to view your original text; click `[🛡️ Protected]` to switch back to the safe version before sending.
6. **Send & Test Response Unmasking**:
   - Press **Send**.
   - When ChatGPT answers using `[PERSON_1]`, P2Shield detects the surrogate and restores `"Alice Smith"` in place.
   - Use the `[🛡️ Restored / 👁️ Raw AI]` button on ChatGPT's response message action bar (beside Copy) to toggle between views.

---

### 4. Interactive Options Dashboard & File Playground

P2Shield includes a full-featured dashboard for testing files and tweaking privacy policies:

1. Click the P2Shield icon in your browser toolbar, or right-click the icon and select **Options**.
2. **Features to test in the Dashboard**:
   - **Interactive Playground**: Paste any raw text to view live entity extraction, risk score before/after, and sanitized output.
   - **File Scanner**: Drag-and-drop `.txt`, `.md`, `.json`, `.csv`, or `.env` files (up to 2MB) to scan for leaked credentials before uploading to AI tools.
   - **Privacy Policy Customizer**: Change actions (Tokenize, Mask, Redact, Generalize, Keep) for any of the 28 data types.
   - **Audit Log**: Inspect the local privacy log showing timestamps, sites, and risk reductions without exposing raw plaintext.

---

### 5. End-to-End Browser Testing (Playwright)

To verify extension injection, UI rendering, and keyboard shortcuts across a headless Chromium instance:

```bash
# Install Chromium browser for Playwright (first time only)
npx playwright install chromium

# Run the 30-check automated E2E test suite
npm run e2e
```

---

## Privacy Profiles & Risk Scoring

P2Shield includes 4 pre-configured security profiles tailored for different environments:

| Data Type | Personal (Default) | Healthcare (HIPAA Focus) | Finance (PCI Focus) | Enterprise |
|---|---|---|---|---|
| **Person Names** | Tokenize / Surrogate | Tokenize / Surrogate | Tokenize / Surrogate | Tokenize / Surrogate |
| **Email Addresses** | Mask (`a***@b.com`) | Redact (`[REDACTED_EMAIL]`) | Mask | Tokenize |
| **Phone Numbers** | Mask (`98*** ***10`) | Redact | Mask | Redact |
| **Cards & Bank Accounts** | Mask | Redact | Mask | Redact |
| **Government IDs (SSN, Aadhaar)** | Redact | Redact | Redact | Redact |
| **Ages & Dates** | Keep | Generalize (`20-30`) | Generalize | Generalize |
| **Locations / Cities** | Keep | Generalize (City → State) | Keep | Generalize |
| **Organizations** | Keep | Tokenize | Keep | Tokenize |
| **Medical Terms** | Keep | Keep (Needed for advice) | Tokenize | Tokenize |
| **API Keys & Secrets** | **Always Removed** | **Always Removed** | **Always Removed** | **Always Removed** |
| **Confidence Threshold** | 0.50 | 0.50 | 0.50 | 0.45 |

> [!NOTE]
> **Secrets are Non-Negotiable**: Passwords, API tokens, private keys, and bearer credentials are **unconditionally removed** across all profiles. Even custom enterprise policies cannot disable secret redaction.

### Mathematical Risk Score (0 to 100)

P2Shield calculates privacy risk using an independent probability formula:

$$\text{Risk} = 1 - \prod_{i=1}^{n} \left(1 - w_i \times c_i \times r_i\right)$$

- $w_i$: Severity weight of the entity type (e.g., Secret = 1.0, Aadhaar/SSN = 0.9, Phone = 0.5, Age = 0.2).
- $c_i$: Confidence of the detection (0.0 to 1.0).
- $r_i$: Residual risk after redaction (Keep = 1.0, Generalize = 0.4, Mask = 0.25, Tokenize = 0.1, Redact/Remove = 0.0).

| Risk Score | Tier | Action Indicator |
|---|---|---|
| **0 – 30** | **Low** | Green badge · Safe for AI transmission |
| **31 – 60** | **Medium** | Yellow badge · Recommended to redact |
| **61 – 80** | **High** | Orange badge · Significant PII present |
| **81 – 100** | **Critical** | Red badge · High-risk credentials or IDs detected |

---

## Using the Engine as an NPM Library

The core firewall engine is completely detached from Chrome extension APIs and can be imported directly into Node.js applications, CI/CD pipelines, or backend LLM proxies:

```bash
npm run build:package
```

```typescript
import { analyze, getBuiltinProfile, restoreText } from './src/core';

// 1. Analyze and sanitize prompt text
const { result, vault } = analyze(
  "Hello, my name is Rahul Sharma and my OpenAI key is sk-proj-1234567890abcdef1234567890abcdef.",
  { profile: getBuiltinProfile('enterprise') }
);

console.log("Safe Prompt:", result.safeText);
// Output: "Hello, my name is Arjun Patel and my OpenAI key is [SECRET_REMOVED]."

console.log("Risk Delta:", `${result.riskBefore} -> ${result.riskAfter}`);
// Output: "Risk Delta: 99 -> 0"

// 2. Unmask incoming LLM responses using the session vault
const llmResponse = "Hello Arjun Patel, I can help you configure your project.";
const unmaskedResponse = vault.restoreText(llmResponse);

console.log("Unmasked Response:", unmaskedResponse);
// Output: "Hello Rahul Sharma, I can help you configure your project."
```

---

## NPM Scripts Reference

| Command | Description |
|---|---|
| `npm run build` | Builds the Chrome extension into the `./dist/` directory using esbuild |
| `npm test` | Runs the full Vitest automated test suite (203 tests) |
| `npm run test:watch` | Runs Vitest in interactive watch mode for TDD |
| `npm run typecheck` | Validates TypeScript types across the entire codebase (`tsc --noEmit`) |
| `npm run check` | Runs typecheck, tests, and build in a single verification pipeline |
| `npm run demo` / `npm run dev` | Starts the offline local demo chat server at `http://localhost:4173/` |
| `npm run e2e` | Runs Playwright browser automation tests against a real Chromium instance |
| `npm run build:package` | Builds the standalone NPM package into `packages/p2shield/dist` |
| `npm run icons` | Re-generates PNG icons from `p2shield-logo.png` across all resolutions |
| `npm run landing` | Launches local development server for the marketing landing page |
| `npm run build:all` | Compiles extension, npm package, and landing page in one command |

---

## Troubleshooting & FAQ

### 1. I made changes to the code, but Chrome isn't showing them.
After modifying files in `src/`, run:
```bash
npm run build
```
Then go to `chrome://extensions`, locate **P2Shield**, and click the **Reload** (circular arrow) button.

### 2. The shield icon doesn't appear on a text box.
- Click inside the input field to focus it. P2Shield mounts the shield on focus to conserve memory.
- If the website uses non-standard containers, use the global keyboard shortcut:
  - **Windows/Linux**: `Alt + Shift + S`
  - **macOS**: `Option + Shift + S`
  - Or right-click the text box and select **Protect this text with P2Shield**.

### 3. How does Smart Mode work?
Smart Mode leverages Google Chrome's built-in **Gemini Nano** model via the experimental Prompt API. It runs 100% locally on your GPU/NPU.
- **Requirements**: Chrome 128+ with desktop GPU and on-device model downloaded.
- You can verify model status in your browser at `chrome://on-device-internals`.
- If the model is not present, P2Shield gracefully falls back to deterministic rule and heuristic engines.

### 4. Does P2Shield send my data to any server?
**Never.** P2Shield contains zero telemetry, zero analytics scripts, and zero network calls. Check the `src/manifest.json` file or open Chrome DevTools Network tab — you will see 0 requests made by the extension.

---

## Contributing

Contributions, bug reports, and suggestions are welcome!
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/new-detector`).
3. Ensure all tests and typechecks pass (`npm run check`).
4. Commit your changes and open a Pull Request.

---

## License

Distributed under the **MIT License**. See [`packages/p2shield/LICENSE`](packages/p2shield/LICENSE) for full details.
