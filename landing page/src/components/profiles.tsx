import React from "react";
import { User, Stethoscope, Landmark, Building2, Check, ShieldAlert } from "lucide-react";

export const ProfilesSection: React.FC = () => {
  const profiles = [
    {
      name: "Personal",
      icon: <User className="w-5 h-5 text-sky-400" />,
      badge: "Everyday AI Users",
      description: "Optimized for students, hobbyists, and personal chats. Blocks passwords and credentials while keeping natural speech fluent.",
      rules: [
        "Passwords & API tokens: Stripped",
        "Credit cards: Redacted",
        "Personal emails: Generalized",
        "Phone numbers: Tokenized",
        "Names: Preserved or Tokenized",
      ],
    },
    {
      name: "Healthcare",
      icon: <Stethoscope className="w-5 h-5 text-emerald-400" />,
      badge: "HIPAA Compliant",
      description: "Strict sanitization for medical notes, patient histories, drug prescriptions, and diagnostic logs.",
      rules: [
        "Medical record numbers (MRN): Redacted",
        "Patient names: Tokenized [PATIENT_N]",
        "Diagnosis & Rx: Masked or tokenized",
        "Hospital & dates: Generalized",
        "Relative contacts: Stripped",
      ],
    },
    {
      name: "Finance",
      icon: <Landmark className="w-5 h-5 text-amber-400" />,
      badge: "PCI-DSS & Banking",
      description: "Guards transaction histories, IBANs, routing numbers, SSNs, and exact balance statements.",
      rules: [
        "Luhn verified credit cards: Tokenized",
        "IBAN & SWIFT: Redacted",
        "Routing & account numbers: Masked",
        "Exact dollar amounts: Rounded/bucketed",
        "Tax IDs (PAN, SSN, NRIC): Redacted",
      ],
    },
    {
      name: "Enterprise",
      icon: <Building2 className="w-5 h-5 text-purple-400" />,
      badge: "Zero-Trust SecOps",
      description: "Maximum paranoia for enterprise employees. Masks internal hosts, employee emails, customer data, and secrets.",
      rules: [
        "All 40+ credential types: Stripped",
        "Internal domain names (*.corp): Redacted",
        "Employee emails & usernames: Tokenized",
        "Cloud ARNs & IPs: Masked",
        "Managed storage policy push: Supported",
      ],
    },
  ];

  return (
    <section id="profiles" className="w-full py-16 sm:py-24 bg-card/20 border-t border-border/40">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Built-in Security Profiles
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Switch policies instantly with a single click. Passwords, API tokens, and private keys are <strong className="text-foreground">always stripped</strong> in every single profile.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {profiles.map((p, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-muted border border-border/40">
                    {p.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary text-foreground">
                    {p.badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{p.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  {p.description}
                </p>

                <div className="space-y-2.5 border-t border-border/40 pt-4">
                  {p.rules.map((rule, rIdx) => (
                    <div key={rIdx} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
