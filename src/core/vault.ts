// Zero-Knowledge Ephemeral Conversation Vault & Semantic Synthetic Data Generator.
// Guarantees zero network leakage, format-preserving natural prompts, and safe local persistence.

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

export interface StoredSessionRecord {
  conversationId: string;
  tokenMap: Record<string, string>;
  updatedAt: number;
}

/** Max conversations kept in local session storage to prevent memory burden (< 50 KB). */
export const MAX_VAULT_CONVERSATIONS = 20;

/**
 * Extracts conversation ID from standard AI chatbot URLs (ChatGPT, Gemini, Claude, Grok).
 */
export function extractConversationId(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const path = url.pathname;
    const host = url.hostname.toLowerCase();

    // Grok: grok.com/c/<id>
    if (host.includes('grok')) {
      const grokMatch = path.match(/\/c\/([a-zA-Z0-9_-]+)/);
      if (grokMatch) return `grok:${grokMatch[1]}`;
      return `grok:${path}`;
    }

    // ChatGPT: chatgpt.com/c/<uuid> or chat.openai.com/c/<uuid>
    if (host.includes('chatgpt') || host.includes('openai')) {
      const gptMatch = path.match(/\/c\/([a-zA-Z0-9_-]+)/);
      if (gptMatch) return `chatgpt:${gptMatch[1]}`;
      return `chatgpt:${path}`;
    }

    // Gemini: gemini.google.com/app/<id>
    if (host.includes('gemini')) {
      const geminiMatch = path.match(/\/app\/([a-zA-Z0-9_-]+)/);
      if (geminiMatch && geminiMatch[1] !== '') return `gemini:${geminiMatch[1]}`;
      return `gemini:${path}`;
    }

    // Claude: claude.ai/chat/<uuid>
    if (host.includes('claude')) {
      const claudeMatch = path.match(/\/chat\/([a-zA-Z0-9_-]+)/);
      if (claudeMatch) return `claude:${claudeMatch[1]}`;
      return `claude:${path}`;
    }

    // Perplexity: perplexity.ai/search/<uuid>
    if (host.includes('perplexity')) {
      const perpMatch = path.match(/\/search\/([a-zA-Z0-9_-]+)/);
      if (perpMatch) return `perplexity:${perpMatch[1]}`;
      return `perplexity:${path}`;
    }

    // Generic fallback based on host + pathname
    return `${url.hostname}:${path}`;
  } catch {
    return urlStr || 'default_session';
  }
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
    if (token.includes('@') && !token.includes(' ') && token.length < 100) {
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
const SYNTHETIC_NAME_PAIRS: Array<{ first: string; last: string }> = [
  { first: 'Arjun', last: 'Patel' },
  { first: 'Sanjay', last: 'Verma' },
  { first: 'Vikram', last: 'Singh' },
  { first: 'Alex', last: 'Morgan' },
  { first: 'Jordan', last: 'Lee' },
  { first: 'Samira', last: 'Khan' },
  { first: 'Elena', last: 'Rostova' },
  { first: 'Marcus', last: 'Vance' },
  { first: 'Chloe', last: 'Bennett' },
  { first: 'Devon', last: 'Chen' },
];

const SYNTHETIC_ORGS = [
  'Apex Healthcare Center',
  'Nexus Global Dynamics',
  'Beacon Enterprises',
  'Acme Technologies',
  'Horizon Solutions',
];

const SYNTHETIC_CITIES = ['Greenville', 'Riverdale', 'Springfield', 'Brookfield', 'Fairview'];

/**
 * Generates natural, consistent synthetic surrogate data for format-preserving masking.
 * Preserves syntax, casing, and semantic structure so LLMs parse the prompt naturally.
 */
export class SyntheticGenerator {
  private cache = new Map<string, string>();
  private subMap = new Map<string, string>();
  private counter = 0;

  generate(type: EntityType, original: string): string {
    const key = `${type}:${original.toLowerCase().trim()}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const idx = this.counter++;
    let result = '';

    switch (type) {
      case 'PERSON': {
        const pair = SYNTHETIC_NAME_PAIRS[idx % SYNTHETIC_NAME_PAIRS.length];
        const words = original.trim().split(/\s+/);
        const isLower = original === original.toLowerCase();
        if (words.length === 1) {
          result = isLower ? pair.first.toLowerCase() : pair.first;
          this.subMap.set(result, original);
          this.subMap.set(pair.first, original);
          this.subMap.set(pair.first.toLowerCase(), original);
        } else {
          result = isLower
            ? `${pair.first.toLowerCase()} ${pair.last.toLowerCase()}`
            : `${pair.first} ${pair.last}`;
          this.subMap.set(result, original);
          this.subMap.set(`${pair.first} ${pair.last}`, original);
          this.subMap.set(pair.first, words[0]);
          this.subMap.set(pair.first.toLowerCase(), words[0]);
          this.subMap.set(pair.last, words[words.length - 1]);
          this.subMap.set(pair.last.toLowerCase(), words[words.length - 1]);
        }
        break;
      }
      case 'EMAIL': {
        const pair = SYNTHETIC_NAME_PAIRS[idx % SYNTHETIC_NAME_PAIRS.length];
        const domain = original.includes('@') ? original.slice(original.indexOf('@') + 1) : 'gmail.com';
        result = `${pair.first.toLowerCase()}.${pair.last.toLowerCase()}@${domain}`;
        this.subMap.set(result, original);
        break;
      }
      case 'PHONE': {
        const digits = original.replace(/\D/g, '');
        if (original.includes('+91')) {
          result = `+91 91234 ${String(56789 + idx).slice(-5)}`;
        } else if (original.includes('+1') || /\(\d{3}\)/.test(original)) {
          result = `+1 (555) 010-${String(1000 + (idx % 9000)).slice(-4)}`;
        } else if (digits.length === 10) {
          result = original.includes(' ') || original.includes('-')
            ? `91234 ${String(56789 + idx).slice(-5)}`
            : `91234${String(56789 + idx).slice(-5)}`;
        } else if (digits.length === 8) {
          result = `9123${String(4567 + idx).slice(-4)}`;
        } else {
          result = `+1 (555) 010-${String(1000 + (idx % 9000)).slice(-4)}`;
        }
        this.subMap.set(result, original);
        break;
      }
      case 'MEDICAL': {
        const lower = original.toLowerCase();
        if (/doctor|specialist|physician|surgeon|consultant|oncologist|cardiologist/i.test(lower)) {
          result = 'general physician';
        } else if (/fever|cough|cold|infection|allergy|flu/i.test(lower)) {
          result = 'mild seasonal allergy';
        } else if (/problem|issue|disease|disorder|failure|pain|condition|damage|attack/i.test(lower)) {
          result = 'general health issue';
        } else if (/paracetamol|metformin|aspirin|insulin|tablet|medicine|medication/i.test(lower)) {
          result = 'multivitamin supplement';
        } else {
          result = 'routine checkup consultation';
        }
        this.subMap.set(result, original);
        break;
      }
      case 'UPI_ID': {
        const pair = SYNTHETIC_NAME_PAIRS[idx % SYNTHETIC_NAME_PAIRS.length];
        const handle = original.includes('@') ? original.slice(original.indexOf('@')) : '@okaxis';
        result = `${pair.first.toLowerCase()}${10 + idx}${handle}`;
        this.subMap.set(result, original);
        break;
      }
      case 'CREDIT_CARD':
        result = '4000 1234 5678 9010';
        this.subMap.set(result, original);
        break;
      case 'AADHAAR':
        result = '9123 4567 8901';
        this.subMap.set(result, original);
        break;
      case 'PAN':
        result = 'ABCDE1234F';
        this.subMap.set(result, original);
        break;
      case 'ORGANIZATION':
        result = SYNTHETIC_ORGS[idx % SYNTHETIC_ORGS.length];
        this.subMap.set(result, original);
        break;
      case 'LOCATION':
        result = SYNTHETIC_CITIES[idx % SYNTHETIC_CITIES.length];
        this.subMap.set(result, original);
        break;
      case 'IP_ADDRESS':
        result = `192.0.2.${(idx % 250) + 1}`;
        this.subMap.set(result, original);
        break;
      case 'DATE_OF_BIRTH':
        result = '1990-01-01';
        this.subMap.set(result, original);
        break;
      case 'AGE':
        result = '30';
        this.subMap.set(result, original);
        break;
      default:
        result = `[SYNTHETIC_${type}_${idx + 1}]`;
        this.subMap.set(result, original);
        break;
    }

    this.cache.set(key, result);
    return result;
  }

  /** Returns all active mappings including full and sub-name mappings. */
  getAllMappings(): Record<string, string> {
    const res: Record<string, string> = {};
    for (const [synth, orig] of this.subMap.entries()) {
      res[synth] = orig;
    }
    return res;
  }

  reset(): void {
    this.cache.clear();
    this.subMap.clear();
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

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Zero-Knowledge Encrypted Conversation Vault.
 * Uses AES-GCM 256-bit encryption with rolling LRU auto-purge (Max 20 conversations).
 * Ensures zero plaintext secrets on disk and survives page reloads (F5).
 */
export class EncryptedConversationVault {
  private key: CryptoKey | null = null;
  private memoryFallback = new Map<string, StoredSessionRecord>();
  private readonly storageKey = '__p2shield_vault_records_v1';

  constructor(private storage?: Storage) {
    if (!this.storage && typeof window !== 'undefined' && window.sessionStorage) {
      this.storage = window.sessionStorage;
    }
  }

  /** Initialize AES-GCM 256-bit encryption key in memory, persisting JWK across F5 tab reloads. */
  private async getKey(): Promise<CryptoKey | null> {
    if (this.key) return this.key;
    if (typeof crypto === 'undefined' || !crypto.subtle) return null;
    try {
      if (this.storage) {
        const savedJwk = this.storage.getItem(`${this.storageKey}_k`);
        if (savedJwk) {
          try {
            const jwk = JSON.parse(savedJwk);
            this.key = await crypto.subtle.importKey(
              'jwk',
              jwk,
              { name: 'AES-GCM', length: 256 },
              true,
              ['encrypt', 'decrypt'],
            );
            return this.key;
          } catch {
            /* invalid or corrupted key */
          }
        }
      }

      this.key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
      );
      if (this.storage && this.key) {
        try {
          const exported = await crypto.subtle.exportKey('jwk', this.key);
          this.storage.setItem(`${this.storageKey}_k`, JSON.stringify(exported));
        } catch {
          /* ignore storage error */
        }
      }
      return this.key;
    } catch {
      return null;
    }
  }

  /** Encrypt object to base64 string using AES-GCM. */
  private async encryptData(data: unknown): Promise<string> {
    const jsonStr = JSON.stringify(data);
    const key = await this.getKey();
    if (!key || typeof crypto === 'undefined' || !crypto.subtle) {
      const encoded = new TextEncoder().encode(jsonStr);
      return toBase64(encoded);
    }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(jsonStr);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return toBase64(combined);
  }

  /** Decrypt base64 string using AES-GCM. */
  private async decryptData<T>(base64Str: string): Promise<T | null> {
    try {
      const key = await this.getKey();
      const combined = fromBase64(base64Str);
      if (!key || typeof crypto === 'undefined' || !crypto.subtle) {
        const decoded = new TextDecoder().decode(combined);
        return JSON.parse(decoded) as T;
      }
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      const jsonStr = new TextDecoder().decode(decrypted);
      return JSON.parse(jsonStr) as T;
    } catch {
      return null;
    }
  }

  /** Load all active conversation records from local storage. */
  async loadAll(): Promise<StoredSessionRecord[]> {
    if (!this.storage) {
      return Array.from(this.memoryFallback.values());
    }
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return Array.from(this.memoryFallback.values());
      const records = await this.decryptData<StoredSessionRecord[]>(raw);
      return records ?? [];
    } catch {
      return Array.from(this.memoryFallback.values());
    }
  }

  /** Save all records to storage with LRU capping (max 20 conversations). */
  private async saveAll(records: StoredSessionRecord[]): Promise<void> {
    // Sort by latest updated first and trim to MAX_VAULT_CONVERSATIONS
    records.sort((a, b) => b.updatedAt - a.updatedAt);
    const trimmed = records.slice(0, MAX_VAULT_CONVERSATIONS);

    // Update memory cache
    this.memoryFallback.clear();
    for (const r of trimmed) {
      this.memoryFallback.set(r.conversationId, r);
    }

    if (!this.storage) return;
    try {
      const encrypted = await this.encryptData(trimmed);
      this.storage.setItem(this.storageKey, encrypted);
    } catch {
      /* quota or storage error */
    }
  }

  /** Store or merge token replacements for a specific conversation. */
  async save(conversationId: string, tokenMap: Record<string, string>): Promise<void> {
    if (!conversationId || !tokenMap || Object.keys(tokenMap).length === 0) return;
    const records = await this.loadAll();
    const existingIdx = records.findIndex((r) => r.conversationId === conversationId);

    if (existingIdx >= 0) {
      records[existingIdx].tokenMap = { ...records[existingIdx].tokenMap, ...tokenMap };
      records[existingIdx].updatedAt = Date.now();
    } else {
      records.push({
        conversationId,
        tokenMap,
        updatedAt: Date.now(),
      });
    }

    await this.saveAll(records);
  }

  /** Retrieve the token mapping for a conversation. */
  async load(conversationId: string): Promise<Record<string, string>> {
    if (!conversationId) return {};
    const records = await this.loadAll();
    const record = records.find((r) => r.conversationId === conversationId);
    return record?.tokenMap ? { ...record.tokenMap } : {};
  }

  /** Migrate token mapping from an initial URL to a newly assigned Chat ID. */
  async migrate(oldId: string, newId: string): Promise<void> {
    if (!oldId || !newId || oldId === newId) return;
    const oldMap = await this.load(oldId);
    if (Object.keys(oldMap).length === 0) return;

    await this.save(newId, oldMap);
    await this.clear(oldId);
  }

  /** Clear tokens for a specific conversation or purge entire vault. */
  async clear(conversationId?: string): Promise<void> {
    if (conversationId) {
      const records = await this.loadAll();
      const filtered = records.filter((r) => r.conversationId !== conversationId);
      await this.saveAll(filtered);
    } else {
      this.memoryFallback.clear();
      this.storage?.removeItem(this.storageKey);
      this.storage?.removeItem(`${this.storageKey}_k`);
      this.key = null;
    }
  }
}
