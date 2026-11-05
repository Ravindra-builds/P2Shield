import React from "react";
import { Github, Moon, Sun } from "lucide-react";
import { LOGO_SRC, REPO_URL } from "@/config";
import { useTheme } from "@/components/theme-provider";

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-4 sm:top-5 sm:px-8">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-full border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 pl-4 pr-2 shadow-[0_8px_30px_rgb(15_23_42/0.06)] dark:shadow-[0_8px_30px_rgb(0_0_0/0.4)] backdrop-blur-xl sm:h-16 sm:pl-6 sm:pr-3 transition-colors duration-300">
        <a href="#" className="flex items-center gap-2.5" aria-label="P2Shield home">
          <img src={LOGO_SRC} alt="" width={28} height={32} className="h-8 w-auto" />
          <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            P2<span className="text-sky-600 dark:text-sky-400">Shield</span>
          </span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
          <a href="#how-it-works" className="rounded-full px-4 py-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
            How it works
          </a>
          <a href="#profiles" className="rounded-full px-4 py-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
            Profiles
          </a>
          <a href="#faq" className="rounded-full px-4 py-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
            FAQ
          </a>
          <a href="#install" className="rounded-full px-4 py-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
            Install
          </a>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-amber-400 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="h-5 w-5 text-slate-600 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>

          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="P2Shield on GitHub"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href="#install"
            className="inline-flex h-10 items-center rounded-full bg-slate-900 dark:bg-sky-500 px-5 text-sm font-semibold text-white dark:text-slate-950 transition-colors hover:bg-slate-700 dark:hover:bg-sky-400"
          >
            Install
          </a>
        </div>
      </div>
    </header>
  );
};
