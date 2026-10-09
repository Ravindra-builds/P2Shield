import React from "react";
import { LOGO_SRC, NPM_URL, REPO_URL } from "@/config";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 md:py-14">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-3">
            <img src={LOGO_SRC} alt="" width={32} height={36} className="h-9 w-auto" />
            <div>
              <p className="text-base font-bold tracking-tight text-slate-900 dark:text-white">P2Shield</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">On-device privacy for AI prompts.</p>
            </div>
          </div>

          <nav aria-label="Footer" className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
            <a href="#how-it-works" className="transition-colors hover:text-slate-900 dark:hover:text-white">How it works</a>
            <a href="#install" className="transition-colors hover:text-slate-900 dark:hover:text-white">Install</a>
            <a href={NPM_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-slate-900 dark:hover:text-white">npm</a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-slate-900 dark:hover:text-white">GitHub</a>
          </nav>
        </div>

        <p className="mt-10 border-t border-slate-100 dark:border-slate-800/80 pt-6 text-center text-xs leading-5 text-slate-500 dark:text-slate-400 md:text-left">
          © {new Date().getFullYear()} TechKnights. Pre-LLM Privacy Firewall for Sensitive Data Protection.
        </p>
      </div>
    </footer>
  );
};
