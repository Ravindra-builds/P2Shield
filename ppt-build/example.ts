// Runs the exact example prompt shown on slide 2 through the real engine.
import { analyze, getBuiltinProfile } from '../src/core';

const texts = [
  "My name is Rahul Sharma, I'm 27. Phone 98765 43210, Aadhaar 2345 6789 0124, email rahul.sharma@gmail.com. I have Type 2 diabetes. What should I ask my doctor?",
  'Fix my deploy: OPENAI_API_KEY=sk-proj-Ab3dEf9hIjKlMnOpQrStUv12 and DB password Tr0ub4dor&3',
];
for (const text of texts) {
  for (const id of ['healthcare', 'personal', 'enterprise']) {
    const { result } = analyze(text, { profile: getBuiltinProfile(id) });
    console.log(
      JSON.stringify({
        profile: id,
        before: result.riskBefore,
        after: result.riskAfter,
        levelBefore: result.levelBefore,
        levelAfter: result.levelAfter,
        safe: result.safeText,
        findings: result.findings.map((f) => `${f.type}:${f.action}:${f.text}=>${f.replacement}`),
      }),
    );
  }
}
