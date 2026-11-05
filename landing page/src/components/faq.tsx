import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "How does P2Shield protect my privacy without sending data to servers?",
    answer:
      "100% of detection and sanitization runs entirely inside your local browser memory using fast regex, Luhn, Verhoeff, and mod-97 checksum algorithms. Zero prompt data, telemetry, or analytics are ever sent over the network.",
  },
  {
    question: "Which AI chatbots and websites are supported?",
    answer:
      "P2Shield automatically detects prompt inputs on Google Gemini, ChatGPT, Claude, Grok, Perplexity, Copilot, DeepSeek, Poe, Mistral, and any custom web-based LLM interface using flexible contenteditable and textarea anchoring.",
  },
  {
    question: "What types of sensitive data does P2Shield detect?",
    answer:
      "P2Shield recognizes over 28 sensitive entity types across 4 built-in profiles: API tokens, private keys, passwords, credit card numbers, SSNs, Aadhaar, PAN, IBANs, medical record numbers (MRNs), health diagnoses, phone numbers, emails, and full names.",
  },
  {
    question: "Does sanitizing my prompt break the AI's understanding or response quality?",
    answer:
      "No. P2Shield uses structure-preserving tokenization (e.g. [EMAIL_1], [PERSON_2]) so LLMs retain full context, syntax, and reasoning capabilities without ever seeing your raw private data.",
  },
  {
    question: "Can I review findings or undo sanitization before sending?",
    answer:
      "Yes! The interactive shield badge displays real-time finding counts and risk levels. Clicking it opens a live review panel to inspect findings item-by-item, with an instant Undo option to restore the original prompt anytime.",
  },
  {
    question: "Is P2Shield open source and usable in backend pipelines?",
    answer:
      "Yes, P2Shield is open source under the MIT license. In addition to the Chrome extension, the core sanitization engine is published as a standalone npm package (p2shield) for Node.js, Bun, and Edge backend applications.",
  },
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="w-full py-14 sm:py-20 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-400 text-[11px] font-semibold mb-2.5">
            <HelpCircle className="w-3.5 h-3.5" />
            Questions & Answers
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Everything you need to know about P2Shield's local privacy engine, supported AI platforms, and compliance profiles.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-2.5">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 text-left font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="pr-3 leading-snug">{item.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? "transform rotate-180 text-sky-600 dark:text-sky-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-4.5 text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
