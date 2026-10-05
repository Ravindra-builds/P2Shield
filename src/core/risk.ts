import type { Action, EntityType, RiskLevel } from './types';

/** Base sensitivity (0-100) per entity type. These are product design choices, not a standard. */
export const TYPE_WEIGHT: Record<EntityType, number> = {
  PRIVATE_KEY: 100,
  API_KEY: 100,
  PASSWORD: 100,
  SECRET: 100,
  CREDENTIAL_URL: 100,
  JWT: 95,
  AADHAAR: 85,
  CREDIT_CARD: 85,
  PAN: 80,
  ID_NUMBER: 85,
  PASSPORT: 80,
  ROUTING_NUMBER: 40,
  BANK_ACCOUNT: 80,
  IBAN: 75,
  MEDICAL: 60,
  FINANCIAL: 50,
  DATE_OF_BIRTH: 50,
  CONFIDENTIAL: 50,
  UPI_ID: 45,
  IFSC: 35,
  EMPLOYEE_ID: 35,
  PHONE: 30,
  IP_ADDRESS: 30,
  EMAIL: 25,
  PERSON: 20,
  LOCATION: 12,
  ORGANIZATION: 10,
  AGE: 8,
};

/** Overrides for finer-grained labels. */
export const LABEL_WEIGHT: Record<string, number> = {
  CONFIDENTIAL_MARKER: 30,
  PROJECT: 50,
  INTERNAL_HOST: 45,
  MEDICAL_RECORD_ID: 70,
  MEDICAL_TEST: 55,
  PIN: 90,
  POSTAL_CODE: 20,
  CITY: 10,
  ADDRESS: 35,
  AMOUNT: 50,
  ENDPOINT: 45,
  USERNAME: 35,
  CLOUD_RESOURCE: 45,
  COORDINATES: 30,
  MAC_ADDRESS: 30,
  CRYPTO_WALLET: 60,
  VEHICLE_REG: 40,
  INSURANCE_ID: 70,
  SWIFT_BIC: 30,
};

/** How much of the original risk remains after each action. */
export const RESIDUAL: Record<Action, number> = {
  KEEP: 1,
  GENERALIZE: 0.4,
  MASK: 0.25,
  TOKENIZE: 0.1,
  REDACT: 0,
  REMOVE_SECRET: 0,
};

export interface RiskItem {
  type: EntityType;
  label?: string;
  text: string;
  confidence: number;
  /** 0..1 fraction of the risk that remains */
  residual: number;
}

export function weightOf(type: EntityType, label?: string): number {
  if (label && label in LABEL_WEIGHT) return LABEL_WEIGHT[label];
  return TYPE_WEIGHT[type];
}

export function riskLevel(score: number): RiskLevel {
  if (score <= 30) return 'Low';
  if (score <= 60) return 'Medium';
  if (score <= 80) return 'High';
  return 'Critical';
}

/** Types that tie a prompt to a real person. */
const IDENTIFYING_TYPES: ReadonlySet<EntityType> = new Set<EntityType>([
  'PERSON', 'AADHAAR', 'PAN', 'PASSPORT', 'PHONE', 'EMAIL', 'DATE_OF_BIRTH', 'EMPLOYEE_ID',
  'BANK_ACCOUNT', 'CREDIT_CARD', 'IBAN', 'UPI_ID', 'ID_NUMBER',
]);
/** Attributes that are only as dangerous as the identity attached to them. */
const CONTEXT_DEPENDENT_TYPES: ReadonlySet<EntityType> = new Set<EntityType>(['MEDICAL', 'FINANCIAL']);

/**
 * Risk 0-100. Each distinct value contributes p = weight * confidence * residual.
 * Contributions combine like independent probabilities (1 - prod(1 - p)) so that one secret
 * is already critical and many small items add up without exceeding 100.
 *
 * Context matters: a diagnosis or a salary with no identity attached is much less sensitive
 * than the same fact next to a name and phone number. Medical and financial values are scaled
 * from 35% (anonymous) up to 100% (clearly tied to an identifiable person).
 */
export function computeRisk(items: RiskItem[]): number {
  const best = new Map<string, { p: number; type: EntityType }>();
  for (const it of items) {
    const p = (weightOf(it.type, it.label) / 100) * it.confidence * it.residual;
    if (p <= 0) continue;
    const key = `${it.type}:${it.label ?? ''}:${it.text.trim().toLowerCase()}`;
    const cur = best.get(key);
    if (!cur || p > cur.p) best.set(key, { p, type: it.type });
  }
  let idP = 0;
  for (const { p, type } of best.values()) {
    if (IDENTIFYING_TYPES.has(type)) idP = Math.max(idP, p);
  }
  const exposure = Math.min(1, idP / 0.25);
  const contextFactor = 0.35 + 0.65 * exposure;

  let keep = 1;
  for (const { p, type } of best.values()) {
    const scaled = CONTEXT_DEPENDENT_TYPES.has(type) ? p * contextFactor : p;
    keep *= 1 - scaled;
  }
  return Math.max(0, Math.min(100, Math.round(100 * (1 - keep))));
}
