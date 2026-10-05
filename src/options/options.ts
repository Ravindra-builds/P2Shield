import { analyze } from '../core/engine';
import { getBuiltinProfile, normalizeProfile } from '../core/policy';
import { BUILTIN_PROFILES } from '../core/policy';
import { isCredentialType } from '../core/detectors';
import { riskLevel } from '../core/risk';
import type { Action, AnalysisResult, EntityType, Profile } from '../core/types';
import { ENTITY_TYPES } from '../core/types';
import { SAMPLES } from '../shared/samples';
import {
  activeProfile,
  allProfiles,
  loadSettings,
  saveSettings,
  type AuditEntry,
  type Settings,
} from '../shared/settings';
import { downloadModel, getAvailability } from '../shared/smartModel';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  ...kids: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  const { class: cls, ...rest } = props as Record<string, unknown>;
  if (cls) e.className = String(cls);
  Object.assign(e, rest);
  for (const k of kids) e.append(k);
  return e;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** An icon from the sprite defined at the top of options.html. */
function icon(name: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'i');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

const TYPE_NAMES: Record<EntityType, string> = {
  EMAIL: 'Email address', PHONE: 'Phone number', CREDIT_CARD: 'Credit / debit card', AADHAAR: 'Aadhaar number',
  PAN: 'PAN', ID_NUMBER: 'Other ID number (SSN, licence, tax, medical record)', IFSC: 'IFSC code',
  ROUTING_NUMBER: 'Bank routing / sort code / SWIFT', BANK_ACCOUNT: 'Bank account / wallet', IBAN: 'IBAN', UPI_ID: 'UPI ID',
  PASSPORT: 'Passport number', IP_ADDRESS: 'IP address', DATE_OF_BIRTH: 'Date of birth', API_KEY: 'API key / token',
  PASSWORD: 'Password / PIN / OTP', PRIVATE_KEY: 'Private key', JWT: 'JWT', SECRET: 'Other secret',
  CREDENTIAL_URL: 'Credentials in a URL', PERSON: 'Person name', MEDICAL: 'Health information',
  FINANCIAL: 'Money amounts', CONFIDENTIAL: 'Confidential / internal', EMPLOYEE_ID: 'Employee ID',
  ORGANIZATION: 'Organization', LOCATION: 'Location / address', AGE: 'Age',
};

/** How the policy table is grouped. Any type not listed here lands in "Other". */
const RULE_GROUPS: Array<{ title: string; types: EntityType[] }> = [
  { title: 'Personal details', types: ['PERSON', 'EMAIL', 'PHONE', 'DATE_OF_BIRTH', 'AGE', 'LOCATION', 'EMPLOYEE_ID'] },
  { title: 'Government IDs', types: ['AADHAAR', 'PAN', 'PASSPORT', 'ID_NUMBER'] },
  { title: 'Money and banking', types: ['CREDIT_CARD', 'BANK_ACCOUNT', 'ROUTING_NUMBER', 'IFSC', 'IBAN', 'UPI_ID', 'FINANCIAL'] },
  { title: 'Health and business', types: ['MEDICAL', 'CONFIDENTIAL', 'ORGANIZATION'] },
  { title: 'Network', types: ['IP_ADDRESS'] },
  { title: 'Secrets', types: ['API_KEY', 'PASSWORD', 'PRIVATE_KEY', 'JWT', 'SECRET', 'CREDENTIAL_URL'] },
];

const EDITABLE_ACTIONS: Array<[Action, string]> = [
  ['KEEP', 'Keep as is'],
  ['MASK', 'Mask (partly hide)'],
  ['TOKENIZE', 'Replace with a token'],
  ['REDACT', 'Remove ([REDACTED])'],
  ['GENERALIZE', 'Generalize (less precise)'],
];

const SAMPLE_LABELS: Record<string, string> = {
  patient: 'Patient question',
  developer: 'Credentials',
  bank: 'Bank details',
  memo: 'Internal memo',
  config: 'JSON config',
  clean: 'Clean prompt',
};

let settings: Settings;
let editing: Profile;

// ---- Feedback: toasts --------------------------------------------------------------

type ToastKind = 'ok' | 'err' | 'info';

