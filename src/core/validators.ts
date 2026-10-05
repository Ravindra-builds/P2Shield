// Checksum and entropy helpers used by the deterministic detectors.

/** Luhn checksum for payment cards. Input must be digits only. */
export function luhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

// Verhoeff tables (used by Aadhaar).
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/** Verhoeff checksum. Input must be digits only. */
export function verhoeffValid(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let c = 0;
  const rev = digits.split('').reverse();
  for (let i = 0; i < rev.length; i++) {
    c = D[c][P[i % 8][Number(rev[i])]];
  }
  return c === 0;
}

/** Aadhaar: 12 digits, first digit 2-9, valid Verhoeff checksum. */
export function aadhaarValid(digits: string): boolean {
  return /^[2-9]\d{11}$/.test(digits) && verhoeffValid(digits);
}

/** Shannon entropy in bits per character. */
export function shannonEntropy(s: string): number {
  if (!s) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  for (const n of freq.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

/** IBAN mod-97 check. */
export function ibanValid(iban: string): boolean {
  const s = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const v = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + (d.charCodeAt(0) - 48)) % 97;
  }
  return rem === 1;
}

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

/** Luhn over any length (used for Canadian SIN, IMEI ...). */
export function luhnAny(digits: string): boolean {
  if (!/^\d{2,}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** US ABA routing number: 9 digits, valid Federal Reserve prefix, weighted checksum 3-7-1. */
export function abaValid(digits: string): boolean {
  if (!/^\d{9}$/.test(digits)) return false;
  const p = Number(digits.slice(0, 2));
  if (!((p >= 0 && p <= 12) || (p >= 21 && p <= 32) || (p >= 61 && p <= 72) || p === 80)) return false;
  if (/^0{9}$/.test(digits)) return false;
  const d = digits.split('').map(Number);
  const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
}

/** US Social Security Number structure (area not 000/666/9xx, group not 00, serial not 0000). */
export function ssnValid(digits: string): boolean {
  if (!/^\d{9}$/.test(digits)) return false;
  const area = digits.slice(0, 3);
  if (area === '000' || area === '666' || area[0] === '9') return false;
  if (digits.slice(3, 5) === '00' || digits.slice(5) === '0000') return false;
  return !/^(\d)\1{8}$/.test(digits);
}

/** Brazilian CPF check digits. */
export function cpfValid(digits: string): boolean {
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  const d = digits.split('').map(Number);
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += d[i] * (len + 1 - i);
    const check = ((sum * 10) % 11) % 10;
    if (check !== d[len]) return false;
  }
  return true;
}

/** UK NHS number: 10 digits, mod-11 check digit. */
export function nhsValid(digits: string): boolean {
  if (!/^\d{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  const check = 11 - (sum % 11);
  const expected = check === 11 ? 0 : check;
  return expected !== 10 && expected === Number(digits[9]);
}

/** Full or compressed IPv6 address (not the loopback/unspecified address). */
export function ipv6Valid(s: string): boolean {
  if (!/^[0-9A-Fa-f:]+$/.test(s) || s.length < 6) return false;
  const doubles = s.split('::').length - 1;
  if (doubles > 1) return false;
  const groups = s.split(':').filter((g) => g !== '');
  if (groups.some((g) => g.length > 4)) return false;
  if (doubles === 0 && groups.length !== 8) return false;
  if (doubles === 1 && groups.length > 7) return false;
  if (groups.length < 2) return false;
  if (/^(?:0*:)*:?0*1?$/.test(s)) return false;
  // Clock times like 10:30:45 have no hex letters and too few groups to qualify above.
  return true;
}
