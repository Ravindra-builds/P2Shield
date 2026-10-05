// End-to-end test: loads the built extension into Chromium and drives the demo page.
// Usage: npm run e2e      (builds a test variant into ./dist-e2e, starts the demo server, runs checks)
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { startServer } from '../demo/serve.mjs';

const root = resolve(import.meta.dirname, '..');
const extDir = join(root, 'dist-e2e');
const shots = join(root, 'test-results');
mkdirSync(shots, { recursive: true });

execFileSync(process.execPath, ['build.mjs'], {
  cwd: root,
  env: { ...process.env, PF_OUT: 'dist-e2e', PF_E2E: '1' },
  stdio: 'inherit',
});

const PORT = 4179;
const server = await startServer(PORT);
const url = `http://127.0.0.1:${PORT}/`;

const profileDir = mkdtempSync(join(tmpdir(), 'pf-e2e-'));
const context = await chromium.launchPersistentContext(profileDir, {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1100, height: 900 },
  args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
});

let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 15000 });
const extId = new URL(sw.url()).host;
const extPage = await context.newPage();
await extPage.goto(`chrome-extension://${extId}/options.html`);

const page = await context.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
});

const SAMPLES = await (async () => {
  await page.goto(url);
  return page.evaluate(() => window.__samples);
})();
const [PATIENT, DEV, BANK, MEMO, CLEAN] = SAMPLES;

// ---- helpers ------------------------------------------------------------------
const setSettings = async (patch) => {
  await extPage.evaluate(async (p) => {
    const got = await chrome.storage.local.get('settings');
    await chrome.storage.local.set({ settings: { ...(got.settings || {}), ...p } });
  }, patch);
  await page.waitForTimeout(350);
};
const resetSettings = async () => {
  await extPage.evaluate(() => chrome.storage.local.remove('settings'));
  await page.waitForTimeout(350);
};
const fresh = async () => {
  await page.goto(url);
  await page.waitForTimeout(500);
};
const shield = () => page.locator('button.shield');
const chip = () => page.locator('.chip.show');

async function focusAndType(id, text) {
  const box = page.locator(`#${id}`);
  await box.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(text);
}
async function sent(id) {
  await page.click(`#send-${id}`);
  return page.evaluate((i) => window.__received[i], id);
}
const norm = (s) => s.replace(/\s+/g, ' ').trim();

let passed = 0;
const failures = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`  FAIL ${name}\n       ${String(e.message).split('\n').slice(0, 6).join('\n       ')}`);
    try {
      await page.screenshot({ path: join(shots, `fail-${failures.length}.png`) });
    } catch {
      /* ignore */
    }
  }
}

const RAW_PATIENT = ['rahul.sharma@gmail.com', '98765 43210', '2345 6789 0124', 'Rahul Sharma', 'Anil Kumar'];
const RAW_DEV = ['sk-proj-Ab3dEf9hIjKlMnOpQrStUv12', 'AKIAIOSFODNN7EXAMPLE', 'Tr0ub4dor&3'];
const absent = (text, list) => {
  for (const raw of list) assert.ok(!text.includes(raw), `raw value leaked: ${raw}\n--- received:\n${text}`);
};

console.log(`\nExtension id: ${extId}\n`);

