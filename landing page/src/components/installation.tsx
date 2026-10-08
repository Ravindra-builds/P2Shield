import React, { useState } from "react";
import { ArrowUpRight, Check, Chrome, Copy, Package, Download, Terminal, Layers } from "lucide-react";
import { NPM_INSTALL, NPM_URL, REPO_URL } from "@/config";

const GIT_CLONE = "git clone https://github.com/Ravindra-builds/P2Shield";
const BUILD_CMD = "npm install && npm run build";

function CodeBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard fallback */
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-950 px-3 py-2 font-mono text-xs text-slate-200 border border-slate-800 shadow-inner group">
      <code className="min-w-0 truncate text-slate-300">
        <span className="select-none text-slate-500 font-bold">$ </span>
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${command}`}
        className="inline-flex h-6 w-6 flex-none items-center justify-center rounded bg-slate-800/80 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

export const InstallationSection: React.FC = () => {
  return (
    <section id="install" aria-labelledby="install-title" className="scroll-mt-20 border-t border-slate-200/80 bg-white py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold mb-3">
            <Download className="w-3.5 h-3.5" />
            Developer Setup
          </div>
          <h2 id="install-title" className="text-balance text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Get Started with P2Shield
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            Run the privacy firewall as an unpacked Chrome extension, or integrate the core engine as a standalone npm package.
          </p>
        </div>

        {/* Dual Setup Cards */}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2 items-stretch">
          {/* Card 1: Browser Extension (Local Build & Unpacked) */}
          <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs hover:border-sky-300 hover:shadow-sm transition-all">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-700">
                    <Chrome className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                      Chrome Extension
                    </h3>
                    <p className="text-xs text-slate-500">
                      Chrome, Edge, Brave & Chromium
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  Unpacked
                </span>
              </div>

              {/* Step-by-Step Guided Workflow */}
              <div className="mt-6 space-y-4">
                {/* Step 1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-mono">
                      1
                    </span>
                    <span>Clone the repository</span>
                  </div>
                  <CodeBlock command={GIT_CLONE} />
                </div>

                {/* Step 2 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-mono">
                      2
                    </span>
                    <span>Install dependencies & build</span>
                  </div>
                  <CodeBlock command={BUILD_CMD} />
                </div>

                {/* Step 3 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-mono">
                      3
                    </span>
                    <span>Load unpacked in browser</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200/90 p-3 text-xs leading-relaxed text-slate-600 space-y-1">
                    <p>
                      Open <code className="font-mono font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">chrome://extensions</code>
                    </p>
                    <p>
                      Toggle <strong>Developer mode</strong> (top right) ➔ click <strong>Load unpacked</strong> ➔ choose the <code className="font-mono font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">dist/</code> folder.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-6 mt-6 border-t border-slate-100">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors hover:bg-slate-800"
              >
                <span>View Source on GitHub</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Card 2: Standalone npm Package */}
          <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs hover:border-sky-300 hover:shadow-sm transition-all">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                      npm Package
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pure engine for Node.js & TypeScript
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  v1.0.0
                </span>
              </div>

              {/* Install Command */}
              <div className="mt-6 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Terminal className="h-3.5 w-3.5 text-slate-600" />
                  <span>Installation</span>
                </div>
                <CodeBlock command={NPM_INSTALL} />
              </div>

              {/* Code Usage Preview */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-sky-600" />
                    <span>Quick Usage Example</span>
                  </span>
                  <span className="text-[11px] font-mono font-normal text-slate-500">index.ts</span>
                </div>
                <div className="rounded-lg bg-slate-950 p-3 font-mono text-[11.5px] leading-5 text-slate-300 border border-slate-800 shadow-inner overflow-x-auto">
                  <span className="text-sky-400">import</span> &#123; analyze &#125; <span className="text-sky-400">from</span> <span className="text-emerald-300">"p2shield"</span>;{"\n"}
                  <span className="text-slate-500">// Sanitizes locally with risk score before LLM call</span>{"\n"}
                  <span className="text-sky-400">const</span> &#123; result &#125; = <span className="text-amber-300">analyze</span>(prompt, &#123;{"\n"}
                  {"  "}profile: <span className="text-emerald-300">"enterprise"</span>{"\n"}
                  &#125;);{"\n"}
                  console.<span className="text-amber-300">log</span>(result.safeText, result.riskAfter);
                </div>
              </div>

              {/* Features List */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <Check className="h-3.5 w-3.5 text-emerald-600 flex-none mt-0.5" />
                  <span>Zero DOM or network dependencies — works in Node, Bun & Edge</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <Check className="h-3.5 w-3.5 text-emerald-600 flex-none mt-0.5" />
                  <span>28 entity types with Verhoeff, Luhn & mod-97 checksums</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <Check className="h-3.5 w-3.5 text-emerald-600 flex-none mt-0.5" />
                  <span>Full TypeScript typings with dual ESM and CJS exports</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-6 mt-6 border-t border-slate-100">
              <a
                href={NPM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs sm:text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 hover:border-slate-300 shadow-xs"
              >
                <span>View on npm Registry</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
