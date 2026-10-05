// Deterministic rule detectors and lower-confidence heuristic detectors.
// Everything here is pure string processing and runs locally.

import type { Category, Detection, EntityType, Source } from './types';
import {
  CITIES,
  FIRST_NAMES,
  MEDICAL_CONDITIONS,
  MEDICATIONS,
  MONTHS,
  STOP_WORDS,
  SURNAMES,
} from './lexicon';
import {
  aadhaarValid,
  abaValid,
  cpfValid,
  ibanValid,
  ipv6Valid,
  luhnAny,
  luhnValid,
  nhsValid,
  onlyDigits,
  shannonEntropy,
  ssnValid,
} from './validators';

export const CATEGORY: Record<EntityType, Category> = {
  EMAIL: 'CONTACT',
  PHONE: 'CONTACT',
  CREDIT_CARD: 'FINANCIAL',
  AADHAAR: 'GOVERNMENT_ID',
  PAN: 'GOVERNMENT_ID',
  ID_NUMBER: 'GOVERNMENT_ID',
  IFSC: 'FINANCIAL',
  ROUTING_NUMBER: 'FINANCIAL',
  BANK_ACCOUNT: 'FINANCIAL',
  IBAN: 'FINANCIAL',
  UPI_ID: 'FINANCIAL',
  PASSPORT: 'GOVERNMENT_ID',
  IP_ADDRESS: 'CONFIDENTIAL',
  DATE_OF_BIRTH: 'IDENTITY',
  API_KEY: 'CREDENTIAL',
  PASSWORD: 'CREDENTIAL',
  PRIVATE_KEY: 'CREDENTIAL',
  JWT: 'CREDENTIAL',
  SECRET: 'CREDENTIAL',
  CREDENTIAL_URL: 'CREDENTIAL',
  PERSON: 'IDENTITY',
  MEDICAL: 'MEDICAL',
  FINANCIAL: 'FINANCIAL',
  CONFIDENTIAL: 'CONFIDENTIAL',
  EMPLOYEE_ID: 'CONFIDENTIAL',
  ORGANIZATION: 'CONTEXT',
  LOCATION: 'CONTEXT',
  AGE: 'IDENTITY',
};

export const CREDENTIAL_TYPES: ReadonlySet<EntityType> = new Set<EntityType>([
  'API_KEY', 'PASSWORD', 'PRIVATE_KEY', 'JWT', 'SECRET', 'CREDENTIAL_URL',
]);

export function isCredentialType(t: EntityType): boolean {
  return CREDENTIAL_TYPES.has(t);
}

export function mk(
  type: EntityType,
  start: number,
  end: number,
  text: string,
  confidence: number,
  source: Source,
  reason: string,
  label?: string,
): Detection {
  return {
    id: `${type}:${start}-${end}`,
    type,
    label,
    category: CATEGORY[type],
    start,
    end,
    text,
    confidence: Math.max(0, Math.min(1, confidence)),
    source,
    reason,
  };
}

/** Does `re` match in a window of `text` around [start, end)? */
export function near(text: string, start: number, end: number, re: RegExp, before = 40, after = 0): boolean {
  return re.test(text.slice(Math.max(0, start - before), Math.min(text.length, end + after)));
}

const PLACEHOLDER = new RegExp(
  '^(?:' +
    [
      'x+', '\\*+', '•+', '\\.+', '_+', '-+', '#+', '\\?+',
      '<[^>]*>', '\\[[^\\]]*\\]', '\\{[^}]*\\}', '\\$\\{[^}]*\\}', '\\$[A-Za-z_]\\w*', '%[A-Za-z_]\\w*%', '\\{\\{[^}]*\\}\\}',
      'your[-_ ]?.*', 'my[-_ ]?(?:key|token|secret|password).*', '.*[-_ ]here', 'insert[-_ ].*', 'enter[-_ ].*', 'replace[-_ ]?me.*',
      'changeme', 'change[-_ ]?me', 'example', 'sample', 'placeholder', 'redacted', 'removed', 'masked', 'hidden',
      'null', 'nil', 'none', 'undefined', 'true', 'false', 'yes', 'no', 'on', 'off', 'n\\/a', 'na', 'tbd', 'todo',
      'required', 'optional', 'incorrect', 'wrong', 'invalid', 'expired', 'empty', 'blank', 'unknown', 'not ?set',
      'secret', 'password', 'passwd', 'token', 'apikey', 'api[-_ ]?key', 'key', 'value', 'string', 'str', 'number',
      'int', 'integer', 'boolean', 'bool', 'object', 'any', 'bearer', 'basic',
    ].join('|') +
    ')$',
  'i',
);

export function isPlaceholder(v: string): boolean {
  return PLACEHOLDER.test(v) || /^(.)\1+$/.test(v);
}

/** A reference in code, not a literal value: os.environ[..., getPassword(), process.env.DB_PASS, ${VAR}. */
const CODE_WORDS = new Set([
  'return', 'raise', 'throw', 'if', 'else', 'elif', 'then', 'pass', 'break', 'continue', 'await', 'yield', 'new',
  'this', 'self', 'none', 'null', 'nil', 'true', 'false', 'undefined', 'function', 'lambda', 'async', 'const', 'let',
  'var', 'def', 'class', 'import', 'from', 'not', 'and', 'or', 'in', 'is', 'str', 'string', 'int', 'bool', 'any',
]);

