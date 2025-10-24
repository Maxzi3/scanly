"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const Hero = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleScan = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!url) {
      toast.error("Please enter a URL to scan");
      return;
    }

    setLoading(true);
    toast.success("Scan started! Check results below.");

    // Simulate scan duration
    setTimeout(() => {
      setLoading(false);
      document
        .getElementById("results")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 1200);
  };

  return (
    <section
      aria-labelledby="hero-heading"
      className="section-container text-center bg-section-bg rounded-2xl shadow-sm"
    >
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-down">
        {/* 🧠 Heading */}
        <h1
          id="hero-heading"
          className="text-5xl md:text-6xl font-bold text-foreground leading-tight capitalize"
        >
          Check your website&apos;s security in seconds.
        </h1>

        {/*  Description */}
        <p className="text-md text-muted-foreground max-w-2xl mx-auto animate-fade-in-up delay-100">
          Scanly analyzes headers, SSL, and cookies to help you find weak spots
          before attackers do.
        </p>

        {/*  Scroll Button */}
        <Button
          size="lg"
          onClick={() => {
            document
              .getElementById("scanner")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Start Scan
        </Button>

        {/*  Trust badges */}
        <div className="flex justify-center gap-4 text-sm text-muted-foreground mt-4 animate-fade-in-up delay-400">
          <span>✅ Free</span>
          <span>⚡ Fast Scan</span>
          <span>🔒 No Data Stored</span>
        </div>
      </div>
    </section>
  );
};

export default Hero;
