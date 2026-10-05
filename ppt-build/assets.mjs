// Builds image assets for the P2Shield deck: recoloured Lucide icons (SVG + PNG),
// the P2Shield shield mark, and crops of real prototype screenshots.
// Run: node ppt-build/assets.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'out', 'assets');
const iconSrc = join(here, 'node_modules', 'lucide-static', 'icons');
mkdirSync(out, { recursive: true });

// name -> list of hex colours (without #) the deck needs
const ICONS = {
  'shield-check': ['FFFFFF', '1F497D', '2E9E5B', '6F4FB0'],
  'triangle-alert': ['6F4FB0', 'FFFFFF'],
  'message-square-text': ['FFFFFF'],
  'scan-search': ['FFFFFF'],
  'sliders-horizontal': ['FFFFFF'],
  gauge: ['FFFFFF'],
  'circle-check': ['FFFFFF', '2E9E5B'],
  bot: ['FFFFFF'],
  'app-window': ['FFFFFF'],
  puzzle: ['FFFFFF'],
  layers: ['FFFFFF'],
  'git-merge': ['FFFFFF'],
  'list-checks': ['FFFFFF'],
  eraser: ['FFFFFF'],
  'undo-2': ['FFFFFF'],
  'brain-circuit': ['FFFFFF', '1F497D'],
  braces: ['FFFFFF', '1F6FB2'],
  binary: ['FFFFFF', '1F6FB2'],
  user: ['FFFFFF', '1F497D'],
  'graduation-cap': ['1F497D'],
  hospital: ['1E7A46'],
  landmark: ['B45309'],
  'square-terminal': ['5B3F8C'],
  'building-2': ['8A6D00'],
  'hand-heart': ['FFFFFF'],
  'indian-rupee': ['FFFFFF'],
  gavel: ['FFFFFF'],
  leaf: ['FFFFFF'],
  rocket: ['1F497D'],
  'lock-keyhole': ['FFFFFF'],
  'server-off': ['FFFFFF'],
  timer: ['FFFFFF'],
  cpu: ['FFFFFF'],
  'file-search': ['FFFFFF', '1F6FB2'],
  keyboard: ['FFFFFF'],
  'cloud-off': ['2E9E5B'],
  'chart-column': ['1F497D'],
  'trending-up': ['1F497D'],
  check: ['2E9E5B'],
  'arrow-right': ['1F497D'],
  'book-open': ['1F497D', 'FFFFFF'],
  scale: ['FFFFFF', '1F497D'],
  'chart-bar': ['FFFFFF', '1F497D'],
  'file-text': ['1F497D', 'FFFFFF'],
  wrench: ['FFFFFF'],
  'refresh-cw': ['FFFFFF', '1F497D'],
  'scan-text': ['FFFFFF', '1F497D'],
  languages: ['FFFFFF', '1F497D'],
  'file-lock': ['FFFFFF', '1F497D'],
  'id-card': ['FFFFFF'],
  'key-round': ['FFFFFF'],
  'eye-off': ['FFFFFF'],
  fingerprint: ['FFFFFF'],
  route: ['FFFFFF', '1F497D'],
  'shield-alert': ['FFFFFF'],
  sparkles: ['FFFFFF', '6F4FB0'],
  'monitor-check': ['FFFFFF'],
  users: ['FFFFFF'],
  'test-tube': ['FFFFFF'],
  package: ['FFFFFF'],
  database: ['FFFFFF'],
};

function iconSvg(name, hex, strokeWidth = 2) {
  const raw = readFileSync(join(iconSrc, `${name}.svg`), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/class="[^"]*"\s*/g, '')
    .replace(/stroke="currentColor"/, `stroke="#${hex}"`)
    .replace(/stroke-width="2"/, `stroke-width="${strokeWidth}"`)
    .replace(/width="24"/, 'width="96"')
    .replace(/height="24"/, 'height="96"');
  return raw.trim();
}