// ---- 1. every editor type: shield appears, badge, click, replace, page state, undo ----
for (const [id, label] of [
  ['ta', 'plain textarea'],
  ['ctl', 'framework-controlled textarea'],
  ['ce', 'plain contenteditable'],
  ['model', 'model-driven rich editor'],
  ['inp', 'single-line input'],
]) {
  await test(`[${label}] shield, live badge, protect, page state, undo`, async () => {
    await fresh();
    await focusAndType(id, PATIENT);
    await shield().waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.badge').waitFor({ state: 'visible', timeout: 3000 });
    const badge = Number(await page.locator('.badge').innerText());
    assert.ok(badge >= 3, `expected badge >= 3, got ${badge}`);

    await shield().click();
    await chip().filter({ hasText: 'Protected' }).waitFor({ timeout: 5000 });
    if (id === 'ta') await page.screenshot({ path: join(shots, 'chip-textarea.png') });

    const got = await sent(id);
    absent(got, RAW_PATIENT);
    assert.ok(got.includes('[PERSON_1]'), `name should be tokenized:\n${got}`);
    assert.ok(got.includes('diabetes'), 'personal profile keeps the medical fact');
    assert.ok(got.includes('r******@gmail.com'), `email should be masked:\n${got}`);
    assert.ok(got.includes('[REDACTED_AADHAAR]'), `aadhaar should be removed:\n${got}`);

    await chip().locator('button', { hasText: 'Undo' }).click();
    await chip().filter({ hasText: 'Original text restored' }).waitFor({ timeout: 5000 });
    const back = await sent(id);
    assert.equal(norm(back), norm(PATIENT), 'undo should restore the original text');
  });
}

// ---- 2. multi-line credentials ------------------------------------------------------
for (const [id, label] of [['ta', 'textarea'], ['ctl', 'controlled textarea'], ['ce', 'contenteditable'], ['model', 'model-driven editor']]) {
  await test(`[${label}] multi-line credentials are removed and lines are kept`, async () => {
    await fresh();
    await focusAndType(id, DEV);
    await shield().waitFor({ state: 'visible', timeout: 5000 });
    await shield().click();
    await chip().filter({ hasText: 'Protected' }).waitFor({ timeout: 5000 });
    const got = await sent(id);
    absent(got, RAW_DEV);
    assert.ok(got.includes('OPENAI_API_KEY=[SECRET_REMOVED]'), got);
    assert.ok(got.includes('AWS_ACCESS_KEY_ID=[SECRET_REMOVED]'), got);
    assert.ok(got.includes('password: [SECRET_REMOVED]'), got);
    assert.ok(got.split(/\n/).filter((l) => l.trim()).length >= 4, `line breaks should survive:\n${JSON.stringify(got)}`);
  });
}

// ---- 2b. shield placement (regression: it sat mid-composer or at the top of the page on ChatGPT) ----------
async function assertShieldOnCard(cardSelector, label) {
  const card = await page.locator(cardSelector).first().boundingBox();
  const s = await shield().boundingBox();
  assert.ok(card && s, `${label}: missing boxes`);
  const centerX = s.x + s.width / 2;
  assert.ok(
    centerX >= card.x + card.width - 70 && centerX <= card.x + card.width,
    `${label}: shield should sit at the card's right edge (card right=${card.x + card.width}, shield x=${centerX})`,
  );
  assert.ok(s.y + s.height <= card.y + 4, `${label}: shield should be above or at the top of the card (card top=${card.y}, shield bottom=${s.y + s.height})`);
  assert.ok(card.y - (s.y + s.height) < 60, `${label}: shield should be close to the card (gap ${card.y - (s.y + s.height)})`);
  assert.ok(s.y >= 0, `${label}: shield must be on screen`);
}

await test('placement: plain textarea card', async () => {
  await fresh();
  await page.locator('#ta').click();
  await shield().waitFor({ state: 'visible' });
  await assertShieldOnCard('#ta >> xpath=ancestor::div[contains(@class,"composer")][1]', 'textarea');
});

