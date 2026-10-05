# p2shield

> **Pre-LLM Privacy Firewall**: Zero-latency, 100% local sanitization, risk scoring, and reverse de-tokenization for AI prompts.

[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg)](https://www.npmjs.com/package/p2shield)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

P2Shield inspects prompts **before** they reach any LLM (OpenAI, Anthropic, Gemini, Ollama, LangChain). It detects PII, secrets, API tokens, and confidential data using deterministic rule algorithms, algorithmic checksums (Luhn, Verhoeff, Mod-97), and contextual heuristics. It tokenizes or masks sensitive values and seamlessly restores real values in LLM responses.

---

## ⚡ Quickstart (2 lines of code)

### Install
```bash
npm install p2shield
```

### Basic Usage
```typescript
import { P2Shield } from 'p2shield';

// 1. Initialize firewall
const shield = new P2Shield();

// 2. Sanitize user prompt
const { safeText, riskBefore, riskAfter, restore } = shield.protect(
  "Please contact Rahul at rahul@example.com. My AWS key is AKIAIOSFODNN7EXAMPLE"
);

console.log(safeText);
// => "Please contact [PERSON_1] at r****@example.com. My AWS key is [SECRET_REMOVED]"

// 3. Send safeText to ChatGPT / Claude ...
const llmResponse = "Hello [PERSON_1], I will reach out shortly.";

// 4. Reverse De-tokenization (Restore original values in LLM response)
console.log(restore(llmResponse));
// => "Hello Rahul, I will reach out shortly."
```

---

## 🛡️ Built-in Privacy Profiles

Choose the policy that fits your compliance requirement:

```typescript
// Personal (Default): Masks cards & contact info, tokenizes names, removes secrets
const personal = new P2Shield({ profile: 'personal' });

// Enterprise / Developer: Strict tokenization of internal systems, names & all secrets
const enterprise = new P2Shield({ profile: 'enterprise' });

// Healthcare: Redacts patient identifiers & contacts, keeps clinical facts useful
const health = new P2Shield({ profile: 'healthcare' });

// Finance: Masks bank accounts & card numbers, generalizes financial amounts
const finance = new P2Shield({ profile: 'finance' });
```

---

## 🔍 Detailed Protection Output

```typescript
const result = shield.protect("My email is alice@corp.com");

console.log(result.findings);
/*
[
  {
    type: 'EMAIL',
    text: 'alice@corp.com',
    action: 'MASK',
    replacement: 'a****@corp.com',
    confidence: 0.98,
    category: 'CONTACT'
  }
]
*/

console.log(result.riskBefore, result.levelBefore); // 60, "Medium"
console.log(result.riskAfter, result.levelAfter);   // 15, "Low"
```

---

## 🔄 Multi-Turn Chat Sessions

Token mapping is automatically maintained across conversation turns:

```typescript
const session = new P2Shield();

session.protect("User 1 is Alice."); // [PERSON_1] -> Alice
session.protect("User 2 is David."); // [PERSON_2] -> David

const reply = "Report for [PERSON_1] and [PERSON_2].";
console.log(session.restore(reply));
// => "Report for Alice and David."
```

---

## 🚀 Features & Invariants

- **Zero Network Egress**: Pure TypeScript calculation. Zero servers, zero telemetry.
- **Sub-Millisecond Latency**: Average run takes < 0.5ms.
- **Guaranteed Secret Erasure**: API keys, JWTs, and private keys are **always removed** in every profile.
- **Checksum Validation**:
  - Credit Cards (Luhn algorithm)
  - Indian Aadhaar (Verhoeff checksum)
  - International Bank Account Numbers (IBAN Mod-97)
  - US SSN & Routing Numbers
- **Dual Module Support**: Works with both ESM (`import`) and CommonJS (`require`) in Node.js, Next.js, and browser environments.

---

## License

MIT © P2Shield Team
