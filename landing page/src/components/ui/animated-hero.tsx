import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOGO_SRC, NPM_URL, REPO_URL } from "@/config";

const TRUST = ["No network requests", "No account or analytics", "Works on ChatGPT, Claude, Gemini"];

function Hero() {
  const reduce = useReducedMotion();
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(() => ["prompt", "privacy"], []);

  // Rotate the highlighted word in a loop: "prompt" -> "privacy" -> "prompt" ...
  // This is intentionally not gated on prefers-reduced-motion. The motion is a
  // single short word inside a clipped box, and gating it hid the animation for
  // anyone whose OS has animations turned off.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTitleNumber((n) => (n === titles.length - 1 ? 0 : n + 1));
    }, 2200);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex min-h-[100svh] items-center overflow-hidden"
    >
      {/* Background: soft glow and a faded grid */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(55%_55%_at_75%_40%,rgb(14_165_233/0.13),transparent_70%)] dark:bg-[radial-gradient(55%_55%_at_75%_40%,rgb(14_165_233/0.22),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(15_23_42/0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgb(15_23_42/0.045)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-16 pt-32 sm:px-8 lg:grid-cols-[1.3fr_0.7fr] lg:gap-10 lg:pb-12 lg:pt-28">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center lg:text-left"
        >
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-sky-200 dark:border-sky-800/80 bg-white/90 dark:bg-slate-900/90 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition-colors hover:border-sky-300 dark:hover:border-sky-700 sm:text-sm"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Chrome extension · 100% on-device
          </a>

          <h1
            id="hero-title"
            className="mt-7 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-[clamp(2.25rem,4.2vw,3.75rem)]"
          >
            <span className="sr-only">P2Shield: protect your prompt and privacy</span>
            <span aria-hidden="true" className="block text-balance lg:whitespace-nowrap">
              P2Shield: protect your
            </span>
            <span
              aria-hidden="true"
              className="relative mt-1 flex h-[1.3em] w-full justify-center overflow-hidden lg:justify-start"
            >
              {titles.map((title, index) => (
                <motion.span
                  key={title}
                  className="absolute bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-700 dark:from-sky-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text font-extrabold leading-[1.25] text-transparent"
                  initial={{ opacity: 0, y: -100 }}
                  transition={{ type: "spring", stiffness: 50 }}
                  animate={
                    titleNumber === index
                      ? { y: 0, opacity: 1 }
                      : { y: titleNumber > index ? -150 : 150, opacity: 0 }
                  }
                >
                  {title}
                </motion.span>
              ))}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg sm:leading-8 lg:mx-0">
            Finds personal data and secrets in your prompt and replaces them on your device. Nothing is sent anywhere.
          </p>

          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
            <Button
              asChild
              size="lg"
              className="group h-12 gap-2 rounded-full bg-slate-900 dark:bg-sky-500 px-7 text-sm font-semibold text-white dark:text-slate-950 shadow-lg shadow-slate-900/15 dark:shadow-sky-500/20 hover:bg-slate-700 dark:hover:bg-sky-400 sm:text-base cursor-pointer"
            >
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                Install P2Shield
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 gap-2 rounded-full border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-7 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 sm:text-base cursor-pointer"
            >
              <a href={NPM_URL} target="_blank" rel="noopener noreferrer">
                <Package className="h-4 w-4" />
                Download npm package
              </a>
            </Button>
          </div>

          <ul className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-300 lg:justify-start">
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="relative mx-auto w-full max-w-[240px] sm:max-w-[300px] lg:max-w-[20rem]"
        >
          <div aria-hidden="true" className="absolute inset-[-12%] rounded-full bg-sky-200/40 dark:bg-sky-500/20 blur-3xl" />
          <motion.img
            src={LOGO_SRC}
            alt="P2Shield logo: a shield crossed by a silver sweep"
            width={453}
            height={512}
            animate={reduce ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative h-auto w-full drop-shadow-[0_28px_36px_rgb(15_23_42/0.2)] dark:drop-shadow-[0_28px_36px_rgb(0_0_0/0.6)]"
          />
        </motion.div>
      </div>
    </section>
  );
}

export { Hero };
