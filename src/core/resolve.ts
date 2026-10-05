import type { Detection } from './types';

const SOURCE_RANK: Record<Detection['source'], number> = { rule: 3, heuristic: 2, ai: 1 };

/**
 * Resolve overlapping detections. Higher confidence wins; ties go to the longer span, then to
 * rule > heuristic > ai. Non-overlapping detections are all kept. Result is sorted by position.
 */
export function resolveOverlaps(all: Detection[]): Detection[] {
  const sorted = [...all].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const la = a.end - a.start;
    const lb = b.end - b.start;
    if (lb !== la) return lb - la;
    return SOURCE_RANK[b.source] - SOURCE_RANK[a.source];
  });
  const accepted: Detection[] = [];
  for (const d of sorted) {
    if (d.end <= d.start) continue;
    const clash = accepted.some((a) => d.start < a.end && a.start < d.end);
    if (!clash) accepted.push(d);
  }
  return accepted.sort((a, b) => a.start - b.start || a.end - b.end);
}
