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
    <section id="features" className="w-full py-16 sm:py-24 bg-background relative">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Engineered for Uncompromising Privacy
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Built directly for the hackathon challenge:{" "}
            <span className="text-foreground font-medium">
              "Pre-LLM Privacy Firewall for Sensitive Data Protection"
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                    {feat.icon}
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-border bg-muted/60 text-muted-foreground">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {feat.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-border/40 flex items-center text-xs text-muted-foreground gap-1.5 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                <span>Audited for hackathon requirements</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
