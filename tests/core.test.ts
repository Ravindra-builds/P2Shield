import { describe, expect, it } from 'vitest';
import { analyze, detectAll } from '../src/core/engine';
import { getBuiltinProfile, BUILTIN_PROFILES, normalizeProfile } from '../src/core/policy';
import { aadhaarValid, ibanValid, luhnValid, shannonEntropy, verhoeffValid } from '../src/core/validators';
import { computeRisk, riskLevel } from '../src/core/risk';
import { resolveOverlaps } from '../src/core/resolve';
import { approxAmount } from '../src/core/sanitize';
import { makeAadhaar, makeCard } from './helpers';
import type { Detection, EntityType } from '../src/core/types';

const types = (text: string): EntityType[] => detectAll(text).map((d) => d.type);
const has = (text: string, t: EntityType) => types(text).includes(t);

describe('validators', () => {
  it('luhn', () => {
    expect(luhnValid('4111111111111111')).toBe(true);
    expect(luhnValid('4111111111111112')).toBe(false);
    expect(luhnValid('123')).toBe(false);
  });
  it('verhoeff / aadhaar', () => {
    const a = makeAadhaar();
    expect(verhoeffValid(a)).toBe(true);
    expect(aadhaarValid(a)).toBe(true);
    expect(aadhaarValid('123456789012')).toBe(false); // starts with 1
    expect(verhoeffValid(a.slice(0, 11) + ((Number(a[11]) + 1) % 10))).toBe(false);
  });
  it('iban', () => {
    expect(ibanValid('GB82 WEST 1234 5698 7654 32')).toBe(true);
    expect(ibanValid('GB82 WEST 1234 5698 7654 33')).toBe(false);
  });
  it('entropy', () => {
    expect(shannonEntropy('aaaaaaaa')).toBe(0);
    expect(shannonEntropy('aB3xK9pQ7mZ2vL5n')).toBeGreaterThan(3.5);
  });
});

describe('rule detectors: positives', () => {
  it('email', () => expect(has('mail me at rahul.sharma@gmail.com please', 'EMAIL')).toBe(true));
  it('indian phone', () => {
    expect(has('call me on 9876543210', 'PHONE')).toBe(true);
    expect(has('phone: +91 98765 43210', 'PHONE')).toBe(true);
  });
  it('international phone', () => expect(has('reach me at +44 20 7946 0958', 'PHONE')).toBe(true));
  it('credit card with luhn', () => {
    const c = makeCard();
    expect(has(`my card is ${c}`, 'CREDIT_CARD')).toBe(true);
    const spaced = c.replace(/(\d{4})(?=\d)/g, '$1 ');
    expect(has(`card ${spaced}`, 'CREDIT_CARD')).toBe(true);
  });
  it('aadhaar with checksum', () => {
    const a = makeAadhaar();
    const spaced = `${a.slice(0, 4)} ${a.slice(4, 8)} ${a.slice(8)}`;
    expect(has(`id ${spaced}`, 'AADHAAR')).toBe(true);
  });
  it('aadhaar with cue but invalid checksum', () => {
    expect(has('my aadhaar number is 2345 6789 0123', 'AADHAAR')).toBe(true);
  });
  it('pan', () => expect(has('PAN: ABCPE1234F', 'PAN')).toBe(true));
  it('ifsc', () => expect(has('IFSC SBIN0001234', 'IFSC')).toBe(true));
  it('bank account needs cue', () => {
    expect(has('account number 123456789012', 'BANK_ACCOUNT')).toBe(true);
    expect(has('a/c no: 00112233445566', 'BANK_ACCOUNT')).toBe(true);
  });
  it('iban', () => expect(has('send to GB82 WEST 1234 5698 7654 32', 'IBAN')).toBe(true));
  it('upi', () => expect(has('pay rahul@okaxis now', 'UPI_ID')).toBe(true));
  it('passport', () => expect(has('passport no: K1234567', 'PASSPORT')).toBe(true));
  it('ip', () => expect(has('server at 192.168.10.45', 'IP_ADDRESS')).toBe(true));
  it('dob', () => expect(has('DOB: 12/05/1998', 'DATE_OF_BIRTH')).toBe(true));
  it('age', () => {
    expect(has('a 27-year-old patient', 'AGE')).toBe(true);
    expect(has('age: 34', 'AGE')).toBe(true);
  });
  it('employee id', () => {
    expect(has('my employee ID is 48291', 'EMPLOYEE_ID')).toBe(true);
    expect(has('ticket from EMP-20391', 'EMPLOYEE_ID')).toBe(true);
  });
});

