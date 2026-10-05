import { verhoeffValid } from '../src/core/validators';

/** Build a 12-digit Aadhaar-like number with a valid Verhoeff checksum (test data only). */
export function makeAadhaar(prefix11 = '23456789012'): string {
  for (let d = 0; d < 10; d++) {
    const candidate = prefix11 + d;
    if (verhoeffValid(candidate)) return candidate;
  }
  throw new Error('unreachable');
}

/** Build a Luhn-valid number from a prefix (test data only). */
export function makeCard(prefix = '411111111111111'): string {
  for (let d = 0; d < 10; d++) {
    const candidate = prefix + d;
    let sum = 0;
    let alt = false;
    for (let i = candidate.length - 1; i >= 0; i--) {
      let n = candidate.charCodeAt(i) - 48;
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    if (sum % 10 === 0) return candidate;
  }
  throw new Error('unreachable');
}