function toast(msg: string, kind: ToastKind = 'ok', action?: { label: string; run: () => void }): void {
  const host = $('toasts');
  while (host.children.length >= 3) host.firstElementChild?.remove();
  const t = h('div', { class: `toast ${kind}` }, icon(kind === 'err' ? 'alert' : kind === 'info' ? 'info' : 'check'), h('span', {}, msg));
  const dismiss = (): void => {
    t.classList.add('out');
    window.setTimeout(() => t.remove(), 260);
  };
  if (action) {
    const b = h('button', { class: 'toast-action', type: 'button' }, action.label);
    b.addEventListener('click', () => {
      action.run();
      dismiss();
    });
    t.append(b);
  }
  host.append(t);
  window.setTimeout(dismiss, action ? 7000 : 3600);
}

/** Two-step button for destructive actions: first click arms it, a second click confirms. */
function armable(btn: HTMLButtonElement, onConfirm: () => void | Promise<void>, armedText = 'Click again to confirm'): void {
  const lab = btn.querySelector<HTMLElement>('.lab')!;
  const original = lab.textContent ?? '';
  let timer = 0;
  const disarm = (): void => {
    window.clearTimeout(timer);
    btn.dataset.armed = 'false';
    lab.textContent = original;
  };
  btn.addEventListener('click', () => {
    if (btn.dataset.armed === 'true') {
      disarm();
      void onConfirm();
      return;
    }
    btn.dataset.armed = 'true';
    lab.textContent = armedText;
    timer = window.setTimeout(disarm, 3500);
  });
  btn.addEventListener('blur', disarm);
}

// ---- Theme (light by default) --------------------------------------------------------

type Theme = 'light' | 'dark' | 'system';

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll<HTMLButtonElement>('[data-theme-opt]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.themeOpt === theme));
  });
}

function initTheme(): void {
  let saved: Theme = 'light';
  try {
    const v = localStorage.getItem('pf-theme');
    if (v === 'light' || v === 'dark' || v === 'system') saved = v;
  } catch {
    /* storage can be unavailable; stay on light */
  }
  applyTheme(saved);
  document.querySelectorAll<HTMLButtonElement>('[data-theme-opt]').forEach((b) => {
    b.addEventListener('click', () => {
      const next = b.dataset.themeOpt as Theme;
      applyTheme(next);
      try {
        localStorage.setItem('pf-theme', next);
      } catch {
        /* ignore */
      }
    });
  });
}

// ---- Views and navigation ------------------------------------------------------------

const VIEWS = ['overview', 'playground', 'mode', 'profile', 'sites', 'audit'] as const;
type ViewId = (typeof VIEWS)[number];

const VIEW_TITLES: Record<ViewId, string> = {
  overview: 'Overview',
  playground: 'Playground',
  mode: 'Detection mode',
  profile: 'Privacy policy',
  sites: 'Sites',
  audit: 'Audit log',
};

