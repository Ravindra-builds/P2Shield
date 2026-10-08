import React from "react";
import { Github } from "lucide-react";
import { LOGO_SRC, REPO_URL } from "@/config";

export const Navbar: React.FC = () => {
  return (
    <header className="fixed inset-x-0 top-3 z-50 px-4 sm:top-5 sm:px-8">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-full border border-slate-200/80 bg-white/80 pl-4 pr-2 shadow-[0_8px_30px_rgb(15_23_42/0.06)] backdrop-blur-xl sm:h-16 sm:pl-6 sm:pr-3">
        <a href="#" className="flex items-center gap-2.5" aria-label="P2Shield home">
          <img src={LOGO_SRC} alt="" width={28} height={32} className="h-8 w-auto" />
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            P2<span className="text-sky-600">Shield</span>
          </span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-1 text-sm font-medium text-slate-600 md:flex">
          <a href="#how-it-works" className="rounded-full px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-900">
            How it works
          </a>
          <a href="#simulator" className="rounded-full px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-900">
            Simulator
          </a>
          <a href="#features" className="rounded-full px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-900">
            Features
          </a>
          <a href="#profiles" className="rounded-full px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-900">
            Profiles
          </a>
          <a href="#install" className="rounded-full px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-900">
            Install
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="P2Shield on GitHub"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href="#install"
            className="inline-flex h-10 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Install
          </a>
        </div>
      </div>
    </header>
  );
};
