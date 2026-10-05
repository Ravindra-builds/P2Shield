import { Hero } from "@/components/ui/animated-hero";
import { HowItWorks } from "@/components/ui/how-it-works";

export function HeroDemo() {
  return (
    <div className="block bg-background text-foreground">
      <Hero />
    </div>
  );
}

export function HowItWorksDemo() {
  return (
    <div className="bg-background text-foreground">
      <HowItWorks />
    </div>
  );
}

export default function DemoPage() {
  return (
    <div className="space-y-12 bg-background min-h-screen">
      <HeroDemo />
      <HowItWorksDemo />
    </div>
  );
}