function currentView(): ViewId {
  const id = location.hash.replace(/^#\/?/, '');
  return (VIEWS as readonly string[]).includes(id) ? (id as ViewId) : 'overview';
}

function showView(id: ViewId, moveFocus: boolean): void {
  for (const v of VIEWS) $(`view-${v}`).hidden = v !== id;
  document.querySelectorAll<HTMLAnchorElement>('#nav .nav-item').forEach((a) => {
    if (a.dataset.view === id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = `${VIEW_TITLES[id]} · TechKnights Privacy Firewall`;
  window.scrollTo(0, 0);
  if (moveFocus) $(`t-${id}`).focus({ preventScroll: true });
}

function initRouter(): void {
  showView(currentView(), false);
  window.addEventListener('hashchange', () => showView(currentView(), true));
  // Number keys jump between views, like most desktop apps.
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable], dialog[open]')) return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= VIEWS.length) location.hash = VIEWS[n - 1];
  });
}

// ---- Overview ------------------------------------------------------------------------

function refreshSummary(): void {
  const p = activeProfile(settings);
  $('ov-mode').textContent = settings.mode === 'smart' ? 'Smart · on-device AI judges what your request needs' : 'Basic · rules and patterns';
  $('ov-profile').textContent = `${p.name} · ${Math.round(p.threshold * 100)}% threshold`;
  $('ov-live').textContent = settings.liveScan ? 'On · counts shown while you type' : 'Off';
  const n = settings.disabledSites.length;
  $('ov-sites').textContent = n ? `${n} site${n === 1 ? '' : 's'}` : 'None · the shield is active everywhere';
  $('setup').dataset.ready = 'true';
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const hr = Math.round(m / 60);
  if (hr < 24) return `${hr} h ago`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(ts).toLocaleDateString();
}

function riskBadge(score: number): HTMLElement {
  return h('span', { class: `rk ${riskLevel(score)}`, title: `${riskLevel(score)} risk` }, String(score));
}

function countChips(counts: Record<string, number>, max = Infinity): HTMLElement[] {
  const all = Object.entries(counts);
  const chips = all.slice(0, max).map(([k, v]) => h('span', { class: 'tag' }, `${k.replace(/_/g, ' ')} ×${v}`));
  if (all.length > max) chips.push(h('span', { class: 'tag' }, `+${all.length - max}`));
  return chips;
}

function renderOverview(list: AuditEntry[]): void {
  let items = 0;
  let secrets = 0;
  let before = 0;
  let after = 0;
  for (const e of list) {
    for (const [k, v] of Object.entries(e.counts)) {
      items += v;
      if (isCredentialType(k as EntityType)) secrets += v;
    }
    before += e.riskBefore;
    after += e.riskAfter;
  }
  $('stats').dataset.ready = 'true';
  $('st-prompts').textContent = list.length.toLocaleString();
  $('st-items').textContent = items.toLocaleString();
  $('st-secrets').textContent = secrets.toLocaleString();
  if (list.length) {
    $('st-risk').replaceChildren(riskBadge(Math.round(before / list.length)), icon('arrow'), riskBadge(Math.round(after / list.length)));
  } else {
    $('st-risk').textContent = '—';
  }

  const recent = $('recent');
  recent.replaceChildren();
  if (!list.length) {
    recent.append(
      h(
        'div',
        { class: 'empty-state' },
        h('span', { class: 'empty-ico' }, icon('shield-check')),
        h('strong', {}, 'Nothing protected yet'),
        h('span', {}, 'Use the shield on any AI chat, or try the playground to see it work.'),
        h('a', { class: 'btn primary', href: '#playground' }, icon('play'), 'Open the playground'),
      ),
    );
    return;
  }
  for (const e of [...list].reverse().slice(0, 5)) {
    recent.append(
      h(
        'div',
        { class: 'recent-row' },
        h('span', {}, h('div', { class: 'site' }, e.host), h('div', { class: 'muted when' }, timeAgo(e.ts))),
        h('span', { class: 'chipset' }, ...countChips(e.counts, 3)),
        h('span', { class: 'rk-flow' }, riskBadge(e.riskBefore), icon('arrow'), riskBadge(e.riskAfter)),
      ),
    );
  }
}

// ---- Detection mode ------------------------------------------------------------------

async function refreshSmart(): Promise<void> {
  const status = $('smart-status');
  const btn = $<HTMLButtonElement>('smart-download');
  const state = await getAvailability();
  status.className = 'status';
  btn.hidden = true;
  switch (state) {
    case 'available':
      status.textContent = 'On-device AI is ready. Smart mode will be used when selected.';
      status.classList.add('ok');
      break;
    case 'downloadable':
      status.textContent = 'On-device AI is supported on this computer but not downloaded yet (about 4 GB).';
      btn.hidden = false;
      break;
    case 'downloading':
      status.textContent = 'The on-device AI model is downloading. Check back in a few minutes.';
      break;
    case 'unavailable':
      status.textContent = "On-device AI isn't available on this computer (hardware or storage requirements not met). Basic mode will be used.";
      status.classList.add('bad');
      break;
    default:
      status.textContent = "This browser doesn't offer Chrome's on-device AI. Basic mode will be used.";
      status.classList.add('bad');
  }
}

function initMode(): void {
  const radios = document.querySelectorAll<HTMLInputElement>('input[name=mode]');
  radios.forEach((r) => {
    r.checked = r.value === settings.mode;
    r.addEventListener('change', async () => {
      if (!r.checked) return;
      settings = await saveSettings({ mode: r.value as 'basic' | 'smart' });
      refreshSummary();
      toast(`${r.value === 'smart' ? 'Smart' : 'Basic'} mode selected.`);
    });
  });
  $('smart-download').addEventListener('click', async () => {
    const out = $('smart-progress');
    const bar = $('smart-bar');
    const fill = bar.firstElementChild as HTMLElement;
    const btn = $<HTMLButtonElement>('smart-download');
    btn.disabled = true;
    bar.hidden = false;
    fill.style.width = '0%';
    out.textContent = 'Starting download…';
    try {
      await downloadModel((pct) => {
        fill.style.width = `${pct}%`;
        out.textContent = `Downloading… ${pct}%`;
      });
      fill.style.width = '100%';
      out.textContent = 'Done.';
      toast('On-device AI is ready.');
    } catch (e) {
      out.textContent = `Couldn't download: ${(e as Error).message}`;
      toast("Couldn't download the on-device model.", 'err');
    } finally {
      btn.disabled = false;
      void refreshSmart();
    }
  });
  void refreshSmart();
}

// ---- Privacy policy ------------------------------------------------------------------

let baseline = '';
let profileDirty = false;

/** A stable summary of everything the editor can change, used to detect unsaved edits. */
function fingerprint(p: Profile): string {
  return JSON.stringify([p.threshold, ENTITY_TYPES.map((t) => [p.rules[t].action, !!p.rules[t].keepIfNeeded])]);
}

function syncDirty(): void {
  profileDirty = fingerprint(editing) !== baseline;
  $('savebar').hidden = !profileDirty;
  document.querySelector<HTMLElement>('#nav [data-view="profile"]')!.toggleAttribute('data-dirty', profileDirty);
}

function resetEditor(p: Profile): void {
  editing = structuredClone(p);
  baseline = fingerprint(editing);
  renderRules();
  syncDirty();
}

function paintRange(input: HTMLInputElement): void {
  const min = Number(input.min);
  const max = Number(input.max);
  input.style.setProperty('--pct', `${((Number(input.value) - min) / (max - min)) * 100}%`);
}

function ruleRow(t: EntityType, group: string, locked: boolean): HTMLTableRowElement {
  const rule = editing.rules[t];
  const row = h('tr');
  row.dataset.g = group;
  row.dataset.name = `${TYPE_NAMES[t]} ${t.replace(/_/g, ' ')}`.toLowerCase();
  row.append(h('td', {}, TYPE_NAMES[t]));
  const actionCell = h('td');
  const keepCell = h('td');
  if (isCredentialType(t)) {
    actionCell.append(h('span', { class: 'tag locked' }, icon('lock'), 'Always removed'));
    keepCell.append('—');
  } else {
    const sel = h('select', { disabled: locked });
    sel.setAttribute('aria-label', `Action for ${TYPE_NAMES[t]}`);
    for (const [v, label] of EDITABLE_ACTIONS) {
      const o = h('option', { value: v, textContent: label });
      o.selected = rule.action === v;
      sel.append(o);
    }
    sel.addEventListener('change', () => {
      editing.rules[t] = { ...editing.rules[t], action: sel.value as Action };
      syncDirty();
    });
    actionCell.append(sel);
    const cb = h('input', { type: 'checkbox', checked: !!rule.keepIfNeeded, disabled: locked, class: 'switch' });
    cb.setAttribute('role', 'switch');
    cb.setAttribute('aria-label', `Keep ${TYPE_NAMES[t]} if needed`);
    cb.addEventListener('change', () => {
      editing.rules[t] = { ...editing.rules[t], keepIfNeeded: cb.checked };
      syncDirty();
    });
    keepCell.append(cb);
  }
  row.append(actionCell, keepCell);
  return row;
}

function applyRuleFilter(): void {
  const q = $<HTMLInputElement>('rules-filter').value.trim().toLowerCase();
  const body = document.querySelector<HTMLTableSectionElement>('#rules tbody')!;
  const perGroup = new Map<string, number>();
  let total = 0;
  body.querySelectorAll<HTMLTableRowElement>('tr[data-name]').forEach((r) => {
    const show = !q || r.dataset.name!.includes(q);
    r.hidden = !show;
    if (show) {
      total++;
      perGroup.set(r.dataset.g!, (perGroup.get(r.dataset.g!) ?? 0) + 1);
    }
  });
  body.querySelectorAll<HTMLTableRowElement>('tr.group').forEach((g) => (g.hidden = !perGroup.get(g.dataset.g!)));
  body.querySelector<HTMLTableRowElement>('tr.nomatch')!.hidden = total > 0;
}

function renderRules(): void {
  const body = document.querySelector<HTMLTableSectionElement>('#rules tbody')!;
  body.replaceChildren();
  const locked = !!settings.lockProfile;
  const listed = new Set(RULE_GROUPS.flatMap((g) => g.types));
  const rest = ENTITY_TYPES.filter((t) => !listed.has(t));
  const groups = rest.length ? [...RULE_GROUPS, { title: 'Other', types: rest }] : RULE_GROUPS;
  for (const g of groups) {
    const types = g.types.filter((t) => ENTITY_TYPES.includes(t));
    if (!types.length) continue;
    const head = h('tr', { class: 'group' }, h('td', { colSpan: 3 }, g.title, h('span', { class: 'n' }, String(types.length))));
    head.dataset.g = g.title;
    body.append(head);
    for (const t of types) body.append(ruleRow(t, g.title, locked));
  }
  body.append(h('tr', { class: 'nomatch', hidden: true }, h('td', { colSpan: 3, class: 'empty' }, icon('search'), 'No data types match your filter.')));

  const thr = $<HTMLInputElement>('thr');
  thr.value = String(editing.threshold);
  thr.disabled = locked;
  paintRange(thr);
  $('thr-out').textContent = `${Math.round(editing.threshold * 100)}%`;
  $('profile-desc').textContent = editing.description;
  applyRuleFilter();
}

function fillProfileSelect(): void {
  const sel = $<HTMLSelectElement>('profile-select');
  sel.replaceChildren();
  for (const p of allProfiles(settings)) {
    const o = h('option', { value: p.id, textContent: p.name });
    o.selected = p.id === settings.profileId;
    sel.append(o);
  }
  sel.disabled = !!settings.lockProfile;
}

function initProfile(): void {
  $('managed-note').hidden = !settings.managed;
  fillProfileSelect();
  resetEditor(activeProfile(settings));

  $('rules-filter').addEventListener('input', applyRuleFilter);

  $('profile-select').addEventListener('change', async (e) => {
    const id = (e.target as HTMLSelectElement).value;
    const hadEdits = profileDirty;
    settings = await saveSettings({ profileId: id });
    resetEditor(activeProfile(settings));
    refreshSummary();
    toast(hadEdits ? `Switched to ${editing.name}. Unsaved edits were discarded.` : `Using the ${editing.name} profile.`, hadEdits ? 'info' : 'ok');
  });
  $('thr').addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    editing.threshold = Number(input.value);
    paintRange(input);
    $('thr-out').textContent = `${Math.round(editing.threshold * 100)}%`;
    syncDirty();
  });

  $('prof-save').addEventListener('click', async () => {
    const normalized = normalizeProfile(editing, editing.id)!;
    settings = await saveSettings({ profiles: { ...settings.profiles, [normalized.id]: normalized } });
    baseline = fingerprint(editing);
    syncDirty();
    refreshSummary();
    toast('Policy saved.');
  });
  $('prof-discard').addEventListener('click', () => {
    resetEditor(activeProfile(settings));
    toast('Changes discarded.', 'info');
  });

  armable($<HTMLButtonElement>('prof-reset'), async () => {
    const profiles = { ...settings.profiles };
    delete profiles[editing.id];
    settings = await saveSettings({ profiles });
    const builtin = BUILTIN_PROFILES.find((p) => p.id === editing.id);
    const target = builtin ? getBuiltinProfile(builtin.id) : getBuiltinProfile('personal');
    if (!builtin) settings = await saveSettings({ profileId: 'personal' });
    fillProfileSelect();
    resetEditor(target);
    refreshSummary();
    toast('Reset to default.', 'info');
  }, 'Click to confirm reset');

  // Save as new profile: a native dialog instead of window.prompt
  const dlg = $<HTMLDialogElement>('new-profile');
  const nameInput = $<HTMLInputElement>('np-name');
  $('prof-new').addEventListener('click', () => {
    dlg.returnValue = '';
    nameInput.value = `${editing.name} (copy)`;
    dlg.showModal();
    nameInput.select();
  });
  $('np-cancel').addEventListener('click', () => dlg.close('cancel'));
  dlg.addEventListener('close', async () => {
    if (dlg.returnValue !== 'create') return;
    const name = nameInput.value.trim();
    if (!name) return;
    const id = `custom-${Date.now()}`;
    const copy = normalizeProfile({ ...editing, id, name }, id)!;
    settings = await saveSettings({ profiles: { ...settings.profiles, [id]: copy }, profileId: id });
    fillProfileSelect();
    resetEditor(copy);
    refreshSummary();
    toast(`Created "${name}".`);
  });

  $('prof-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(normalizeProfile(editing, editing.id), null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `${editing.id}.privacy-profile.json` });
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Profile exported.', 'info');
  });
  $('prof-import').addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const p = normalizeProfile(raw, `custom-${Date.now()}`);
      if (!p) throw new Error('Not a profile file');
      settings = await saveSettings({ profiles: { ...settings.profiles, [p.id]: p }, profileId: p.id });
      fillProfileSelect();
      resetEditor(p);
      refreshSummary();
      toast(`Imported "${p.name}". Secrets stay forced to removal.`);
    } catch {
      toast("Couldn't read that file.", 'err');
    }
    (e.target as HTMLInputElement).value = '';
  });

  window.addEventListener('beforeunload', (e) => {
    if (profileDirty) e.preventDefault();
  });
}