await test('placement: ChatGPT-style card, empty and after a long multi-line paste', async () => {
  await fresh();
  await page.locator('#gpt').click();
  await shield().waitFor({ state: 'visible' });
  await assertShieldOnCard('#gpt-card', 'empty composer');
  await page.screenshot({ path: join(shots, 'placement-empty.png') });

  const long = Array.from({ length: 14 }, (_, i) => `Line ${i + 1}: contact rahul.sharma@gmail.com about ticket ${i + 1}`).join('\n');
  await page.keyboard.insertText(long);
  await page.waitForTimeout(600);
  const editorBox = await page.locator('#gpt').boundingBox();
  const cardBox = await page.locator('#gpt-card').boundingBox();
  assert.ok(editorBox.height > cardBox.height, 'test setup: the editor should be taller than its scrolling wrapper');
  await assertShieldOnCard('#gpt-card', 'long composer');
  await page.screenshot({ path: join(shots, 'placement-long.png') });

  await shield().click();
  await chip().filter({ hasText: 'Protected' }).waitFor({ timeout: 5000 });
  const got = await sent('gpt');
  assert.ok(!got.includes('rahul.sharma@gmail.com'), got);
  assert.ok(got.includes('r******@gmail.com'), got);
  assert.ok(got.split('\n').filter((l) => l.trim()).length >= 14, 'all 14 lines should be kept');
  await assertShieldOnCard('#gpt-card', 'after protect');
});

// ---- 2c. regressions reported on ChatGPT: Undo after repeated clicks, and page re-renders --------------------
await test('undo still restores the ORIGINAL after the shield is clicked twice', async () => {
  await fresh();
  await focusAndType('ta', PATIENT);
  await shield().waitFor({ state: 'visible' });
  await shield().click();
  await chip().filter({ hasText: 'Protected' }).waitFor({ timeout: 5000 });
  await shield().click(); // second click on already-cleaned text
  await page.waitForTimeout(400);
  await chip().filter({ hasText: 'Protected' }).waitFor();
  await chip().locator('button', { hasText: 'Undo' }).click();
  await chip().filter({ hasText: 'Original text restored' }).waitFor({ timeout: 5000 });
  assert.equal(norm(await sent('ta')), norm(PATIENT), 'undo must bring back the original, not the cleaned text');
});

await test('undo from the details panel works too', async () => {
  await fresh();
  await focusAndType('ta', PATIENT);
  await shield().waitFor({ state: 'visible' });
  await shield().click();
  await chip().filter({ hasText: 'Protected' }).waitFor({ timeout: 5000 });
  await chip().locator('button', { hasText: 'Details' }).click();
  await page.locator('.panel.show button', { hasText: 'Undo all' }).click();
  await chip().filter({ hasText: 'Original text restored' }).waitFor({ timeout: 5000 });
  assert.equal(norm(await sent('ta')), norm(PATIENT));
});

await test('page swaps the editor node: shield comes back and undo still works', async () => {
  await fresh();
  await page.locator('#gpt').click();
  await page.keyboard.insertText(PATIENT);
  await shield().waitFor({ state: 'visible' });
  await shield().click();
  await chip().filter({ hasText: 'Protected' }).waitFor({ timeout: 5000 });

  await page.evaluate(() => document.getElementById('rerender-gpt').click()); // new node, old one detached
  await page.waitForTimeout(900);
  assert.equal(await shield().isVisible(), true, 'shield must reappear on the replacement editor without re-clicking');
  const cardBox = await page.locator('#gpt-card').boundingBox();
  const s = await shield().boundingBox();
  assert.ok(Math.abs(s.x + s.width / 2 - (cardBox.x + cardBox.width)) < 70, 'shield should still sit on the card');

  await chip().locator('button', { hasText: 'Undo' }).click();
  await chip().filter({ hasText: 'Original text restored' }).waitFor({ timeout: 5000 });
  assert.equal(norm(await sent('gpt')), norm(PATIENT), 'undo must reach the replacement editor');
});

await test('clicking into an already-focused editor brings the shield back', async () => {
  await fresh();
  await page.locator('#ta').click();
  await shield().waitFor({ state: 'visible' });
  // Simulate the shield having been detached (e.g. focus moved to a hidden field and back).
  await page.locator('#search').click();
  await page.waitForTimeout(300);
  await page.locator('#ta').click();
  await shield().waitFor({ state: 'visible', timeout: 3000 });
});

