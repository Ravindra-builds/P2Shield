import React from "react";
import { Shield, Download, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onDownloadExtension: () => void;
  onDownloadPackage: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onDownloadExtension,
  onDownloadPackage,
}) => {
  return (
    <header className="sticky top-3 sm:top-5 z-50 w-full px-4 sm:px-6">
      <div className="max-w-6xl mx-auto rounded-2xl sm:rounded-full bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] px-4 sm:px-7 h-16 flex items-center justify-between transition-all">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 via-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/25 ring-2 ring-sky-100 flex-shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight text-slate-900 text-base sm:text-lg flex items-center gap-1.5 leading-none">
              TechKnights
              <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent font-bold">
                Firewall
              </span>
            </span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide hidden sm:inline-block mt-0.5">
              Pre-LLM Privacy Engine
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200/80 bg-emerald-50 text-emerald-700 text-xs font-semibold ml-2 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            100% On-Device
          </div>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-semibold text-slate-600">
          <a
            href="#how-it-works"
            className="px-4 py-2 rounded-full hover:bg-slate-100/80 hover:text-slate-900 transition-all"
          >
            How It Works
          </a>
          <a
            href="#install"
            className="px-4 py-2 rounded-full hover:bg-slate-100/80 hover:text-slate-900 transition-all"
          >
            Download & Setup
          </a>
        </nav>

        {/* Action Buttons in Header */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onDownloadPackage}
            className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-700 transition-all shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Download Package</span>
          </button>

          <button
            onClick={onDownloadExtension}
            className="inline-flex items-center gap-2 text-xs font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-white bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 shadow-md shadow-sky-500/25 hover:shadow-lg hover:shadow-sky-500/35 transition-all active:scale-95"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Download Extension</span>
          </button>
        </div>
      </div>
    </header>
  );
};