// ---- Sites ---------------------------------------------------------------------------

function normalizeSite(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/\s+/g, '');
}

function renderSites(): void {
  const list = $('sites-list');
  list.replaceChildren();
  if (!settings.disabledSites.length) {
    list.append(h('li', { class: 'site-empty' }, 'No sites turned off. The shield is active everywhere.'));
    return;
  }
  for (const site of settings.disabledSites) {
    const rm = h('button', { class: 'icon-btn', type: 'button', title: `Turn the shield back on for ${site}` }, icon('x'));
    rm.setAttribute('aria-label', `Turn the shield back on for ${site}`);
    rm.addEventListener('click', async () => {
      settings = await saveSettings({ disabledSites: settings.disabledSites.filter((s) => s !== site) });
      renderSites();
      refreshSummary();
      toast(`Shield is back on for ${site}.`, 'info', {
        label: 'Undo',
        run: async () => {
          settings = await saveSettings({ disabledSites: [...settings.disabledSites, site] });
          renderSites();
          refreshSummary();
        },
      });
    });
    list.append(h('li', { class: 'site-row' }, icon('globe'), h('code', {}, site), rm));
  }
}

function initSites(): void {
  const live = $<HTMLInputElement>('live');
  const all = $<HTMLInputElement>('show-all');
  live.checked = settings.liveScan;
  all.checked = settings.showOnAll;
  live.addEventListener('change', async () => {
    settings = await saveSettings({ liveScan: live.checked });
    refreshSummary();
    toast(live.checked ? 'Live scan is on.' : 'Live scan is off.', 'info');
  });
  all.addEventListener('change', async () => {
    settings = await saveSettings({ showOnAll: all.checked });
    toast(all.checked ? 'Shield shows on every text box.' : 'Shield shows on chat-style boxes only.', 'info');
  });

  const input = $<HTMLInputElement>('site-input');
  $('site-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const site = normalizeSite(input.value);
    if (!site) return;
    if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d+)?$/.test(site)) {
      toast('Enter a site like example.com', 'err');
      return;
    }
    if (settings.disabledSites.includes(site)) {
      toast(`${site} is already in the list.`, 'info');
      input.value = '';
      return;
    }
    settings = await saveSettings({ disabledSites: [...settings.disabledSites, site] });
    input.value = '';
    renderSites();
    refreshSummary();
    toast(`Shield turned off on ${site}.`);
  });
  renderSites();
}