describe('rule detectors: negatives', () => {
  it('ordinary numbers are not cards/aadhaar/phones', () => {
    expect(has('I bought 12345 apples and 67890 pears', 'CREDIT_CARD')).toBe(false);
    expect(has('order number 123456', 'PHONE')).toBe(false);
    expect(has('the year is 2024 and the total is 100', 'AADHAAR')).toBe(false);
  });
  it('a plain 12-digit number without cue or checksum is not Aadhaar', () => {
    expect(has('value 234567890123', 'AADHAAR') && !aadhaarValid('234567890123')).toBe(false);
  });
  it('luhn-invalid 16 digits without cue is not a card', () => {
    expect(has('tracking 1234567812345678', 'CREDIT_CARD')).toBe(false);
  });
  it('bank account needs the cue word', () => {
    expect(has('reference 123456789012', 'BANK_ACCOUNT')).toBe(false);
  });
  it('plain text has no detections', () => {
    expect(detectAll('Please explain how photosynthesis works in simple terms.')).toHaveLength(0);
  });
  it('version numbers are not IPs', () => {
    expect(has('upgrade to version 1.2.3.4.5', 'IP_ADDRESS')).toBe(false);
  });
});

describe('credentials', () => {
  const samples: Array<[string, string]> = [
    ['OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwx123456', 'API_KEY'],
    ['key sk-ant-api03-abcdefghijklmnopqrstuvwxyz', 'API_KEY'],
    ['AWS id AKIAIOSFODNN7EXAMPLE', 'API_KEY'],
    ['token ghp_abcdefghijklmnopqrstuvwxyz0123456789', 'API_KEY'],
    ['slack xoxb-1234567890-abcdefghij', 'API_KEY'],
    ['key AIzaSyA1234567890abcdefghijklmnopqrstuv', 'API_KEY'],
    ['stripe sk_live_abcdefghijklmnop1234', 'API_KEY'],
    ['jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcDEF123_-xyz', 'JWT'],
    ['-----BEGIN RSA PRIVATE KEY-----\nMIIEabc\n-----END RSA PRIVATE KEY-----', 'PRIVATE_KEY'],
    ['password: Hunter2!', 'PASSWORD'],
    ['my password is Tr0ub4dor', 'PASSWORD'],
    ['AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', 'SECRET'],
    ['curl -H "Authorization: Bearer abcdefghijklmnop1234567890"', 'SECRET'],
    ['postgres://admin:s3cretPass@db.example.com/app', 'CREDENTIAL_URL'],
    ['https://api.example.com/v1?api_key=abcd1234efgh5678', 'SECRET'],
    ['my pin is 4821', 'PASSWORD'],
  ];
  for (const [text, type] of samples) {
    it(`detects ${type} in: ${text.slice(0, 40)}`, () => {
      expect(has(text, type as EntityType)).toBe(true);
    });
  }
  it('does not treat talk about passwords as a password', () => {
    expect(has('the password is required for login', 'PASSWORD')).toBe(false);
    expect(has('how do I reset my password', 'PASSWORD')).toBe(false);
  });
  it('placeholders are ignored', () => {
    expect(has('API_KEY=your-key-here', 'SECRET')).toBe(false);
    expect(has('token=xxxxxxxxxxxx', 'SECRET')).toBe(false);
  });
  it('git sha and uuid are not secrets', () => {
    expect(has('commit 3f786850e387550fdab836ed7e6dc881de23001b', 'SECRET')).toBe(false);
    expect(has('id 550e8400-e29b-41d4-a716-446655440000', 'SECRET')).toBe(false);
  });
});

