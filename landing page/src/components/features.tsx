import React from "react";
import {
  ShieldCheck,
  Cpu,
  Lock,
  FileCode2,
  Sliders,
  Scale,
  Database,
  Globe2,
  CheckCircle,
} from "lucide-react";

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <Lock className="w-6 h-6 text-primary" />,
      title: "100% Client-Side Airgap",
      badge: "Zero Network Egress",
      description:
        "The extension operates strictly within Chrome. No proxies, no external AI calls, no analytics. Raw prompts never touch a wire.",
    },
    {
      icon: <FileCode2 className="w-6 h-6 text-sky-400" />,
      title: "40+ Secret & Token Formats",
      badge: "Always Stripped",
      description:
        "Pre-trained detectors for AWS, GitHub, Stripe, OpenAI, SSH keys, Bearer tokens, DB connection strings, and webhook endpoints.",
    },
    {
      icon: <Cpu className="w-6 h-6 text-emerald-400" />,
      title: "Cryptographic Checksums",
      badge: "Zero False Positives",
      description:
        "Validates numbers with Luhn (Cards), Verhoeff (Aadhaar), IBAN mod-97, ABA routing, US SSN structure, UK NHS, and Canadian SIN.",
    },
    {
      icon: <Database className="w-6 h-6 text-purple-400" />,
      title: "Deep Structure Awareness",
      badge: "Syntax Intelligent",
      description:
        "Understands JSON, YAML, .env, INI, HTTP headers, CLI flags, SQL queries, and Markdown tables by analyzing both key and value context.",
    },
    {
      icon: <Sliders className="w-6 h-6 text-amber-400" />,
      title: "Configurable Policies",
      badge: "4 Built-in Profiles",
      description:
        "Select from Personal, Healthcare, Finance, and Enterprise. Customize individual rules or deploy organization-wide via Chrome managed storage.",
    },
    {
      icon: <Scale className="w-6 h-6 text-rose-400" />,
      title: "Reversible Tokenization",
      badge: "Granular Control",
      description:
        "Per-item actions: keep, mask, tokenize ([PERSON_1]), redact ([REDACTED_PHONE]), or generalize (ages to ranges, exact salaries to buckets).",
    },
  ];

  return (
    <section id="features" className="w-full py-16 sm:py-20 bg-white border-t border-slate-200/80 relative">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            Core Capabilities
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Engineered for Uncompromising Privacy
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            A comprehensive, client-side defense pipeline designed specifically for sensitive prompt protection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 hover:border-sky-300 hover:shadow-xs group"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-700 border border-sky-100 group-hover:bg-sky-100 transition-colors">
                    {feat.icon}
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-sky-700 transition-colors">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center text-xs text-slate-500 gap-1.5 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-sky-600" />
                <span>Audited for hackathon requirements</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
