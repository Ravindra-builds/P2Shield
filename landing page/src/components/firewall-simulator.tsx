import React, { useState } from "react";
import { ShieldCheck, RefreshCw, Copy, Check, Sparkles, AlertTriangle, Eye, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DetectionItem {
  type: string;
  original: string;
  replacement: string;
  severity: "critical" | "high" | "medium";
}

interface Preset {
  name: string;
  category: string;
  originalText: string;
  sanitizedText: string;
  initialRisk: number;
  finalRisk: number;
  detectedCount: number;
  detectedItems: DetectionItem[];
  highlightOriginal: (highlight: boolean) => React.ReactNode;
  highlightSanitized: () => React.ReactNode;
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
    detectedCount: 5,
    detectedItems: [
      { type: "AWS Access Key", original: "AKIAIOSFODNN7EXAMPLE", replacement: "[REDACTED_AWS_KEY]", severity: "critical" },
      { type: "AWS Secret Key", original: "wJalrXUtnFEMI...", replacement: "[REDACTED_AWS_SECRET]", severity: "critical" },
      { type: "DB Password", original: "SuperSecretP@ssw0rd123!", replacement: "[REDACTED_PASSWORD]", severity: "critical" },
      { type: "Internal Host", original: "db.internal.acme.corp", replacement: "[INTERNAL_HOST]", severity: "high" },
      { type: "Webhook Endpoint", original: "https://discord.com/api/...", replacement: "[REDACTED_WEBHOOK_URL]", severity: "medium" },
    ],
    highlightOriginal: (highlight) => (
      <>
        <span>Hey chatbot, debug this AWS deployment error:</span>{"\n"}
        <span>export AWS_ACCESS_KEY_ID=</span>
        {highlight ? <span className="bg-rose-500/30 text-rose-300 px-1 py-0.5 rounded border border-rose-500/40">AKIAIOSFODNN7EXAMPLE</span> : "AKIAIOSFODNN7EXAMPLE"}{"\n"}
        <span>export AWS_SECRET_ACCESS_KEY=</span>
        {highlight ? <span className="bg-rose-500/30 text-rose-300 px-1 py-0.5 rounded border border-rose-500/40">wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</span> : "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"}{"\n"}
        <span>const dbUri = "postgresql://postgres:</span>
        {highlight ? <span className="bg-rose-500/30 text-rose-300 px-1 py-0.5 rounded border border-rose-500/40">SuperSecretP@ssw0rd123!</span> : "SuperSecretP@ssw0rd123!"}
        <span>@</span>
        {highlight ? <span className="bg-amber-500/30 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40">db.internal.acme.corp</span> : "db.internal.acme.corp"}
        <span>:5432/production_customers";</span>{"\n"}
        <span>And notify my webhook </span>
        {highlight ? <span className="bg-rose-500/30 text-rose-300 px-1 py-0.5 rounded border border-rose-500/40">https://discord.com/api/webhooks/123456789/abcdefgh-token</span> : "https://discord.com/api/webhooks/123456789/abcdefgh-token"}
      </>
    ),
    highlightSanitized: () => (
      <>
        <span>Hey chatbot, debug this AWS deployment error:</span>{"\n"}
        <span>export AWS_ACCESS_KEY_ID=</span>
        <span className="bg-emerald-500/25 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40 font-semibold">[REDACTED_AWS_KEY]</span>{"\n"}
        <span>export AWS_SECRET_ACCESS_KEY=</span>
        <span className="bg-emerald-500/25 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40 font-semibold">[REDACTED_AWS_SECRET]</span>{"\n"}
        <span>const dbUri = "postgresql://postgres:</span>
        <span className="bg-emerald-500/25 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40 font-semibold">[REDACTED_PASSWORD]</span>
        <span>@</span>
        <span className="bg-sky-500/25 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40 font-semibold">[INTERNAL_HOST]</span>
        <span>:5432/production_customers";</span>{"\n"}
        <span>And notify my webhook </span>
        <span className="bg-emerald-500/25 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40 font-semibold">[REDACTED_WEBHOOK_URL]</span>
      </>
    ),
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
    highlightOriginal: (highlight) => (
      <>
        <span>Customer request: Please summarize credit card dispute for </span>
        {highlight ? <span className="bg-sky-500/30 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40">Johnathan Miller</span> : "Johnathan Miller"}
        <span> (SSN: </span>
        {highlight ? <span className="bg-rose-500/30 text-rose-300 px-1 py-0.5 rounded border border-rose-500/40">078-05-1120</span> : "078-05-1120"}
        <span>).</span>{"\n"}
        <span>Card number is </span>
        {highlight ? <span className="bg-rose-500/30 text-rose-300 px-1 py-0.5 rounded border border-rose-500/40">4532 0150 1289 4921</span> : "4532 0150 1289 4921"}
        <span>, CVV </span>
        {highlight ? <span className="bg-rose-500/30 text-rose-300 px-1 py-0.5 rounded border border-rose-500/40">892</span> : "892"}
        <span>, exp </span>
        {highlight ? <span className="bg-amber-500/30 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40">08/29</span> : "08/29"}
        <span>.</span>{"\n"}
        <span>His phone is </span>
        {highlight ? <span className="bg-sky-500/30 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40">+1 (555) 234-8901</span> : "+1 (555) 234-8901"}
        <span> and email is </span>
        {highlight ? <span className="bg-sky-500/30 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40">j.miller@globalfintech.com</span> : "j.miller@globalfintech.com"}
        <span>.</span>{"\n"}
        <span>Current balance in account: </span>
        {highlight ? <span className="bg-amber-500/30 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40">$48,250.00</span> : "$48,250.00"}
        <span>.</span>
      </>
    ),
    highlightSanitized: () => (
      <>
        <span>Customer request: Please summarize credit card dispute for </span>
        <span className="bg-sky-500/25 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40 font-semibold">[PERSON_1]</span>
        <span> (SSN: </span>
        <span className="bg-emerald-500/25 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40 font-semibold">[REDACTED_SSN]</span>
        <span>).</span>{"\n"}
        <span>Card number is </span>
        <span className="bg-emerald-500/25 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40 font-semibold">[CARD_1_VISA]</span>
        <span>, CVV </span>
        <span className="bg-emerald-500/25 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40 font-semibold">[REDACTED_CVV]</span>
        <span>, exp </span>
        <span className="bg-emerald-500/25 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40 font-semibold">[REDACTED_EXP]</span>
        <span>.</span>{"\n"}
        <span>His phone is </span>
        <span className="bg-sky-500/25 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40 font-semibold">[PHONE_1]</span>
        <span> and email is </span>
        <span className="bg-sky-500/25 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40 font-semibold">[EMAIL_1]</span>
        <span>.</span>{"\n"}
        <span>Current balance in account: </span>
        <span className="bg-amber-500/25 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40 font-semibold">approx. $50,000</span>
        <span>.</span>
      </>
    ),
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
    highlightOriginal: (highlight) => (
      <>
        <span>Patient discharge summary: </span>
        {highlight ? <span className="bg-sky-500/30 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40">Sarah Jenkins</span> : "Sarah Jenkins"}
        <span>, </span>
        {highlight ? <span className="bg-amber-500/30 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40">42 years old</span> : "42 years old"}
        <span>, MRN: </span>
        {highlight ? <span className="bg-rose-500/30 text-rose-300 px-1 py-0.5 rounded border border-rose-500/40">MRN-8930129</span> : "MRN-8930129"}
        <span>.</span>{"\n"}
        <span>Prescribed </span>
        {highlight ? <span className="bg-amber-500/30 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40">500mg Metformin</span> : "500mg Metformin"}
        <span> twice daily for </span>
        {highlight ? <span className="bg-amber-500/30 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40">Type 2 Diabetes</span> : "Type 2 Diabetes"}
        <span>.</span>{"\n"}
        <span>Emergency contact: </span>
        {highlight ? <span className="bg-sky-500/30 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40">Mark Jenkins</span> : "Mark Jenkins"}
        <span>, </span>
        {highlight ? <span className="bg-rose-500/30 text-rose-300 px-1 py-0.5 rounded border border-rose-500/40">+1 (415) 890-4421</span> : "+1 (415) 890-4421"}
        <span>.</span>{"\n"}
        <span>Admitted to </span>
        {highlight ? <span className="bg-sky-500/30 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40">St. Jude Regional Hospital</span> : "St. Jude Regional Hospital"}
        <span> on </span>
        {highlight ? <span className="bg-amber-500/30 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40">12-Oct-2025</span> : "12-Oct-2025"}
        <span>.</span>
      </>
    ),
    highlightSanitized: () => (
      <>
        <span>Patient discharge summary: </span>
        <span className="bg-sky-500/25 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40 font-semibold">[PATIENT_1]</span>
        <span>, </span>
        <span className="bg-amber-500/25 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40 font-semibold">40-50 years old</span>
        <span>, MRN: </span>
        <span className="bg-emerald-500/25 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40 font-semibold">[REDACTED_MRN]</span>
        <span>.</span>{"\n"}
        <span>Prescribed </span>
        <span className="bg-emerald-500/25 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40 font-semibold">[REDACTED_MEDICATION]</span>
        <span> twice daily for </span>
        <span className="bg-emerald-500/25 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40 font-semibold">[REDACTED_DIAGNOSIS]</span>
        <span>.</span>{"\n"}
        <span>Emergency contact: </span>
        <span className="bg-sky-500/25 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40 font-semibold">[PERSON_2]</span>
        <span>, </span>
        <span className="bg-sky-500/25 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40 font-semibold">[PHONE_1]</span>
        <span>.</span>{"\n"}
        <span>Admitted to </span>
        <span className="bg-sky-500/25 text-sky-300 px-1 py-0.5 rounded border border-sky-500/40 font-semibold">[HOSPITAL_FACILITY]</span>
        <span> on </span>
        <span className="bg-amber-500/25 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40 font-semibold">[REDACTED_DATE]</span>
        <span>.</span>
      </>
    ),
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
    }, 200);
  };

  const handleToggleSanitize = () => {
    setIsSanitizing(true);
    setTimeout(() => {
      setIsSanitizing(false);
      setIsSanitized(!isSanitized);
    }, 200);
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

  return (
    <section id="simulator" className="w-full py-16 sm:py-24 bg-slate-50/80 border-t border-slate-200/80 relative">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Live Firewall Simulator
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            See the Privacy Firewall in Action
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
            Test how P2Shield intercepts sensitive credentials, personal IDs, and confidential data directly in the browser before network egress.
          </p>
        </div>

        {/* Preset Selector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {PRESETS.map((preset, idx) => (
            <button
              key={preset.name}
              onClick={() => handlePresetSelect(idx)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                selectedPresetIndex === idx
                  ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10 scale-[1.01]"
                  : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <span>{preset.name}</span>
              <span className={`ml-2 text-[11px] font-normal ${selectedPresetIndex === idx ? "text-slate-300" : "text-slate-600"}`}>
                ({preset.category})
              </span>
            </button>
          ))}
        </div>

        {/* Control & Status Bar */}
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-xs">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Active Profile:</span>
            <div className="flex gap-1">
              {(["Enterprise", "Finance", "Healthcare", "Personal"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setActiveProfile(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    activeProfile === p
                      ? "bg-sky-100 text-sky-800 border border-sky-300"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Airgapped · 0 Network Requests</span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleSanitize}
              className="gap-1.5 text-xs h-8 border-slate-200 text-slate-700 hover:bg-slate-100"
              disabled={isSanitizing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSanitizing ? "animate-spin text-sky-600" : ""}`} />
              {isSanitized ? "View Raw Prompt" : "Click to Clean"}
            </Button>
          </div>
        </div>

        {/* Dual Code Panels (Developer-Grade IDE / Terminal Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Panel: Unprotected / Original */}
          <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-md">
            {/* Window Title Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono text-slate-400 text-[12px] flex items-center gap-1.5 ml-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  raw_input_prompt.txt
                </span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-300">
                Risk {activePreset.initialRisk}/100 · Critical
              </span>
            </div>

            {/* Code Body */}
            <div className="p-4 sm:p-5 font-mono text-xs sm:text-[13px] leading-relaxed text-slate-300 bg-slate-950 min-h-[210px] whitespace-pre-wrap select-all overflow-x-auto">
              {activePreset.highlightOriginal(true)}
            </div>

            {/* Panel Footer */}
            <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>{activePreset.detectedCount} sensitive items flagged</span>
              <button
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                onClick={() => copyToClipboard(activePreset.originalText, false)}
              >
                {copiedOriginal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedOriginal ? "Copied" : "Copy Raw"}
              </button>
            </div>
          </div>

          {/* Right Panel: Sanitized Safe Output */}
          <div className="flex flex-col rounded-xl border border-sky-800/80 bg-slate-950 overflow-hidden shadow-md">
            {/* Window Title Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono text-slate-400 text-[12px] flex items-center gap-1.5 ml-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  sanitized_prompt.txt
                </span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                Risk {activePreset.finalRisk}/100 · Safe
              </span>
            </div>

            {/* Code Body */}
            <div className="p-4 sm:p-5 font-mono text-xs sm:text-[13px] leading-relaxed text-slate-200 bg-slate-950 min-h-[210px] whitespace-pre-wrap select-all overflow-x-auto">
              {isSanitizing ? (
                <div className="flex items-center justify-center h-36 text-slate-400 gap-2 font-sans text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  <span>Sanitizing on-device with checksum verification...</span>
                </div>
              ) : isSanitized ? (
                activePreset.highlightSanitized()
              ) : (
                <span className="text-slate-400 font-sans italic text-xs">Showing original text. Click "Clean" above to sanitize.</span>
              )}
            </div>

            {/* Panel Footer */}
            <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                ✓ Sanitized locally in &lt;8ms
              </span>
              <button
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-900/60 hover:bg-sky-800 text-sky-200 text-xs font-semibold border border-sky-700/50 transition-colors cursor-pointer"
                onClick={() => copyToClipboard(activePreset.sanitizedText, true)}
              >
                {copiedSanitized ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSanitized ? "Copied Safe" : "Copy Safe"}
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Findings Inspection Grid */}
        <div className="mt-5 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="text-xs uppercase tracking-wider font-bold text-slate-600 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-sky-600" />
              Detected Items & In-Memory Redactions ({activePreset.detectedItems.length})
            </h4>
            <span className="text-[11px] text-slate-600 font-medium">Reversible via local in-memory token map</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {activePreset.detectedItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/90 text-xs"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      item.severity === "critical"
                        ? "bg-rose-500"
                        : item.severity === "high"
                        ? "bg-amber-500"
                        : "bg-sky-500"
                    }`}
                  />
                  <span className="font-semibold text-slate-800 truncate">{item.type}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] flex-shrink-0">
                  <span className="text-slate-600 line-through max-w-[80px] truncate">{item.original}</span>
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span className="text-sky-700 font-bold">{item.replacement}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
