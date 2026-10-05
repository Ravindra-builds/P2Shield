import { detectHeuristics, detectRules } from './detectors';
import { getBuiltinProfile } from './policy';
import { resolveOverlaps } from './resolve';
import { evaluate, type Override } from './sanitize';
import { mergeAi } from './smart';
import type { AiEntity, AnalysisResult, Detection, Profile } from './types';

const MAX_CHARS = 400_000;

/** Rules + heuristics (Basic mode). Deterministic and fast. */
export function detectAll(text: string): Detection[] {
  const t = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
  return resolveOverlaps([...detectRules(t), ...detectHeuristics(t)]);
}

export interface AnalyzeOptions {
  profile?: Profile;
  /** Labels from Smart mode. When present the result is reported as mode "smart". */
  ai?: AiEntity[];
  overrides?: Record<string, Override>;
}

export interface Analysis {
  result: AnalysisResult;
  /** Final detections (for re-evaluating with user overrides without re-detecting). */
  detections: Detection[];
}

export function analyze(text: string, opts: AnalyzeOptions = {}): Analysis {
  const profile = opts.profile ?? getBuiltinProfile('personal');
  let detections = detectAll(text);
  if (opts.ai) detections = resolveOverlaps(mergeAi(text, detections, opts.ai));
  const result = evaluate(text, detections, profile, opts.ai ? 'smart' : 'basic', opts.overrides);
  return { result, detections };
}

/** Quick count used by the live badge. */
export function quickScan(text: string, profile: Profile) {
  const slice = text.length > 20_000 ? text.slice(0, 20_000) : text;
  const { result } = analyze(slice, { profile });
  const applied = result.findings.filter((f) => f.applied).length;
  return { applied, total: result.findings.length, risk: result.riskBefore, level: result.levelBefore };
}

export { evaluate };
export type { Override };
