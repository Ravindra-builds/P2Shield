// Builds the extension icons from the P2Shield logo.
// Run: node scripts/make-icons.mjs   (reads p2shield-logo.png, writes src/icons/*.png)
// Removes any white background outside the shield, crops to the artwork, places it on a dark
// rounded tile (toolbar icons) and downsizes. The artwork itself is not altered.
// Also writes src/icons/logo.png: the cropped transparent master (512px tall).
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const srcPng = join(root, 'p2shield-logo.png');
const outDir = join(root, 'src', 'icons');
mkdirSync(outDir, { recursive: true });

const dataUrl = 'data:image/png;base64,' + readFileSync(srcPng).toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage();

const result = await page.evaluate(async ({ dataUrl, sizes }) => {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;

  // Is the background already transparent?
  let transparentPx = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 10) transparentPx++;

  const isBg = (p) => d[p + 3] < 10 || (d[p] > 232 && d[p + 1] > 232 && d[p + 2] > 232);
  const outside = new Uint8Array(W * H);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const k = y * W + x;
    if (outside[k] || !isBg(k * 4)) return;
    outside[k] = 1;
    stack.push(k);
  };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (stack.length) {
    const k = stack.pop();
    const x = k % W, y = (k - x) / W;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }

  // Edge band: pixels within 2px of the outside region become black with alpha from luminance.
  const band = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    if (outside[k]) continue;
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && outside[yy * W + xx]) { near = true; break; }
    }
    if (near) band[k] = 1;
  }
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, p = k * 4;
    if (outside[k]) { d[p + 3] = 0; continue; }
    if (band[k]) {
      const lum = Math.min(d[p], d[p + 1], d[p + 2]);
      if (lum < 200) {
        d[p] = d[p + 1] = d[p + 2] = 0;
        d[p + 3] = Math.round(255 * (1 - lum / 255));
      }
    }
    if (d[p + 3] > 20) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  ctx.putImageData(id, 0, 0);

  const cw = maxX - minX + 1, ch = maxY - minY + 1;

  const scaled = (w, h, src, sw, sh, sx = 0, sy = 0) => {
    // Step-down halving for quality.
    let cur = document.createElement('canvas');
    cur.width = sw; cur.height = sh;
    cur.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
    while (cur.width / 2 >= w && cur.height / 2 >= h) {
      const n = document.createElement('canvas');
      n.width = Math.round(cur.width / 2); n.height = Math.round(cur.height / 2);
      const nctx = n.getContext('2d');
      nctx.imageSmoothingQuality = 'high';
      nctx.drawImage(cur, 0, 0, n.width, n.height);
      cur = n;
    }
    const f = document.createElement('canvas');
    f.width = w; f.height = h;
    const fctx = f.getContext('2d');
    fctx.imageSmoothingQuality = 'high';
    fctx.drawImage(cur, 0, 0, w, h);
    return f;
  };

  // Toolbar icons: the logo sits on a dark rounded tile so the silver reads on light and dark
  // toolbars and the thin strokes stay legible at 16px.
  const out = {};
  for (const s of sizes) {
    const inner = Math.round(s * (s <= 32 ? 0.84 : 0.78));
    const scale = inner / Math.max(cw, ch);
    const w = Math.max(1, Math.round(cw * scale)), h = Math.max(1, Math.round(ch * scale));
    const part = scaled(w, h, c, cw, ch, minX, minY);
    const f = document.createElement('canvas');
    f.width = s; f.height = s;
    const fctx = f.getContext('2d');
    const r = s * 0.22;
    const g = fctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#1e293b');
    g.addColorStop(1, '#0b1220');
    fctx.fillStyle = g;
    fctx.beginPath();
    fctx.roundRect(0, 0, s, s, r);
    fctx.fill();
    fctx.drawImage(part, Math.round((s - w) / 2), Math.round((s - h) / 2));
    out['icon' + s] = f.toDataURL('image/png').split(',')[1];
  }
  const master = scaled(Math.round(512 * (cw / ch)), 512, c, cw, ch, minX, minY);
  out.logo = master.toDataURL('image/png').split(',')[1];
  return { out, transparentPx, W, H, cw, ch };
}, { dataUrl, sizes: [16, 32, 48, 128] });

await browser.close();
for (const [name, b64] of Object.entries(result.out)) {
  writeFileSync(join(outDir, name + '.png'), Buffer.from(b64, 'base64'));
}
console.log(`source ${result.W}x${result.H}, pre-transparent px: ${result.transparentPx}, artwork ${result.cw}x${result.ch}`);
console.log('wrote', Object.keys(result.out).join(', '));
