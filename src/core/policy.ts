import type { Action, EntityType, PolicyRule, Profile } from './types';
import { ENTITY_TYPES } from './types';
import { CREDENTIAL_TYPES } from './detectors';

type RuleMap = Record<EntityType, PolicyRule>;

function build(base: Partial<Record<EntityType, Action | PolicyRule>>): RuleMap {
  const rules = {} as RuleMap;
  for (const t of ENTITY_TYPES) {
    const v = base[t];
    rules[t] = typeof v === 'string' ? { action: v } : v ?? { action: 'KEEP' };
  }
  // Credentials are always removed, in every profile, whatever the table says.
  for (const t of CREDENTIAL_TYPES) rules[t] = { action: 'REMOVE_SECRET' };
  return rules;
}

const PERSONAL: Profile = {
  id: 'personal',
  name: 'Personal',
  description: 'Everyday use. Hides identity and account numbers, keeps the rest so answers stay useful.',
  threshold: 0.5,
  rules: build({
    PERSON: 'TOKENIZE',
    EMAIL: 'MASK',
    PHONE: 'MASK',
    CREDIT_CARD: 'MASK',
    BANK_ACCOUNT: 'MASK',
    IBAN: 'MASK',
    UPI_ID: 'MASK',
    IFSC: 'REDACT',
    AADHAAR: 'REDACT',
    PAN: 'REDACT',
    ID_NUMBER: 'REDACT',
    ROUTING_NUMBER: 'MASK',
    PASSPORT: 'REDACT',
    DATE_OF_BIRTH: 'GENERALIZE',
    IP_ADDRESS: 'REDACT',
    EMPLOYEE_ID: 'REDACT',
    CONFIDENTIAL: 'TOKENIZE',
    MEDICAL: 'KEEP',
    FINANCIAL: 'KEEP',
    AGE: 'KEEP',
    LOCATION: 'KEEP',
    ORGANIZATION: 'KEEP',
  }),
};

const HEALTHCARE: Profile = {
  id: 'healthcare',
  name: 'Healthcare',
  description: 'Keeps the clinical facts, removes who the patient is and where they can be reached.',
  threshold: 0.5,
  rules: build({
    PERSON: 'TOKENIZE',
    EMAIL: 'REDACT',
    PHONE: 'REDACT',
    CREDIT_CARD: 'REDACT',
    BANK_ACCOUNT: 'REDACT',
    IBAN: 'REDACT',
    UPI_ID: 'REDACT',
    IFSC: 'REDACT',
    AADHAAR: 'REDACT',
    PAN: 'REDACT',
    ID_NUMBER: 'REDACT',
    ROUTING_NUMBER: 'REDACT',
    PASSPORT: 'REDACT',
    DATE_OF_BIRTH: 'GENERALIZE',
    AGE: 'GENERALIZE',
    IP_ADDRESS: 'REDACT',
    EMPLOYEE_ID: 'REDACT',
    CONFIDENTIAL: 'TOKENIZE',
    MEDICAL: 'KEEP',
    FINANCIAL: 'GENERALIZE',
    LOCATION: 'GENERALIZE',
    ORGANIZATION: 'TOKENIZE',
  }),
};

const FINANCE: Profile = {
  id: 'finance',
  name: 'Finance',
  description: 'Masks accounts and cards, rounds amounts, and keeps health details out unless needed.',
  threshold: 0.5,
  rules: build({
    PERSON: 'TOKENIZE',
    EMAIL: 'MASK',
    PHONE: 'MASK',
    CREDIT_CARD: 'MASK',
    BANK_ACCOUNT: 'MASK',
    IBAN: 'MASK',
    UPI_ID: 'MASK',
    IFSC: 'REDACT',
    AADHAAR: 'REDACT',
    PAN: 'REDACT',
    ID_NUMBER: 'REDACT',
    ROUTING_NUMBER: 'MASK',
    PASSPORT: 'REDACT',
    DATE_OF_BIRTH: 'GENERALIZE',
    AGE: 'GENERALIZE',
    IP_ADDRESS: 'REDACT',
    EMPLOYEE_ID: 'TOKENIZE',
    CONFIDENTIAL: 'TOKENIZE',
    MEDICAL: { action: 'TOKENIZE', keepIfNeeded: true },
    FINANCIAL: 'GENERALIZE',
    LOCATION: 'KEEP',
    ORGANIZATION: 'KEEP',
  }),
};

