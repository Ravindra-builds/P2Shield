import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight, Download, ShieldCheck, Check } from "lucide-react";

interface HeroProps {
  badgeText?: string;
  badgeLink?: string;
  headlinePrefix?: string;
  rotatingTitles?: string[];
  description?: string;
  onDownloadPackage?: () => void;
  onDownloadExtension?: () => void;
}

function Hero({
  badgeText = "Pre-LLM Privacy Firewall • 100% On-Device",
  badgeLink = "#how-it-works",
  headlinePrefix = "AI prompts made",
  rotatingTitles,
  description = "Sanitize prompts locally on your device before any AI chatbot sees them. Zero network calls, zero server logs, and zero telemetry. Raw credentials and personal data never leave your browser.",
  onDownloadPackage,
  onDownloadExtension,
}: HeroProps = {}) {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => rotatingTitles || ["Completely Private", "100% Air-Gapped", "Zero-Leak", "Enterprise-Safe", "Audit-Compliant"],
    [rotatingTitles]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2200);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <section className="w-full min-h-[calc(100vh-1rem)] sm:min-h-screen flex flex-col justify-center items-center relative overflow-hidden pt-20 pb-8 sm:pt-24 sm:pb-12 border-b border-slate-200/90 snap-start">
      {/* Background ambient radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-gradient-to-b from-sky-100/70 via-cyan-50/40 to-transparent blur-[110px] pointer-events-none rounded-full -z-10" />

      <div className="container mx-auto px-4 max-w-4xl relative z-10 flex flex-col items-center text-center my-auto">
        {/* Top Announcement Pill */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-5 sm:mb-6"
        >
          <a href={badgeLink} className="group inline-block">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-200/90 bg-white/95 backdrop-blur-md shadow-xs hover:border-sky-300 hover:shadow-sm transition-all">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              <span className="text-xs sm:text-sm font-semibold text-slate-700 tracking-tight">
                {badgeText}
              </span>
              <MoveRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </a>
        </motion.div>

        {/* Main Headline - Professionally Proportioned */}
        <div className="max-w-3xl mx-auto mb-4 sm:mb-5">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            <span>{headlinePrefix}</span>
            <span className="relative flex w-full justify-center overflow-hidden text-center min-h-[1.25em] mt-1.5 pb-1">
              &nbsp;
              {titles.map((title, index) => (
                <motion.span
                  key={index}
                  className="absolute font-extrabold bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-700 bg-clip-text text-transparent"
                  initial={{ opacity: 0, y: -50 }}
                  transition={{ type: "spring", stiffness: 65, damping: 14 }}
                  animate={
                    titleNumber === index
                      ? {
                          y: 0,
                          opacity: 1,
                        }
                      : {
                          y: titleNumber > index ? -80 : 80,
                          opacity: 0,
                        }
                  }
                >
                  {title}
                </motion.span>
              ))}
            </span>
          </h1>
        </div>

        {/* Subtitle with balanced line-height and max-width */}
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-7 sm:mb-8">
          {description}
        </p>

        {/* Action CTA Buttons - Balanced, Big and Beautiful */}
        <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 w-full sm:w-auto justify-center items-center mb-6">
          {/* Download Extension Button (Primary) */}
          <button
            onClick={onDownloadExtension}
            className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-bold text-white bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-600 hover:from-sky-700 hover:via-sky-600 hover:to-cyan-700 shadow-md shadow-sky-500/25 hover:shadow-lg hover:shadow-sky-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 whitespace-nowrap cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white/95 flex-shrink-0" />
            <span>Download extension</span>
            <MoveRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
          </button>

          {/* Download Package Button (Secondary) */}
          <button
            onClick={onDownloadPackage}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-slate-600 group-hover:text-sky-600 transition-colors duration-200" />
            <span>Download package</span>
          </button>
        </div>

        {/* Trust Guarantees */}
        <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
            Free & Open Source (MIT)
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
            Zero Network Calls
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
            Works on ChatGPT, Claude & Gemini
          </span>
        </div>
      </div>
    </section>
  );
}

function HeroDemo() {
  return (
    <div className="block bg-background text-foreground min-h-screen">
      <Hero />
    </div>
  );
}

export { Hero, HeroDemo };
