import { BUILTIN_PROFILES, DEFAULT_PROFILE_ID, getBuiltinProfile, normalizeProfile } from '../core/policy';
import type { Profile } from '../core/types';

export interface Settings {
  /** "smart" uses Chrome's on-device model when available, otherwise falls back to Basic. */
  mode: 'basic' | 'smart';
  profileId: string;
  /** Profiles the user edited or imported, keyed by id. They override the built-in with the same id. */
  profiles: Record<string, Profile>;
  /** Show the shield on every text box, not only chat-like ones. */
  showOnAll: boolean;
  /** Scan while typing to show the live badge. */
  liveScan: boolean;
  disabledSites: string[];
  /** True when an organization policy (chrome.storage.managed) is in force. */
  managed?: boolean;
  lockProfile?: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'basic',
  profileId: DEFAULT_PROFILE_ID,
  profiles: {},
  showOnAll: false,
  liveScan: true,
  disabledSites: [],
};

export interface AuditEntry {
  ts: number;
  host: string;
  mode: 'basic' | 'smart';
  profileId: string;
  riskBefore: number;
  riskAfter: number;
  /** entity type -> number of values protected. Never contains the values themselves. */
  counts: Record<string, number>;
}

export type Msg =
  | { type: 'SMART_LABEL'; text: string }
  | { type: 'SMART_PREFETCH'; text: string }
  | { type: 'SMART_WARM' }
  | { type: 'SMART_STATUS' }
  | { type: 'AUDIT'; entry: AuditEntry }
  | { type: 'PROTECT_FOCUSED'; force?: boolean };

export type SmartLabelReply =
  | { ok: true; entities: import('../core/types').AiEntity[] }
  | { ok: false; error: string };

export type SmartState = 'unavailable' | 'downloadable' | 'downloading' | 'available' | 'unsupported';

const KEY = 'settings';

async function readManaged(): Promise<Record<string, unknown>> {
  try {
    return (await chrome.storage.managed.get(null)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function loadSettings(): Promise<Settings> {
  let stored: Partial<Settings> = {};
  try {
    const got = await chrome.storage.local.get(KEY);
    stored = (got[KEY] as Partial<Settings>) ?? {};
  } catch {
    /* extension context invalidated or storage unavailable */
  }
  const s: Settings = { ...DEFAULT_SETTINGS, ...stored };
  // Profiles saved by an older version lack rules for data types added since. Normalising fills them
  // in from the built-in defaults (and re-forces secrets to removal) instead of leaving holes.
  s.profiles = {};
  for (const [id, raw] of Object.entries(stored.profiles ?? {})) {
    const p = normalizeProfile(raw, id);
    if (p) s.profiles[id] = p;
  }
  const managed = await readManaged();
  if (Object.keys(managed).length) {
    s.managed = true;
    if (typeof managed.profileId === 'string') s.profileId = managed.profileId;
    if (typeof managed.lockProfile === 'boolean') s.lockProfile = managed.lockProfile;
    if (Array.isArray(managed.disabledSites)) s.disabledSites = managed.disabledSites.map(String);
    if (typeof managed.showOnAll === 'boolean') s.showOnAll = managed.showOnAll;
    if (managed.mode === 'basic' || managed.mode === 'smart') s.mode = managed.mode;
    if (managed.customProfile && typeof managed.customProfile === 'object') {
      const p = normalizeProfile(managed.customProfile, 'org-policy');
      if (p) {
        s.profiles[p.id] = p;
        if (managed.profileId === undefined) s.profileId = p.id;
      }
    }
  }
  return s;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const next: Settings = { ...current, ...patch };
  const { managed: _m, lockProfile: _l, ...persist } = next;
  void _m;
  void _l;
  await chrome.storage.local.set({ [KEY]: persist });
  return next;
}

export function allProfiles(s: Settings): Profile[] {
  const list = BUILTIN_PROFILES.map((p) => s.profiles[p.id] ?? getBuiltinProfile(p.id));
  for (const p of Object.values(s.profiles)) {
    if (!BUILTIN_PROFILES.some((b) => b.id === p.id)) list.push(p);
  }
  return list;
}

export function activeProfile(s: Settings): Profile {
  return allProfiles(s).find((p) => p.id === s.profileId) ?? getBuiltinProfile(DEFAULT_PROFILE_ID);
}

export function isSiteDisabled(s: Settings, hostname: string): boolean {
  return s.disabledSites.some((d) => hostname === d || hostname.endsWith('.' + d));
}
