import React, { useState, useMemo } from "react";
import { analyze, detectAll } from "@core/engine";
import { getBuiltinProfile } from "@core/policy";
import type { RiskLevel } from "@core/types";
type ProfileId = "personal" | "healthcare" | "finance" | "enterprise";
import {
  Check,
  Copy,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
  Maximize2,
  Minimize2,
  FileCode,
  Layers,
  Cpu,
  Lock,
  Eye,
  FileText,
  Activity,
  Bot,
  Info,
} from "lucide-react";

interface SampleScenario {
  id: string;
  category: string;
  title: string;
  badge: string;
  icon: string;
  description: string;
  prompt: string;
}

const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    id: "medical",
    category: "PII & Healthcare",
    title: "Patient Medical Record & Diagnosis",
    badge: "Healthcare",
    icon: "🩺",
    description: "Contains Patient Name, Aadhaar, Phone, Email & Medical Diagnosis.",
    prompt:
      "I'm a patient at ABC Hospital in Jamshedpur. My name is Rahul Sharma, I'm 27, my phone is 98765 43210 and my Aadhaar number is 2345 6789 0124. My doctor Dr. Anil Kumar said I have Type 2 diabetes and I take Metformin 500mg. You can email me at rahul.sharma@gmail.com. What questions should I ask my doctor?",
  },
  {
    id: "secrets",
    category: "Developer & Security",
    title: "API Keys, Credentials & DB Passwords",
    badge: "Secrets",
    icon: "🔑",
    description: "Contains OpenAI API keys, AWS Access Key & Database Passwords.",
    prompt:
      "Deploy this app for me.\nOPENAI_API_KEY=sk-proj-Ab3dEf9hIjKlMnOpQrStUv12\nAWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nThe database password: Tr0ub4dor&3\nWhy does the build fail?",
  },
  {
    id: "finance",
    category: "Financial & Tax",
    title: "Bank Card, PAN & Salary Info",
    badge: "Finance",
    icon: "💳",
    description: "Contains Credit Card, IFSC, PAN number & Salary metrics.",
    prompt:
      "I'm Priya Verma, account number 123456789012, IFSC HDFC0001234, PAN ABCPE1234F, and my credit card is 4111 1111 1111 1111. My salary is ₹12,50,000 per year. Help me understand my tax calculation.",
  },
  {
    id: "enterprise",
    category: "Corporate Secret",
    title: "Q3 Financials & Internal Network IP",
    badge: "Enterprise",
    icon: "💼",
    description: "Contains confidential revenue, Employee ID & internal server IP.",
    prompt:
      "CONFIDENTIAL - internal use only.\nProject Phoenix Q3 revenue is $4.2 million. Employee ID: 48291 (Neha Gupta) reports to Mr. Vikram Singh.\nThe staging server is build01.corp at 10.2.3.4. Summarize the risks for the board.",
  },
  {
    id: "clean",
    category: "Safe Baseline",
    title: "Clean Non-Sensitive Query",
    badge: "Safe",
    icon: "✨",
    description: "Standard programming query without any sensitive or PII data.",
    prompt:
      "Explain the difference between TCP and UDP in simple terms, with one practical example for each protocol.",
  },
];

const PROFILES: { id: ProfileId; label: string; desc: string }[] = [
  { id: "personal", label: "Personal", desc: "Everyday privacy balance" },
  { id: "healthcare", label: "Healthcare", desc: "Strict HIPAA protection" },
  { id: "finance", label: "Finance", desc: "Masks banking & cards" },
  { id: "enterprise", label: "Enterprise", desc: "Tokenizes people & IP" },
];

const TARGET_MODELS = [
  { id: "chatgpt", name: "ChatGPT", label: "GPT-4o / ChatGPT", badge: "OpenAI" },
  { id: "gemini", name: "Gemini", label: "Google Gemini", badge: "Google" },
  { id: "grok", name: "Grok", label: "xAI Grok 2", badge: "xAI" },
  { id: "claude", name: "Claude", label: "Anthropic Claude", badge: "Anthropic" },
];

