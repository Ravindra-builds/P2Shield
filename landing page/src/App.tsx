import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/ui/animated-hero";
import { HowItWorks } from "@/components/ui/how-it-works";
import { InstallationSection } from "@/components/installation";
import { Footer } from "@/components/footer";

export function App() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 selection:bg-sky-100 selection:text-sky-900">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <InstallationSection />
      </main>
      <Footer />
    </div>
  );
}

export default App;