// ---- Playground ----------------------------------------------------------------------

function riskCard(el: HTMLElement, label: string, score: number, level: string): void {
  el.className = `risk ${level}`;
  const fill = h('i');
  fill.style.width = `${Math.max(0, Math.min(100, score))}%`;
  el.replaceChildren(
    h('span', { class: 'risk-k' }, label),
    h('span', { class: 'risk-l' }, level),
    h('span', { class: 'risk-n' }, String(score), h('small', {}, '/ 100')),
    h('span', { class: 'meter' }, fill),
  );
}

function renderHighlight(result: AnalysisResult): void {
  const box = $('pg-highlight');
  box.replaceChildren();
  let cursor = 0;
  const text = result.originalText;
  for (const f of result.findings) {
    if (f.start < cursor) continue;
    box.append(text.slice(cursor, f.start));
    const m = h('mark', { class: isCredentialType(f.type) ? 'cred' : f.applied ? 'applied' : 'kept' }, text.slice(f.start, f.end));
    m.title = `${f.label ?? f.type}: ${f.reason}`;
    box.append(m);
    cursor = f.end;
  }
  box.append(text.slice(cursor));
}

function confidenceCell(conf: number): HTMLElement {
  const fill = h('i');
  fill.style.width = `${Math.round(conf * 100)}%`;
  return h('span', { class: 'conf' }, h('span', { class: 'meter' }, fill), `${Math.round(conf * 100)}%`);
}

