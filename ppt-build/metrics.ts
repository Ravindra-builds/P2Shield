// Collects real numbers from the P2Shield engine for the presentation charts.
// Bundled with esbuild and run with node (see ppt-build/README in the final summary).
import { analyze, getBuiltinProfile } from '../src/core';
import { SAMPLES } from '../src/shared/samples';

const profileFor: Record<string, string> = {
  patient: 'healthcare',
  developer: 'enterprise',
  bank: 'finance',
  memo: 'enterprise',
  config: 'enterprise',
  clean: 'personal',
};

const samples = SAMPLES.map((s) => {
  const profile = getBuiltinProfile(profileFor[s.id] ?? 'personal');
  const { result } = analyze(s.text, { profile });
  return {
    id: s.id,
    title: s.title,
    profile: profile.name,
    findings: result.findings.length,
    applied: result.findings.filter((f) => f.applied).length,
    riskBefore: result.riskBefore,
    riskAfter: result.riskAfter,
    levelBefore: result.levelBefore,
    levelAfter: result.levelAfter,
    types: result.findings.map((f) => `${f.type}:${f.action}`),
  };
});

// Example before/after for the slide visual.
const patient = analyze(SAMPLES[0].text, { profile: getBuiltinProfile('healthcare') }).result;

// Latency vs prompt size (median of several runs, after warm-up).
const base = SAMPLES.filter((s) => s.id !== 'clean').map((s) => s.text).join('\n\n');
const sizes = [1000, 2500, 5000, 10000, 20000, 40000];
const latency = sizes.map((n) => {
  let text = '';
  while (text.length < n) text += base + '\n\n';
  text = text.slice(0, n);
  const profile = getBuiltinProfile('enterprise');
  for (let i = 0; i < 3; i++) analyze(text, { profile });
  const runs: number[] = [];
  for (let i = 0; i < 9; i++) {
    const t0 = performance.now();
    analyze(text, { profile });
    runs.push(performance.now() - t0);
  }
  runs.sort((a, b) => a - b);
  return { chars: n, ms: Math.round(runs[4] * 10) / 10 };
});

console.log(
  JSON.stringify(
    { samples, latency, patient: { safe: patient.safeText, before: patient.riskBefore, after: patient.riskAfter } },
    null,
    2,
  ),
);
