// Turns detections into a safe text according to a profile.

import { CITIES } from './lexicon';
import { isCredentialType } from './detectors';
import { computeRisk, riskLevel, RESIDUAL } from './risk';
import type { Action, AnalysisResult, Detection, Finding, Profile } from './types';

export type Override = 'KEEP' | 'PROTECT';

export function labelOf(d: Detection): string {
  return d.label ?? d.type;
}

// ---- Masking ---------------------------------------------------------------

/** Hide every letter/digit except the last `keep`, preserving separators (spaces, dashes). */
function maskKeepLast(s: string, keep: number): string {
  const total = (s.match(/[A-Za-z0-9]/g) ?? []).length;
  if (total <= keep) return s.replace(/[A-Za-z0-9]/g, '*');
  let seen = 0;
  return s.replace(/[A-Za-z0-9]/g, (c) => (++seen <= total - keep ? '*' : c));
}

export function maskValue(d: Detection): string {
  const t = d.text;
  switch (d.type) {
    case 'EMAIL': {
      const at = t.lastIndexOf('@');
      if (at < 1) return '*'.repeat(Math.min(t.length, 8));
      const local = t.slice(0, at);
      return local[0] + '*'.repeat(Math.max(2, Math.min(local.length - 1, 6))) + t.slice(at);
    }
    case 'UPI_ID': {
      const at = t.lastIndexOf('@');
      return (at > 0 ? t[0] + '***' + t.slice(at) : '****');
    }
    case 'PHONE': {
      const total = (t.match(/\d/g) ?? []).length;
      let seen = 0;
      return t.replace(/\d/g, (c) => {
        seen++;
        return seen <= 2 || seen > total - 2 ? c : '*';
      });
    }
    case 'CREDIT_CARD':
    case 'BANK_ACCOUNT':
    case 'AADHAAR':
    case 'ID_NUMBER':
    case 'ROUTING_NUMBER':
      return maskKeepLast(t, 4);
    case 'IBAN': {
      const clean = t.replace(/\s+/g, '');
      return clean.slice(0, 2) + '*'.repeat(Math.max(4, clean.length - 6)) + clean.slice(-4);
    }
    default:
      if (t.length <= 2) return '*'.repeat(t.length);
      return t[0] + '*'.repeat(Math.min(t.length - 1, 8));
  }
}

// ---- Generalisation ---------------------------------------------------------

function sig2(n: number): number {
  return Number(n.toPrecision(2));
}

export function approxAmount(text: string): string {
  const lower = text.toLowerCase();
  const num = Number((lower.match(/\d[\d,]*(?:\.\d+)?/)?.[0] ?? '').replace(/,/g, ''));
  if (!isFinite(num) || num === 0) return '[AMOUNT]';
  let mult = 1;
  if (/\bcrores?\b|\bcr\b/.test(lower)) mult = 1e7;
  else if (/\blakhs?\b|\blacs?\b|\blpa\b/.test(lower)) mult = 1e5;
  else if (/\b(?:billion|bn)\b/.test(lower)) mult = 1e9;
  else if (/\b(?:million|mn)\b|\d\s?m\b/.test(lower)) mult = 1e6;
  else if (/\d\s?k\b/.test(lower)) mult = 1e3;
  const value = num * mult;
  const inr = /₹|rs\.?|inr|rupees|lakh|lac|crore|\bcr\b|lpa/.test(lower);
  const symbol = inr ? '₹' : /€|eur/.test(lower) ? '€' : /£|gbp/.test(lower) ? '£' : '$';
  if (inr) {
    if (value >= 1e7) return `approx. ${symbol}${sig2(value / 1e7)} crore`;
    if (value >= 1e5) return `approx. ${symbol}${sig2(value / 1e5)} lakh`;
    return `approx. ${symbol}${sig2(value)}`;
  }
  if (value >= 1e9) return `approx. ${symbol}${sig2(value / 1e9)}B`;
  if (value >= 1e6) return `approx. ${symbol}${sig2(value / 1e6)}M`;
  if (value >= 1e3) return `approx. ${symbol}${sig2(value / 1e3)}K`;
  return `approx. ${symbol}${sig2(value)}`;
}

/** Returns a generalised replacement, or null if this type can't be generalised. */
export function generalizeValue(d: Detection): string | null {
  switch (d.type) {
    case 'AGE': {
      const n = Number(d.text);
      if (!isFinite(n)) return null;
      if (n < 18) return '0-18';
      const lo = Math.floor(n / 10) * 10;
      return `${lo}-${lo + 10}`;
    }
    case 'DATE_OF_BIRTH': {
      const y4 = d.text.match(/\b(19|20)\d{2}\b/);
      if (y4) return y4[0];
      const y2 = d.text.match(/[\/\-.](\d{2})$/);
      if (y2) {
        const yy = Number(y2[1]);
        return String(yy > 30 ? 1900 + yy : 2000 + yy);
      }
      return '[BIRTH_YEAR]';
    }
    case 'FINANCIAL':
      return approxAmount(d.text);
    case 'LOCATION': {
      if (d.label === 'CITY' || CITIES[d.text]) return CITIES[d.text] ?? '[LOCATION]';
      if (d.label === 'POSTAL_CODE') return d.text.slice(0, 3) + '***';
      if (d.label === 'ADDRESS') return '[ADDRESS]';
      return '[LOCATION]';
    }
    default:
      return null;
  }
}

