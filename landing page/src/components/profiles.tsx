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
    <section id="profiles" className="w-full py-16 sm:py-20 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-400 text-xs font-semibold mb-3">
            <Building2 className="w-3.5 h-3.5" />
            Compliance Profiles
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Built-in Security Profiles
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Switch policies instantly with a single click. Passwords, API tokens, and private keys are <strong className="text-slate-900 dark:text-white">always stripped</strong> in every single profile.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {profiles.map((p, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-700 transition-all hover:shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50">
                    {p.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {p.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{p.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  {p.description}
                </p>

                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3.5">
                  {p.rules.map((rule, rIdx) => (
                    <div key={rIdx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
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
