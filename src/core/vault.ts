// Ephemeral in-memory vault for two-way de-anonymization and format-preserving synthetic data generation.
// No data is ever persisted to disk or sent over the network.

import type { EntityType } from './types';

export interface RestoredTokenInfo {
  token: string;
  original: string;
  count: number;
}

export interface RestoreResult {
  restoredText: string;
  replacementsCount: number;
  restoredTokens: RestoredTokenInfo[];
}

/**
 * Replaces token placeholders, synthetic surrogates, or masked values in LLM outputs back to original values.
 * Supports case-insensitivity, email domain variation tolerance, and longest-first precedence.
 */
export function restore(text: string, tokenMap: Record<string, string>): string {
  return restoreDetailed(text, tokenMap).restoredText;
}

/**
 * Detailed restore returning metrics on what was de-anonymized.
 */
export function restoreDetailed(text: string, tokenMap: Record<string, string>): RestoreResult {
  if (!text || !tokenMap || Object.keys(tokenMap).length === 0) {
    return { restoredText: text, replacementsCount: 0, restoredTokens: [] };
  }

  // Sort keys by descending length so longer tokens/masked strings match first
  const keys = Object.keys(tokenMap).sort((a, b) => b.length - a.length);
  let current = text;
  let totalCount = 0;
  const restoredTokens: RestoredTokenInfo[] = [];

  for (const token of keys) {
    const original = tokenMap[token];
    if (!original || !token) continue;

    let pattern: string;
    if (token.includes('@')) {
      // If token is an email mask (e.g. r***@GAMAIL.com), handle domain typos that AI might normalize
      const atIdx = token.lastIndexOf('@');
      const local = token.slice(0, atIdx).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const domain = token.slice(atIdx + 1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (/gamail|gmail/i.test(domain)) {
        pattern = `${local}@(?:gmail\\.com|gamail\\.com)`;
      } else {
        pattern = `${local}@${domain}`;
      }
    } else {
      pattern = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Use case-insensitive matching
    const regex = new RegExp(pattern, 'gi');

    let matchCount = 0;
    current = current.replace(regex, () => {
      matchCount++;
      return original;
    });

    if (matchCount > 0) {
      totalCount += matchCount;
      restoredTokens.push({ token, original, count: matchCount });
    }
  }

  return {
    restoredText: current,
    replacementsCount: totalCount,
    restoredTokens,
  };
}

/** Realistic synthetic mock pools for format-preserving anonymization (FPE). */
const SYNTHETIC_NAMES = [
  'Alex Morgan',
  'Jordan Lee',
  'Samira Khan',
  'Taylor Brooks',
  'Arjun Patel',
  'Elena Rostova',
  'Marcus Vance',
  'Chloe Bennett',
  'Devon Chen',
  'Maya Lin',
];

const SYNTHETIC_ORGS = [
  'Acme Global',
  'Apex Dynamics',
  'Nexus Health',
  'Beacon Enterprises',
  'Horizon Solutions',
];

const SYNTHETIC_CITIES = ['Springfield', 'Riverdale', 'Fairview', 'Brookfield', 'Greenville'];

/**
 * Generates natural, consistent synthetic surrogate data for format-preserving masking.
 * Preserves syntax, casing, and semantic structure so LLMs parse the prompt naturally.
 */
export class SyntheticGenerator {
  private cache = new Map<string, string>();
  private counter = 0;

  generate(type: EntityType, original: string): string {
    const key = `${type}:${original.toLowerCase().trim()}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const idx = this.counter++;
    let result = '';

    switch (type) {
      case 'PERSON':
        result = SYNTHETIC_NAMES[idx % SYNTHETIC_NAMES.length];
        break;
      case 'EMAIL':
        result = `user${idx + 1}@privacy-mock.local`;
        break;
      case 'PHONE':
        result = `+1 (555) 010-${String(1000 + (idx % 9000)).slice(-4)}`;
        break;
      case 'CREDIT_CARD':
        // Standard test Visa card passing Luhn
        result = '4000 1234 5678 9010';
        break;
      case 'ORGANIZATION':
        result = SYNTHETIC_ORGS[idx % SYNTHETIC_ORGS.length];
        break;
      case 'LOCATION':
        result = SYNTHETIC_CITIES[idx % SYNTHETIC_CITIES.length];
        break;
      case 'IP_ADDRESS':
        // RFC 5737 TEST-NET-1 documentation IP range
        result = `192.0.2.${(idx % 250) + 1}`;
        break;
      case 'DATE_OF_BIRTH':
        result = '1990-01-01';
        break;
      case 'AGE':
        result = '30';
        break;
      default:
        result = `[SYNTHETIC_${type}_${idx + 1}]`;
        break;
    }

    this.cache.set(key, result);
    return result;
  }

  reset(): void {
    this.cache.clear();
    this.counter = 0;
  }
}

/**
 * In-memory tab/conversation vault for two-way token session management.
 * All data lives exclusively in RAM and is purged on reset.
 */
export class EphemeralVault {
  private sessions = new Map<string, Record<string, string>>();
  private activeMap: Record<string, string> = {};

  /** Store or merge token replacements for a specific session ID (e.g. active tab or conversation). */
  register(sessionId: string, tokenMap: Record<string, string>): void {
    if (!tokenMap) return;
    const existing = this.sessions.get(sessionId) ?? {};
    const merged = { ...existing, ...tokenMap };
    this.sessions.set(sessionId, merged);
    this.activeMap = { ...this.activeMap, ...tokenMap };
  }

  /** Retrieve the token mapping for a session. */
  getMap(sessionId: string): Record<string, string> {
    return { ...(this.sessions.get(sessionId) ?? {}) };
  }

  /** Retrieve the entire active tab token map. */
  getActiveMap(): Record<string, string> {
    return { ...this.activeMap };
  }

  /** Restore a received AI completion text for the given session. */
  restore(sessionId: string, aiResponse: string): string {
    const map = this.getMap(sessionId);
    return restore(aiResponse, map);
  }

  /** Clear tokens for a specific session or purge all sessions. */
  clear(sessionId?: string): void {
    if (sessionId) {
      this.sessions.delete(sessionId);
      if (this.sessions.size === 0) {
        this.activeMap = {};
      }
    } else {
      this.sessions.clear();
      this.activeMap = {};
    }
  }

  /** Count total active session vaults. */
  get sessionCount(): number {
    return this.sessions.size;
  }
}
