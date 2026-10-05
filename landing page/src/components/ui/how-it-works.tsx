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
      "flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300",
      "hover:border-sky-300 hover:shadow-md motion-safe:hover:-translate-y-0.5"
    )}
  >
    <div className="flex items-center justify-between">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-700">
        {icon}
      </div>
      <span className="font-mono text-sm font-medium text-slate-400">{step}</span>
    </div>
    <h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
    <p className="mt-2 text-[15px] leading-7 text-slate-600">{description}</p>
    <div className="mt-auto pt-6">
      <ul className="space-y-3 border-t border-slate-100 pt-6 text-sm leading-6 text-slate-600">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-3">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-sky-500" aria-hidden="true" />
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
    description: "A shield appears on the chat box and counts what it finds.",
    benefits: ["Works on ChatGPT, Claude, Gemini", "Live count and risk colour"],
  },
  {
    icon: <ScanSearch className="h-5 w-5" />,
    step: "02",
    title: "Click the shield",
    description: "Names, IDs, cards and keys are masked, tokenized or removed by your policy.",
    benefits: ["Personal to Enterprise profiles", "Secrets are always removed"],
  },
  {
    icon: <SendHorizontal className="h-5 w-5" />,
    step: "03",
    title: "Send the safe version",
    description: "The clean prompt replaces your text in the box. Press Send as usual.",
    benefits: ["Undo restores the original", "Review and keep items one by one"],
  },
];

export const HowItWorks: React.FC<HowItWorksProps> = ({
  className,
  title = "How it works",
  subtitle = "Three steps, all inside your browser.",
  steps = defaultPrivacySteps,
  ...props
}) => (
  <section
    id="how-it-works"
    aria-labelledby="how-title"
    className={cn("scroll-mt-24 border-t border-slate-200/80 bg-slate-50/70 py-20 md:py-28", className)}
    {...props}
  >
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="how-title" className="text-balance text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">{subtitle}</p>
      </div>

      <ol className="mt-14 grid list-none grid-cols-1 gap-6 md:mt-16 md:grid-cols-3">
        {steps.map((s) => (
          <StepCard key={s.step} {...s} />
        ))}
      </ol>
    </div>
  </section>
);

export default HowItWorks;
