"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { AlertCircle, Search } from "lucide-react";
import { ScanReport } from "@/types/scan";
import Results from "./Results";

export default function Scanner() {
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!url) {
      toast.error("Please enter a URL to scan");
      return;
    }

    // Basic URL validation
    if (!/^https?:\/\/.+\..+/.test(url)) {
      toast.error("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setIsScanning(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Scan failed");
      }

      setResult(data);
      toast.success("Scan complete!");

      // Scroll to results after a brief delay
      setTimeout(() => {
        document
          .getElementById("results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsScanning(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isScanning) {
      handleScan();
    }
  };

  return (
    <section id="scanner" className="section-container">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Run a Security Scan
          </h1>
          <p className="text-lg text-muted-foreground">
            Enter a website URL to analyze its security configuration
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex gap-3 flex-col sm:flex-row">
            <Input
            className="py-5"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isScanning}
              aria-label="Website URL to scan"
            />
            <Button
              onClick={handleScan}
              disabled={isScanning}
              size="lg"
              aria-busy={isScanning}
            >
              {isScanning ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚡</span>
                  Scanning...
                </span>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Scan Now
                </>
              )}
            </Button>
          </div>

          <div className="flex items-start gap-2 p-4 bg-section border border-border rounded-lg">
            <AlertCircle className="w-5 h-5 text-error mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Only scan websites you own or have permission to test.
              Unauthorized security testing may be illegal.
            </p>
          </div>

          {error && !result && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Show results dynamically */}
        {result && <Results data={result} />}
      </div>
    </section>
  );
}
