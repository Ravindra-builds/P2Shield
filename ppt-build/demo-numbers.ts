// Prints what the shield will report for each demo-page sample, per profile,
// so the presentation script can quote the exact numbers seen on screen.
import { analyze, getBuiltinProfile } from '../src/core';

const DEMO = [
  ['Patient', "I'm a patient at ABC Hospital in Jamshedpur. My name is Rahul Sharma, I'm 27, my phone is 98765 43210 and my Aadhaar number is 2345 6789 0124. My doctor Dr. Anil Kumar said I have Type 2 diabetes and I take Metformin 500mg. You can email me at rahul.sharma@gmail.com. What questions should I ask my doctor at my next appointment?"],
  ['Developer', 'Deploy this app for me.\nOPENAI_API_KEY=sk-proj-Ab3dEf9hIjKlMnOpQrStUv12\nAWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nThe database password: Tr0ub4dor&3\nWhy does the build fail?'],
  ['Bank', "I'm Priya Verma, account number 123456789012, IFSC HDFC0001234, PAN ABCPE1234F, and my credit card is 4111 1111 1111 1111. My salary is ₹12,50,000 per year. Help me understand my tax calculation."],
  ['Memo', 'CONFIDENTIAL - internal use only.\nProject Phoenix Q3 revenue is $4.2 million. Employee ID: 48291 (Neha Gupta) reports to Mr. Vikram Singh.\nThe staging server is build01.corp at 10.2.3.4. Summarize the risks for the board.'],
  ['Clean', 'Explain the difference between TCP and UDP in simple terms, with one example each.'],
] as const;

// Playground "Credentials" chip uses the longer sample from src/shared/samples.ts.
import { SAMPLES } from '../src/shared/samples';
for (const s of SAMPLES) {
  const { result } = analyze(s.text, { profile: getBuiltinProfile('personal') });
  console.log(`PLAYGROUND ${s.id} | personal | ${result.findings.filter((f) => f.applied).length}/${result.findings.length} | ${result.riskBefore} -> ${result.riskAfter} (${result.levelBefore} -> ${result.levelAfter})`);
}

for (const [name, text] of DEMO) {
  for (const id of ['personal', 'healthcare', 'finance', 'enterprise']) {
    const { result } = analyze(text, { profile: getBuiltinProfile(id) });
    const applied = result.findings.filter((f) => f.applied).length;
    console.log(
      `${name} | ${id} | protected ${applied}/${result.findings.length} | risk ${result.riskBefore} -> ${result.riskAfter} (${result.levelAfter})`,
    );
    if (id === 'personal' || (name === 'Patient' && id === 'healthcare') || (name === 'Bank' && id === 'finance')) {
      console.log('   SAFE: ' + result.safeText.replace(/\n/g, ' / '));
    }
  }
}
