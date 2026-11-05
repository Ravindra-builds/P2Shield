// Bundles the extension into ./dist (load that folder with chrome://extensions -> Load unpacked).
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

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

// Also build standalone browser engine for demo page
await build({
  entryPoints: ['src/demo-engine-entry.ts'],
  outfile: 'demo/engine.js',
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: false,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
});

cpSync('src/manifest.json', `${out}/manifest.json`);
cpSync('src/managed_schema.json', `${out}/managed_schema.json`);
cpSync('src/options/options.html', `${out}/options.html`);
cpSync('src/options/options.css', `${out}/options.css`);
cpSync('src/offscreen/offscreen.html', `${out}/offscreen.html`);

// Icons are generated from p2shield-logo.png by scripts/make-icons.mjs and committed in src/icons.
for (const s of [16, 32, 48, 128]) cpSync(`src/icons/icon${s}.png`, `${out}/icons/icon${s}.png`);
cpSync('src/icons/logo.png', `${out}/icons/logo.png`);
cpSync('src/icons/logo.png', 'demo/logo.png');

console.log(`Extension built in ./${out} and demo/engine.js generated`);