export function looksLikeCodeRef(v: string): boolean {
  if (CODE_WORDS.has(v.toLowerCase())) return true;
  return (
    /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*[([]/.test(v) ||
    /^(?:process\.env|import\.meta|os\.environ|os\.getenv|System\.getenv|ENV\[|env\.|config\.|settings\.|self\.|this\.)/.test(v) ||
    /^\$\{?[A-Za-z_]\w*\}?$/.test(v) ||
    (/^[A-Z][A-Z0-9_]*$/.test(v) && v.includes('_') && !/\d/.test(v))
  );
}

/**
 * "<cue> [number|no|#|code] [is|:|=] <value>" — works for prose ("routing number is 0210..."),
 * snake_case keys ("routing_num": "0210..."), and JSON/YAML punctuation in between.
 */
function cueRe(cue: string, value: string, words = 'number|num|no\\.?|nr|#|code'): RegExp {
  return new RegExp(
    String.raw`(?<![A-Za-z])(?:${cue})(?![A-Za-z])[\s_-]*(?:(?:${words})(?![A-Za-z]))?["'\x60]?\s*(?:(?:is|was)\s+|[:=#-]\s*|=>\s*)?["'\x60]?\s*(${value})(?![A-Za-z0-9])`,
    'gid',
  );
}

// --------------------------------------------------------------------------
// Rule detectors
// --------------------------------------------------------------------------

const CARD_CUE =
  /(?<![A-Za-z])(?:card|cards|visa|master\s?card|amex|american express|discover|rupay|maestro|debit|credit|cvv|cvc|cc|ccn|ccnum|pan)(?![A-Za-z])/i;
const CARD_IIN = /^(?:4|5[0-8]|2[2-7]|3\d|6\d|8[12])/;

export function detectRules(text: string): Detection[] {
  const out: Detection[] = [];
  const push = (d: Detection) => out.push(d);

  // ---- EMAIL
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g)) {
    push(mk('EMAIL', m.index!, m.index! + m[0].length, m[0], 0.98, 'rule', 'Matches an email address pattern'));
  }
  // Obfuscated: name [at] domain [dot] com
  for (const m of text.matchAll(
    /\b[A-Za-z0-9._%+-]+\s*(?:\[at\]|\(at\)|\{at\}|\s@\s)\s*[A-Za-z0-9-]+(?:\s*(?:\[dot\]|\(dot\)|\{dot\}|\.)\s*[A-Za-z0-9-]+)*\s*(?:\[dot\]|\(dot\)|\{dot\})\s*[A-Za-z]{2,}\b/gi,
  )) {
    push(mk('EMAIL', m.index!, m.index! + m[0].length, m[0], 0.9, 'rule', 'Email address written with [at] / [dot]'));
  }

  // ---- UPI id (handle@bank, no dot after the @)
  const UPI_HANDLES =
    'ok(?:axis|sbi|hdfcbank|icici)|ybl|ibl|axl|paytm|apl|upi|sbi|hdfcbank|icici|axisbank|pnb|barodampay|airtel|fbl|freecharge|jupiter|postbank|ikwik|pingpay|kotak|idfcbank|yesbank|cnrb|unionbank|aubank|rbl';
  for (const m of text.matchAll(new RegExp(`\\b[A-Za-z0-9._-]{2,}@(?:${UPI_HANDLES})\\b(?!\\.)`, 'gi'))) {
    push(mk('UPI_ID', m.index!, m.index! + m[0].length, m[0], 0.92, 'rule', 'Matches a UPI payment address'));
  }

  // ---- Credit / debit card (Luhn). Never inside a longer alphanumeric token (e.g. "xyz7890123456789").
  for (const m of text.matchAll(/(?<![A-Za-z0-9_]|\d[ -])(?:\d[ -]?){12,18}\d(?![A-Za-z0-9_]|[ -]\d)/g)) {
    const digits = onlyDigits(m[0]);
    if (digits.length < 13 || digits.length > 19) continue;
    const s = m.index!;
    const e = s + m[0].length;
    const cue = near(text, s, e, CARD_CUE, 40);
    if (luhnValid(digits)) {
      push(mk('CREDIT_CARD', s, e, m[0], cue ? 0.98 : 0.95, 'rule', 'Card number with a valid Luhn checksum'));
    } else if (cue && digits.length >= 14) {
      const iin = CARD_IIN.test(digits);
      push(
        mk('CREDIT_CARD', s, e, m[0], iin ? 0.84 : 0.7, 'rule', 'Card-length number next to a card cue (checksum did not validate)'),
      );
    }
  }

  // ---- Aadhaar
  for (const m of text.matchAll(/(?<![A-Za-z0-9_]|\d[\s-])[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}(?![A-Za-z0-9_]|[\s-]\d)/g)) {
    const digits = onlyDigits(m[0]);
    if (digits.length !== 12) continue;
    const cue = near(text, m.index!, m.index! + m[0].length, /(?<![A-Za-z])(?:aadhaar|aadhar|adhar|uidai|uid)(?![A-Za-z])/i, 50);
    if (aadhaarValid(digits)) {
      push(mk('AADHAAR', m.index!, m.index! + m[0].length, m[0], cue ? 0.99 : 0.95, 'rule', 'Aadhaar number with a valid Verhoeff checksum'));
    } else if (cue) {
      push(mk('AADHAAR', m.index!, m.index! + m[0].length, m[0], 0.9, 'rule', 'Twelve-digit number next to the word "Aadhaar"'));
    }
  }

  // ---- PAN
  for (const m of text.matchAll(/\b[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]\b/gi)) {
    const upper = m[0] === m[0].toUpperCase();
    const cue = near(text, m.index!, m.index! + m[0].length, /(?<![A-Za-z])pan(?![A-Za-z])/i, 30);
    if (!upper && !cue) continue;
    push(mk('PAN', m.index!, m.index! + m[0].length, m[0], upper ? 0.95 : 0.8, 'rule', 'Matches the Indian PAN format'));
  }

  // ---- IFSC
  for (const m of text.matchAll(/\b[A-Z]{4}0[A-Z0-9]{6}\b/gi)) {
    const upper = m[0] === m[0].toUpperCase();
    const cue = near(text, m.index!, m.index! + m[0].length, /(?<![A-Za-z])ifsc(?![A-Za-z])/i, 30);
    if (!upper && !cue) continue;
    if (!/\d/.test(m[0].slice(5))) continue; // "CONFIDENTIAL"-style words are not IFSC codes
    push(mk('IFSC', m.index!, m.index! + m[0].length, m[0], upper ? 0.93 : 0.8, 'rule', 'Matches the Indian IFSC format'));
  }

  // ---- Bank account (needs a cue word)
  for (const m of text.matchAll(
    cueRe('a\\/c|acct?\\.?|account|bank[\\s_-]*account|beneficiary[\\s_-]*account|savings[\\s_-]*account|checking[\\s_-]*account', '\\d[\\d -]{4,22}\\d'),
  )) {
    const [s, e] = m.indices![1];
    const digits = onlyDigits(m[1]);
    if (digits.length < 6 || digits.length > 18) continue;
    push(mk('BANK_ACCOUNT', s, e, m[1], 0.95, 'rule', 'Account-length number after an account cue'));
  }

  // ---- IBAN
  for (const m of text.matchAll(/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g)) {
    if (ibanValid(m[0])) {
      push(mk('IBAN', m.index!, m.index! + m[0].length, m[0], 0.95, 'rule', 'IBAN with a valid mod-97 checksum'));
    }
  }

  // ---- Bank routing identifiers
  for (const m of text.matchAll(cueRe('routing|aba|rtn|transit|ach[\\s_-]*routing', '\\d{9}'))) {
    const [s, e] = m.indices![1];
    const ok = abaValid(m[1]);
    push(mk('ROUTING_NUMBER', s, e, m[1], ok ? 0.96 : 0.8, 'rule', ok ? 'ABA routing number (valid checksum)' : 'Nine-digit number after a routing cue', 'ROUTING_NUMBER'));
  }
  for (const m of text.matchAll(cueRe('sort[\\s_-]*code', '\\d{2}[- ]?\\d{2}[- ]?\\d{2}', 'number|no\\.?'))) {
    const [s, e] = m.indices![1];
    push(mk('ROUTING_NUMBER', s, e, m[1], 0.92, 'rule', 'UK sort code', 'SORT_CODE'));
  }
  for (const m of text.matchAll(cueRe('bsb', '\\d{3}[- ]?\\d{3}'))) {
    const [s, e] = m.indices![1];
    push(mk('ROUTING_NUMBER', s, e, m[1], 0.9, 'rule', 'Australian BSB number', 'BSB'));
  }
  for (const m of text.matchAll(cueRe('swift|bic|swift[\\s_/-]*bic', '[A-Za-z]{6}[A-Za-z0-9]{2}(?:[A-Za-z0-9]{3})?'))) {
    const [s, e] = m.indices![1];
    if (m[1] !== m[1].toUpperCase()) continue;
    push(mk('ROUTING_NUMBER', s, e, m[1], 0.92, 'rule', 'SWIFT / BIC bank code', 'SWIFT_BIC'));
  }

  // ---- Passport (cue required)
  for (const m of text.matchAll(cueRe('passport', '[A-Za-z]{1,2}\\d{6,8}|\\d{8,9}|[A-Za-z]\\d{2}[A-Za-z0-9]{5,6}'))) {
    const [s, e] = m.indices![1];
    if (!/\d{3}/.test(m[1])) continue;
    push(mk('PASSPORT', s, e, m[1], 0.92, 'rule', 'Passport-format number after the word "passport"'));
  }

  detectIdNumbers(text).forEach(push);

  // ---- Phone numbers
  {
    const indian = /(?<![\w.+])(?:\+?91[\s-]?)?0?[6-9]\d{4}[\s-]?\d{5}(?![\w]|[\s-]\d)/g;
    for (const m of text.matchAll(indian)) {
      const digits = onlyDigits(m[0]);
      if (digits.length < 10 || digits.length > 12) continue;
      let conf = 0.85;
      if (near(text, m.index!, m.index! + m[0].length, /\b(?:phone|mobile|mob|call|contact|whatsapp|cell|tel|number|reach)\b/i, 30)) conf = 0.96;
      if (near(text, m.index!, m.index! + m[0].length, /\b(?:account|a\/c|acct|aadhaar|card|routing)\b/i, 25)) conf = Math.min(conf, 0.6);
      push(mk('PHONE', m.index!, m.index! + m[0].length, m[0], conf, 'rule', 'Matches a mobile phone number pattern'));
    }
    const intl = /(?<![\w.])\+\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,4}){2,4}(?!\d)/g;
    for (const m of text.matchAll(intl)) {
      const digits = onlyDigits(m[0]);
      if (digits.length < 8 || digits.length > 15) continue;
      push(mk('PHONE', m.index!, m.index! + m[0].length, m[0], 0.9, 'rule', 'Matches an international phone number pattern'));
    }
    const us = /(?<![\w.(])(?:\(\d{3}\)[\s.-]?|\d{3}[\s.-])\d{3}[\s.-]\d{4}(?![\w]|[\s.-]\d)/g;
    for (const m of text.matchAll(us)) {
      push(mk('PHONE', m.index!, m.index! + m[0].length, m[0], 0.82, 'rule', 'Matches a North American phone number pattern'));
    }
    const PHONE_VALUE = '\\+?\\(?\\d[\\d \\t().-]{5,18}\\d';
    const cued = [
      ...text.matchAll(
        cueRe('phone|mobile|mob|cell(?:[\\s_-]?phone)?|tel(?:ephone)?|ph|whats[\\s_-]?app|fax|landline|contact[\\s_-]*(?:number|no\\.?)|phone[\\s_-]*(?:number|no\\.?)|mobile[\\s_-]*(?:number|no\\.?)', PHONE_VALUE),
      ),
      ...text.matchAll(new RegExp(`\\b(?:call|text|reach|ring|sms|message|whatsapp)\\s+(?:me|us|him|her|them)\\s+(?:at|on)\\s+(${PHONE_VALUE})(?![A-Za-z0-9])`, 'gid')),
    ];
    for (const m of cued) {
      const [s, e] = m.indices![1];
      const digits = onlyDigits(m[1]);
      if (digits.length < 7 || digits.length > 15) continue;
      push(mk('PHONE', s, e, m[1].trim(), 0.92, 'rule', 'Number after a phone cue'));
    }
  }

  // ---- IP / MAC addresses
  for (const m of text.matchAll(/(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?![\d]|\.\d)/g)) {
    // "version 1.2.3.4", "v2.0.1.0", "build 10.0.19045.1"
    if (/(?:\bv|\bver\.?|\bversion|\brelease|\bbuild|\bupdate|\bpatch|@|\bsdk|\bchrome|\bfirefox|\bedge|\bwindows)\s*:?\s*$/i.test(text.slice(Math.max(0, m.index! - 12), m.index!))) continue;
    push(mk('IP_ADDRESS', m.index!, m.index! + m[0].length, m[0], 0.82, 'rule', 'IPv4 address'));
  }
  for (const m of text.matchAll(/(?<![\w:.])[0-9A-Fa-f]{0,4}(?::[0-9A-Fa-f]{0,4}){2,7}(?![\w:])/g)) {
    if (!ipv6Valid(m[0])) continue;
    push(mk('IP_ADDRESS', m.index!, m.index! + m[0].length, m[0], 0.85, 'rule', 'IPv6 address'));
  }
  for (const m of text.matchAll(/(?<![\w:-])[0-9A-Fa-f]{2}([:-])(?:[0-9A-Fa-f]{2}\1){4}[0-9A-Fa-f]{2}(?![\w:-])/g)) {
    push(mk('IP_ADDRESS', m.index!, m.index! + m[0].length, m[0], 0.85, 'rule', 'MAC (hardware) address', 'MAC_ADDRESS'));
  }

  // ---- Date of birth (cue required)
  {
    const dob =
      /(?:\bdob\b|\bd\.o\.b\.?|date[\s_-]of[\s_-]birth|birth[\s_-]?date|birthday|born(?: on)?)["']?\s*(?:is|was|:|=|-)?\s*["']?(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9},?\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/gid;
    for (const m of text.matchAll(dob)) {
      const [s, e] = m.indices![1];
      push(mk('DATE_OF_BIRTH', s, e, m[1], 0.93, 'rule', 'Date next to a date-of-birth cue'));
    }
  }

  // ---- Age
  {
    const patterns: RegExp[] = [
      /\b(\d{1,3})(?=[- ]years?[- ]old\b)/gid,
      /\b(?:age|aged)\s*(?:is|of|:|=)?\s*(\d{1,3})\b/gid,
      /\bI(?:'m| am)\s+(\d{2})(?=\s*(?:,|\.|\band\b|\byears?\b|$))/gid,
    ];
    for (const re of patterns) {
      for (const m of text.matchAll(re)) {
        const [s, e] = m.indices![1];
        const n = Number(m[1]);
        if (n < 1 || n > 110) continue;
        push(mk('AGE', s, e, m[1], 0.8, 'rule', 'Age of a person'));
      }
    }
  }

  // ---- Employee identifiers
  for (const m of text.matchAll(/\b(?:emp(?:loyee)?|staff)[\s_-]*(?:id|no\.?|number|code)?\s*(?:is|was|[:=#-])?\s*((?:[A-Z]{1,4}-?)?\d{3,9})\b/gid)) {
    const [s, e] = m.indices![1];
    push(mk('EMPLOYEE_ID', s, e, m[1], 0.86, 'rule', 'Employee identifier'));
  }
  for (const m of text.matchAll(/\bEMP[-_]?\d{3,9}\b/g)) {
    push(mk('EMPLOYEE_ID', m.index!, m.index! + m[0].length, m[0], 0.9, 'rule', 'Employee identifier format'));
  }

  // ---- Postal code (cue required)
  for (const m of text.matchAll(/\b(?:pin\s?code|pincode|postal code|post ?code|zip(?: code)?)\s*(?:is|:|=|-)?\s*(\d{5,6}(?:-\d{4})?)\b/gid)) {
    const [s, e] = m.indices![1];
    push(mk('LOCATION', s, e, m[1], 0.85, 'rule', 'Postal code', 'POSTAL_CODE'));
  }

  // ---- GPS coordinates (decimal degrees with at least 4 decimals)
  for (const m of text.matchAll(/(?<![\d.])-?(?:[1-8]?\d|90)\.\d{4,}\s*,\s*-?(?:1[0-7]\d|[1-9]?\d|180)\.\d{4,}(?![\d.])/g)) {
    push(mk('LOCATION', m.index!, m.index! + m[0].length, m[0], 0.8, 'rule', 'GPS coordinates', 'COORDINATES'));
  }

  // ---- Crypto wallets
  for (const m of text.matchAll(/(?<![\w])0x[a-fA-F0-9]{40}(?![\w])/g)) {
    push(mk('BANK_ACCOUNT', m.index!, m.index! + m[0].length, m[0], 0.9, 'rule', 'Ethereum-style wallet address', 'CRYPTO_WALLET'));
  }
  for (const m of text.matchAll(/\b(?:bc1|tb1)[ac-hj-np-z02-9]{25,87}\b/g)) {
    push(mk('BANK_ACCOUNT', m.index!, m.index! + m[0].length, m[0], 0.9, 'rule', 'Bitcoin wallet address', 'CRYPTO_WALLET'));
  }
  for (const m of text.matchAll(/\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g)) {
    if (!near(text, m.index!, m.index! + m[0].length, /\b(?:bitcoin|btc|wallet|crypto|address)\b/i, 50)) continue;
    push(mk('BANK_ACCOUNT', m.index!, m.index! + m[0].length, m[0], 0.86, 'rule', 'Bitcoin wallet address', 'CRYPTO_WALLET'));
  }

  detectCredentials(text).forEach(push);
  return out;
}

// --------------------------------------------------------------------------
// National / personal ID numbers (worldwide)
// --------------------------------------------------------------------------

/** Value shape for cue-based IDs: optional short letter prefix, then digits, optional digit groups. */
const ID_VALUE = '[A-Za-z]{0,5}[-/]?\\d[A-Za-z0-9/-]{1,20}(?:[ ]\\d[A-Za-z0-9/-]{0,10}){0,3}';

const ID_CUES: Array<[string, string, string]> = [
  ['national[\\s_-]*id(?:entity)?(?:[\\s_-]*card)?|national[\\s_-]*identity(?:[\\s_-]*card)?|identity[\\s_-]*card|id[\\s_-]*card|citizen[\\s_-]*id|resident[\\s_-]*id|civil[\\s_-]*id|personal[\\s_-]*id|nric|hkid|mykad|emirates[\\s_-]*id|dni|nie|curp|cnic|nida|bvn|nin|personnummer|pesel|bsn|codice[\\s_-]*fiscale|steuer[\\s_-]*id', 'NATIONAL_ID', 'National ID number'],
  ['voter[\\s_-]*id|epic', 'VOTER_ID', 'Voter ID number'],
  ['tax[\\s_-]*(?:id|payer[\\s_-]*id|file|reference|ref)|tin|ein|fein|itin|vat|gst(?:in)?|abn|utr|cnpj|tfn', 'TAX_ID', 'Tax identification number'],
  ['driver\'?s?[\\s_-]*licen[cs]e|driving[\\s_-]*licen[cs]e|licen[cs]e', 'DRIVER_LICENSE', 'Driving licence number'],
  ['mrn|uhid|patient[\\s_-]*id|medical[\\s_-]*record|health[\\s_-]*id|abha|medicare|medicaid', 'MEDICAL_RECORD_ID', 'Medical record identifier'],
  ['insurance[\\s_-]*(?:id|policy|member[\\s_-]*id)?|policy|member[\\s_-]*id|subscriber[\\s_-]*id|group[\\s_-]*number', 'INSURANCE_ID', 'Insurance policy / member number'],
  ['vin|chassis|vehicle[\\s_-]*(?:reg(?:istration)?|number|no\\.?)|licen[cs]e[\\s_-]*plate|number[\\s_-]*plate|reg(?:istration)?[\\s_-]*plate', 'VEHICLE_REG', 'Vehicle identifier'],
];

const AMBIGUOUS_ID_CUE =
  /^(?:tin|ein|fein|itin|vat|gst|abn|utr|tfn|epic|vin|nin|dni|nie|bsn|policy|licen[cs]e|chassis|insurance|medicare|medicaid|nhs)(?![A-Za-z])/i;

export function detectIdNumbers(text: string): Detection[] {
  const out: Detection[] = [];
  const add = (s: number, e: number, v: string, c: number, reason: string, label: string) =>
    out.push(mk('ID_NUMBER', s, e, v, c, 'rule', reason, label));

  // US Social Security Number (dashed) — checked for valid structure.
  for (const m of text.matchAll(/(?<![\w-])\d{3}-\d{2}-\d{4}(?![\w-]|\.\d)/g)) {
    const d = onlyDigits(m[0]);
    if (!ssnValid(d)) continue;
    const cue = near(text, m.index!, m.index! + m[0].length, /(?<![A-Za-z])(?:ssn|ss#|social|itin|tax)(?![A-Za-z])/i, 40);
    add(m.index!, m.index! + m[0].length, m[0], cue ? 0.97 : 0.88, 'US Social Security Number format', 'SSN');
  }
  for (const m of text.matchAll(cueRe('ssn|ss#|social[\\s_-]*security|itin', '\\d{3}[- ]?\\d{2}[- ]?\\d{4}'))) {
    const [s, e] = m.indices![1];
    add(s, e, m[1], 0.96, 'Number after a Social Security cue', 'SSN');
  }
  // Canada SIN
  for (const m of text.matchAll(cueRe('sin|social[\\s_-]*insurance', '\\d{3}[- ]?\\d{3}[- ]?\\d{3}'))) {
    const [s, e] = m.indices![1];
    add(s, e, m[1], luhnAny(onlyDigits(m[1])) ? 0.95 : 0.82, 'Canadian Social Insurance Number', 'SIN');
  }
  // UK National Insurance number
  for (const m of text.matchAll(/\b(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z] ?\d{2} ?\d{2} ?\d{2} ?[A-D]\b/g)) {
    add(m.index!, m.index! + m[0].length, m[0], 0.88, 'UK National Insurance number format', 'NINO');
  }
  // UK NHS number
  for (const m of text.matchAll(cueRe('nhs', '\\d{3}[- ]?\\d{3}[- ]?\\d{4}'))) {
    const [s, e] = m.indices![1];
    add(s, e, m[1], nhsValid(onlyDigits(m[1])) ? 0.97 : 0.86, 'UK NHS number', 'MEDICAL_RECORD_ID');
  }
  // India GSTIN
  for (const m of text.matchAll(/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g)) {
    add(m.index!, m.index! + m[0].length, m[0], 0.95, 'Indian GSTIN format', 'TAX_ID');
  }
  // Singapore NRIC / FIN
  for (const m of text.matchAll(/\b[STFGM]\d{7}[A-Z]\b/g)) {
    add(m.index!, m.index! + m[0].length, m[0], 0.85, 'Singapore NRIC / FIN format', 'NATIONAL_ID');
  }
  // Brazil CPF
  for (const m of text.matchAll(/(?<![\d.])\d{3}\.\d{3}\.\d{3}-\d{2}(?![\d])/g)) {
    add(m.index!, m.index! + m[0].length, m[0], cpfValid(onlyDigits(m[0])) ? 0.95 : 0.8, 'Brazilian CPF format', 'NATIONAL_ID');
  }
  // UAE Emirates ID
  for (const m of text.matchAll(/\b784-?\d{4}-?\d{7}-?\d\b/g)) {
    add(m.index!, m.index! + m[0].length, m[0], 0.95, 'Emirates ID format', 'NATIONAL_ID');
  }
  // Indian vehicle registration
  for (const m of text.matchAll(
    /\b(?:AN|AP|AR|AS|BR|CH|CG|DD|DL|DN|GA|GJ|HP|HR|JH|JK|KA|KL|LA|LD|MH|ML|MN|MP|MZ|NL|OD|OR|PB|PY|RJ|SK|TN|TR|TS|UK|UP|WB)[ -]?\d{1,2}[ -]?[A-Z]{1,3}[ -]?\d{4}\b/g,
  )) {
    add(m.index!, m.index! + m[0].length, m[0], 0.8, 'Indian vehicle registration format', 'VEHICLE_REG');
  }
  // Cue-based IDs (any country). Short or everyday cue words ("VAT 2024", "policy 2023", "licence 3")
  // only count when followed by an explicit "number / no / # / id / : / =".
  for (const [cue, label, reason] of ID_CUES) {
    for (const m of text.matchAll(cueRe(cue, ID_VALUE, 'number|num|no\\.?|nr|#|code|id'))) {
      const [s] = m.indices![1];
      const prefix = text.slice(m.index!, s);
      if (AMBIGUOUS_ID_CUE.test(prefix) && !/(?:number|num|no\.?|nr|#|\bid\b|[:=]|\bis\b)/i.test(prefix.replace(AMBIGUOUS_ID_CUE, ''))) {
        continue;
      }
      const v = m[1].replace(/[-/.]+$/, '');
      const digits = onlyDigits(v).length;
      if (digits < 3 || v.length < 4 || v.length > 30) continue;
      if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(v)) continue; // a date, not an ID
      add(s, s + v.length, v, 0.88, `${reason} after a cue`, label);
    }
  }
  return out;
}

// --------------------------------------------------------------------------
// Credentials
// --------------------------------------------------------------------------

function hasMixed(v: string): boolean {
  return /\d/.test(v) && /[A-Za-z]/.test(v);
}

const KNOWN_TOKENS: Array<[RegExp, string]> = [
  [/\bsk-(?:ant-|proj-|svcacct-|admin-)?[A-Za-z0-9_-]{8,}/g, 'OpenAI/Anthropic-style secret key'],
  [/\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ABIA|ACCA)[A-Z0-9]{16}\b/g, 'AWS access key id'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}\b/g, 'GitHub token'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, 'GitHub fine-grained token'],
  [/\bglpat-[A-Za-z0-9_-]{20,}\b/g, 'GitLab token'],
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}/g, 'Slack token'],
  [/\bxapp-\d-[A-Za-z0-9-]{10,}/g, 'Slack app token'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/g, 'Google API key'],
  [/\bya29\.[0-9A-Za-z_-]{20,}/g, 'Google OAuth access token'],
  [/\bGOCSPX-[A-Za-z0-9_-]{20,}/g, 'Google OAuth client secret'],
  [/\b[sr]k_(?:live|test)_[0-9A-Za-z]{16,}\b/g, 'Stripe secret key'],
  [/\bwhsec_[0-9A-Za-z]{16,}\b/g, 'Stripe webhook secret'],
  [/\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g, 'SendGrid key'],
  [/\bhf_[A-Za-z0-9]{30,}\b/g, 'Hugging Face token'],
  [/\bnpm_[A-Za-z0-9]{36}\b/g, 'npm token'],
  [/\bpypi-[A-Za-z0-9_-]{50,}/g, 'PyPI token'],
  [/\bdckr_pat_[A-Za-z0-9_-]{20,}/g, 'Docker Hub token'],
  [/\bSK[0-9a-f]{32}\b/g, 'Twilio key'],
  [/\bkey-[0-9a-f]{32}\b/g, 'Mailgun key'],
  [/\bsq0(?:atp|csp)-[0-9A-Za-z_-]{22,}/g, 'Square token'],
  [/\bshp(?:at|ss|ca|pa)_[a-fA-F0-9]{32}\b/g, 'Shopify token'],
  [/\bdop_v1_[a-f0-9]{64}\b/g, 'DigitalOcean token'],
  [/\bdapi[a-f0-9]{32}\b/g, 'Databricks token'],
  [/\b(?:ntn_|secret_)[A-Za-z0-9]{40,}\b/g, 'Notion token'],
  [/\blin_api_[A-Za-z0-9]{32,}\b/g, 'Linear API key'],
  [/\bsbp_[a-f0-9]{40}\b/g, 'Supabase token'],
  [/\b(?:gsk|xai|pplx|r8)[_-][A-Za-z0-9]{20,}\b/g, 'AI provider API key'],
  [/\b(?:EAA[A-Za-z0-9]{30,})\b/g, 'Facebook access token'],
  [/\b\d{8,10}:AA[A-Za-z0-9_-]{30,}\b/g, 'Telegram bot token'],
  [/\b[MN][A-Za-z\d]{23,25}\.[\w-]{6}\.[\w-]{27,}\b/g, 'Discord bot token'],
  [/\bAccountKey=[A-Za-z0-9+/=]{40,}/g, 'Azure storage key'],
  [/\bsig=[A-Za-z0-9%+/=]{20,}/g, 'Azure SAS signature'],
];

export function detectCredentials(text: string): Detection[] {
  const out: Detection[] = [];
  const push = (d: Detection) => out.push(d);

  // Private key blocks (RSA, EC, OPENSSH, PGP ...)
  for (const m of text.matchAll(
    /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----[\s\S]*?(?:-----END (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----|$)/g,
  )) {
    push(mk('PRIVATE_KEY', m.index!, m.index! + m[0].length, m[0], 0.99, 'rule', 'PEM private key block'));
  }
  for (const m of text.matchAll(/PuTTY-User-Key-File-\d+:[\s\S]*?(?:Private-MAC:\s*[0-9a-fA-F]+|$)/g)) {
    push(mk('PRIVATE_KEY', m.index!, m.index! + m[0].length, m[0], 0.99, 'rule', 'PuTTY private key'));
  }
  // Raw 64-hex private keys (crypto wallets) next to a cue
  for (const m of text.matchAll(/(?<![\w])(?:0x)?[a-fA-F0-9]{64}(?![\w])/g)) {
    if (!near(text, m.index!, m.index! + m[0].length, /private[\s_-]*key|priv[\s_-]*key|secret[\s_-]*key|wallet[\s_-]*key|signing[\s_-]*key/i, 40)) continue;
    push(mk('PRIVATE_KEY', m.index!, m.index! + m[0].length, m[0], 0.95, 'rule', 'Hex private key'));
  }
  // Wallet seed / recovery phrases
  for (const m of text.matchAll(
    /(?:seed[\s_-]*phrase|recovery[\s_-]*phrase|secret[\s_-]*recovery[\s_-]*phrase|mnemonic|backup[\s_-]*phrase|seed[\s_-]*words)["']?\s*(?:is|was|:|=|-)?\s*["']?((?:[a-z]{3,8}[\s,]+){11,23}[a-z]{3,8})/gid,
  )) {
    const [s, e] = m.indices![1];
    push(mk('SECRET', s, e, m[1], 0.95, 'rule', 'Wallet recovery phrase', 'SEED_PHRASE'));
  }

  // Well-known token formats
  for (const [re, why] of KNOWN_TOKENS) {
    for (const m of text.matchAll(re)) {
      push(mk('API_KEY', m.index!, m.index! + m[0].length, m[0], 0.97, 'rule', why));
    }
  }

  // Webhook URLs carry their own secret
  for (const m of text.matchAll(
    /https?:\/\/(?:hooks\.slack\.com\/(?:services|workflows|triggers)\/[A-Za-z0-9/_-]{10,}|(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]{20,}|[\w.-]+\.webhook\.office\.com\/[^\s"'<>]+|outlook\.office\.com\/webhook\/[^\s"'<>]+|hooks\.zapier\.com\/hooks\/catch\/[^\s"'<>]+|chat\.googleapis\.com\/v1\/spaces\/[^\s"'<>]*key=[^\s"'<>]+)/g,
  )) {
    push(mk('SECRET', m.index!, m.index! + m[0].length, m[0], 0.96, 'rule', 'Webhook URL (anyone with it can post)', 'WEBHOOK_URL'));
  }

  // JWT
  for (const m of text.matchAll(/\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{5,}/g)) {
    push(mk('JWT', m.index!, m.index! + m[0].length, m[0], 0.97, 'rule', 'JSON Web Token'));
  }

  // Bearer / Basic / Token authorization
  for (const m of text.matchAll(/\b(?:Bearer|Token)\s+([A-Za-z0-9._~+/=-]{16,})/gid)) {
    const [s, e] = m.indices![1];
    if (!hasMixed(m[1])) continue;
    push(mk('SECRET', s, e, m[1], 0.92, 'rule', 'Bearer token'));
  }
  for (const m of text.matchAll(/\bAuthorization["']?\s*[:=]\s*["']?Basic\s+([A-Za-z0-9+/=]{8,})/gid)) {
    const [s, e] = m.indices![1];
    push(mk('SECRET', s, e, m[1], 0.92, 'rule', 'Basic authorization value'));
  }
  // curl -u user:password / --user user:password
  for (const m of text.matchAll(/(?:^|\s)(?:-u|--user)\s+["']?[^\s:"']+:([^\s"']{3,})/gid)) {
    const [s, e] = m.indices![1];
    if (isPlaceholder(m[1])) continue;
    push(mk('PASSWORD', s, e, m[1], 0.92, 'rule', 'Password in a command-line credential'));
  }

  // Passwords
  {
    const explicit =
      /(?<![A-Za-z])(?:password|passwd|pwd|passcode|passphrase|passwort|kennwort|contrase[nñ]a|senha|mot[\s_-]de[\s_-]passe|wachtwoord)["'\x60]?[^\S\r\n]*(?:[:=](?!=)|->|=>)[^\S\r\n]*["'\x60]?([^\s"'\x60,;]{3,})/gid;
    for (const m of text.matchAll(explicit)) {
      const [s] = m.indices![1];
      const v = m[1].replace(/[.,)\]}]+$/, '');
      if (isPlaceholder(v) || v.length < 3 || looksLikeCodeRef(v)) continue;
      push(mk('PASSWORD', s, s + v.length, v, 0.93, 'rule', 'Value assigned to a password field'));
    }
    const spoken = /\b(?:password|passwd|pwd|passcode|passphrase)\s+(?:is|was|=)\s+["'\x60]?([^\s"'\x60,;]{4,})/gid;
    for (const m of text.matchAll(spoken)) {
      const [s] = m.indices![1];
      const v = m[1].replace(/[.,)]+$/, '');
      if (isPlaceholder(v) || looksLikeCodeRef(v)) continue;
      if (!(/\d/.test(v) || /[^A-Za-z0-9]/.test(v) || (/[a-z]/.test(v) && /[A-Z]/.test(v)))) continue;
      push(mk('PASSWORD', s, s + v.length, v, 0.85, 'rule', 'Value stated as a password'));
    }
    // "PIN code 834001" is an Indian postal code, not a PIN.
    const pin = /(?<![A-Za-z])(?:pin(?![\s_-]*code)|mpin|upi\s?pin|atm\s?pin|otp|cvv2?|cvc2?|cvn|security code|verification code|one[\s-]time (?:password|code))(?![A-Za-z])[\s_-]*(?:number|no\.?)?["']?\s*(?:is|=|:)?\s*["']?(\d{3,8})\b/gid;
    for (const m of text.matchAll(pin)) {
      const [s, e] = m.indices![1];
      push(mk('PASSWORD', s, e, m[1], 0.86, 'rule', 'PIN / OTP / security code', 'PIN'));
    }
  }

  // Credentials embedded in URLs
  for (const m of text.matchAll(/\b[a-z][a-z0-9+.-]*:\/\/([^\s:@/]*:[^\s@/]+)@[^\s]+/gid)) {
    const [s, e] = m.indices![1];
    // 0.99 so it beats the EMAIL rule, which also matches "pass@host".
    push(mk('CREDENTIAL_URL', s, e, m[1], 0.99, 'rule', 'Username and password inside a URL'));
  }
  for (const m of text.matchAll(/[?&](?:token|access_token|refresh_token|id_token|api[_-]?key|apikey|key|secret|client_secret|sig|signature|auth|password|pwd|code)=([^&\s#"']{8,})/gid)) {
    const [s, e] = m.indices![1];
    push(mk('SECRET', s, e, m[1], 0.88, 'rule', 'Secret-looking URL parameter'));
  }

  // A token that names itself: bearer_secret_xyz7890..., prod_api_key_2f9a..., db-password-1234...
  for (const m of text.matchAll(/(?<![\w-])[A-Za-z0-9_-]{16,}(?![\w-])/g)) {
    const v = m[0];
    if (!/(?:secret|token|apikey|api_key|api-key|passw|pwd|bearer|private|credential|auth)/i.test(v)) continue;
    if ((v.match(/\d/g) ?? []).length < 4) continue;
    push(mk('SECRET', m.index!, m.index! + v.length, v, 0.82, 'rule', 'Token-like value that contains a secret keyword'));
  }

  // A long token right after a credential cue ("my github token ghx12...", "api key 9f8e7d...")
  for (const m of text.matchAll(
    /\b(?:token|api[\s_-]?key|access[\s_-]?key|secret(?:[\s_-]?key)?|private[\s_-]?key|client[\s_-]?secret|credential|bearer|auth(?:orization)?[\s_-]?(?:code|token|key))\b[^\S\n]{1,3}(?:is[^\S\n]+|[:=-][^\S\n]*)?["'\x60]?([A-Za-z0-9_\-+/=.]{12,})/gid,
  )) {
    const [s] = m.indices![1];
    const v = m[1].replace(/[.,]+$/, '');
    if (!hasMixed(v) || isPlaceholder(v)) continue;
    push(mk('SECRET', s, s + v.length, v, 0.84, 'rule', 'Long token after a credential cue'));
  }

  // Generic high-entropy tokens
  for (const m of text.matchAll(/(?<![\w/+=.-])[A-Za-z0-9_+=-]{24,}(?![\w/+=-])/g)) {
    const v = m[0];
    if (!(/[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v))) continue;
    if (shannonEntropy(v) < 4.0) continue;
    push(mk('SECRET', m.index!, m.index! + v.length, v, 0.55, 'rule', 'Long high-entropy string (looks like a key or token)'));
  }

  return out;
}

// --------------------------------------------------------------------------
// Heuristic detectors (Basic mode: lower confidence, no model needed)
// --------------------------------------------------------------------------

const NAME_WORD = "[A-Z][a-z]{1,}(?:['\u2019-][A-Z]?[a-z]+)?";
export const NAME_SEQ = new RegExp(`${NAME_WORD}(?:\\s+${NAME_WORD}){0,2}`, 'y');

export function isNameish(word: string): boolean {
  return !STOP_WORDS.has(word) && !MONTHS.has(word) && !/(?:ing|ly|ed)$/.test(word);
}

export function trimToNames(seq: string): string {
  const words = seq.split(/\s+/);
  const kept: string[] = [];
  for (const wd of words) {
    if (!isNameish(wd)) break;
    kept.push(wd);
  }
  return kept.join(' ');
}

/** Read a capitalised name starting exactly at `start`. */
function nameAt(text: string, start: number): string {
  NAME_SEQ.lastIndex = start;
  const n = NAME_SEQ.exec(text);
  return n ? trimToNames(n[0]) : '';
}

const RELATIONS =
  'wife|husband|son|daughter|mother|mom|mum|father|dad|brother|sister|sibling|friend|best friend|boss|manager|colleague|coworker|co-worker|teammate|partner|fianc[eé]e?|girlfriend|boyfriend|uncle|aunt|cousin|nephew|niece|grandmother|grandfather|grandma|grandpa|granny|neighbou?r|landlord|landlady|tenant|roommate|flatmate|client|patient|doctor|dentist|therapist|lawyer|attorney|accountant|teacher|tutor|professor|student|assistant|secretary|nanny|maid|driver|kid|child|baby|toddler|stepson|stepdaughter|ex|ex-wife|ex-husband|in-law|mother-in-law|father-in-law|spouse';
const PERSON_NOUN =
  /\b(?:guy|man|woman|girl|boy|person|patient|friend|someone|somebody|kid|child|son|daughter|lady|gentleman|employee|customer|user|client|colleague|doctor|nurse|teacher|student|candidate|applicant|baby|dog|cat)\b/i;

export function detectPersons(text: string): Detection[] {
  const out: Detection[] = [];

  // Titles: Dr. Anil Kumar -> name part only
  for (const m of text.matchAll(/\b(?:Mr|Mrs|Ms|Mx|Miss|Dr|Shri|Smt|Kumari|Prof|Sir|Sri|Herr|Frau|Mme|Mlle|Mister|Madam|Capt|Lt|Sgt)\.?\s+(?=[A-Z])/g)) {
    const start = m.index! + m[0].length;
    const name = nameAt(text, start);
    if (!name) continue;
    out.push(mk('PERSON', start, start + name.length, name, 0.88, 'heuristic', 'Name after a title (Mr./Dr./Shri ...)'));
  }

  // Cue phrases
  const STRONG = /\b(?:my name is|my name's|name is|i am called|i'm called|call me|(?:patient|employee|customer|client|user|contact|applicant|candidate|student|account holder|cardholder|card holder|beneficiary|nominee|guardian)(?: full)? name\s*(?:is|[:=-])|(?:full |first |last |legal )?name\s*[:=-]|patient\s*[:=-]|employee\s*[:=-]|customer\s*[:=-]|signed\s*[:=-])\s*/gi;
  const WEAK = /\b(?:i am|i'm|this is|hi|hello|hey|dear|regards,?|thanks,?|thank you,?|sincerely,?|cheers,|best,|yours,|warmly,|respectfully,|love,|signed(?: by)?|patient|employee|customer|client|applicant|candidate|with|met|meet|told|asked|cc|attn:?)\s+/gi;
  for (const [re, strong] of [[STRONG, true], [WEAK, false]] as const) {
    for (const m of text.matchAll(re)) {
      const start = m.index! + m[0].length;
      const name = nameAt(text, start);
      if (!name) continue;
      const words = name.split(' ');
      const known = FIRST_NAMES.has(words[0]);
      if (strong) {
        out.push(mk('PERSON', start, start + name.length, name, known ? 0.92 : 0.8, 'heuristic', 'Name introduced by a cue phrase'));
      } else if (known || (words.length >= 2 && SURNAMES.has(words[words.length - 1]))) {
        out.push(mk('PERSON', start, start + name.length, name, known ? 0.82 : 0.7, 'heuristic', 'Name following a greeting or role word'));
      } else if (words.length >= 2 && !/\b(?:with|met|meet|told|asked)\s+$/i.test(m[0])) {
        out.push(mk('PERSON', start, start + name.length, name, 0.66, 'heuristic', 'Name following a greeting or role word'));
      }
    }
  }

  // Relationships: "my wife Priya", "our landlord, Mr Rao", "my boss's name is Mark"
  for (const m of text.matchAll(new RegExp(`\\b(?:my|our|his|her|their|your)\\s+(?:${RELATIONS})(?:'s name is|,| named| called| is)?\\s+(?=[A-Z])`, 'gi'))) {
    const start = m.index! + m[0].length;
    const name = nameAt(text, start);
    if (!name) continue;
    const known = FIRST_NAMES.has(name.split(' ')[0]);
    out.push(mk('PERSON', start, start + name.length, name, known ? 0.88 : 0.76, 'heuristic', 'Name after a relationship word'));
  }

  // "a patient named Ravi", "a guy called John Smith"
  for (const m of text.matchAll(/\b(?:named|called|nicknamed|aka|a\.k\.a\.)\s+(?=[A-Z])/g)) {
    const start = m.index! + m[0].length;
    const name = nameAt(text, start);
    if (!name) continue;
    const known = FIRST_NAMES.has(name.split(' ')[0]);
    const personish = near(text, m.index!, m.index!, PERSON_NOUN, 30);
    if (!known && !personish) continue;
    out.push(mk('PERSON', start, start + name.length, name, known ? 0.86 : 0.74, 'heuristic', 'Name after "named" / "called"'));
  }

  // Email headers: From: Jane Doe <jane@x.com>
  for (const m of text.matchAll(/^[ \t>]*(?:From|To|Cc|Bcc|Reply-To|Sender|Attn|Attention)\s*:\s*"?([A-Z][A-Za-z'\u2019.-]+(?:\s+[A-Z][A-Za-z'\u2019.-]+){0,3})"?\s*(?=<|,|;|$)/gm)) {
    const name = m[1].trim();
    const start = m.index! + m[0].indexOf(name);
    const words = name.split(/\s+/);
    if (words.length < 2 && !FIRST_NAMES.has(words[0])) continue;
    out.push(mk('PERSON', start, start + name.length, name, 0.86, 'heuristic', 'Name in an email header'));
  }

  // Known first names (optionally followed by a known surname)
  // The second word is a lookahead so "Contact Priya Verma" still reaches "Priya" (a consuming match
  // would swallow "Priya" as the second word of "Contact Priya").
  for (const m of text.matchAll(/\b([A-Z][a-z]+)\b(?=(?:[ \t]+([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\b)?)/g)) {
    const first = m[1];
    if (!FIRST_NAMES.has(first) || STOP_WORDS.has(first)) continue;
    const second = m[2];
    const full = second ? text.slice(m.index!, text.indexOf(second, m.index! + first.length) + second.length) : first;
    if (second && SURNAMES.has(second)) {
      out.push(mk('PERSON', m.index!, m.index! + full.length, full, 0.86, 'heuristic', 'Common first name followed by a common surname'));
    } else if (second && isNameish(second) && !CITIES[second] && /^[A-Z][a-z]{2,}$/.test(second) && !/^(?:The|And|But|Or)$/.test(second)) {
      out.push(mk('PERSON', m.index!, m.index! + full.length, full, 0.72, 'heuristic', 'Common first name followed by a capitalised word'));
    } else {
      out.push(mk('PERSON', m.index!, m.index! + first.length, first, 0.6, 'heuristic', 'Common first name'));
    }
  }

  // Propagate: later bare mentions of a detected name word (e.g. "Rahul" after "Rahul Sharma")
  const seen = new Set<string>();
  for (const d of out.slice()) {
    if (d.confidence < 0.6) continue;
    for (const word of d.text.split(/\s+/)) {
      if (word.length < 3 || !isNameish(word) || seen.has(word)) continue;
      seen.add(word);
      for (const m of text.matchAll(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'))) {
        out.push(mk('PERSON', m.index!, m.index! + word.length, word, 0.74, 'heuristic', 'Repeat mention of a detected name'));
      }
    }
  }
  return out;
}

const CONDITION_RE = new RegExp(`\\b(?:${MEDICAL_CONDITIONS.join('|')})\\b`, 'gi');
const MED_RE = new RegExp(
  `\\b(?:${MEDICATIONS.join('|')})\\b(?:\\s+\\d+(?:\\.\\d+)?\\s?(?:mg|mcg|g|ml|iu|units))?`,
  'gi',
);

export function detectMedical(text: string): Detection[] {
  const out: Detection[] = [];
  for (const m of text.matchAll(CONDITION_RE)) {
    out.push(mk('MEDICAL', m.index!, m.index! + m[0].length, m[0], 0.82, 'heuristic', 'Known medical condition', 'MEDICAL_CONDITION'));
  }
  for (const m of text.matchAll(MED_RE)) {
    out.push(mk('MEDICAL', m.index!, m.index! + m[0].length, m[0], 0.82, 'heuristic', 'Known medication', 'MEDICATION'));
  }
  // Cue phrases: "diagnosed with X"
  const cue = /\b(?:diagnosed with|diagnosis of|suffering from|suffers from|history of|treated for|symptoms of|tested positive for|prescribed)\s+((?:an?\s+|the\s+)?[a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})/gid;
  for (const m of text.matchAll(cue)) {
    let [s, e] = m.indices![1];
    let phrase = m[1].replace(/^(?:an?|the)\s+/i, '');
    phrase = phrase.split(/\b(?:and|but|who|which|for|since|because|so|that|with|last|this|every|in|at|on|by)\b/i)[0].trim();
    if (!phrase) continue;
    s = m.index! + m[0].indexOf(phrase);
    e = s + phrase.length;
    out.push(mk('MEDICAL', s, e, phrase, 0.66, 'heuristic', 'Health condition after a diagnosis cue', 'MEDICAL_CONDITION'));
  }
  // Lab readings
  for (const m of text.matchAll(/\b(?:hba1c|blood sugar|glucose|bp|blood pressure|cholesterol|creatinine|hemoglobin|haemoglobin|ldl|hdl|tsh|psa|bmi)\s*(?:is|was|of|:|=|level)?\s*\d+(?:[./]\d+)?(?:\s?(?:mg\/dl|mmhg|mmol\/l|g\/dl|%))?/gi)) {
    if (!/\d/.test(m[0])) continue;
    out.push(mk('MEDICAL', m.index!, m.index! + m[0].length, m[0], 0.78, 'heuristic', 'Clinical measurement', 'MEDICAL_TEST'));
  }
  // Blood group
  for (const m of text.matchAll(/\bblood\s*(?:group|type)\s*(?:is|:|=|-)?\s*((?:A|B|AB|O)[+-]|(?:A|B|AB|O)\s?(?:positive|negative|pos|neg))/gid)) {
    const [s, e] = m.indices![1];
    out.push(mk('MEDICAL', s, e, m[1], 0.85, 'heuristic', 'Blood group', 'MEDICAL_CONDITION'));
  }
  return out;
}

const AMOUNT_RE =
  /(?:₹|Rs\.?|INR|USD|US\$|\$|€|£|¥|EUR|GBP|AED|SGD|CAD|AUD)\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:lakhs?|lacs?|crores?|cr|k|m|mn|million|billion|bn|lpa))?\b|\b\d[\d,]*(?:\.\d+)?\s?(?:lakhs?|lacs?|crores?|lpa|rupees|dollars|euros|pounds)\b/gi;
const MONEY_CUE =
  /\b(?:salary|income|earn(?:s|ing|ings)?|ctc|package|balance|loan|emi|savings|revenue|profit|turnover|invoice|bonus|mortgage|debt|rent|budget|payment|paid|fee|tax|deal|valuation|funding|arr|mrr|sales|worth|net worth|compensation|stipend|wage|pension|credit limit|owe|owes|owed|spent|cost)\b/i;

export function detectFinancial(text: string): Detection[] {
  const out: Detection[] = [];
  for (const m of text.matchAll(AMOUNT_RE)) {
    const s = m.index!;
    const e = s + m[0].length;
    if (!near(text, s, e, MONEY_CUE, 60, 60)) continue;
    out.push(mk('FINANCIAL', s, e, m[0], 0.74, 'heuristic', 'Money amount near a financial cue', 'AMOUNT'));
  }
  return out;
}

/** Host-name segments that mark private infrastructure. */
const INTERNAL_SEGMENTS = new Set([
  'internal', 'intranet', 'vault', 'corp', 'staging', 'stage', 'preprod', 'uat', 'private', 'priv', 'onprem', 'backoffice',
]);
const INTERNAL_TLDS = new Set(['internal', 'corp', 'intranet', 'lan', 'local', 'localdomain', 'home', 'private']);
const SYSTEM_USERS = new Set([
  'public', 'shared', 'default', 'default user', 'all users', 'guest', 'admin', 'administrator', 'root', 'ubuntu',
  'ec2-user', 'runner', 'user', 'username', 'yourname', 'your-name', 'me', 'you', 'name', 'node', 'app', 'www-data',
  'vagrant', 'docker', 'pi', 'linuxbrew', 'shared folders', 'desktop',
]);

export function detectConfidential(text: string): Detection[] {
  const out: Detection[] = [];
  for (const m of text.matchAll(
    /\b(?:strictly confidential|confidential|internal use only|internal only|for internal use|do not distribute|not for distribution|do not share|proprietary|trade secret|under nda|\bnda\b|top secret|classified|privileged (?:and|&) confidential)\b/gi,
  )) {
    out.push(mk('CONFIDENTIAL', m.index!, m.index! + m[0].length, m[0], 0.7, 'heuristic', 'Document is marked confidential', 'CONFIDENTIAL_MARKER'));
  }
  for (const m of text.matchAll(/\b(?:Project|Operation|Codename|Code name)\s+[A-Z][A-Za-z0-9]+\b/g)) {
    if (/^Project\s+(?:Manager|Management|Plan|Team|Lead|Report|Status|Overview|Scope|Timeline|Goals?|Summary|Name)$/.test(m[0])) continue;
    out.push(mk('CONFIDENTIAL', m.index!, m.index! + m[0].length, m[0], 0.76, 'heuristic', 'Internal project code name', 'PROJECT'));
  }

  // Internal hostnames and URLs: build01.corp, https://internal-vault.net, api.staging.acme.com
  for (const m of text.matchAll(
    /(?<![@\w.-])(?:[a-z][a-z0-9+.-]*:\/\/)?((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,23})(?::\d{2,5})?(?:\/[^\s"'<>)\]}]*)?/gi,
  )) {
    const host = m[1].toLowerCase();
    const labels = host.split('.');
    const tld = labels[labels.length - 1];
    const segments = labels.slice(0, -1).flatMap((l) => l.split('-'));
    const internal = INTERNAL_TLDS.has(tld) || segments.some((s) => INTERNAL_SEGMENTS.has(s));
    if (!internal) continue;
    const v = m[0].replace(/[.,;:]+$/, '');
    out.push(mk('CONFIDENTIAL', m.index!, m.index! + v.length, v, 0.8, 'heuristic', 'Internal hostname or URL', 'INTERNAL_HOST'));
  }

  // Cloud resource identifiers
  for (const m of text.matchAll(/\barn:aws[a-z-]*:[a-z0-9-]+:[a-z0-9-]*:\d{12}:[^\s"',;)\]}]+/g)) {
    out.push(mk('CONFIDENTIAL', m.index!, m.index! + m[0].length, m[0], 0.86, 'rule', 'AWS resource name (includes the account id)', 'CLOUD_RESOURCE'));
  }
  for (const m of text.matchAll(/\b(?:aws[\s_-]*)?account[\s_-]*id["']?\s*(?:is|:|=)?\s*["']?(\d{12})\b/gid)) {
    const [s, e] = m.indices![1];
    out.push(mk('CONFIDENTIAL', s, e, m[1], 0.86, 'rule', 'Cloud account id', 'CLOUD_RESOURCE'));
  }

  // User names inside file paths: C:\Users\rohit\..., /home/priya/..., /Users/sam/...
  for (const m of text.matchAll(/(?:\b[A-Za-z]:\\+(?:Users|Documents and Settings)\\+|(?<![\w.])\/(?:Users|home)\/)([^\\/\s"'<>:*?|]{2,40})/gid)) {
    const [s, e] = m.indices![1];
    if (SYSTEM_USERS.has(m[1].toLowerCase()) || /^[$%<{]/.test(m[1])) continue;
    out.push(mk('CONFIDENTIAL', s, e, m[1], 0.74, 'heuristic', 'User name inside a file path', 'USERNAME'));
  }
  return out;
}

const ORG_SUFFIX =
  'Pvt\\.?\\s+Ltd\\.?|Ltd\\.?|Limited|Inc\\.?|LLC|LLP|PLC|GmbH|S\\.?A\\.?|AG|B\\.?V\\.?|Pty\\.?\\s+Ltd\\.?|Corp\\.?|Corporation|Technologies|Technology|Solutions|Systems|Labs|Bank|Hospital|Clinic|University|College|Institute|School|Group|Enterprises|Industries|Consultancy|Consulting|Services|Healthcare|Pharma|Pharmaceuticals|Motors|Airlines|Foundation|Trust|Holdings|Partners|Capital|Ventures|Insurance';
const ORG_LEAD_STOP = new Set(['At', 'The', 'In', 'On', 'Visit', 'Contact', 'Call', 'My', 'Our', 'Your', 'Dear', 'To', 'From', 'For', 'With', 'Of', 'And', 'I']);

export function detectPlaces(text: string): Detection[] {
  const out: Detection[] = [];

  // Organizations by suffix
  const orgRe = new RegExp(`\\b((?:[A-Z][\\w&'-]*\\s+){1,3}(?:${ORG_SUFFIX}))(?![\\w])`, 'g');
  for (const m of text.matchAll(orgRe)) {
    const words = m[1].split(/\s+/);
    let skip = 0;
    while (skip < words.length - 1 && (ORG_LEAD_STOP.has(words[skip]) || STOP_WORDS.has(words[skip]))) skip++;
    const name = words.slice(skip).join(' ');
    if (words.length - skip < 2) continue;
    const start = m.index! + m[1].indexOf(name);
    out.push(mk('ORGANIZATION', start, start + name.length, name, 0.66, 'heuristic', 'Organization name (company/hospital/bank suffix)'));
  }

  // Known cities
  const cityNames = Object.keys(CITIES).sort((a, b) => b.length - a.length);
  const cityRe = new RegExp(`\\b(?:${cityNames.join('|')})\\b`, 'g');
  for (const m of text.matchAll(cityRe)) {
    out.push(mk('LOCATION', m.index!, m.index! + m[0].length, m[0], 0.72, 'heuristic', 'Known city', 'CITY'));
  }

  // Cue + capitalised word(s)
  const cue = /\b(?:from|lives? in|living in|based in|located in|resident of|residing in|staying in|born in|moved to|posted in|works? in|working in|grew up in|relocat(?:e|ed|ing) to|address is)\s+/gi;
  for (const m of text.matchAll(cue)) {
    const start = m.index! + m[0].length;
    NAME_SEQ.lastIndex = start;
    const n = NAME_SEQ.exec(text);
    if (!n) continue;
    const words = n[0].split(/\s+/);
    const place: string[] = [];
    for (const wd of words.slice(0, 2)) {
      if (STOP_WORDS.has(wd) || MONTHS.has(wd)) break;
      place.push(wd);
    }
    if (!place.length) continue;
    const p = place.join(' ');
    out.push(mk('LOCATION', start, start + p.length, p, CITIES[p] ? 0.75 : 0.45, 'heuristic', 'Place after a location cue', 'LOCATION'));
  }

  // Street-style addresses
  for (const m of text.matchAll(
    /\b\d{1,5}[A-Za-z]?,?\s+[A-Z][\w .'-]{2,40}?\s(?:Street|St\.?|Road|Rd\.?|Lane|Ln\.?|Avenue|Ave\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Court|Ct\.?|Place|Pl\.?|Way|Terrace|Crescent|Highway|Hwy\.?|Nagar|Colony|Sector|Block|Marg|Layout|Apartments?|Apts?\.?|Society|Enclave|Phase|Chowk|Gali|Bagh|Vihar|Puram)\b[^\n.]{0,40}/g,
  )) {
    out.push(mk('LOCATION', m.index!, m.index! + m[0].length, m[0], 0.62, 'heuristic', 'Street address', 'ADDRESS'));
  }
  // US-style "City, ST 12345"
  for (const m of text.matchAll(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s(?:A[KLRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])\s\d{5}(?:-\d{4})?\b/g)) {
    out.push(mk('LOCATION', m.index!, m.index! + m[0].length, m[0], 0.8, 'heuristic', 'City, state and ZIP code', 'ADDRESS'));
  }
  // UK postcodes
  for (const m of text.matchAll(/\b[A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2}\b/g)) {
    out.push(mk('LOCATION', m.index!, m.index! + m[0].length, m[0], 0.72, 'heuristic', 'UK postcode', 'POSTAL_CODE'));
  }
  return out;
}

export function detectHeuristics(text: string): Detection[] {
  return [
    ...detectPersons(text),
    ...detectMedical(text),
    ...detectFinancial(text),
    ...detectConfidential(text),
    ...detectPlaces(text),
  ];
}