// ---- 3. details panel ---------------------------------------------------------------
await test('details panel: toggle an item back, secrets are locked', async () => {
  await fresh();
  await focusAndType('ta', PATIENT + '\n' + DEV);
  await shield().waitFor({ state: 'visible' });
  await shield().click();
  await chip().filter({ hasText: 'Protected' }).waitFor({ timeout: 5000 });
  await chip().locator('button', { hasText: 'Details' }).click();
  const panel = page.locator('.panel.show');
  await panel.waitFor({ timeout: 3000 });
  await page.screenshot({ path: join(shots, 'details-panel.png') });
  assert.ok(await panel.locator('input[aria-label="Protect API_KEY"]').first().isDisabled(), 'API key checkbox must be locked');
  await panel.locator('input[aria-label="Protect EMAIL"]').uncheck();
  await chip().filter({ hasText: 'Protected' }).waitFor();
  await page.waitForTimeout(300);
  const got = await sent('ta');
  assert.ok(got.includes('rahul.sharma@gmail.com'), 'email should be restored when unchecked');
  assert.ok(!got.includes('98765 43210'), 'phone stays protected');
  assert.ok(!got.includes('sk-proj-Ab3d'), 'secret stays removed');
});

// ---- 4. nothing sensitive ---------------------------------------------------------------
await test('clean prompt: unchanged and reported as clean', async () => {
  await fresh();
  await focusAndType('ta', CLEAN);
  await shield().waitFor({ state: 'visible' });
  await shield().click();
  await chip().filter({ hasText: 'No sensitive data found' }).waitFor({ timeout: 4000 });
  assert.equal(norm(await sent('ta')), norm(CLEAN));
});

// ---- 5. not a chat box, then show-on-all -------------------------------------------------
await test('search field gets no shield by default, gets one with "show on all"', async () => {
  await fresh();
  await page.locator('#search').click();
  await page.waitForTimeout(900);
  assert.equal(await shield().isVisible(), false, 'shield must not appear on a search field');
  await setSettings({ showOnAll: true });
  await fresh();
  await page.locator('#search').click();
  await shield().waitFor({ state: 'visible', timeout: 4000 });
  await resetSettings();
});

// ---- 6. keyboard shortcut / context menu path (same message the background sends) -------------
await test('shortcut path protects a box without a shield', async () => {
  await fresh();
  await page.locator('#search').click();
  await page.keyboard.insertText('mail me at rahul.sharma@gmail.com');
  await extPage.evaluate(async () => {
    const me = await chrome.tabs.getCurrent();
    for (const t of await chrome.tabs.query({})) {
      if (t.id !== me?.id) await chrome.tabs.sendMessage(t.id, { type: 'PROTECT_FOCUSED', force: true }).catch(() => undefined);
    }
  });
  await page.waitForFunction(() => !document.getElementById('search').value.includes('rahul.sharma@gmail.com'), null, { timeout: 4000 });
  const v = await page.inputValue('#search');
  assert.ok(v.includes('r******@gmail.com'), v);
});

// ---- 7. profiles -------------------------------------------------------------------------------
await test('healthcare profile: keeps diagnosis, generalizes age and city', async () => {
  await setSettings({ profileId: 'healthcare' });
  await fresh();
  await focusAndType('ta', PATIENT);
  await shield().waitFor({ state: 'visible' });
  await shield().click();
  await chip().filter({ hasText: 'Protected' }).waitFor({ timeout: 5000 });
  const got = await sent('ta');
  absent(got, RAW_PATIENT);
  assert.ok(got.includes('diabetes'), got);
  assert.ok(got.includes('20-30'), got);
  assert.ok(got.includes('Jharkhand'), got);
  assert.ok(got.includes('[REDACTED_PHONE]'), got);
  await resetSettings();
});
await test('finance profile: masks card/account, rounds salary', async () => {
  await setSettings({ profileId: 'finance' });
  await fresh();
  await focusAndType('ctl', BANK);
  await shield().waitFor({ state: 'visible' });
  await shield().click();
  await chip().filter({ hasText: 'Protected' }).waitFor({ timeout: 5000 });
  const got = await sent('ctl');
  absent(got, ['123456789012', '4111 1111 1111 1111', 'ABCPE1234F', 'Priya Verma', '12,50,000']);
  assert.ok(got.includes('approx. ₹13 lakh'), got);
  assert.ok(got.includes('1111'), 'last four of the card may stay');
  await resetSettings();
});

