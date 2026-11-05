import { cn } from "@/lib/utils";
import { MousePointerClick, ScanSearch, SendHorizontal } from "lucide-react";
import type React from "react";

export interface StepCardProps {
  icon: React.ReactNode;
  step: string;
  title: string;
  description: string;
  benefits: string[];
}

export interface HowItWorksProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  steps?: StepCardProps[];
}

export const StepCard: React.FC<StepCardProps> = ({ icon, step, title, description, benefits }) => (
  <li
    className={cn(
      "flex h-full flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs transition-all duration-300",
      "hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-sm motion-safe:hover:-translate-y-0.5"
    )}
  >
    <div className="flex items-center justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-100 dark:border-sky-900/50 bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-400">
        {icon}
      </div>
      <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500">{step}</span>
    </div>
    <h3 className="mt-5 text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>
    <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
    <div className="mt-auto pt-5">
      <ul className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs leading-5 text-slate-600 dark:text-slate-300">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-sky-500" aria-hidden="true" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  </li>
);

export const defaultPrivacySteps: StepCardProps[] = [
  {
    icon: <MousePointerClick className="h-5 w-5" />,
    step: "01",
    title: "Type or paste",
    description: "A shield badge appears right above the AI chat composer and displays the real-time count of detected items.",
    benefits: ["Works across ChatGPT, Claude, Gemini & custom LLMs", "Real-time risk color badge"],
  },
  {
    icon: <ScanSearch className="h-5 w-5" />,
    step: "02",
    title: "Click the shield",
    description: "Names, IDs, cards, and keys are masked, tokenized, or removed according to your active privacy profile.",
    benefits: ["Personal, Healthcare, Finance & Enterprise modes", "Credentials are always removed by policy"],
  },
  {
    icon: <SendHorizontal className="h-5 w-5" />,
    step: "03",
    title: "Send the safe version",
    description: "The sanitized prompt replaces the draft in the input box so you can press Send without leaking raw data.",
    benefits: ["Instant Undo restores the original prompt", "Review panel lets you audit findings one-by-one"],
  },
];

export const HowItWorks: React.FC<HowItWorksProps> = ({
  className,
  title = "How it works",
  subtitle = "Three simple steps, executed entirely on your local machine.",
  steps = defaultPrivacySteps,
  ...props
}) => (
  <section
    id="how-it-works"
    aria-labelledby="how-title"
    className={cn("scroll-mt-20 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 py-16 sm:py-20", className)}
    {...props}
  >
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="how-title" className="text-balance text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">{subtitle}</p>
      </div>

      <ol className="mt-10 grid list-none grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        {steps.map((s) => (
          <StepCard key={s.step} {...s} />
        ))}
      </ol>
    </div>
  </section>
);

export default HowItWorks;