function showResults(visible: boolean): void {
  $('pg-out').hidden = !visible;
  $('pg-empty').hidden = visible;
}

function runPlayground(opts: { quiet?: boolean; scroll?: boolean } = {}): void {
  const text = $<HTMLTextAreaElement>('pg-input').value;
  if (!text.trim()) {
    showResults(false);
    if (!opts.quiet) toast('Paste some text first.', 'info');
    return;
  }
  const { result } = analyze(text, { profile: activeProfile(settings) });
  showResults(true);
  riskCard($('pg-risk-before'), 'Before', result.riskBefore, result.levelBefore);
  riskCard($('pg-risk-after'), 'After', result.riskAfter, result.levelAfter);
  $('pg-meta').textContent = `${result.findings.filter((f) => f.applied).length} of ${result.findings.length} findings protected · ${activeProfile(settings).name} profile · Basic rules (the Smart model runs from the shield button on web pages)`;
  $('pg-findings-count').textContent = String(result.findings.length);
  renderHighlight(result);
  $('pg-safe').textContent = result.safeText;
  const body = document.querySelector<HTMLTableSectionElement>('#pg-table tbody')!;
  body.replaceChildren();
  if (!result.findings.length) {
    const td = h('td', { colSpan: 6, class: 'empty' }, icon('shield-check'), 'Nothing sensitive found. This text is safe to send.');
    body.append(h('tr', {}, td));
  }
  for (const f of result.findings) {
    const shown = isCredentialType(f.type) ? f.text.slice(0, 3) + '••••' : f.text.length > 40 ? f.text.slice(0, 38) + '…' : f.text;
    const actionKey = f.applied ? f.action.toLowerCase() : 'kept';
    body.append(
      h(
        'tr',
        {},
        h('td', {}, h('span', { class: 'tag type' }, (f.label ?? f.type).replace(/_/g, ' '))),
        h('td', {}, h('code', { class: 'found' }, shown)),
        h('td', {}, h('span', { class: `tag act-${actionKey}` }, f.applied ? f.action.replace('_', ' ').toLowerCase() : 'kept')),
        h('td', {}, f.applied ? h('code', {}, f.replacement) : '—'),
        h('td', {}, confidenceCell(f.confidence)),
        h('td', { class: 'muted' }, f.reason),
      ),
    );
  }
  if (opts.scroll) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('pg-out').scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }
}

