import React from "react";
import { Shield, Lock } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-bold shadow-sm shadow-sky-600/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base">
                TechKnights Privacy Firewall
              </span>
              <p className="text-xs text-slate-500">
                Pre-LLM Privacy Firewall for Sensitive Data Protection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Zero-Telemetry & 100% Local</span>
            </div>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How It Works
            </a>
            <a href="#install" className="hover:text-slate-900 transition-colors">
              Download
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} TechKnights. Pre-LLM Sensitive Data Protection.</p>
          <p className="flex items-center gap-1">
            Built with <span>React, Tailwind CSS & shadcn/ui</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
