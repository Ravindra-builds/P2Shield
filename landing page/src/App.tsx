import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/ui/animated-hero";
import { HowItWorks } from "@/components/ui/how-it-works";
import { ProfilesSection } from "@/components/profiles";
import { FAQSection } from "@/components/faq";
import { InstallationSection } from "@/components/installation";
import { Footer } from "@/components/footer";

export function App() {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-sky-100 dark:selection:bg-sky-900/50 selection:text-sky-900 dark:selection:text-sky-200 transition-colors duration-300">
        <Navbar />
        <main className="flex-1">
          <Hero />
          <HowItWorks />
          <ProfilesSection />
          <InstallationSection />
          <FAQSection />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
