"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Lock,
  Code2,
  Scale,
  Container,
  Bug,
  Download,
  Search,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { CodeScanReport } from "@/types/code-scan";

const CodeScanResults = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [isScanning, setIsScanning] = useState(false);
  const [report, setReport] = useState<CodeScanReport | null>(null);

  const handleScan = async () => {
    if (!repoUrl) {
      toast.error("Please enter a GitHub repository URL");
      return;
    }

    if (!/^https:\/\/github\.com\/[\w-]+\/[\w-]+/.test(repoUrl)) {
      toast.error("Please enter a valid GitHub URL");
      return;
    }

    setIsScanning(true);
    setReport(null);
    toast.info("Cloning and scanning repository...");

    try {
      const res = await fetch("/api/scan-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, branch }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Scan failed");
      }

      setReport(data);
      toast.success("Scan complete!");

      setTimeout(() => {
        document
          .getElementById("code-results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(errorMessage);
    } finally {
      setIsScanning(false);
    }
  };

  const handleClear = () => {
    setRepoUrl("");
    setBranch("main");
    setReport(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info("Ready for a new scan!");
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code-scan-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-600 text-white";
      case "high":
        return "bg-red-500 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <section className="py-16 max-w-6xl mx-auto px-2 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">
          Code & Dependency Scanner
        </h1>
        <p className="text-md text-muted-foreground">
          Deep analysis of GitHub repositories for security vulnerabilities,
          outdated packages, hardcoded secrets, and code quality issues
        </p>
      </div>

      {/* Input Form */}
      <div className="space-y-4">
        <div className="flex gap-3 flex-col sm:flex-row px-2">
          <Input
            className="py-5"
            type="url"
            placeholder="https://github.com/username/repository"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={isScanning}
            aria-label="Github URL to scan"
          />

          <Input
            className="py-5"
            type="text"
            placeholder="Branch (default: main)"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            disabled={isScanning}
            aria-label="Branch to scan"
          />
          <Button
            onClick={report ? handleClear : handleScan}
            disabled={isScanning}
            size="lg"
            className="h-12 px-8"
            aria-busy={isScanning}
          >
            {isScanning ? (
              <>
                <span className="animate-spin mr-2">⚡</span>
                Scanning...
              </>
            ) : report ? (
              <>
                <AlertCircle className="w-5 h-5 mr-2" />
                Clear Results
              </>
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Scan Repository
              </>
            )}
          </Button>
        </div>

        <div className="flex items-start gap-2 p-2 bg-section border border-border rounded-lg">
          <AlertCircle className="w-5 h-5 text-error mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Only public GitHub repositories are supported. Scanning may take
            30-60 seconds.
          </p>
        </div>
      </div>

      {/* Results */}
      {isScanning ? (
        <Card className="bg-card border-border">
          <CardContent className="text-center">
            <div className="flex justify-center items-center gap-2 text-muted-foreground">
              <span className="animate-spin">⚡</span>
              <p className="text-lg">Scanning repository, please wait...</p>
            </div>
          </CardContent>
        </Card>
      ) : report ? (
        <div id="code-results" className="space-y-6">
          {/* Summary Card */}
          <Card className="bg-linear-to-br from-card to-card/50 border-border p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Scan Summary
                </h3>
                <p className="text-sm text-muted-foreground">
                  Repository: {report.repoUrl.split("/").slice(-2).join("/")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Scanned on: {new Date(report.scanDate).toLocaleString()}
                </p>
              </div>
              <Button
                onClick={downloadReport}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-background rounded-lg">
                <div
                  className={`text-4xl font-bold ${getScoreColor(
                    report.summary.securityScore
                  )}`}
                >
                  {report.summary.securityScore}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Security Score
                </div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-4xl font-bold text-foreground">
                  {report.summary.totalIssues}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Total Issues
                </div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-4xl font-bold text-red-600">
                  {report.summary.critical}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Critical
                </div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-4xl font-bold text-orange-600">
                  {report.summary.high}
                </div>
                <div className="text-sm text-muted-foreground mt-1">High</div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-4xl font-bold text-yellow-600">
                  {report.summary.medium}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Medium</div>
              </div>
            </div>
          </Card>

          {/* Recommendations */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 p-6">
            <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Priority Recommendations
            </h3>
            {report.recommendations.length > 0 ? (
              <ul className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 dark:text-blue-400 mt-1">
                      •
                    </span>
                    <span className="text-foreground">{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                ✅ No recommendations needed
              </p>
            )}
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-6">
            {/* Outdated Packages */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Code2 className="w-5 h-5 text-yellow-500" />
                  Outdated Dependencies ({report.outdatedPackages.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {report.outdatedPackages.length > 0 ? (
                  report.outdatedPackages.map((pkg, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-start border-b border-border py-3 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {pkg.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pkg.currentVersion} → {pkg.latestVersion}
                        </p>
                        {pkg.cve && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            CVE: {pkg.cve}
                          </p>
                        )}
                      </div>
                      <Badge className={getSeverityColor(pkg.severity)}>
                        {pkg.severity}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    ✅ All dependencies are up to date
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Hardcoded Secrets */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="w-5 h-5 text-red-500" />
                  Hardcoded Secrets ({report.hardcodedSecrets.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {report.hardcodedSecrets.length > 0 ? (
                  report.hardcodedSecrets.map((secret, i) => (
                    <div
                      key={i}
                      className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                    >
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        {secret.type.toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {secret.file}:{secret.line}
                      </p>
                      <code className="text-xs bg-background p-1 rounded mt-2 block overflow-x-auto">
                        {secret.preview}
                      </code>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    ✅ No hardcoded secrets detected
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Insecure Functions */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Insecure Functions ({report.insecureFunctions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {report.insecureFunctions.length > 0 ? (
                  report.insecureFunctions.map((func, i) => (
                    <div
                      key={i}
                      className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800"
                    >
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        {func.function}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {func.file}:{func.line}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Risk: {func.risk}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        💡 {func.suggestion}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    ✅ No insecure function calls found
                  </p>
                )}
              </CardContent>
            </Card>

            {/* SAST Findings */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bug className="w-5 h-5 text-purple-500" />
                  Security Vulnerabilities ({report.sastFindings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {report.sastFindings.length > 0 ? (
                  report.sastFindings.map((finding, i) => (
                    <div
                      key={i}
                      className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800"
                    >
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                        {finding.type.toUpperCase().replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {finding.file}:{finding.line}
                      </p>
                      <p className="text-xs text-foreground mt-2">
                        {finding.description}
                      </p>
                      <code className="text-xs bg-background p-1 rounded mt-2 block overflow-x-auto">
                        {finding.code}
                      </code>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    ✅ No injection vulnerabilities found
                  </p>
                )}
              </CardContent>
            </Card>

            {/* License Issues */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scale className="w-5 h-5 text-blue-500" />
                  License Issues ({report.licenseIssues.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {report.licenseIssues.length > 0 ? (
                  report.licenseIssues.map((issue, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-start border-b border-border py-3 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {issue.package}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          License: {issue.license}
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          {issue.reason}
                        </p>
                      </div>
                      <Badge className={getSeverityColor(issue.risk)}>
                        {issue.risk}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    ✅ No problematic licenses found
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Docker Issues */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Container className="w-5 h-5 text-cyan-500" />
                  Docker Security ({report.dockerIssues.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {report.dockerIssues.length > 0 ? (
                  report.dockerIssues.map((issue, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-start border-b border-border py-3 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {issue.issue}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Line {issue.line} in {issue.file}
                        </p>
                      </div>
                      <Badge className={getSeverityColor(issue.severity)}>
                        {issue.severity}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    ✅ No Dockerfile found or no issues detected
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default CodeScanResults;
