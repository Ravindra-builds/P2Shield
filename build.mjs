// Bundles the extension into ./dist (load that folder with chrome://extensions -> Load unpacked).
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const out = process.env.PF_OUT || 'dist';
const e2e = process.env.PF_E2E === '1';
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/icons`, { recursive: true });

await build({
  entryPoints: {
    content: 'src/content/main.ts',
    background: 'src/background/background.ts',
    options: 'src/options/options.ts',
    offscreen: 'src/offscreen/offscreen.ts',
  },
  outdir: out,
  bundle: true,
  format: 'iife',
  target: 'chrome116',
  minify: false,
  sourcemap: false,
  legalComments: 'none',
  define: { __E2E__: e2e ? 'true' : 'false' },
  logLevel: 'info',
});

cpSync('src/manifest.json', `${out}/manifest.json`);
cpSync('src/managed_schema.json', `${out}/managed_schema.json`);
cpSync('src/options/options.html', `${out}/options.html`);
cpSync('src/options/options.css', `${out}/options.css`);
cpSync('src/offscreen/offscreen.html', `${out}/offscreen.html`);

// ---- Icons: a shield with a check mark, drawn with a tiny supersampling rasteriser ----
const SHIELD = [[12, 2], [4, 5], [4, 11], [5.2, 14.6], [7.4, 17.8], [12, 22], [16.6, 17.8], [18.8, 14.6], [20, 11], [20, 5]];
const CHECK = [[8.5, 12], [10.9, 14.4], [15.5, 9.5]];

function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function distSeg(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const SS = 4;
  const scale = 24 / size;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      let shield = 0, check = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = (x + (sx + 0.5) / SS) * scale;
        const py = (y + (sy + 0.5) / SS) * scale;
        if (inside(SHIELD, px, py)) {
          shield++;
          if (Math.min(distSeg(px, py, CHECK[0], CHECK[1]), distSeg(px, py, CHECK[1], CHECK[2])) <= 1.05) check++;
        }
      }
      const n = SS * SS;
      const a = shield / n;
      const w = check / n;
      const o = 1 + x * 4;
      row[o] = Math.round(67 + (255 - 67) * w);
      row[o + 1] = Math.round(56 + (255 - 56) * w);
      row[o + 2] = Math.round(202 + (255 - 202) * w);
      row[o + 3] = Math.round(255 * a);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
for (const s of [16, 32, 48, 128]) writeFileSync(`${out}/icons/icon${s}.png`, png(s));

console.log(`Extension built in ./${out}`);
