import { Hero } from "./src/components/ui/animated-hero";
import { HowItWorks } from "./src/components/ui/how-it-works";

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