const ENTERPRISE: Profile = {
  id: 'enterprise',
  name: 'Enterprise / Developer',
  description: 'Strict. Tokenizes people and organizations, hides internal systems, removes every secret.',
  threshold: 0.45,
  rules: build({
    PERSON: 'TOKENIZE',
    EMAIL: 'TOKENIZE',
    PHONE: 'REDACT',
    CREDIT_CARD: 'REDACT',
    BANK_ACCOUNT: 'REDACT',
    IBAN: 'REDACT',
    UPI_ID: 'REDACT',
    IFSC: 'REDACT',
    AADHAAR: 'REDACT',
    PAN: 'REDACT',
    ID_NUMBER: 'REDACT',
    ROUTING_NUMBER: 'REDACT',
    PASSPORT: 'REDACT',
    DATE_OF_BIRTH: 'GENERALIZE',
    AGE: 'GENERALIZE',
    IP_ADDRESS: 'REDACT',
    EMPLOYEE_ID: 'TOKENIZE',
    CONFIDENTIAL: 'TOKENIZE',
    MEDICAL: { action: 'TOKENIZE', keepIfNeeded: true },
    FINANCIAL: 'GENERALIZE',
    LOCATION: 'GENERALIZE',
    ORGANIZATION: 'TOKENIZE',
  }),
};

export const BUILTIN_PROFILES: Profile[] = [PERSONAL, HEALTHCARE, FINANCE, ENTERPRISE];

export const DEFAULT_PROFILE_ID = 'personal';

export function getBuiltinProfile(id: string): Profile {
  const p = BUILTIN_PROFILES.find((x) => x.id === id) ?? PERSONAL;
  return structuredCloneSafe(p);
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isSafeId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id) && !DANGEROUS_KEYS.has(id);
}

/** Validate and normalise an imported / stored profile. Credentials are forced to REMOVE_SECRET. */
export function normalizeProfile(raw: unknown, fallbackId = 'custom'): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Profile>;
  const base = getBuiltinProfile(typeof r.id === 'string' ? r.id : DEFAULT_PROFILE_ID);
  const rules = { ...base.rules };
  const actions: Action[] = ['KEEP', 'MASK', 'TOKENIZE', 'REDACT', 'GENERALIZE', 'REMOVE_SECRET'];
  if (r.rules && typeof r.rules === 'object') {
    for (const t of ENTITY_TYPES) {
      if (DANGEROUS_KEYS.has(t as string)) continue;
      const v = (r.rules as Record<string, PolicyRule | undefined>)[t];
      if (v && actions.includes(v.action)) {
        rules[t] = { action: v.action, keepIfNeeded: !!v.keepIfNeeded };
      }
    }
  }
  for (const t of CREDENTIAL_TYPES) rules[t] = { action: 'REMOVE_SECRET' };
  const threshold =
    typeof r.threshold === 'number' && r.threshold >= 0 && r.threshold <= 1 ? r.threshold : base.threshold;
  const safeFallback = isSafeId(fallbackId) ? fallbackId : 'custom';
  const id = isSafeId(r.id) ? r.id : safeFallback;
  return {
    id,
    name: typeof r.name === 'string' && r.name ? r.name.slice(0, 80) : base.name,
    description: typeof r.description === 'string' ? r.description.slice(0, 300) : base.description,
    threshold,
    rules,
  };
}
