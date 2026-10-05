// Shared types for the privacy engine. No DOM or browser APIs in src/core.

export type EntityType =
  | 'EMAIL'
  | 'PHONE'
  | 'CREDIT_CARD'
  | 'AADHAAR'
  | 'PAN'
  | 'IFSC'
  | 'BANK_ACCOUNT'
  | 'IBAN'
  | 'UPI_ID'
  | 'PASSPORT'
  | 'IP_ADDRESS'
  | 'DATE_OF_BIRTH'
  | 'API_KEY'
  | 'PASSWORD'
  | 'PRIVATE_KEY'
  | 'JWT'
  | 'SECRET'
  | 'CREDENTIAL_URL'
  | 'PERSON'
  | 'MEDICAL'
  | 'FINANCIAL'
  | 'CONFIDENTIAL'
  | 'EMPLOYEE_ID'
  | 'ORGANIZATION'
  | 'LOCATION'
  | 'AGE'
  /** Other personal ID numbers: SSN, NINO, SIN, driving licence, tax IDs, medical record / insurance IDs ... */
  | 'ID_NUMBER'
  /** Bank routing identifiers: ABA routing number, sort code, BSB, SWIFT/BIC. */
  | 'ROUTING_NUMBER';

export const ENTITY_TYPES: EntityType[] = [
  'EMAIL', 'PHONE', 'CREDIT_CARD', 'AADHAAR', 'PAN', 'ID_NUMBER', 'IFSC', 'ROUTING_NUMBER', 'BANK_ACCOUNT', 'IBAN',
  'UPI_ID', 'PASSPORT', 'IP_ADDRESS', 'DATE_OF_BIRTH', 'API_KEY', 'PASSWORD',
  'PRIVATE_KEY', 'JWT', 'SECRET', 'CREDENTIAL_URL', 'PERSON', 'MEDICAL', 'FINANCIAL',
  'CONFIDENTIAL', 'EMPLOYEE_ID', 'ORGANIZATION', 'LOCATION', 'AGE',
];

export type Category =
  | 'CREDENTIAL'
  | 'GOVERNMENT_ID'
  | 'FINANCIAL'
  | 'MEDICAL'
  | 'CONTACT'
  | 'IDENTITY'
  | 'CONFIDENTIAL'
  | 'CONTEXT';

export type Source = 'rule' | 'heuristic' | 'ai';

export interface Detection {
  id: string;
  type: EntityType;
  /** Finer-grained name used in placeholders, e.g. MEDICAL_CONDITION. Defaults to the type. */
  label?: string;
  category: Category;
  start: number;
  end: number;
  text: string;
  confidence: number; // 0..1
  source: Source;
  reason: string;
  /** Set by Smart mode: is this value needed to answer the user's request? */
  neededForTask?: boolean;
}

export type Action =
  | 'KEEP'
  | 'MASK'
  | 'TOKENIZE'
  | 'REDACT'
  | 'GENERALIZE'
  | 'REMOVE_SECRET';

export interface PolicyRule {
  action: Action;
  /** Smart mode: keep the value when the model says it is needed for the task. */
  keepIfNeeded?: boolean;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  /** Detections below this confidence are reported but left untouched. */
  threshold: number;
  rules: Record<EntityType, PolicyRule>;
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Finding extends Detection {
  action: Action;
  replacement: string;
  applied: boolean;
}

export interface AnalysisResult {
  originalText: string;
  safeText: string;
  findings: Finding[];
  riskBefore: number;
  riskAfter: number;
  levelBefore: RiskLevel;
  levelAfter: RiskLevel;
  mode: 'basic' | 'smart';
  profileId: string;
  /** token -> original value. In memory only, never persisted. */
  tokenMap: Record<string, string>;
}

export interface AiEntity {
  text: string;
  type: EntityType;
  neededForTask: boolean;
  reason?: string;
}
