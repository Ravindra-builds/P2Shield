import React, { useState } from "react";
import { ArrowUpRight, Check, Chrome, Copy, Package } from "lucide-react";
import { NPM_INSTALL, NPM_URL, REPO_URL } from "@/config";

const CODE = "rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800";

const STEPS: React.ReactNode[] = [
  <>Get the source from <a className="font-medium text-sky-700 underline underline-offset-2" href={REPO_URL} target="_blank" rel="noopener noreferrer">GitHub</a>.</>,
  <>Run <code className={CODE}>npm install</code> then <code className={CODE}>npm run build</code>.</>,
  <>Open <code className={CODE}>chrome://extensions</code>, turn on Developer mode, choose Load unpacked and pick the <code className={CODE}>dist</code> folder.</>,
];

const PACKAGE_POINTS = [
  "protect() returns safe text and risk scores",
  "restore() puts real values back in replies",
  "Same four profiles as the extension",
  "TypeScript types included",
];

function CopyCommand() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(NPM_INSTALL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable: the command is still selectable */
    }
  };

  return (
    <div className="mt-6 flex items-center justify-between gap-3 rounded-xl bg-slate-900 py-2.5 pl-4 pr-2.5 font-mono text-sm text-slate-100">
      <code className="min-w-0 truncate">
        <span className="select-none text-slate-500">$ </span>
        {NPM_INSTALL}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy install command"
        className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
}

export const InstallationSection: React.FC = () => {
  return (
    <section id="install" aria-labelledby="install-title" className="scroll-mt-24 border-t border-slate-200/80 bg-white py-20 md:py-28">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="install-title" className="text-balance text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Install P2Shield
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">
            Use the Chrome extension, or add the engine to your own app.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-6 md:mt-16 md:grid-cols-2">
          <div className="flex h-full flex-col rounded-2xl border border-sky-200 bg-white p-7 shadow-sm ring-1 ring-sky-100">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-700">
              <Chrome className="h-5 w-5" />
            </div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">Load in Chrome</h3>
            <p className="mt-2 text-[15px] leading-7 text-slate-600">For Chrome and other Chromium browsers.</p>

            <ol className="mt-6 space-y-4 text-[15px] leading-7 text-slate-600">
              {STEPS.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>

            <div className="mt-auto pt-8">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
              >
                Get the source
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">npm package</h3>
            <p className="mt-2 text-[15px] leading-7 text-slate-600">The same engine, for your own code.</p>

            <CopyCommand />

            <ul className="mt-6 space-y-4 text-[15px] leading-7 text-slate-600">
              {PACKAGE_POINTS.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <Check className="mt-1.5 h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              <a
                href={NPM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
              >
                View on npm
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