describe('heuristics', () => {
  it('person via cue phrase', () => {
    const d = detectAll('My name is Rahul Sharma and I need help').find((x) => x.type === 'PERSON');
    expect(d?.text).toBe('Rahul Sharma');
  });
  it('person after title keeps the title', () => {
    const r = analyze('Please ask Dr. Anil Kumar about this').result;
    expect(r.safeText).toContain('Dr. [PERSON_');
    expect(r.safeText).not.toContain('Anil');
  });
  it('does not flag ordinary capitalised words', () => {
    expect(has('I am Happy and the Sun is bright. Monday is fine.', 'PERSON')).toBe(false);
  });
  it('medical conditions and medication with dosage', () => {
    const r = detectAll('I have type 2 diabetes and take Metformin 500mg daily');
    const med = r.filter((d) => d.type === 'MEDICAL').map((d) => d.text.toLowerCase());
    expect(med).toContain('type 2 diabetes');
    expect(med).toContain('metformin 500mg');
  });
  it('financial amounts need a money cue', () => {
    expect(has('my salary is ₹12,50,000 per year', 'FINANCIAL')).toBe(true);
    expect(has('The box costs 5 cm', 'FINANCIAL')).toBe(false);
  });
  it('confidential markers, projects and hosts', () => {
    const labels = detectAll('CONFIDENTIAL: Project Phoenix runs on build01.corp').map((d) => d.label);
    expect(labels).toContain('CONFIDENTIAL_MARKER');
    expect(labels).toContain('PROJECT');
    expect(labels).toContain('INTERNAL_HOST');
  });
  it('organizations and cities', () => {
    const r = detectAll('I am a patient at ABC Hospital in Jamshedpur');
    expect(r.some((d) => d.type === 'ORGANIZATION' && d.text === 'ABC Hospital')).toBe(true);
    expect(r.some((d) => d.type === 'LOCATION' && d.text === 'Jamshedpur')).toBe(true);
  });
});

describe('overlap resolution', () => {
  const d = (start: number, end: number, confidence: number, type: EntityType = 'PERSON'): Detection => ({
    id: `${type}:${start}-${end}`, type, category: 'IDENTITY', start, end, text: 'x'.repeat(end - start),
    confidence, source: 'rule', reason: '',
  });
  it('higher confidence wins and result is sorted', () => {
    const out = resolveOverlaps([d(0, 10, 0.5), d(5, 15, 0.9), d(20, 30, 0.4)]);
    expect(out.map((x) => [x.start, x.end])).toEqual([[5, 15], [20, 30]]);
  });
  it('a card is not also reported as aadhaar', () => {
    const c = makeCard('411111111111111');
    const spaced = c.replace(/(\d{4})(?=\d)/g, '$1 ');
    const t = detectAll(`card ${spaced}`).map((x) => x.type);
    expect(t).toContain('CREDIT_CARD');
    expect(t).not.toContain('AADHAAR');
  });
  it('an email is not also reported as a UPI id', () => {
    const t = types('mail a@gmail.com');
    expect(t).toContain('EMAIL');
    expect(t).not.toContain('UPI_ID');
  });
});

describe('tokenization', () => {
  it('same value gets the same token and different values differ', () => {
    const r = analyze('My name is Rahul Sharma. Email a@x.com. Later Rahul Sharma wrote to b@y.com and a@x.com.', {
      profile: getBuiltinProfile('enterprise'),
    }).result;
    expect(r.safeText.match(/\[PERSON_1\]/g)?.length).toBeGreaterThanOrEqual(2);
    expect(r.safeText).toContain('[EMAIL_1]');
    expect(r.safeText).toContain('[EMAIL_2]');
    expect(r.safeText.match(/\[EMAIL_1\]/g)).toHaveLength(2);
    expect(r.tokenMap['[EMAIL_1]']).toBe('a@x.com');
  });
  it('a bare first name reuses the full-name token', () => {
    const r = analyze('My name is Rahul Sharma. Rahul also likes tea.').result;
    expect(r.safeText).toBe('My name is [PERSON_1]. [PERSON_1] also likes tea.');
  });
});

