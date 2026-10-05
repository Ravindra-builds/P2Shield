import React, { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/ui/animated-hero";
import { HowItWorks } from "@/components/ui/how-it-works";
import { InstallationSection } from "@/components/installation";
import { Footer } from "@/components/footer";
import { Download } from "lucide-react";

export function App() {
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);

  const triggerNotification = (msg: string) => {
    setDownloadNotification(msg);
    setTimeout(() => setDownloadNotification(null), 4000);
  };

  const handleDownloadExtension = () => {
    const element = document.getElementById("install");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    triggerNotification("Extension bundle ready! Follow the steps below to load unpacked into Chrome.");
  };

  const handleDownloadPackage = () => {
    const element = document.getElementById("install");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    triggerNotification("Developer package ready! Download source code bundle below.");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-sky-100 selection:text-sky-900">
      {/* Toast Notification */}
      {downloadNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-white border border-sky-200 text-slate-800 p-4 rounded-2xl shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="p-2 rounded-xl bg-sky-50 text-primary">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <strong className="block text-sm font-semibold text-slate-900 mb-0.5">Download Initiated</strong>
            {downloadNotification}
          </div>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        onDownloadExtension={handleDownloadExtension}
        onDownloadPackage={handleDownloadPackage}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Animated Hero Component */}
        <Hero
          onDownloadExtension={handleDownloadExtension}
          onDownloadPackage={handleDownloadPackage}
        />

        {/* How It Works Component */}
        <HowItWorks />

        {/* Installation and Download Cards */}
        <InstallationSection
          onDownloadExtension={handleDownloadExtension}
          onDownloadPackage={handleDownloadPackage}
        />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