// ---- Tokenisation -----------------------------------------------------------

class Tokenizer {
  private counters: Record<string, number> = {};
  private byKey = new Map<string, string>();
  private people: Array<{ words: Set<string>; token: string }> = [];
  readonly map: Record<string, string> = {};

  token(d: Detection): string {
    const label = labelOf(d);
    const norm = d.text.toLowerCase().replace(/\s+/g, ' ').trim();

    if (d.type === 'PERSON') {
      const words = new Set(norm.split(' ').filter((w) => w.length > 1));
      for (const p of this.people) {
        const sub = [...words].every((w) => p.words.has(w));
        const sup = [...p.words].every((w) => words.has(w));
        if (sub || sup) {
          for (const w of words) p.words.add(w);
          if (d.text.length > (this.map[p.token]?.length ?? 0)) this.map[p.token] = d.text;
          return p.token;
        }
      }
      const tok = this.next(label);
      this.people.push({ words, token: tok });
      this.map[tok] = d.text;
      return tok;
    }

    const key = `${label}:${norm}`;
    const have = this.byKey.get(key);
    if (have) return have;
    const tok = this.next(label);
    this.byKey.set(key, tok);
    this.map[tok] = d.text;
    return tok;
  }

  private next(label: string): string {
    this.counters[label] = (this.counters[label] ?? 0) + 1;
    return `[${label}_${this.counters[label]}]`;
  }
}

// ---- Policy decision ----------------------------------------------------------

export function decideAction(d: Detection, profile: Profile, override?: Override): Action {
  // Secrets are always removed; the user can't switch this off.
  if (isCredentialType(d.type)) return d.confidence >= 0.5 ? 'REMOVE_SECRET' : 'KEEP';

  // Advisory flag only: the word "Confidential" itself is not replaced.
  if (d.label === 'CONFIDENTIAL_MARKER') return 'KEEP';

  const rule = profile.rules[d.type];
  let action: Action = rule.action;
  if (d.confidence < profile.threshold) action = 'KEEP';
  if (rule.keepIfNeeded && d.neededForTask === true) action = 'KEEP';

  if (override === 'KEEP') return 'KEEP';
  if (override === 'PROTECT' && action === 'KEEP') {
    return rule.action !== 'KEEP' ? rule.action : 'TOKENIZE';
  }
  return action;
}

function replacementFor(d: Detection, action: Action, tk: Tokenizer): string {
  switch (action) {
    case 'KEEP':
      return d.text;
    case 'MASK':
      return maskValue(d);
    case 'TOKENIZE':
      return tk.token(d);
    case 'REDACT':
      return `[REDACTED_${labelOf(d)}]`;
    case 'GENERALIZE':
      return generalizeValue(d) ?? `[REDACTED_${labelOf(d)}]`;
    case 'REMOVE_SECRET':
      return '[SECRET_REMOVED]';
  }
}

/** Apply a profile to a set of (already resolved, non-overlapping) detections. */
export function evaluate(
  text: string,
  detections: Detection[],
  profile: Profile,
  mode: 'basic' | 'smart',
  overrides: Record<string, Override> = {},
): AnalysisResult {
  const sorted = [...detections].sort((a, b) => a.start - b.start);
  const tk = new Tokenizer();
  const findings: Finding[] = [];
  let out = '';
  let cursor = 0;
  for (const d of sorted) {
    if (d.start < cursor) continue; // defensive: overlapping input
    const action = decideAction(d, profile, overrides[d.id]);
    const replacement = replacementFor(d, action, tk);
    out += text.slice(cursor, d.start) + replacement;
    cursor = d.end;
    findings.push({ ...d, action, replacement, applied: action !== 'KEEP' });
  }
  out += text.slice(cursor);

  const riskBefore = computeRisk(
    findings.map((f) => ({ type: f.type, label: f.label, text: f.text, confidence: f.confidence, residual: 1 })),
  );
  const riskAfter = computeRisk(
    findings.map((f) => ({
      type: f.type,
      label: f.label,
      text: f.text,
      confidence: f.confidence,
      residual: RESIDUAL[f.action],
    })),
  );

  return {
    originalText: text,
    safeText: out,
    findings,
    riskBefore,
    riskAfter,
    levelBefore: riskLevel(riskBefore),
    levelAfter: riskLevel(riskAfter),
    mode,
    profileId: profile.id,
    tokenMap: tk.map,
  };
}
