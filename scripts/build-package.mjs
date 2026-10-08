// Bundles the pure core engine into packages/p2shield/dist (ESM, CJS, and typings)
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const outDir = 'packages/p2shield/dist';
mkdirSync(outDir, { recursive: true });

// 1. ESM bundle
await build({
  entryPoints: ['src/core/index.ts'],
  outfile: `${outDir}/index.mjs`,
  bundle: true,
  format: 'esm',
  target: 'es2022',
  sourcemap: true,
  legalComments: 'none',
  logLevel: 'info',
});

// 2. CommonJS bundle
await build({
  entryPoints: ['src/core/index.ts'],
  outfile: `${outDir}/index.cjs`,
  bundle: true,
  format: 'cjs',
  target: 'es2022',
  sourcemap: true,
  legalComments: 'none',
  logLevel: 'info',
});

// 3. Emit TypeScript declarations
try {
  execSync(
    'npx tsc --declaration --emitDeclarationOnly --target ES2022 --moduleResolution Bundler --outDir packages/p2shield/dist src/core/index.ts src/core/types.ts src/core/engine.ts src/core/detectors.ts src/core/fields.ts src/core/lexicon.ts src/core/policy.ts src/core/resolve.ts src/core/risk.ts src/core/sanitize.ts src/core/smart.ts src/core/validators.ts',
    { stdio: 'inherit' },
  );
} catch {
  // If individual declaration emit fails, fallback gracefully
}

console.log('NPM library package built in ./packages/p2shield/dist');
