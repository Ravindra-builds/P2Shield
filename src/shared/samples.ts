// Fictional sample prompts for the playground and the demo page. All values are made up.

export interface Sample {
  id: string;
  title: string;
  text: string;
}

export const SAMPLES: Sample[] = [
  {
    id: 'patient',
    title: 'Patient asking for doctor questions',
    text:
      "I'm a patient at ABC Hospital in Jamshedpur. My name is Rahul Sharma, I'm 27, my phone is 98765 43210 and my Aadhaar number is 2345 6789 0124. " +
      'My doctor Dr. Anil Kumar said I have Type 2 diabetes and I take Metformin 500mg. You can email me at rahul.sharma@gmail.com. ' +
      'What questions should I ask my doctor at my next appointment?',
  },
  {
    id: 'developer',
    title: 'Developer sharing credentials',
    text:
      'Deploy this app for me.\nOPENAI_API_KEY=sk-proj-Ab3dEf9hIjKlMnOpQrStUv12\nAWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\n' +
      'The database password: Tr0ub4dor&3 and the connection string is postgres://admin:s3cretPass@10.0.4.17:5432/app.\n' +
      'Docs are on wiki.corp. Why does the build fail?',
  },
  {
    id: 'bank',
    title: 'Bank customer and salary',
    text:
      "I'm Priya Verma, account number 123456789012, IFSC HDFC0001234, PAN ABCPE1234F, and my credit card is 4111 1111 1111 1111. " +
      'My salary is ₹12,50,000 per year. Help me understand my tax calculation.',
  },
  {
    id: 'memo',
    title: 'Confidential internal memo',
    text:
      'CONFIDENTIAL - internal use only.\nProject Phoenix Q3 revenue is $4.2 million. Employee ID: 48291 (Neha Gupta) reports to Mr. Vikram Singh.\n' +
      'The staging server is build01.corp at 10.2.3.4. Summarize the risks for the board.',
  },
  {
    id: 'clean',
    title: 'Nothing sensitive',
    text: 'Explain the difference between TCP and UDP in simple terms, with one example each.',
  },
];