export const InteractivePlayground: React.FC = () => {
  const [activeScenarioId, setActiveScenarioId] = useState<string>("medical");
  const [promptText, setPromptText] = useState(SAMPLE_SCENARIOS[0].prompt);
  const [originalText, setOriginalText] = useState(SAMPLE_SCENARIOS[0].prompt);
  const [profileId, setProfileId] = useState<ProfileId>("personal");
  const [targetModel, setTargetModel] = useState<string>("chatgpt");
  const [activeTab, setActiveTab] = useState<"payload" | "diff" | "telemetry">("payload");
  const [sentPayload, setSentPayload] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSanitized, setIsSanitized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active full profile object
  const activeProfile = useMemo(() => getBuiltinProfile(profileId), [profileId]);

  // Run analysis locally via P2Shield engine
  const analysis = useMemo(() => {
    return analyze(promptText, { profile: activeProfile });
  }, [promptText, activeProfile]);

  const rawDetections = useMemo(() => detectAll(promptText), [promptText]);
  const findingsCount = rawDetections.length;
  const appliedFindings = analysis.result.findings.filter((f) => f.applied);

  // Compute risk level
  const riskLevel: RiskLevel = analysis.result.levelBefore;

  const handleSelectScenario = (s: SampleScenario) => {
    setActiveScenarioId(s.id);
    setPromptText(s.prompt);
    setOriginalText(s.prompt);
    setSentPayload(null);
    setIsSanitized(false);
  };

  const handleSanitize = () => {
    if (!promptText.trim()) return;
    setPromptText(analysis.result.safeText);
    setIsSanitized(true);
    setPanelOpen(true);
    setSentPayload(analysis.result.safeText);
  };

  const handleUndo = () => {
    setPromptText(originalText);
    setIsSanitized(false);
    setSentPayload(null);
  };

  const handleSend = () => {
    setSentPayload(promptText);
  };

  const copyPayload = async () => {
    const textToCopy = sentPayload ?? analysis.result.safeText;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* fallback */
    }
  };

  // Badge gradient based on risk level
  const shieldColorClass = useMemo(() => {
    if (findingsCount === 0) return "from-indigo-600 to-purple-600 shadow-purple-500/30";
    switch (riskLevel) {
      case "Critical":
        return "from-red-600 to-rose-600 shadow-red-500/40 animate-pulse";
      case "High":
        return "from-orange-600 to-amber-600 shadow-orange-500/35";
      case "Medium":
        return "from-amber-500 to-yellow-600 shadow-amber-500/30";
      default:
        return "from-emerald-600 to-teal-600 shadow-emerald-500/30";
    }
  }, [findingsCount, riskLevel]);

  return (
    <section
      id="playground"
      className={`scroll-mt-20 w-full transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-950 text-white overflow-y-auto p-4 sm:p-8"
          : "py-12 sm:py-20 bg-slate-950 text-white border-t border-slate-800/80"
      }`}
    >
      <div className={`${isFullscreen ? "max-w-7xl mx-auto" : "container mx-auto px-4 max-w-6xl"}`}>
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-slate-800/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              Interactive Extension Playground & Live Engine
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              P2Shield Privacy Studio
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                ● 100% On-Device Engine
              </span>
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Test how P2Shield detects, redacts, and tokenizes sensitive data live inside AI chat prompts before any network request leaves your browser.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isFullscreen ? "Exit Studio" : "Full Studio Mode"}</span>
            </button>
          </div>
        </div>

        {/* Studio Control Toolbar (Model Selector & Profile Switcher) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          {/* Target Model Tabs */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-sky-400" />
              Target Chatbot:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1">
              {TARGET_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTargetModel(m.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    targetModel === m.id
                      ? "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                      : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Privacy Profile Selector */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Profile:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1">
              {PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfileId(p.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                    profileId === p.id
                      ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                      : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                  title={p.desc}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Categorized Test Preset Cards */}
        <div className="mb-8">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Select Test Scenario Preset:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {SAMPLE_SCENARIOS.map((s) => {
              const isActive = activeScenarioId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectScenario(s)}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? "border-sky-500 bg-sky-950/40 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/30"
                      : "border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-lg">{s.icon}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        {s.badge}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white mb-1 line-clamp-1">{s.title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{s.description}</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10.5px] font-semibold text-sky-400">
                    <span>Load Scenario</span>
                    <span>→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Split-Pane Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Workspace Pane: Prompt Composer & Extension Simulation */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl flex flex-col justify-between flex-1">
              <div>
                <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-medium pb-2 border-b border-slate-800/80">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    Simulated Composer ({TARGET_MODELS.find((m) => m.id === targetModel)?.label})
                  </span>
                  <span>{promptText.length} characters</span>
                </div>

                {/* Textarea with Floating Shield Badge */}
                <div className="relative">
                  {/* Floating Extension Shield Icon Button */}
                  <div className="absolute -top-3 right-3 z-20">
                    <button
                      type="button"
                      onClick={handleSanitize}
                      title="Click to sanitize prompt with P2Shield engine"
                      className={`group relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${shieldColorClass} text-white shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer`}
                    >
                      <svg className="h-5.5 w-5.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                        <path d="M12 2L4 5.5v5.8c0 4.8 3.4 9.3 8 10.4 4.6-1.1 8-5.6 8-10.4V5.5L12 2zm0 4a3 3 0 110 6 3 3 0 010-6z" />
                      </svg>

                      {/* Finding Count Badge */}
                      {findingsCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10.5px] font-black text-slate-950 shadow-md">
                          {findingsCount}
                        </span>
                      )}
                    </button>
                  </div>

                  <textarea
                    rows={6}
                    value={promptText}
                    onChange={(e) => {
                      setPromptText(e.target.value);
                      setOriginalText(e.target.value);
                      setIsSanitized(false);
                      setSentPayload(null);
                    }}
                    placeholder="Type or paste any prompt containing emails, phone numbers, API keys, medical records..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 leading-relaxed font-mono"
                  />
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSanitize}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-400 active:scale-95 cursor-pointer"
                  >
                    <Zap className="h-4 w-4" />
                    Sanitize Prompt
                  </button>

                  {isSanitized && (
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Undo
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSend}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-95 cursor-pointer"
                >
                  <span>Send to AI</span>
                  <span>↑</span>
                </button>
              </div>

              {/* Extension In-Page Detection Drawer */}
              {panelOpen && (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-xl text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-sky-400" />
                      <span className="font-bold text-white">Detection Telemetry</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          riskLevel === "Critical"
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : riskLevel === "High"
                            ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                            : riskLevel === "Medium"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {riskLevel} RISK
                      </span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {appliedFindings.length} / {findingsCount} Masked
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
                    {findingsCount === 0 ? (
                      <div className="flex items-center gap-2 text-emerald-400 py-1 font-medium">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Prompt is clean. No sensitive items or API keys detected.</span>
                      </div>
                    ) : (
                      analysis.result.findings.map((f, fIdx) => (
                        <div
                          key={fIdx}
                          className="flex items-center justify-between rounded-lg bg-slate-900 p-2.5 border border-slate-800/80"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                              {f.type}
                            </span>
                            <code className="font-mono text-[11px] text-slate-300 truncate max-w-[140px] sm:max-w-[200px]">
                              {f.text}
                            </code>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              → {f.replacement}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Workspace Pane: Real-time Payload & Telemetry Studio */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl flex flex-col justify-between flex-1">
              <div>
                {/* Tab Header Bar */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveTab("payload")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeTab === "payload" ? "bg-sky-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      Payload
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("diff")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeTab === "diff" ? "bg-sky-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      Diff Map
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("telemetry")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeTab === "telemetry" ? "bg-sky-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Telemetry
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={copyPayload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold cursor-pointer transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                {/* Tab Content 1: Payload Terminal */}
                {activeTab === "payload" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                      <span>HTTP POST /v1/chat/completions</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Sanitized Payload
                      </span>
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 text-emerald-300 font-mono text-xs leading-relaxed overflow-x-auto border border-slate-800/80 min-h-[220px] max-h-[300px]">
                      {sentPayload !== null ? sentPayload : analysis.result.safeText}
                    </pre>
                  </div>
                )}

                {/* Tab Content 2: Diff Map */}
                {activeTab === "diff" && (
                  <div className="space-y-3">
                    <div className="text-[11px] font-mono text-slate-400 px-1">
                      Original Text vs Sanitized Mask Mapping:
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 text-xs font-mono border border-slate-800/80 space-y-2 min-h-[220px] max-h-[300px] overflow-y-auto">
                      {findingsCount === 0 ? (
                        <div className="text-slate-500 italic">No replacements required. Raw text matches safe payload.</div>
                      ) : (
                        appliedFindings.map((f, i) => (
                          <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800 space-y-1">
                            <div className="text-red-400 line-through truncate">- Raw: {f.text}</div>
                            <div className="text-emerald-400 font-bold">+ Safe: {f.replacement}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Tab Content 3: Telemetry */}
                {activeTab === "telemetry" && (
                  <div className="space-y-3">
                    <div className="text-[11px] font-mono text-slate-400 px-1">Engine Analysis Telemetry JSON:</div>
                    <pre className="p-4 rounded-xl bg-slate-950 text-sky-300 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800/80 min-h-[220px] max-h-[300px]">
                      {JSON.stringify(
                        {
                          status: "SUCCESS",
                          profile: activeProfile.id,
                          riskLevelBefore: analysis.result.levelBefore,
                          riskLevelAfter: analysis.result.levelAfter,
                          findingsTotal: findingsCount,
                          findingsApplied: appliedFindings.length,
                          executionTimeMs: "< 1ms",
                          zeroNetwork: true,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>

              {/* Performance Metric Footer Cards */}
              <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-slate-800">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Latency</div>
                  <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">&lt; 1 ms</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Network</div>
                  <div className="text-xs font-bold text-sky-400 font-mono mt-0.5">0 Bytes</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Findings</div>
                  <div className="text-xs font-bold text-amber-400 font-mono mt-0.5">{findingsCount} Found</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