// ---- 8. site disabled --------------------------------------------------------------------------------
await test('disabled site shows no shield', async () => {
  await setSettings({ disabledSites: ['127.0.0.1'] });
  await fresh();
  await page.locator('#ta').click();
  await page.waitForTimeout(900);
  assert.equal(await shield().isVisible(), false);
  await resetSettings();
});

// ---- 9. Smart mode falls back cleanly when the on-device model is missing ---------------------------------
await test('smart mode falls back to basic when Gemini Nano is unavailable', async () => {
  await setSettings({ mode: 'smart' });
  await fresh();
  await focusAndType('ta', PATIENT);
  await shield().waitFor({ state: 'visible' });
  await shield().click();
  const c = chip().filter({ hasText: 'Protected' });
  await c.waitFor({ timeout: 20000 });
  const text = await c.innerText();
  assert.ok(/Basic mode/.test(text) && /unavailable/i.test(text), `chip should explain the fallback:\n${text}`);
  absent(await sent('ta'), RAW_PATIENT);
  await resetSettings();
});

// ---- 10. options page / playground / audit log -----------------------------------------------------------------
await test('options page: playground, policy table, smart status', async () => {
  // The options page is a small app: each sidebar item is its own view, addressed by the URL hash.
  await extPage.goto(`chrome-extension://${extId}/options.html#playground`);
  await extPage.reload();
  await extPage.locator('[data-sample="developer"]').click();
  await extPage.locator('#pg-out').waitFor({ state: 'visible' });
  const safe = await extPage.locator('#pg-safe').innerText();
  absent(safe, RAW_DEV);
  assert.ok(safe.includes('[SECRET_REMOVED]'));
  assert.ok((await extPage.locator('#pg-risk-before').innerText()).includes('Critical'));
  await extPage.screenshot({ path: join(shots, 'options-playground.png'), fullPage: true });

  const openView = async (id) => {
    await extPage.evaluate((v) => { location.hash = v; }, id);
    await extPage.locator(`#view-${id}`).waitFor({ state: 'visible' });
  };
  await openView('mode');
  await extPage.waitForFunction(() => !/Checking/.test(document.getElementById('smart-status').textContent));
  const status = await extPage.locator('#smart-status').innerText();
  assert.ok(status.length > 10, status);
  await extPage.screenshot({ path: join(shots, 'options-mode.png'), fullPage: true });

  await openView('profile');
  assert.ok((await extPage.locator('#rules tbody tr').count()) >= 20);
  await extPage.screenshot({ path: join(shots, 'options-policy.png'), fullPage: true });

  await openView('overview');
  await extPage.screenshot({ path: join(shots, 'options.png'), fullPage: true });
});
await test('audit log holds metadata only', async () => {
  const stored = await extPage.evaluate(() => chrome.storage.local.get('audit').then((g) => JSON.stringify(g.audit ?? [])));
  assert.ok(stored.length > 10, 'audit entries expected');
  for (const raw of [...RAW_PATIENT, ...RAW_DEV, 'diabetes', 'Metformin']) {
    assert.ok(!stored.includes(raw), `audit log leaked: ${raw}`);
  }
  const parsed = JSON.parse(stored);
  assert.ok(parsed.every((e) => typeof e.counts === 'object' && e.riskBefore >= 0 && e.host));
});

await test('no page or console errors were raised', async () => {
  assert.deepEqual(problems, []);
});

await context.close();
server.close();
rmSync(profileDir, { recursive: true, force: true });

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('Failed:\n - ' + failures.join('\n - '));
  process.exit(1);
}