function initTabs(): void {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('#pg-out [role="tab"]'));
  const select = (t: HTMLButtonElement): void => {
    for (const x of tabs) {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      $(x.getAttribute('aria-controls')!).hidden = !on;
    }
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(next);
      next.focus();
    });
  });
}

function initPlayground(): void {
  const input = $<HTMLTextAreaElement>('pg-input');
  const count = $('pg-count');
  const clear = $('pg-clear');
  const sync = (): void => {
    const n = input.value.length;
    count.textContent = `${n.toLocaleString()} character${n === 1 ? '' : 's'}`;
    clear.hidden = n === 0;
  };

  // Once results are on screen, keep them in step with the text.
  let timer = 0;
  input.addEventListener('input', () => {
    sync();
    if ($('pg-out').hidden) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => runPlayground({ quiet: true }), 350);
  });

  const chips = $('pg-samples');
  for (const s of SAMPLES) {
    const chip = h('button', { class: 'ex-chip', type: 'button' }, SAMPLE_LABELS[s.id] ?? s.title);
    chip.dataset.sample = s.id;
    chip.title = s.title;
    chip.addEventListener('click', () => {
      input.value = s.text;
      sync();
      runPlayground({ scroll: true });
    });
    chips.append(chip);
  }

  $('pg-run').addEventListener('click', () => runPlayground({ scroll: true }));
  clear.addEventListener('click', () => {
    input.value = '';
    sync();
    showResults(false);
    input.focus();
  });
  $('pg-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('pg-safe').textContent ?? '');
      toast('Safe version copied.');
    } catch {
      toast('Select the text and copy it manually.', 'err');
    }
  });

  const loadFile = async (file: File): Promise<void> => {
    if (file.size > 2_000_000) return toast('That file is too large (2 MB max).', 'err');
    if (/\.(pdf|docx?|xlsx?|pptx?)$/i.test(file.name)) {
      return toast('PDF and Office files are not supported yet. Paste the text instead.', 'err');
    }
    input.value = await file.text();
    sync();
    toast(`Loaded ${file.name}.`, 'info');
    runPlayground({ scroll: true });
  };
  $('pg-file').addEventListener('change', (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) void loadFile(f);
    (e.target as HTMLInputElement).value = '';
  });
  const drop = $('drop');
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const f = e.dataTransfer?.files?.[0];
    if (f) void loadFile(f);
  });

  initTabs();
  sync();
}

