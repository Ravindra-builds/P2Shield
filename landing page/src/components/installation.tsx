import React from "react";
import { Download, Chrome, Package, FolderArchive, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstallationSectionProps {
  onDownloadExtension: () => void;
  onDownloadPackage: () => void;
}

export const InstallationSection: React.FC<InstallationSectionProps> = ({
  onDownloadExtension,
  onDownloadPackage,
}) => {
  return (
    <section
      id="install"
      className="w-full min-h-[calc(100vh-1rem)] sm:min-h-screen flex flex-col justify-center items-center py-14 sm:py-20 bg-white relative border-b border-slate-200/90 snap-start"
    >
      <div className="container mx-auto px-4 max-w-5xl my-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Get Started with Privacy Firewall
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            No signup, no API keys, and zero telemetry. Works in Chrome, Edge, Brave, and Chromium browsers.
          </p>
        </div>

        {/* Dual Cards: Extension vs Package */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-7 max-w-4xl mx-auto">
          {/* Card 1: Download Extension */}
          <div className="rounded-2xl border-2 border-sky-600/30 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:border-sky-600/60 transition-all">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
                  <Chrome className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready to Load
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">Chrome Extension Build</h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
                Pre-built unpacked extension bundle ready to load into Chrome via Developer mode. Intercepts prompts in ChatGPT, Claude, and Gemini.
              </p>

              <ol className="space-y-2.5 text-xs sm:text-sm text-slate-600 mb-6">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-4 w-4 rounded-full bg-sky-100 text-sky-700 font-bold text-[10px] items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Click <strong className="text-slate-900">Download Extension</strong> below to obtain the dist bundle.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-4 w-4 rounded-full bg-sky-100 text-sky-700 font-bold text-[10px] items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span>Open <code className="text-sky-700 font-mono bg-slate-100 px-1 py-0.5 rounded font-semibold text-xs">chrome://extensions</code> & enable <strong>Developer mode</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-4 w-4 rounded-full bg-sky-100 text-sky-700 font-bold text-[10px] items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>Click <strong>Load unpacked</strong> and select the downloaded <code className="text-sky-700 font-mono bg-slate-100 px-1 py-0.5 rounded font-semibold text-xs">dist</code> folder.</span>
                </li>
              </ol>
            </div>

            <button
              onClick={onDownloadExtension}
              className="w-full inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Extension (dist.zip)</span>
            </button>
          </div>

          {/* Card 2: Download Package */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200">
                  <Package className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Full Source Code
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">Developer Package</h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
                Complete TypeScript codebase with rule engine, test suite with 169 assertions, and demo server.
              </p>

              <div className="space-y-2 text-xs sm:text-sm text-slate-600 mb-6">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>TypeScript 5.9 + esbuild engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Vitest test suite for all checksum algorithms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Interactive local sandbox demo server</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Full policy JSON schemas and presets</span>
                </div>
              </div>
            </div>

            <button
              onClick={onDownloadPackage}
              className="w-full inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <FolderArchive className="w-4 h-4 text-slate-600" />
              <span>Download Package (.zip)</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
