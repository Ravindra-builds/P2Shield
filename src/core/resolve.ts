import type { Detection } from './types';
import { isCredentialType } from './detectors';

const SOURCE_RANK: Record<Detection['source'], number> = { rule: 3, heuristic: 2, ai: 1 };

/**
 * "Container" detections cover free text (an address, an organization, a confidential URL) that can
 * legitimately contain a more specific item. When such a span loses an overlap, the parts it still
 * covers on either side are kept instead of being thrown away.
 */
function isContainer(d: Detection): boolean {
  return (
    d.label === 'ADDRESS' ||
    d.label === 'ENDPOINT' ||
    d.label === 'INTERNAL_HOST' ||
    d.label === 'MEDICAL_CONDITION' ||
    d.label === 'MEDICATION' ||
    d.type === 'ORGANIZATION'
  );
}

function rank(d: Detection): number {
  // Credentials always beat anything they overlap: a secret must never be left partly visible.
  return (isCredentialType(d.type) && d.confidence >= 0.5 ? 1 : 0) * 10 + d.confidence;
}

/**
 * Resolve overlapping detections. Credentials first, then higher confidence; ties go to the longer
 * span, then to rule > heuristic > ai. Non-overlapping detections are all kept, and container spans
 * keep their uncovered pieces. Result is sorted by position.
 */
export function resolveOverlaps(all: Detection[]): Detection[] {
  const sorted = [...all].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (rb !== ra) return rb - ra;
    const la = a.end - a.start;
    const lb = b.end - b.start;
    if (lb !== la) return lb - la;
    return SOURCE_RANK[b.source] - SOURCE_RANK[a.source];
  });
  const accepted: Detection[] = [];
  const queue = [...sorted];
  while (queue.length) {
    const d = queue.shift()!;
    if (d.end <= d.start) continue;
    const clashes = accepted.filter((a) => d.start < a.end && a.start < d.end);
    if (!clashes.length) {
      accepted.push(d);
      continue;
    }
    if (!isContainer(d)) continue;
    // Keep the uncovered pieces of a container span, if they are still meaningful.
    let pieces: Array<[number, number]> = [[d.start, d.end]];
    for (const c of clashes) {
      pieces = pieces.flatMap(([s, e]) => {
        if (c.end <= s || c.start >= e) return [[s, e]] as Array<[number, number]>;
        const out: Array<[number, number]> = [];
        if (c.start > s) out.push([s, c.start]);
        if (c.end < e) out.push([c.end, e]);
        return out;
      });
    }
    for (const [s0, e0] of pieces) {
      const rel0 = s0 - d.start;
      const raw = d.text.slice(rel0, rel0 + (e0 - s0));
      const lead = raw.length - raw.trimStart().length;
      const trimmed = raw.trim().replace(/^[,;:.@/\-\s]+|[,;:.@/\-\s]+$/g, '');
      if (trimmed.length < 3 || (trimmed.match(/[A-Za-z0-9]/g) ?? []).length < 3) continue;
      if (/^[a-z][a-z0-9+.-]*:?$/i.test(trimmed) && /^[a-z][a-z0-9+.-]*:\/\//i.test(d.text)) continue; // only the URL scheme is left
      const s = s0 + lead + raw.trimStart().indexOf(trimmed);
      const e = s + trimmed.length;
      accepted.push({ ...d, id: `${d.type}:${s}-${e}`, start: s, end: e, text: trimmed });
    }
  }
  return accepted.sort((a, b) => a.start - b.start || a.end - b.end);
}