// ---- Audit log -----------------------------------------------------------------------

async function loadAudit(): Promise<AuditEntry[]> {
  const got = await chrome.storage.local.get('audit');
  return Array.isArray(got.audit) ? got.audit : [];
}

async function renderAudit(): Promise<void> {
  const list = await loadAudit();
  renderOverview(list);
  $<HTMLButtonElement>('audit-clear').disabled = !list.length;
  const body = document.querySelector<HTMLTableSectionElement>('#audit-table tbody')!;
  body.replaceChildren();
  if (!list.length) {
    body.append(
      h('tr', {}, h('td', { colSpan: 6, class: 'empty' }, icon('scroll'), 'No entries yet. Protected prompts will appear here, as metadata only.')),
    );
    return;
  }
  for (const e of [...list].reverse().slice(0, 100)) {
    const chips = countChips(e.counts);
    body.append(
      h(
        'tr',
        {},
        h('td', { class: 'when' }, new Date(e.ts).toLocaleString()),
        h('td', {}, h('code', {}, e.host)),
        h('td', {}, h('span', { class: 'tag' }, e.mode)),
        h('td', {}, e.profileId),
        h('td', {}, chips.length ? h('span', { class: 'chipset' }, ...chips) : '—'),
        h('td', {}, h('span', { class: 'rk-flow' }, riskBadge(e.riskBefore), icon('arrow'), riskBadge(e.riskAfter))),
      ),
    );
  }
}

function initAudit(): void {
  armable($<HTMLButtonElement>('audit-clear'), async () => {
    await chrome.storage.local.set({ audit: [] });
    void renderAudit();
    toast('Audit log cleared.', 'info');
  }, 'Click again to clear');
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.audit) void renderAudit();
  });
  void renderAudit();
}

async function main(): Promise<void> {
  initTheme();
  initRouter();
  initAudit(); // needs no settings, so the Overview numbers appear immediately
  settings = await loadSettings();
  refreshSummary();
  initMode();
  initProfile();
  initSites();
  initPlayground();
}

void main();