describe('policy', () => {
  const prompt =
    "I'm a patient at ABC Hospital in Jamshedpur. My name is Rahul Sharma, I'm 27, phone 9876543210, " +
    'my doctor said I have diabetes. My OpenAI key is sk-proj-abcdefghijklmnopqrstuvwx123456. ' +
    'What should I ask my doctor?';

  it('credentials are removed in every built-in profile', () => {
    for (const p of BUILTIN_PROFILES) {
      const r = analyze(prompt, { profile: p }).result;
      expect(r.safeText, p.id).not.toContain('sk-proj');
      expect(r.safeText, p.id).toContain('[SECRET_REMOVED]');
    }
  });
  it('a custom profile cannot keep credentials', () => {
    const custom = normalizeProfile({
      id: 'x', name: 'x', threshold: 0.1,
      rules: { API_KEY: { action: 'KEEP' }, PASSWORD: { action: 'MASK' } },
    })!;
    expect(custom.rules.API_KEY.action).toBe('REMOVE_SECRET');
    expect(custom.rules.PASSWORD.action).toBe('REMOVE_SECRET');
    const r = analyze('password: Hunter2! key sk-abcdefghijkl1234', { profile: custom }).result;
    expect(r.safeText).not.toContain('Hunter2');
    expect(r.safeText).not.toContain('sk-abcdefghijkl1234');
  });
  it('profiles give different safe output for the same input', () => {
    const outs = BUILTIN_PROFILES.map((p) => analyze(prompt, { profile: p }).result.safeText);
    expect(new Set(outs).size).toBe(BUILTIN_PROFILES.length);
  });
  it('healthcare keeps the medical fact, removes identity', () => {
    const r = analyze(prompt, { profile: getBuiltinProfile('healthcare') }).result;
    expect(r.safeText).toContain('diabetes');
    expect(r.safeText).not.toContain('Rahul');
    expect(r.safeText).not.toContain('9876543210');
    expect(r.safeText).toContain('20-30');
    expect(r.safeText).toContain('Jharkhand');
  });
  it('personal masks the phone and tokenizes the name', () => {
    const r = analyze(prompt, { profile: getBuiltinProfile('personal') }).result;
    expect(r.safeText).toContain('98******10');
    expect(r.safeText).toContain('[PERSON_1]');
  });
  it('finance generalizes amounts and masks accounts/cards', () => {
    const card = makeCard();
    const t = `My salary is ₹12,50,000. Account number 123456789012. Card ${card}.`;
    const r = analyze(t, { profile: getBuiltinProfile('finance') }).result;
    expect(r.safeText).toContain('approx. ₹13 lakh');
    expect(r.safeText).toContain('********9012');
    expect(r.safeText).toContain('1111'.slice(0, 0) + card.slice(-4));
    expect(r.safeText).not.toContain(card);
  });
  it('threshold: low-confidence detections are reported but kept', () => {
    const r = analyze('I live in Zorbia now').result; // unknown place after cue -> 0.45 < 0.5
    const f = r.findings.find((x) => x.type === 'LOCATION');
    expect(f).toBeTruthy();
    expect(f!.applied).toBe(false);
    expect(r.safeText).toBe('I live in Zorbia now');
  });
  it('user overrides can keep or protect non-credential findings but never keep secrets', () => {
    const base = analyze('Email a@x.com and key sk-abcdefghijkl1234');
    const email = base.result.findings.find((f) => f.type === 'EMAIL')!;
    const key = base.result.findings.find((f) => f.type === 'API_KEY')!;
    const kept = analyze('Email a@x.com and key sk-abcdefghijkl1234', {
      overrides: { [email.id]: 'KEEP', [key.id]: 'KEEP' },
    }).result;
    expect(kept.safeText).toContain('a@x.com');
    expect(kept.safeText).not.toContain('sk-abc');
  });
  it('keepIfNeeded keeps labelled context (finance medical)', () => {
    const text = 'My name is Rahul Sharma and I have diabetes. What should I ask my doctor?';
    const profile = getBuiltinProfile('finance');
    const withoutAi = analyze(text, { profile }).result.safeText;
    expect(withoutAi).toContain('[MEDICAL_CONDITION_1]');
    const withAi = analyze(text, { profile, ai: [{ text: 'diabetes', type: 'MEDICAL', neededForTask: true }] }).result;
    expect(withAi.safeText).toContain('diabetes');
    expect(withAi.mode).toBe('smart');
  });
});