// P2Shield mark: gradient shield holding a chat bubble whose text is masked.
const SHIELD = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="460" viewBox="0 0 400 460">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22D3EE"/>
      <stop offset="0.5" stop-color="#2563EB"/>
      <stop offset="1" stop-color="#6D28D9"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.15"/>
    </linearGradient>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#1e1b4b" flood-opacity="0.30"/>
    </filter>
  </defs>
  <path filter="url(#s)" fill="url(#g)"
    d="M200 22 C250 58 308 74 364 76 C366 92 366 110 366 128 C366 290 290 384 200 432 C110 384 34 290 34 128 C34 110 34 92 36 76 C92 74 150 58 200 22 Z"/>
  <path fill="none" stroke="url(#rim)" stroke-width="6"
    d="M200 46 C246 78 296 94 344 97 C345 108 345 119 345 130 C345 274 279 360 200 405 C121 360 55 274 55 130 C55 119 55 108 56 97 C104 94 154 78 200 46 Z"/>
  <!-- chat bubble -->
  <path fill="#ffffff" d="M112 150 h176 a26 26 0 0 1 26 26 v84 a26 26 0 0 1 -26 26 h-96 l-40 34 v-34 h-40 a26 26 0 0 1 -26 -26 v-84 a26 26 0 0 1 26 -26 z"/>
  <!-- masked text lines -->
  <rect x="122" y="184" width="64" height="16" rx="8" fill="#2563EB"/>
  <rect x="194" y="184" width="84" height="16" rx="8" fill="#CBD5E1"/>
  <g fill="#6D28D9">
    <circle cx="132" cy="236" r="9"/><circle cx="158" cy="236" r="9"/><circle cx="184" cy="236" r="9"/>
    <circle cx="210" cy="236" r="9"/><circle cx="236" cy="236" r="9"/>
  </g>
  <rect x="252" y="228" width="26" height="16" rx="8" fill="#CBD5E1"/>
</svg>`;

async function main() {
  // 1. Icon SVGs (used directly by PowerPoint) and PNG fallbacks.
  const iconJobs = [];
  for (const [name, colours] of Object.entries(ICONS)) {
    if (!existsSync(join(iconSrc, `${name}.svg`))) throw new Error(`missing icon ${name}`);
    for (const hex of colours) {
      const svg = iconSvg(name, hex);
      const base = join(out, `icon-${name}-${hex}`);
      writeFileSync(`${base}.svg`, svg);
      iconJobs.push({ svg, png: `${base}.png` });
    }
  }
  writeFileSync(join(out, 'p2shield-mark.svg'), SHIELD.trim());

  console.log('launching browser');
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  async function renderSvg(svg, w, h, file) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg.replace(/width="\d+"/, `width="${w}"`).replace(/height="\d+"/, `height="${h}"`)}</body></html>`,
    );
    await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  }

  for (const j of iconJobs) await renderSvg(j.svg, 192, 192, j.png);
  console.log('icons rendered');
  await renderSvg(SHIELD, 800, 920, join(out, 'p2shield-mark.png'));
  console.log('shield rendered');

  // 2. Crops of real prototype screenshots (test-results/ from the e2e run).
  const shots = resolve(here, '..', 'test-results');
  async function crop(src, clip, file, cover = '') {
    // Embed the screenshot as a data URL so no file:// navigation is needed.
    // `cover` is optional HTML drawn on top (used to hide a half-cut line of page text).
    const b64 = readFileSync(join(shots, src)).toString('base64');
    await page.setViewportSize({ width: 1400, height: 1400 });
    await page.setContent(
      `<html><body style="margin:0;position:relative"><img id="i" src="data:image/png;base64,${b64}" style="display:block">${cover}</body></html>`,
    );
    await page.waitForFunction(() => document.getElementById('i').naturalWidth > 0);
    await page.screenshot({ path: file, clip });
    console.log('cropped', src);
  }
  await crop('options-playground.png', { x: 330, y: 588, width: 712, height: 545 }, join(out, 'shot-playground.png'));
  // Hide the half-visible page header sentence to the left of the shield's popup.
  const hideHeader =
    '<div style="position:absolute;left:0;top:40px;width:618px;height:51px;background:#f1f5f9"></div>';
  await crop('chip-textarea.png', { x: 52, y: 46, width: 990, height: 240 }, join(out, 'shot-shield.png'), hideHeader);

  await browser.close();
  console.log(`Wrote ${iconJobs.length} icons, shield mark and 2 screenshot crops to ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
