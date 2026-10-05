"use client";

import { cn } from "@/lib/utils";
import { Layers, Search, Zap } from "lucide-react";
import type React from "react";

// The props for a single step card
export interface StepCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
}

// The main props for the HowItWorks component
export interface HowItWorksProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  steps?: StepCardProps[];
}

/**
 * A single step card within the "How It Works" section.
 * Professional, clean card with subtle border and balanced typography.
 */
export const StepCard: React.FC<StepCardProps> = ({
  icon,
  title,
  description,
  benefits,
}) => (
  <div
    className={cn(
      "relative rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 text-card-foreground transition-all duration-300 ease-in-out shadow-xs",
      "hover:scale-[1.01] hover:shadow-lg hover:border-primary/40 flex flex-col justify-between"
    )}
  >
    <div>
      {/* Icon */}
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700 border border-sky-100 shadow-xs">
        {icon}
      </div>
      {/* Title and Description */}
      <h3 className="mb-2 text-lg sm:text-xl font-bold tracking-tight text-slate-900">{title}</h3>
      <p className="mb-5 text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
    {/* Benefits List */}
    <ul className="space-y-2.5 pt-3.5 border-t border-slate-100">
      {benefits.map((benefit, index) => (
        <li key={index} className="flex items-start gap-2.5">
          <div className="flex h-3.5 w-3.5 mt-1 flex-shrink-0 items-center justify-center rounded-full bg-sky-100">
            <div className="h-1.5 w-1.5 rounded-full bg-sky-600"></div>
          </div>
          <span className="text-xs sm:text-sm text-slate-600 leading-snug">{benefit}</span>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Default steps data tailored for TechKnights Pre-LLM Privacy Firewall
 */
export const defaultPrivacySteps: StepCardProps[] = [
  {
    icon: <Search className="h-5 w-5" />,
    title: "1. Type Prompt in Chatbox",
    description:
      "Open ChatGPT, Claude, Gemini, or internal AI tools. The lightweight shield icon attaches automatically above the prompt input.",
    benefits: [
      "Zero network latency or proxy setup",
      "Auto-detects active text areas & inputs",
      "Shows instant risk score (0-100) as you type",
    ],
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: "2. Inspect & Sanitize Locally",
    description:
      "Click the shield or enable auto-guard. Advanced rule detectors evaluate 40+ credential types, PII, and financial records on-device.",
    benefits: [
      "Checksums: Luhn, Verhoeff, IBAN mod-97",
      "Always strips passwords, API keys & tokens",
      "Customizable profiles: Personal to Enterprise",
    ],
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "3. Send Safe Prompt to LLM",
    description:
      "The sanitized prompt replaces raw text directly in the box. You press Send as usual, knowing secrets never leave your device.",
    benefits: [
      "Zero egress guarantee — raw text never leaves",
      "Full 1-click Undo & granular review panel",
      "Audit-proof sensitive data protection",
    ],
  },
];

/**
 * A responsive "How It Works" section that displays a 3-step process.
 * Fits a full screen view down to the divider line.
 */
export const HowItWorks: React.FC<HowItWorksProps> = ({
  className,
  title = "How TechKnights Firewall Works",
  subtitle = "Complete pre-LLM prompt sanitization executed strictly on your local browser before any network packets are transmitted.",
  steps = defaultPrivacySteps,
  ...props
}) => {
  return (
    <section
      id="how-it-works"
      className={cn(
        "w-full min-h-[calc(100vh-1rem)] sm:min-h-screen flex flex-col justify-center items-center bg-slate-50/70 py-14 sm:py-20 relative overflow-hidden border-b border-slate-200/90 snap-start",
        className
      )}
      {...props}
    >
      <div className="container mx-auto px-4 max-w-5xl relative z-10 flex flex-col justify-center my-auto">
        {/* Section Header */}
        <div className="mx-auto mb-10 sm:mb-12 max-w-3xl text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Step Indicators with Connecting Line */}
        <div className="relative mx-auto mb-8 w-full max-w-3xl hidden md:block">
          <div
            aria-hidden="true"
            className="absolute left-[16.6667%] top-1/2 h-0.5 w-[66.6667%] -translate-y-1/2 bg-slate-200"
          ></div>
          <div className="relative grid grid-cols-3">
            {steps.map((_, index) => (
              <div
                key={index}
                className="flex h-8 w-8 items-center justify-center justify-self-center rounded-full bg-white border-2 border-sky-600 font-bold text-xs text-sky-700 shadow-xs ring-4 ring-slate-100"
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Steps Grid */}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <StepCard
              key={index}
              icon={step.icon}
              title={step.title}
              description={step.description}
              benefits={step.benefits}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default function HowItWorksDemo() {
  return (
    <div className="bg-background text-foreground">
      <HowItWorks />
    </div>
  );
}
