import React, { useState } from "react";
import { Shield, ShieldAlert, ShieldCheck, RefreshCw, Copy, Check, Sparkles, AlertTriangle, Eye, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Preset {
  name: string;
  category: string;
  originalText: string;
  sanitizedText: string;
  initialRisk: number;
  finalRisk: number;
  detectedCount: number;
  detectedItems: { type: string; original: string; replacement: string; severity: "critical" | "high" | "medium" }[];
}

const PRESETS: Preset[] = [
  {
    name: "Developer Secrets",
    category: "DevOps & Cloud",
    originalText: `Hey chatbot, debug this AWS deployment error:
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
const dbUri = "postgresql://postgres:SuperSecretP@ssw0rd123!@db.internal.acme.corp:5432/production_customers";
And notify my webhook https://discord.com/api/webhooks/123456789/abcdefgh-token`,
    sanitizedText: `Hey chatbot, debug this AWS deployment error:
export AWS_ACCESS_KEY_ID=[REDACTED_AWS_KEY]
export AWS_SECRET_ACCESS_KEY=[REDACTED_AWS_SECRET]
const dbUri = "postgresql://postgres:[REDACTED_PASSWORD]@[INTERNAL_HOST]:5432/production_customers";
And notify my webhook [REDACTED_WEBHOOK_URL]`,
    initialRisk: 98,
    finalRisk: 8,
    detectedCount: 4,
    detectedItems: [
      { type: "AWS Access Key", original: "AKIAIOSFODNN7EXAMPLE", replacement: "[REDACTED_AWS_KEY]", severity: "critical" },
      { type: "AWS Secret Key", original: "wJalrXUtnFEMI/...", replacement: "[REDACTED_AWS_SECRET]", severity: "critical" },
      { type: "DB Password", original: "SuperSecretP@ssw0rd123!", replacement: "[REDACTED_PASSWORD]", severity: "critical" },
      { type: "Internal Host", original: "db.internal.acme.corp", replacement: "[INTERNAL_HOST]", severity: "high" },
    ],
  },
  {
    name: "Customer PII & Banking",
    category: "Finance & Retail",
    originalText: `Customer request: Please summarize credit card dispute for Johnathan Miller (SSN: 078-05-1120). 
Card number is 4532 0150 1289 4921, CVV 892, exp 08/29.
His phone is +1 (555) 234-8901 and email is j.miller@globalfintech.com.
Current balance in account: $48,250.00.`,
    sanitizedText: `Customer request: Please summarize credit card dispute for [PERSON_1] (SSN: [REDACTED_SSN]). 
Card number is [CARD_1_VISA], CVV [REDACTED_CVV], exp [REDACTED_EXP].
His phone is [PHONE_1] and email is [EMAIL_1].
Current balance in account: approx. $50,000.`,
    initialRisk: 94,
    finalRisk: 12,
    detectedCount: 6,
    detectedItems: [
      { type: "Visa Card (Luhn Valid)", original: "4532 0150 1289 4921", replacement: "[CARD_1_VISA]", severity: "critical" },
      { type: "US SSN", original: "078-05-1120", replacement: "[REDACTED_SSN]", severity: "critical" },
      { type: "Full Name", original: "Johnathan Miller", replacement: "[PERSON_1]", severity: "medium" },
      { type: "Email Address", original: "j.miller@globalfintech.com", replacement: "[EMAIL_1]", severity: "medium" },
      { type: "Phone Number", original: "+1 (555) 234-8901", replacement: "[PHONE_1]", severity: "medium" },
      { type: "Financial Amount", original: "$48,250.00", replacement: "approx. $50,000", severity: "medium" },
    ],
  },
  {
    name: "Healthcare & Patient Data",
    category: "HIPAA Compliant",
    originalText: `Patient discharge summary: Sarah Jenkins, 42 years old, MRN: MRN-8930129.
Prescribed 500mg Metformin twice daily for Type 2 Diabetes. 
Emergency contact: Mark Jenkins, +1 (415) 890-4421. 
Admitted to St. Jude Regional Hospital on 12-Oct-2025.`,
    sanitizedText: `Patient discharge summary: [PATIENT_1], 40-50 years old, MRN: [REDACTED_MRN].
Prescribed [REDACTED_MEDICATION] twice daily for [REDACTED_DIAGNOSIS]. 
Emergency contact: [PERSON_2], [PHONE_1]. 
Admitted to [HOSPITAL_FACILITY] on [REDACTED_DATE].`,
    initialRisk: 88,
    finalRisk: 5,
    detectedCount: 6,
    detectedItems: [
      { type: "Patient Name", original: "Sarah Jenkins", replacement: "[PATIENT_1]", severity: "high" },
      { type: "Medical Record Number", original: "MRN-8930129", replacement: "[REDACTED_MRN]", severity: "critical" },
      { type: "Medication & Diagnosis", original: "Metformin / Diabetes", replacement: "[REDACTED_MEDICATION]", severity: "high" },
      { type: "Relative Contact", original: "Mark Jenkins / Phone", replacement: "[PERSON_2] / [PHONE_1]", severity: "medium" },
    ],
  },
];

export const FirewallSimulator: React.FC = () => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [isSanitizing, setIsSanitizing] = useState(false);
  const [isSanitized, setIsSanitized] = useState(true);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedSanitized, setCopiedSanitized] = useState(false);
  const [activeProfile, setActiveProfile] = useState<"Personal" | "Healthcare" | "Finance" | "Enterprise">("Enterprise");

  const activePreset = PRESETS[selectedPresetIndex];

  const handlePresetSelect = (index: number) => {
    setSelectedPresetIndex(index);
    setIsSanitizing(true);
    setTimeout(() => {
      setIsSanitizing(false);
      setIsSanitized(true);
    }, 300);
  };

  const handleToggleSanitize = () => {
    setIsSanitizing(true);
    setTimeout(() => {
      setIsSanitizing(false);
      setIsSanitized(!isSanitized);
    }, 250);
  };

  const copyToClipboard = (text: string, isSanitizedCopy: boolean) => {
    navigator.clipboard.writeText(text);
    if (isSanitizedCopy) {
      setCopiedSanitized(true);
      setTimeout(() => setCopiedSanitized(false), 2000);
    } else {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    }
  };

  const riskColor = (score: number) => {
    if (score >= 80) return "text-rose-500 bg-rose-500/10 border-rose-500/30";
    if (score >= 50) return "text-amber-500 bg-amber-500/10 border-amber-500/30";
    if (score >= 20) return "text-sky-500 bg-sky-500/10 border-sky-500/30";
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  };

  return (
    <section id="simulator" className="w-full py-16 sm:py-24 bg-card/40 border-y border-border/40 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Interactive Playground
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Test Prompt Firewall Live
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">
            Experience how the on-device engine intercepts confidential tokens, credentials, and PII before they ever reach an LLM endpoint.
          </p>
        </div>

        {/* Preset selector buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
          {PRESETS.map((preset, idx) => (
            <button
              key={preset.name}
              onClick={() => handlePresetSelect(idx)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                selectedPresetIndex === idx
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {preset.name}
              <span className="ml-2 text-[10px] opacity-75 hidden sm:inline">({preset.category})</span>
            </button>
          ))}
        </div>

        {/* Profile and action toolbar */}
        <div className="max-w-5xl mx-auto mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border/60 p-3 sm:p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Active Profile:</span>
            <div className="flex gap-1.5">
              {(["Enterprise", "Finance", "Healthcare", "Personal"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setActiveProfile(p)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeProfile === p
                      ? "bg-secondary text-primary border border-primary/30 font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Shield Status:</span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Active Protection
              </span>
            </div>

            <Button
              size="sm"
              variant={isSanitized ? "secondary" : "default"}
              onClick={handleToggleSanitize}
              className="gap-1.5 text-xs h-8"
              disabled={isSanitizing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSanitizing ? "animate-spin" : ""}`} />
              {isSanitized ? "View Raw Prompt" : "Click Shield to Clean"}
            </Button>
          </div>
        </div>

        {/* Dual Sandbox View */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input / Raw text */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-5 relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-sm font-semibold text-foreground">Original Unprotected Prompt</span>
              </div>
              <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${riskColor(activePreset.initialRisk)}`}>
                Risk {activePreset.initialRisk}/100 Critical
              </div>
            </div>

            <div className="relative font-mono text-xs sm:text-sm text-foreground/80 leading-relaxed bg-background/60 p-4 rounded-xl border border-border/40 min-h-[190px] whitespace-pre-wrap select-all">
              {activePreset.originalText}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Contains {activePreset.detectedCount} sensitive findings</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => copyToClipboard(activePreset.originalText, false)}
              >
                {copiedOriginal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedOriginal ? "Copied" : "Copy Raw"}
              </Button>
            </div>
          </div>

          {/* Right: Sanitized / LLM Safe output */}
          <div className="flex flex-col rounded-2xl border border-primary/40 bg-card p-5 relative overflow-hidden shadow-xl shadow-primary/5">
            <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-foreground">Safe Prompt (Sent to LLM)</span>
              </div>
              <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${riskColor(activePreset.finalRisk)}`}>
                Risk {activePreset.finalRisk}/100 Safe
              </div>
            </div>

            <div className="relative font-mono text-xs sm:text-sm text-emerald-300 leading-relaxed bg-background/60 p-4 rounded-xl border border-emerald-500/20 min-h-[190px] whitespace-pre-wrap select-all">
              {isSanitizing ? (
                <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  Running local regex & checksum engine...
                </div>
              ) : isSanitized ? (
                activePreset.sanitizedText
              ) : (
                <span className="text-rose-300">{activePreset.originalText}</span>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-emerald-400 font-medium">✓ Zero network calls made</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => copyToClipboard(activePreset.sanitizedText, true)}
              >
                {copiedSanitized ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSanitized ? "Copied Safe" : "Copy Safe"}
              </Button>
            </div>
          </div>
        </div>

        {/* Findings Inspection Breakdown */}
        <div className="max-w-5xl mx-auto mt-6 bg-card border border-border/60 rounded-xl p-4 sm:p-5">
          <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-primary" />
            Detected Items & Local Transformations ({activePreset.detectedItems.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activePreset.detectedItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-background/60 border border-border/40 text-xs"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      item.severity === "critical"
                        ? "bg-rose-500"
                        : item.severity === "high"
                        ? "bg-amber-500"
                        : "bg-sky-400"
                    }`}
                  />
                  <span className="font-semibold text-foreground truncate">{item.type}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] flex-shrink-0">
                  <span className="text-muted-foreground line-through max-w-[90px] truncate">{item.original}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-primary font-medium">{item.replacement}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