describe('generalization helpers', () => {
  it('approxAmount', () => {
    expect(approxAmount('₹12,50,000')).toBe('approx. ₹13 lakh');
    expect(approxAmount('Rs 4.2 crore')).toBe('approx. ₹4.2 crore');
    expect(approxAmount('$50k')).toBe('approx. $50K');
    expect(approxAmount('$2.5 million')).toBe('approx. $2.5M');
  });
});

describe('risk', () => {
  it('levels', () => {
    expect(riskLevel(0)).toBe('Low');
    expect(riskLevel(30)).toBe('Low');
    expect(riskLevel(31)).toBe('Medium');
    expect(riskLevel(61)).toBe('High');
    expect(riskLevel(81)).toBe('Critical');
  });
  it('a single secret is critical and nothing is low', () => {
    expect(computeRisk([{ type: 'API_KEY', text: 'k', confidence: 0.97, residual: 1 }])).toBeGreaterThan(80);
    expect(computeRisk([])).toBe(0);
  });
  it('identity + medical costs more than either alone (context factor)', () => {
    const name = { type: 'PERSON' as const, text: 'a', confidence: 0.9, residual: 1 };
    const phone = { type: 'PHONE' as const, text: 'p', confidence: 0.95, residual: 1 };
    const med = { type: 'MEDICAL' as const, text: 'd', confidence: 0.82, residual: 1 };
    expect(computeRisk([name, phone, med])).toBeGreaterThan(computeRisk([name, phone]));
    expect(computeRisk([name, phone, med])).toBeGreaterThan(computeRisk([med]));
  });
  it('repeated identical values are counted once', () => {
    const one = computeRisk([{ type: 'PERSON', text: 'Rahul', confidence: 0.9, residual: 1 }]);
    const many = computeRisk(Array(5).fill({ type: 'PERSON', text: 'Rahul', confidence: 0.9, residual: 1 }));
    expect(many).toBe(one);
  });
  it('residual risk after sanitization is lower than before', () => {
    const r = analyze(
      "My name is Rahul Sharma, phone 9876543210, aadhaar number 2345 6789 0123, I have diabetes. key sk-abcdefghijkl1234",
    ).result;
    expect(r.riskBefore).toBeGreaterThan(80);
    expect(r.riskAfter).toBeLessThan(r.riskBefore);
  });
});

describe('sanitizer invariants', () => {
  it('safe text contains none of the raw sensitive values', () => {
    const a = makeAadhaar();
    const card = makeCard();
    const raw = ['rahul.sharma@gmail.com', '9876543210', a, card, 'sk-abcdefghijkl1234567890', 'Hunter2!'];
    const text =
      `email ${raw[0]} phone ${raw[1]} aadhaar ${a} card ${card} key ${raw[4]} password: ${raw[5]}`;
    for (const p of BUILTIN_PROFILES) {
      const safe = analyze(text, { profile: p }).result.safeText;
      for (const v of raw) expect(safe, `${p.id}:${v}`).not.toContain(v);
    }
  });
  it('text without findings is returned unchanged', () => {
    const t = 'Explain the difference between TCP and UDP.\nKeep it short.';
    expect(analyze(t).result.safeText).toBe(t);
  });
  it('handles empty and large input', () => {
    expect(analyze('').result.safeText).toBe('');
    const big = 'hello world. '.repeat(20000);
    expect(analyze(big).result.safeText.length).toBeGreaterThan(0);
  });
});
